"""Actividades: actividad grande (POA) + sus sub-actividades, con datos reales.

Tablas: efectoancash.prog_poa_actividad_grande, prog_actividad_pequena,
        core_componente, core_ugt, core_catalogo_item.
Salida: la forma que espera el front (views.js → actividades/reportes).
"""
from fastapi import APIRouter

from ..config import get_settings
from .. import db
from ..queries import (AP_FROM, SUB_ESTADO, UGT_LABEL, CT_NOMBRE_SQL,
                       estado_grande, fecha_corta, mes_titulo, hora_txt,
                       dia_semana, fecha_num)

router = APIRouter(tags=["actividades"])
S = get_settings().schema

_SQL = f"""
    WITH ap AS (
      SELECT s.act_grande_id,
             s.fecha_programada,
             s.hora_inicio,
             s.distrito,
             s.centro_poblado,
             s.especifico,
             {SUB_ESTADO} AS sub_estado
      {AP_FROM}
      WHERE EXTRACT(YEAR FROM s.fecha_programada) = CAST(:anio AS int)
    )
    SELECT ag.id,
           ag.nombre,
           {UGT_LABEL} AS ugt,
           COALESCE(co.codigo, '—') AS comp,
           COALESCE(co.nombre, '')  AS comp_nombre,
           {CT_NOMBRE_SQL} AS ct,
           ag.anio,
           ag.meta,
           (SELECT array_agg(a.sub_estado ORDER BY a.fecha_programada)
              FROM ap a WHERE a.act_grande_id = ag.id) AS subs,
           (SELECT min(a.fecha_programada) FROM ap a WHERE a.act_grande_id = ag.id) AS fecha_min
      FROM {S}.prog_poa_actividad_grande ag
      LEFT JOIN {S}.core_componente co ON co.id = ag.componente_id
      LEFT JOIN {S}.core_ugt        u  ON u.id  = ag.ugt_id
     WHERE CAST(ag.anio AS int) = CAST(:anio AS int)
     ORDER BY ag.id
"""


def _fila(r: dict) -> dict:
    subs = list(r.get("subs") or [])
    return {
        "id": r["id"],
        "nombre": r["nombre"],
        "ugt": r.get("ugt") or "Región",
        "comp": r.get("comp") or "—",
        "compNom": r.get("comp_nombre") or "",
        "ct": r.get("ct") or "",
        "anio": int(r.get("anio") or 0),
        "mes": mes_titulo(r.get("fecha_min")) or "—",
        "estado": estado_grande(subs),
        "meta": r.get("meta") or "",
        "subs": [{"e": e} for e in subs],
    }


@router.get("/ct")
async def coordinadores():
    """Catálogo de Coordinadores Territoriales (CT) por UGT.

    Fuente: efectoancash.core_ct + core_persona (catálogo propio).
    UGT Mina tiene DOS CT (Rayza Jara y Santiago Mansilla); el resto, uno.
    """
    sql = f"""
        SELECT DISTINCT trim(replace(coalesce(u.nombre, ''), 'UGT ', '')) AS ugt,
               trim(coalesce(p.nombres,'') || ' ' || coalesce(p.apellidos,'')) AS ct
          FROM {S}.core_ct c
          JOIN {S}.core_persona p ON p.id = c.persona_id
          LEFT JOIN {S}.core_ugt u ON u.id = c.ugt_id
         ORDER BY 1, 2
    """
    try:
        filas = await db.fetch(sql)
    except Exception:
        return []
    return [{"ugt": r.get("ugt") or "", "ct": r.get("ct") or ""} for r in filas]


@router.get("/actividades")
async def listar(anio: int = 2026, mes: str = "", ugt: str = "", componente: str = "", estado: str = "", ct: str = ""):
    try:
        filas = [_fila(r) for r in await db.fetch(_SQL, {"anio": anio})]
    except Exception:
        return []
    if mes:
        filas = [f for f in filas if f["mes"].lower().startswith(mes.lower()[:3])]
    if ugt:
        filas = [f for f in filas if f["ugt"].lower() == ugt.lower()]
    if componente:
        filas = [f for f in filas if f["comp"].lower() == componente.lower()]
    if estado:
        filas = [f for f in filas if f["estado"].lower() == estado.lower()]
    if ct:
        filas = [f for f in filas if f["ct"].lower() == ct.lower()]
    return filas


@router.get("/actividades/{aid}/subactividades")
async def subactividades(aid: int):
    """Sub-actividades de una actividad grande (detalle de "Programación")."""
    sql = f"""
        SELECT s.id, s.fecha_programada, s.hora_inicio, s.distrito, s.centro_poblado,
               s.nivel, s.especifico, ie.nombre AS ie_nombre,
               trim(coalesce(p.nombres,'') || ' ' || coalesce(p.apellidos,'')) AS responsable,
               {SUB_ESTADO} AS estado
        {AP_FROM}
        LEFT JOIN {S}.core_ie ie ON ie.id = s.ie_id
        LEFT JOIN {S}.core_usuario ru ON ru.id = s.responsable_id
        LEFT JOIN {S}.core_persona p ON p.id = ru.persona_id
        WHERE s.act_grande_id = :aid
        ORDER BY s.fecha_programada, s.hora_inicio
    """
    try:
        filas = await db.fetch(sql, {"aid": aid})
    except Exception:
        return []
    def _titulo(r):
        """Nombre corto de la sub-actividad: 1er bloque del especifico."""
        esp = (r.get("especifico") or "").strip()
        return (esp.split(" · ")[0] if esp else "") or "Actividad"
    return [{
        "id": r["id"],
        "titulo": _titulo(r),
        "lugar": " / ".join([x for x in [r.get("distrito"), r.get("centro_poblado"), r.get("ie_nombre")] if x]) or "—",
        "resp": r.get("responsable") or "—",
        "fecha": (fecha_corta(r.get("fecha_programada")) + (f" · {hora_txt(r.get('hora_inicio'))}" if hora_txt(r.get("hora_inicio")) else "")),
        "dia": dia_semana(r.get("fecha_programada")),
        "fecha_num": fecha_num(r.get("fecha_programada")),
        "hora": hora_txt(r.get("hora_inicio")),
        "nivel": r.get("nivel") or "",
        "especifico": r.get("especifico") or "",
        "e": r.get("estado") or "Pendiente",
    } for r in filas]
