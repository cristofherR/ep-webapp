"""Incidencias y alertas (casos) desde datos reales.

Tablas: efectoancash.prog_incidencia, prog_reporte, prog_actividad_pequena,
        prog_poa_actividad_grande, prog_notificacion (para derivar el estado),
        core_catalogo_item (categoría, subcategoría y nivel de semáforo).
Salida: la forma que espera el front (views.js → incidencias).
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from ..config import get_settings
from .. import db
from ..queries import cat_item, normaliza_semaforo, normaliza_tipo_incidencia

router = APIRouter(tags=["incidencias"])
S = get_settings().schema

# NIVEL_SEMAFORO (5 niveles del spec 4.2 · Informativo..Prioritario; se aceptan los
# códigos previos verde/ambar/rojo) → vocabulario del front (--sem-<nivel>).
_SEM = """
    CASE lower(sem.codigo)
         WHEN 'informativo' THEN 'Informativo'
         WHEN 'leve'        THEN 'Leve'
         WHEN 'moderado'    THEN 'Moderado'
         WHEN 'urgente'     THEN 'Urgente'
         WHEN 'prioritario' THEN 'Prioritario'
         WHEN 'verde'       THEN 'Leve'
         WHEN 'ambar'       THEN 'Moderado'
         WHEN 'rojo'        THEN 'Urgente'
         ELSE initcap(COALESCE(sem.etiqueta, 'Moderado')) END
"""

# El estado del caso no vive en prog_incidencia: se deriva de sus notificaciones.
_ESTADO = f"""
    CASE WHEN EXISTS (SELECT 1 FROM {S}.prog_notificacion n
                       WHERE n.incidencia_id = i.id AND n.estado = 'cerrado') THEN 'Cerrada'
         WHEN EXISTS (SELECT 1 FROM {S}.prog_notificacion n
                       WHERE n.incidencia_id = i.id AND n.estado IN ('enviado','pendiente')) THEN 'En seguimiento'
         ELSE 'Abierta' END
"""

_SQL = f"""
    SELECT i.id,
           i.tipo,
           i.diagnostico_previo,
           i.descripcion,
           COALESCE(cat.codigo, 'OTR') AS cat,
           COALESCE(sub.etiqueta, '—') AS sub,
           {_SEM} AS sem,
           {_ESTADO} AS estado,
           COALESCE(ag.nombre, '—') AS origen,
           s.especifico,
           i.categoria_id,
           i.subcategoria_id,
           i.nivel_semaforo_id
      FROM {S}.prog_incidencia i
      LEFT JOIN {S}.core_catalogo_item cat ON cat.id = i.categoria_id
      LEFT JOIN {S}.core_catalogo_item sub ON sub.id = i.subcategoria_id
      LEFT JOIN {S}.core_catalogo_item sem ON sem.id = i.nivel_semaforo_id
      LEFT JOIN {S}.prog_reporte r ON r.id = i.reporte_id
      LEFT JOIN {S}.prog_actividad_pequena s ON s.id = r.act_pequena_id
      LEFT JOIN {S}.prog_poa_actividad_grande ag ON ag.id = s.act_grande_id
     ORDER BY i.id DESC
"""


@router.get("/incidencias")
async def listar(estado: str = "", tipo: str = ""):
    try:
        filas = await db.fetch(_SQL, {})
    except Exception:
        return []
    salida = []
    for r in filas:
        tipo_txt = "Alerta" if (r.get("tipo") or "").lower() == "alerta" else "Incidencia"
        if estado and (r.get("estado") or "").lower() != estado.lower():
            continue
        if tipo and tipo_txt.lower() != tipo.lower():
            continue
        salida.append({
            "id": r["id"],
            "tipo": tipo_txt,
            "cat": r.get("cat") or "OTR",
            "sub": r.get("sub") or "—",
            "sem": r.get("sem") or "Moderado",
            "estado": r.get("estado") or "Abierta",
            "origen": r.get("origen") or "—",
            "diag": r.get("diagnostico_previo") or "",
            "descripcion": r.get("descripcion") or "",
        })
    return salida


class CasoIn(BaseModel):
    tipo: str = "Incidencia"
    origen: str = "actividad"
    actividad_id: Optional[str] = None
    categoria: Optional[str] = None       # código en CATEGORIA_INCIDENCIA
    subcategoria: Optional[str] = None    # código en SUBCATEGORIA_INCIDENCIA
    semaforo: Optional[str] = None        # Informativo..Prioritario
    diagnostico_previo: Optional[str] = None
    descripcion: Optional[str] = None


@router.post("/incidencias")
async def crear(body: CasoIn):
    """Registra un caso. La categoría/subcategoría/semáforo se resuelven por código,
    siempre DENTRO de su catálogo (los códigos se repiten entre catálogos)."""
    try:
        await db.execute(f"""
            INSERT INTO {S}.prog_incidencia
              (tipo, categoria_id, subcategoria_id, nivel_semaforo_id, diagnostico_previo, descripcion)
            VALUES (:tipo,
                    {cat_item('CATEGORIA_INCIDENCIA', 'cat')},
                    {cat_item('SUBCATEGORIA_INCIDENCIA', 'sub')},
                    {cat_item('NIVEL_SEMAFORO', 'sem')},
                    :diag, :desc)
        """, {"tipo": normaliza_tipo_incidencia(body.tipo),
              "cat": (body.categoria or "").strip().upper() or None,
              "sub": (body.subcategoria or "").strip().upper() or None,
              "sem": normaliza_semaforo(body.semaforo),
              "diag": (body.diagnostico_previo or "")[:20] or None, "desc": body.descripcion})
    except Exception:
        return {"ok": False}
    return {"ok": True}
