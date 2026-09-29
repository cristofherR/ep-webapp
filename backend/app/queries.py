"""Consultas compartidas sobre el schema efectoancash (datos REALES).

Reglas de esta capa:
- Solo se consultan tablas/vistas del schema `efectoancash`.
- Las etiquetas se traducen al vocabulario que ya pinta el frontend
  (src/views.js): UGT sin el prefijo "UGT ", estados EST_GRANDE / SUB,
  y pares [etiqueta, valor] para los cortes de Indicadores.
- Las fechas se formatean en hora de Perú (America/Lima).
"""
from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from .config import get_settings

S = get_settings().schema
LIMA = ZoneInfo("America/Lima")

MESES = ["ene", "feb", "mar", "abr", "may", "jun",
         "jul", "ago", "set", "oct", "nov", "dic"]
MES_TITULO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
              "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

# --- Fragmentos reutilizables -------------------------------------------------

# Etiqueta de UGT para el front: "UGT San Marcos" → "San Marcos"; sin UGT → "Región".
UGT_LABEL = "COALESCE(NULLIF(replace(u.nombre, 'UGT ', ''), ''), 'Región')"

# Estado de la sub-actividad (actividad pequeña) en el vocabulario del front (SUB).
SUB_ESTADO = """
    CASE WHEN ci.codigo = 'ejecutado'                          THEN 'Ejecutado'
         WHEN ci.codigo IN ('reprogramado', 'postergado')      THEN 'Reprogramado'
         WHEN ci.codigo = 'cancelado'                          THEN 'Cancelado'
         WHEN ((now() AT TIME ZONE 'America/Lima')::date - s.fecha_programada::date) > 3 THEN 'Vencida3'
         WHEN ((now() AT TIME ZONE 'America/Lima')::date - s.fecha_programada::date) > 0 THEN 'Vencida'
         ELSE 'Pendiente' END
"""

# FROM base de la actividad pequeña con sus joins (POA grande, componente, UGT, estado).
AP_FROM = f"""
    FROM {S}.prog_actividad_pequena s
    LEFT JOIN {S}.prog_poa_actividad_grande ag ON ag.id = s.act_grande_id
    LEFT JOIN {S}.core_componente  co ON co.id = ag.componente_id
    LEFT JOIN {S}.core_ugt         u  ON u.id  = ag.ugt_id
    LEFT JOIN {S}.core_catalogo_item ci ON ci.id = s.estado_id
"""

EST_GRANDE_ORDEN = ["Programado", "En ejecución", "Completado", "Reprogramado", "No ejecutado"]

# --- CT derivado del centro poblado ------------------------------------------
# Cadena: actividad grande → sub-actividades → centro poblado → CT.
# Resolución: (1) si TODAS las sub-actividades de la actividad apuntan a un mismo
# CT de CP, ese manda; (2) si no, el ct_id explícito de la actividad; (3) si la UGT
# tiene un solo CT en el catálogo de CP, ese (Mina queda excluida por tener 2).
CT_ID_SQL = f"""
    COALESCE(
      (SELECT CASE WHEN count(DISTINCT cp.ct_id) = 1 THEN min(cp.ct_id) END
         FROM {S}.prog_actividad_pequena s2
         JOIN {S}.core_centro_poblado cp ON cp.id = s2.centro_poblado_id
        WHERE s2.act_grande_id = ag.id AND cp.ct_id IS NOT NULL),
      ag.ct_id,
      (SELECT CASE WHEN count(DISTINCT c2.ct_id) = 1 THEN min(c2.ct_id) END
         FROM {S}.core_centro_poblado c2 WHERE c2.ugt_id = ag.ugt_id)
    )
"""

CT_NOMBRE_SQL = f"""
    (SELECT trim(coalesce(p.nombres,'') || ' ' || coalesce(p.apellidos,''))
       FROM {S}.core_ct c JOIN {S}.core_persona p ON p.id = c.persona_id
      WHERE c.id = ({CT_ID_SQL}))
"""


# --- Resolución de catálogos --------------------------------------------------
# IMPORTANTE: los códigos se REPITEN entre catálogos (p. ej. 'incidencia' existe en
# TIPO_INCIDENCIA y también como categoría/estado en otros), y core_catalogo_item no
# tiene UNIQUE (catalogo_id, codigo). Por eso TODA búsqueda por código debe filtrar
# por el dominio del catálogo.

