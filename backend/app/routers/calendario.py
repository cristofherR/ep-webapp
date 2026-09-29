"""Calendario: sub-actividades del mes en curso (hora Perú) desde datos reales.

Tablas: efectoancash.prog_actividad_pequena, prog_poa_actividad_grande,
        core_componente, core_ugt, core_catalogo_item.
Salida: la forma que espera el front (views.js → calendario): nombre + fecha + día.
"""
from fastapi import APIRouter

from ..config import get_settings
from .. import db
from ..queries import AP_FROM, SUB_ESTADO, UGT_LABEL, a_lima, fecha_corta, hora_txt

router = APIRouter(tags=["calendario"])
S = get_settings().schema

_SQL = f"""
    SELECT s.id,
           s.fecha_programada,
           s.hora_inicio,
           s.distrito,
           s.centro_poblado,
           s.especifico,
           ag.nombre AS actividad,
           {UGT_LABEL} AS ugt,
           COALESCE(co.codigo, '—') AS comp,
           {SUB_ESTADO} AS estado,
           (SELECT count(*) FROM {S}.prog_reporte r WHERE r.act_pequena_id = s.id) AS reportes
    {AP_FROM}
     WHERE date_trunc('month', s.fecha_programada AT TIME ZONE 'America/Lima')
           = date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'))
     ORDER BY s.fecha_programada, s.hora_inicio
"""


@router.get("/calendario")
async def calendario(desde: str = "", hasta: str = "", ugt: str = "", responsable: str = ""):
    try:
        filas = await db.fetch(_SQL, {})
    except Exception:
        return []
    salida = []
    for r in filas:
        d = a_lima(r.get("fecha_programada"))
        h = hora_txt(r.get("hora_inicio"))
        salida.append({
            "id": r["id"],
            "nombre": r.get("actividad") or "Actividad",
            "fecha": fecha_corta(r.get("fecha_programada")) + (f" · {h}" if h else ""),
            "dia": d.day if d else None,
            "mes": d.month if d else None,
            "hora": h,
            "ugt": r.get("ugt") or "Región",
            "comp": r.get("comp") or "—",
            "estado": r.get("estado") or "Pendiente",
            "lugar": " / ".join([x for x in [r.get("distrito"), r.get("centro_poblado")] if x]) or "",
            "especifico": r.get("especifico") or "",
            "reportado": bool(r.get("reportes")),
        })
    return salida
