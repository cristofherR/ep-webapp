"""Portada (Inicio): KPIs, próximas actividades y usuario de la sesión — datos reales.

Tablas: efectoancash.prog_actividad_pequena, prog_reporte, core_catalogo_item,
        prog_poa_actividad_grande, core_comentario (comentarios de la portada).
Salida: la forma que espera el front (views.js → portada).
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel

from ..config import get_settings
from .. import db, security
from ..queries import a_lima, fecha_corta, hora_txt

router = APIRouter(tags=["portada"])
_S = get_settings()
S = _S.schema


def _sesion(request: Request):
    tok = request.cookies.get(_S.session_cookie)
    return security.read_session(tok) if tok else None


_SQL_KPI = f"""
    SELECT (SELECT COUNT(*) FROM {S}.prog_actividad_pequena s
             WHERE EXTRACT(YEAR FROM s.fecha_programada) = EXTRACT(YEAR FROM CURRENT_DATE)) AS programadas,
           (SELECT COUNT(*) FROM {S}.prog_actividad_pequena s
             WHERE EXTRACT(YEAR FROM s.fecha_programada) = EXTRACT(YEAR FROM CURRENT_DATE)
               AND (EXISTS (SELECT 1 FROM {S}.prog_reporte r WHERE r.act_pequena_id = s.id)
                    OR s.estado_id IN (SELECT i.id FROM {S}.core_catalogo_item i
                                        JOIN {S}.core_catalogo c ON c.id = i.catalogo_id
                                        WHERE c.dominio = 'ESTADO_ACTIVIDAD'
                                          AND i.codigo = 'ejecutado')))) AS reportadas
"""

# Próximas actividades: desde hoy (hora Perú), sin canceladas.
_SQL_PROX = f"""
    SELECT ag.nombre, s.fecha_programada, s.hora_inicio
      FROM {S}.prog_actividad_pequena s
      LEFT JOIN {S}.prog_poa_actividad_grande ag ON ag.id = s.act_grande_id
      LEFT JOIN {S}.core_catalogo_item ci ON ci.id = s.estado_id
     WHERE s.fecha_programada >= (date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')) AT TIME ZONE 'America/Lima'
       AND COALESCE(ci.codigo, '') <> 'cancelado'
     ORDER BY s.fecha_programada, s.hora_inicio
     LIMIT 5
"""


@router.get("/portada")
async def portada(request: Request, periodo: str = ""):
    out: dict = {}
    u = _sesion(request)
    if u:
        out["user"] = {"nombre": u.get("nombre"), "rol": u.get("rol"),
                       "email": u.get("email"), "rol_codigo": u.get("rol_codigo", "")}
    try:
        k = await db.fetch(_SQL_KPI, {})
        if k and (int(k[0].get("programadas") or 0) or int(k[0].get("reportadas") or 0)):
            out["kpis"] = {"programadas": int(k[0].get("programadas") or 0),
                           "reportadas": int(k[0].get("reportadas") or 0)}
    except Exception:
        pass
    try:
        p = await db.fetch(_SQL_PROX, {})
        if p:
            out["proximas"] = [{
                "id": i + 1,
                "nombre": r.get("nombre") or "Actividad",
                "fecha": fecha_corta(r.get("fecha_programada")) + (f" · {hora_txt(r.get('hora_inicio'))}" if hora_txt(r.get("hora_inicio")) else ""),
            } for i, r in enumerate(p)]
    except Exception:
        pass
    return out


class ComentarioIn(BaseModel):
    texto: str


@router.post("/portada/comentario")
async def comentario(body: ComentarioIn, request: Request):
    txt = (body.texto or "").strip()
    if not txt:
        return {"ok": False, "detail": "Comentario vacío"}
    try:
        u = _sesion(request) or {}
        await db.execute(
            f"INSERT INTO {S}.core_comentario (usuario_id, texto, fecha) "
            f"VALUES ((SELECT id FROM {S}.core_usuario WHERE lower(email) = lower(:e)), :t, now())",
            {"e": u.get("email"), "t": txt},
        )
    except Exception:
        return {"ok": False}
    return {"ok": True}