def cat_item(dominio: str, bind: str) -> str:
    """Subconsulta que resuelve un ítem de core_catalogo_item por DOMINIO + código.

    Uso: f"... (categoria_id, ...) VALUES ({cat_item('CATEGORIA_INCIDENCIA', 'cat')}, ...)"
    """
    return (f"(SELECT i.id FROM {S}.core_catalogo_item i "
            f"JOIN {S}.core_catalogo c ON c.id = i.catalogo_id "
            f"WHERE c.dominio = '{dominio}' AND lower(i.codigo) = lower(:{bind}) LIMIT 1)")


# Ítem 'Ejecutado' de ESTADO_ACTIVIDAD (literal, sin bind).
ESTADO_EJECUTADO_SQL = (f"(SELECT i.id FROM {S}.core_catalogo_item i "
                        f"JOIN {S}.core_catalogo c ON c.id = i.catalogo_id "
                        f"WHERE c.dominio = 'ESTADO_ACTIVIDAD' AND lower(i.codigo) = 'ejecutado' LIMIT 1)")


# 5 niveles (vocabulario del front / spec 4.2) + alias de los códigos previos de 3 niveles.
_SEM_ALIAS = {
    "informativo": "informativo", "info": "informativo", "azul": "informativo", "bajo": "informativo",
    "leve": "leve", "verde": "leve",
    "moderado": "moderado", "medio": "moderado", "ambar": "moderado",
    "urgente": "urgente", "alto": "urgente", "naranja": "urgente",
    "prioritario": "prioritario", "critico": "prioritario", "rojo": "prioritario",
}


def _sin_tildes(txt: str) -> str:
    for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("Á", "A")):
        txt = txt.replace(a, b)
    return txt


def normaliza_semaforo(valor: str | None) -> str | None:
    """Acepta el vocabulario del front (Leve/Moderado/Urgente) o el del catálogo
    (verde/ambar/rojo) y devuelve siempre el código del catálogo NIVEL_SEMAFORO."""
    if not valor:
        return None
    return _SEM_ALIAS.get(_sin_tildes(valor).strip().lower(), "moderado")


def normaliza_tipo_incidencia(valor: str | None) -> str:
    """prog_incidencia.tipo es texto libre (varchar 12): solo 'incidencia' | 'alerta'."""
    return "alerta" if "alerta" in _sin_tildes(valor or "").lower() else "incidencia"


# --- Ayudantes de formato -----------------------------------------------------

def a_lima(dt) -> datetime | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.astimezone(LIMA) if dt.tzinfo else dt.replace(tzinfo=LIMA)
    if isinstance(dt, date):
        return datetime(dt.year, dt.month, dt.day, tzinfo=LIMA)
    return None


def fecha_corta(valor) -> str:
    """"22 set" (SOLO la fecha: la hora se añade aparte con hora_txt)."""
    d = a_lima(valor)
    return f"{d.day} {MESES[d.month - 1]}" if d else ""


def fecha_hora(valor) -> str:
    """"17/09/2026 08:10" para el historial."""
    d = a_lima(valor)
    return d.strftime("%d/%m/%Y %H:%M") if d else ""


def mes_titulo(valor) -> str:
    d = a_lima(valor)
    return MES_TITULO[d.month - 1] if d else ""


def hora_txt(h) -> str:
    if isinstance(h, time):
        return h.strftime("%H:%M")
    return ""


DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def dia_semana(valor) -> str:
    """"martes" (día de la semana en español, hora Lima)."""
    d = a_lima(valor)
    return DIAS[d.weekday()] if d else ""


def fecha_num(valor) -> str:
    """"01/05/2026" (dd/mm/aaaa, hora Lima)."""
    d = a_lima(valor)
    return d.strftime("%d/%m/%Y") if d else ""


def estado_grande(subs: list | None) -> str:
    """Estado de la actividad grande derivado de sus sub-actividades."""
    subs = [s for s in (subs or []) if s]
    if not subs:
        return "Programado"
    uniq = set(subs)
    if uniq <= {"Ejecutado"}:
        return "Completado"
    if "Ejecutado" in uniq:
        return "En ejecución"
    if uniq <= {"Cancelado"}:
        return "No ejecutado"
    if uniq <= {"Reprogramado"}:
        return "Reprogramado"
    return "Programado"


def semana_del_mes(valor) -> int:
    d = a_lima(valor)
    return ((d.day - 1) // 7) + 1 if d else 1
