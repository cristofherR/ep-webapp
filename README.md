# WebApp MEL — aplicación de gestión de equipo (demo de portafolio)

Aplicación web **real** (no mockup) para la gestión de un programa educativo territorial:
portada con KPIs, actividades (POA), reportes, incidencias/alertas, indicadores e historial.

- **Frontend:** SPA con ES Modules nativos + design system de tokens + PWA. Sin bundler.
- **Backend:** FastAPI (Python 3.12) + SQLAlchemy 2.0 async / asyncpg sobre PostgreSQL.
- **Auth:** sesión firmada en cookie `HttpOnly`, RBAC por rol × alcance, bloqueo por intentos.
- **Doble layout:** móvil primero; en escritorio pasa a sidebar + rejillas (un solo código).

> Este repositorio es una **versión pública y saneada** de un proyecto real: no incluye
> credenciales, datos de personas, hosts internos ni identificadores de sistemas internos.
> El código corre **sin base de datos** (modo UI) y con una base de datos propia si la configuras.

## Estructura

```
backend/
  app/
    main.py          # app FastAPI: CORS, estáticos, montaje de routers
    config.py        # settings desde .env (Pydantic Settings)
    db.py            # engine async; si no hay URL, la app corre en modo UI
    security.py      # hash, sesión firmada, intentos/bloqueo
    deps.py          # dependencias (usuario actual, RBAC, paginación)
    queries.py       # capa SQL compartida (solo SELECT / agregados)
    routers/         # health, auth, ui, portada, actividades, reportes,
                     # incidencias, indicadores, calendario, historial, catálogos
  requirements.txt
  .env.example
frontend/
  index.html · sw.js · manifest.webmanifest
  src/               # app.js, router.js, store.js, nav.js, api.js, views.js
  styles/            # tokens.css (design system) + app.css (móvil + escritorio)
  icons/ · assets/   # íconos PWA y placeholders neutros de marca
docs/                # VISION.md · ARQUITECTURA.md · PLAN_ETAPAS.md
```

## Arranque rápido

```bash
# 1) dependencias del backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2) (opcional) configuración; sin EA_DATABASE_URL la app corre en modo UI
cp .env.example .env

# 3) API
uvicorn app.main:app --reload --port 8090
# → OpenAPI en http://localhost:8090/docs   ·  health en /api/health
```

Frontend estático (en otra terminal):

```bash
cd frontend && python3 -m http.server 5173
# → http://localhost:5173
```

Paso a paso, variables de entorno y resultados esperados: **[REPRODUCIR.md](REPRODUCIR.md)**.

## Qué demuestra (para portafolio de ingeniería de datos / analytics)

- **Capa de datos separada:** toda consulta vive en `queries.py` / routers; la UI nunca toca la BD.
- **Contrato explícito:** Pydantic v2 valida entradas/salidas; tabla = un registro (idempotente).
- **Auditoría append-only:** cada escritura deja evento en la tabla de historial.
- **Agregados para KPIs:** % reportabilidad, estados por UGT, cortes por semana — calculados en SQL.
- **Seguridad aplicada:** RBAC en el servicio, sesión firmada, bloqueo de intentos, allowlist.
- **PWA + doble layout:** un código sirve teléfono y escritorio.

## Privacidad

- Sin credenciales versionadas: todo se lee de variables de entorno (ver `.env.example`).
- Datos de estudiantes, familias y docentes **nunca** entran a este repositorio.
- Los assets de marca incluidos son **placeholders neutros**; reemplázalos por los tuyos.


> Autor: Cristofher Rodríguez · Analista de datos · MEL · Educación e impacto social (Perú)
