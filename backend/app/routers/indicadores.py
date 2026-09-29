"""Indicadores: KPIs + cortes (UGT / tipo / semana / mes) desde datos reales.

Tablas: efectoancash.prog_actividad_pequena, prog_poa_actividad_grande,
        core_componente, core_ugt, core_catalogo_item, prog_reporte.
Las consultas van EN PARALELO (asyncio.gather): cada ida a Azure cuesta ~0.3 s.
Las filas se devuelven como pares [etiqueta, valor], que es lo que pinta el front.
"""
import asyncio

from fastapi import APIRouter

from ..config import get_settings
from .. import db
from ..queries import AP_FROM, MESES, UGT_LABEL

router = APIRouter(tags=["indicadores"])
S = get_settings().schema

_ANIO = "EXTRACT(YEAR FROM s.fecha_programada) = CAST(:anio AS int)"

_SQL_BASE = f"""
    SELECT COUNT(*)                                              AS programadas,
           COUNT(*) FILTER (WHERE ci.codigo = 'ejecutado'
                              OR EXISTS (SELECT 1 FROM {S}.prog_reporte r
                                          WHERE r.act_pequena_id = s.id)) AS reportadas,
           COUNT(*) FILTER (WHERE ci.codigo = 'cancelado')        AS canceladas,
           COUNT(*) FILTER (WHERE ci.codigo IN ('reprogramado','postergado')) AS reprogramadas
      FROM {S}.prog_actividad_pequena s
      LEFT JOIN {S}.core_catalogo_item ci ON ci.id = s.estado_id
     WHERE {_ANIO}
"""

_SQL_UGT = f"""
    SELECT {UGT_LABEL} AS k, COUNT(*) AS n {AP_FROM}
     WHERE {_ANIO}
     GROUP BY 1 ORDER BY n DESC
"""

_SQL_TIPO = f"""
    SELECT COALESCE(co.codigo, 'Otros') AS k, COUNT(*) AS n {AP_FROM}
     WHERE {_ANIO}
     GROUP BY 1 ORDER BY n DESC
"""

# Semanas del mes más reciente con datos (S1..S5) — barras de "Ejecutadas por semana".
_SQL_SEMANA = f"""
    WITH mes AS (
      SELECT date_trunc('month', max(s.fecha_programada AT TIME ZONE 'America/Lima')) AS m0
        FROM {S}.prog_actividad_pequena s
       WHERE {_ANIO}
    )
    SELECT 'S' || CEIL(EXTRACT(DAY FROM (s.fecha_programada AT TIME ZONE 'America/Lima')) / 7.0)::int AS k,
           COUNT(*) AS n
      FROM {S}.prog_actividad_pequena s, mes
     WHERE {_ANIO}
       AND date_trunc('month', s.fecha_programada AT TIME ZONE 'America/Lima') = mes.m0
     GROUP BY 1 ORDER BY 1
"""

_SQL_MES = f"""
    SELECT EXTRACT(MONTH FROM s.fecha_programada AT TIME ZONE 'America/Lima')::int AS m,
           COUNT(*) AS prog,
           COUNT(*) FILTER (WHERE ci.codigo = 'ejecutado') AS rep
      FROM {S}.prog_actividad_pequena s
      LEFT JOIN {S}.core_catalogo_item ci ON ci.id = s.estado_id
     WHERE {_ANIO}
     GROUP BY 1 ORDER BY 1
"""


async def _q(sql: str, params: dict):
    """Consulta tolerante: si algo falla, devuelve None (el front cae a su DEMO)."""
    try:
        return await db.fetch(sql, params)
    except Exception:
        return None


@router.get("/indicadores")
async def indicadores(anio: int = 2026, ugt: str = ""):
    p = {"anio": anio}
    base, r_ugt, r_tipo, r_sem, r_mes = await asyncio.gather(
        _q(_SQL_BASE, p), _q(_SQL_UGT, p), _q(_SQL_TIPO, p), _q(_SQL_SEMANA, p), _q(_SQL_MES, p),
    )

    out: dict = {}
    if base:
        b = base[0]
        out.update({k: int(b.get(k) or 0) for k in ("programadas", "reportadas", "canceladas", "reprogramadas")})
    else:
        return {}

    programadas = int(out.get("programadas") or 0) or 1

    if r_ugt:
        out["porUGT"] = [[r["k"] or "Región", int(r["n"] or 0)] for r in r_ugt]
    if r_tipo:
        # El front pinta el tipo como porcentaje y además reparte la dona con esos valores.
        out["porTipo"] = [[r["k"] or "Otros", round(int(r["n"] or 0) / programadas * 100)] for r in r_tipo]
    if r_sem:
        out["porSemana"] = [[r["k"], int(r["n"] or 0)] for r in r_sem]
    if r_mes:
        out["porMes"] = [[MESES[int(r["m"]) - 1].capitalize(),
                          round(int(r["rep"] or 0) / max(int(r["prog"] or 0), 1) * 100)] for r in r_mes]
    return out
