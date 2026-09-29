"""EA WebApp MEL — aplicación FastAPI (API + estáticos del frontend)."""
from __future__ import annotations
import json
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .config import get_settings
from . import db
from .routers import (health, auth, ui, portada, actividades, reportes,
                      incidencias, indicadores, calendario, historial, catalogos,
                      actividad43)

logging.basicConfig(level=logging.INFO)
cfg = get_settings()
db.init(cfg)

app = FastAPI(title=cfg.app_name, version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

# --- Caché corta de respuestas GET (/api/*) -------------------------------------------------
# Cada ida a Azure cuesta ~0.8 s (casi todo es apertura de conexión/latencia). Este caché de
# 25 s hace que moverse entre vistas sea instantáneo y encaja con el refresco de fondo del front.
# La clave incluye la cookie de sesión (los datos son por usuario) y se vacía al escribir.
_CACHE_TTL = 40.0
_CACHE: dict[str, tuple[float, object]] = {}


@app.middleware("http")
async def cache_api(request: Request, call_next):
    path = request.url.path
    es_api = path.startswith("/api/")
    cacheable = (
        es_api
        and request.method == "GET"
        and not path.startswith("/api/auth/")
        and not path.startswith("/api/health")
        and not path.startswith("/api/docs")
        and not path.startswith("/api/openapi")
        and not path.startswith("/api/ui")
    )
    if not cacheable:
        resp = await call_next(request)
        # Cualquier escritura invalida todo el caché (los datos pueden haber cambiado).
        if es_api and request.method in ("POST", "PUT", "PATCH", "DELETE") and resp.status_code < 500:
            _CACHE.clear()
        return resp

    key = f"{path}?{request.url.query}#{request.cookies.get(cfg.session_cookie) or '-'}"
    ahora = time.time()
    hit = _CACHE.get(key)
    if hit and ahora - hit[0] < _CACHE_TTL:
        return JSONResponse(hit[1], headers={"X-Cache": "HIT"})

    resp = await call_next(request)
    if resp.status_code == 200 and (resp.headers.get("content-type", "").startswith("application/json")):
        body = b"".join([chunk async for chunk in resp.body_iterator])
        try:
            data = json.loads(body)
        except Exception:
            return resp
        _CACHE[key] = (ahora, data)
        return JSONResponse(data, headers={"X-Cache": "MISS"})
    return resp

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if cfg.debug else [],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (health, auth, ui, portada, actividades, reportes,
          incidencias, indicadores, calendario, historial, catalogos, actividad43):
    app.include_router(r.router, prefix="/api")

# --- Frontend estático ---
fe = cfg.frontend_dir
if fe.exists():
    app.mount("/styles", StaticFiles(directory=str(fe / "styles")), name="styles")
    app.mount("/src", StaticFiles(directory=str(fe / "src")), name="src")
    app.mount("/icons", StaticFiles(directory=str(fe / "icons")), name="icons")

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(str(fe / "index.html"))

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = fe / path
        if f.is_file():
            return FileResponse(str(f))
        return FileResponse(str(fe / "index.html"))   # SPA fallback
