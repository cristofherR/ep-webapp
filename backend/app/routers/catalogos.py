"""Catálogos de la sección 4.2 + detalle de una sub-actividad (pantalla "Reporte").

- GET /api/catalogos            → categorías, subcategorías y semáforo (5 niveles)
                                  para los desplegables del formulario de Reporte.
- GET /api/subactividades/{sid} → detalle de la sub-actividad que se va a reportar.

Tablas: efectoancash.core_catalogo, core_catalogo_item, prog_actividad_pequena,
        prog_poa_actividad_grande, core_componente, core_ugt, core_ie,
        core_usuario, core_persona.
"""
from fastapi import APIRouter

from ..config import get_settings
from .. import db
from ..queries import AP_FROM, SUB_ESTADO, UGT_LABEL, fecha_corta, mes_titulo, hora_txt
from ..taxonomia42 import payload as taxo_payload

router = APIRouter(tags=["catalogos"])
S = get_settings().schema


async def _items(dominio: str) -> list:
    """Ítems de un catálogo por DOMINIO (los códigos se repiten entre catálogos)."""
    sql = f"""
        SELECT i.codigo, i.etiqueta, i.color_hex
          FROM {S}.core_catalogo_item i
          JOIN {S}.core_catalogo c ON c.id = i.catalogo_id
         WHERE c.dominio = :dom
         ORDER BY i.orden NULLS LAST, i.etiqueta
    """
    try:
        filas = await db.fetch(sql, {"dom": dominio})
    except Exception:
        return []
    return [{"codigo": r.get("codigo"), "etiqueta": r.get("etiqueta"),
             "color": r.get("color_hex")} for r in filas]


CANON_SEM = ("informativo", "leve", "moderado", "urgente", "prioritario")
CANON_CAT = ("rt", "op", "pb", "ie", "at", "bp", "nee", "do")
CANON_SUB = ("fisica", "verbal", "psicologica", "sexual", "ciberbullying",
             "accidente", "enfermedad", "crisis_emocional", "negligencia",
             "violencia_domestica", "ausentismo_docente", "infraestructura",
             "conflicto_autoridad", "logistica", "comunicacion", "clima_laboral")


def _canon(items: list, canon: tuple) -> list:
    """Deja solo los códigos canónicos, en el orden del spec.

    Oculta los ítems heredados de la demo previa (IE/AT/NEE/DOC/COM/OTR,
    INF/RAP/AUS/…, verde/ambar/rojo). Si aún no hay canónicos, devuelve todo.
    """
    por_cod = {(x.get("codigo") or "").lower(): x for x in items}
    disponibles = [c for c in canon if c in por_cod]
    if not disponibles:
        return items
    return [por_cod[c] for c in disponibles]


async def _taxonomia_bd() -> dict | None:
    """Taxonomía N:M viva (tablas puente). None si aún no está cargada."""
    try:
        sn = await db.fetch(f"""
            SELECT s.codigo AS sub, n.codigo AS nat
              FROM {S}.prog_nat_subcat b
              JOIN {S}.core_catalogo_item s ON s.id = b.subcategoria_id
              JOIN {S}.core_catalogo_item n ON n.id = b.naturaleza_id
        """)
        cs = await db.fetch(f"""
            SELECT c.codigo AS cat, s.codigo AS sub
              FROM {S}.prog_cat_subcat b
              JOIN {S}.core_catalogo_item c ON c.id = b.categoria_id
              JOIN {S}.core_catalogo_item s ON s.id = b.subcategoria_id
        """)
    except Exception:
        return None
    if not sn or not cs:
        return None
    nats = await _items("NATURALEZA_INCIDENCIA")
    if not nats:
        return None
    sub_nat = {(r["sub"] or "").upper(): (r["nat"] or "").upper() for r in sn}
    cat_sub: dict = {}
    for r in cs:
        cat_sub.setdefault((r["cat"] or "").upper(), []).append((r["sub"] or "").upper())
    return {"naturalezas": nats, "sub_nat": sub_nat, "cat_sub": cat_sub}


@router.get("/catalogos")
async def catalogos():
    """Listas para los desplegables del formulario de Reporte (4.2).

    Incluye la taxonomía N:M (naturaleza ↔ categoría ↔ subcategoría).
    """
    taxo = taxo_payload()                       # respaldo canónico (nunca vacío)
    viva = await _taxonomia_bd()                # si la BD tiene el puente, manda
    if viva:
        taxo["naturalezas"] = viva["naturalezas"]
        taxo["sub_nat"] = viva["sub_nat"]
        taxo["cat_sub"] = viva["cat_sub"]
    return {
        "categorias":    _canon(await _items("CATEGORIA_INCIDENCIA"), CANON_CAT),
        "subcategorias": _canon(await _items("SUBCATEGORIA_INCIDENCIA"), CANON_SUB),
        "semaforo":      _canon(await _items("NIVEL_SEMAFORO"), CANON_SEM),
        "naturalezas":   taxo["naturalezas"],
        "taxonomia":     taxo,
    }


@router.get("/subactividades/{sid}")
async def subactividad(sid: int):
    """Detalle de una sub-actividad para el formulario de Reporte (4.2)."""
    sql = f"""
        SELECT s.id, s.act_grande_id, s.fecha_programada, s.hora_inicio, s.distrito,
               s.centro_poblado, s.nivel, s.especifico,
               ag.nombre AS actividad, ag.meta,
               {UGT_LABEL} AS ugt,
               COALESCE(co.codigo, '—') AS comp,
               COALESCE(co.nombre, '')  AS comp_nombre,
               ie.nombre AS ie_nombre,
               trim(coalesce(p.nombres,'') || ' ' || coalesce(p.apellidos,'')) AS responsable,
               {SUB_ESTADO} AS estado
        {AP_FROM}
        LEFT JOIN {S}.core_ie ie ON ie.id = s.ie_id
        LEFT JOIN {S}.core_usuario ru ON ru.id = s.responsable_id
        LEFT JOIN {S}.core_persona p ON p.id = ru.persona_id
        WHERE s.id = :sid
    """
    try:
        filas = await db.fetch(sql, {"sid": sid})
    except Exception:
        return {}
    if not filas:
        return {}
    r = filas[0]
    f = r.get("fecha_programada")
    return {
        "id": r["id"],
        "act_id": r.get("act_grande_id"),
        "actividad": r.get("actividad") or "",
        "meta": r.get("meta") or "",
        "ugt": r.get("ugt") or "Región",
        "comp": r.get("comp") or "—",
        "compNom": r.get("comp_nombre") or "",
        "lugar": " / ".join([x for x in [r.get("distrito"), r.get("centro_poblado"),
                                         r.get("ie_nombre")] if x]) or "—",
        "nivel": r.get("nivel") or "",
        "especifico": r.get("especifico") or "",
        "resp": r.get("responsable") or "—",
        "fecha": fecha_corta(f),
        "hora": hora_txt(r.get("hora_inicio")),
        "mes": mes_titulo(f),
        "anio": (f.year if f else None),
        "estado": r.get("estado") or "Pendiente",
    }
