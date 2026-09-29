"""Sección 4.3 "Nueva actividad" (crear una sub-actividad).

Endpoints:
- GET  /api/actividad43/{aid}/catalogos   → datos de la actividad grande + catálogos
                                            (tipos, equipo, provincias) para el formulario.
- GET  /api/actividad43/ubicacion         → distritos / centros poblados / IE filtrados.
- POST /api/actividad43                   → crea la sub-actividad + sus participantes.

Tablas: efectoancash.prog_poa_actividad_grande, prog_actividad_pequena,
        prog_actividad_participante, core_componente, core_ugt, core_catalogo,
        core_catalogo_item, core_usuario, core_persona, core_rol,
        core_centro_poblado, core_ie.

Notas de esquema (verificado 20-sep-2026):
 - prog_actividad_pequena: migración 080 añadió nombre, tipo_id, hora_fin, provincia;
   migración 081 añade `lugar` (texto de "Lugar específico"), separado del nombre.
 - ESTADO_ACTIVIDAD · programado = id 45 (se resuelve por cat_item, sin hardcodear).
 - TIPO_ACTIVIDAD · 10 ítems (ids 164–173).
 - hora_inicio / hora_fin son `time without time zone`.
 - prog_actividad_participante(act_pequena_id, usuario_id NULL-able, todo_equipo).
"""
from __future__ import annotations

import asyncio
from datetime import date, time
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ..config import get_settings
from .. import db
from ..queries import UGT_LABEL, cat_item

router = APIRouter(tags=["actividad43"])
S = get_settings().schema

VACIO = {"distritos": [], "centros": [], "ie": []}


# --------------------------------------------------------------------------- #
# 1) GET /actividad43/{aid}/catalogos
# --------------------------------------------------------------------------- #
@router.get("/actividad43/{aid}/catalogos")
async def catalogos43(aid: int):
    """Datos de la actividad grande + catálogos del formulario "Nueva actividad"."""
    # Las 4 consultas son independientes: se lanzan EN PARALELO (1 ida a la BD en vez de 4,
    # que a ~0.8 s por viaje es la diferencia entre ~3.2 s y ~0.9 s en el primer render).
    async def _grande():
        try:
            filas = await db.fetch(f"""
                SELECT ag.id, ag.nombre,
                       {UGT_LABEL} AS ugt,
                       COALESCE(co.codigo, '—') AS comp,
                       COALESCE(co.nombre, '')  AS comp_nombre
                  FROM {S}.prog_poa_actividad_grande ag
                  LEFT JOIN {S}.core_componente co ON co.id = ag.componente_id
                  LEFT JOIN {S}.core_ugt        u  ON u.id  = ag.ugt_id
                 WHERE ag.id = :aid
            """, {"aid": aid})
            if filas:
                r = filas[0]
                return {
                    "id": r["id"],
                    "nombre": r.get("nombre") or "",
                    "ugt": r.get("ugt") or "Región",
                    "comp": r.get("comp") or "—",
                    "compNom": r.get("comp_nombre") or "",
                }
        except Exception:
            pass
        return {}

    async def _tipos():
        try:
            filas = await db.fetch(f"""
                SELECT i.id, i.codigo, i.etiqueta
                  FROM {S}.core_catalogo_item i
                  JOIN {S}.core_catalogo c ON c.id = i.catalogo_id
                 WHERE c.dominio = 'TIPO_ACTIVIDAD'
                 ORDER BY i.orden NULLS LAST, i.etiqueta
            """)
            return [{"id": r["id"], "codigo": r.get("codigo") or "",
                     "nombre": r.get("etiqueta") or ""} for r in filas]
        except Exception:
            return []

    async def _equipo():
        try:
            filas = await db.fetch(f"""
                SELECT u.id,
                       trim(coalesce(p.nombres,'') || ' ' || coalesce(p.apellidos,'')) AS nombre,
                       COALESCE(r.codigo, '') AS rol
                  FROM {S}.core_usuario u
                  LEFT JOIN {S}.core_persona p ON p.id = u.persona_id
                  LEFT JOIN {S}.core_rol     r ON r.id = u.rol_id
                 WHERE COALESCE(u.activo, true)
                 ORDER BY p.apellidos NULLS LAST, p.nombres NULLS LAST
            """)
            return [{"id": r["id"], "nombre": r.get("nombre") or "",
                     "rol": r.get("rol") or ""} for r in filas]
        except Exception:
            return []

    async def _provincias():
        try:
            filas = await db.fetch(f"""
                SELECT DISTINCT provincia
                  FROM {S}.core_centro_poblado
                 WHERE provincia IS NOT NULL AND provincia <> ''
                 ORDER BY 1
            """)
            return [r["provincia"] for r in filas]
        except Exception:
            return []

    grande, tipos, equipo, provincias = await asyncio.gather(
        _grande(), _tipos(), _equipo(), _provincias())
    return {"grande": grande, "tipos": tipos, "equipo": equipo, "provincias": provincias}


# --------------------------------------------------------------------------- #
# 2) GET /actividad43/ubicacion
# --------------------------------------------------------------------------- #
@router.get("/actividad43/ubicacion")
async def ubicacion43(provincia: str = "", distrito: str = "", cp: str = ""):
    """Distritos / centros poblados / IE filtrados en cascada. Nunca lanza 500."""
    if not provincia:
        return dict(VACIO)

    # Las 3 consultas son independientes → en paralelo (1 viaje a la BD en vez de 3).
    async def _distritos():
        try:
            filas = await db.fetch(f"""
                SELECT DISTINCT distrito
                  FROM {S}.core_centro_poblado
                 WHERE provincia = :prov AND distrito IS NOT NULL AND distrito <> ''
                 ORDER BY 1
            """, {"prov": provincia})
            return [r["distrito"] for r in filas]
        except Exception:
            return []

    async def _centros():
        try:
            filas = await db.fetch(f"""
                SELECT id, nombre
                  FROM {S}.core_centro_poblado
                 WHERE provincia = :prov
                   AND (:dist = '' OR distrito = :dist)
                 ORDER BY nombre
            """, {"prov": provincia, "dist": distrito or ""})
            return [{"id": r["id"], "nombre": r.get("nombre") or ""} for r in filas]
        except Exception:
            return []

    async def _ie():
        try:
            filas = await db.fetch(f"""
            SELECT id, cod_inst, nombre, cod_mod, niv_mod, nivel
              FROM {S}.core_ie
             WHERE provincia = :prov
               AND (:dist = '' OR distrito = :dist)
               AND (:cp = '' OR cen_poblado = :cp)
             ORDER BY cod_inst, niv_mod NULLS LAST
            """, {"prov": provincia, "dist": distrito or "", "cp": cp or ""})
            agrup: dict = {}
            for r in filas:
                k = r.get("cod_inst") or ""
                nodo = agrup.get(k)
                if nodo is None:
                    nodo = {"cod_inst": k, "nombre": r.get("nombre") or "", "niveles": []}
                    agrup[k] = nodo
                nodo["niveles"].append({
                    "id": r["id"],
                    "cod_mod": r.get("cod_mod") or "",
                    "niv_mod": r.get("niv_mod") or "",
                    "nivel": r.get("nivel") or "",
                })
            return list(agrup.values())
        except Exception:
            return []

    distritos, centros, ie = await asyncio.gather(_distritos(), _centros(), _ie())
    return {"distritos": distritos, "centros": centros, "ie": ie}


# --------------------------------------------------------------------------- #
# 3) POST /actividad43
# --------------------------------------------------------------------------- #
class Actividad43In(BaseModel):
    act_grande_id: int
    nombre: str
    tipo_id: Optional[int] = None
    fecha: str                              # YYYY-MM-DD
    hora_inicio: str = ""                   # HH:MM
    hora_fin: str = ""                      # HH:MM
    provincia: str = ""
    distrito: str = ""
    centro_poblado_id: Optional[int] = None
    centro_poblado: str = ""
    ie_id: Optional[int] = None
    nivel: str = ""
    lugar: str = ""
    responsable_id: Optional[int] = None
    participantes: list[int] = []
    todo_equipo: bool = False


@router.post("/actividad43")
async def crear43(body: Actividad43In):
    """Crea una sub-actividad (prog_actividad_pequena) + sus participantes."""
    # `especifico` = título corto de la sub-actividad (= nombre).
    # "Lugar específico" va a su propia columna `lugar` (migración 081): así no contamina
    # el nombre y se puede editar/buscar por separado.
    especifico = (body.nombre or "").strip() or None
    lugar = (body.lugar or "").strip() or None

    # asyncpg exige un `date` real al usar CAST(:fecha AS date) → se parsea aquí.
    try:
        f = date.fromisoformat((body.fecha or "").strip()[:10])
    except Exception:
        return {"ok": False, "detail": f"Fecha inválida: {body.fecha!r} (se espera YYYY-MM-DD)"}

    def _hora(s: str):
        """'HH:MM' → datetime.time, o None si viene vacío/inválido."""
        s = (s or "").strip()
        if not s:
            return None
        try:
            hh, mm = s.split(":")[:2]
            return time(int(hh), int(mm))
        except Exception:
            return None

    params = {
        "aid": body.act_grande_id,
        "ie_id": body.ie_id,
        "distrito": (body.distrito or "").strip() or None,
        "cp_txt": (body.centro_poblado or "").strip() or None,
        "cp_id": body.centro_poblado_id,
        "nivel": (body.nivel or "").strip() or None,
        "especifico": especifico,
        "nombre": (body.nombre or "").strip() or None,
        "lugar": lugar,
        "tipo_id": body.tipo_id,
        "resp_id": body.responsable_id,
        "fecha": f,
        "hi": _hora(body.hora_inicio),
        "hf": _hora(body.hora_fin),
        "provincia": (body.provincia or "").strip() or None,
        "estado": "programado",
    }

    try:
        filas = await db.fetch(f"""
            INSERT INTO {S}.prog_actividad_pequena
              (act_grande_id, ie_id, distrito, centro_poblado, centro_poblado_id, nivel,
               especifico, nombre, tipo_id, responsable_id, fecha_programada,
               hora_inicio, hora_fin, estado_id, provincia, lugar)
            VALUES
              (:aid, :ie_id, :distrito, :cp_txt, :cp_id, :nivel,
               :especifico, :nombre, :tipo_id, :resp_id,
               (CAST(:fecha AS date) + COALESCE(CAST(:hi AS time), time '08:00')) AT TIME ZONE 'America/Lima',
               CAST(:hi AS time), CAST(:hf AS time),
               {cat_item('ESTADO_ACTIVIDAD', 'estado')}, :provincia, :lugar)
            RETURNING id
        """, params, commit=True)
        nuevo_id = filas[0]["id"] if filas else None
    except Exception as e:
        return {"ok": False, "detail": str(e)[:300]}

    if nuevo_id is None:
        return {"ok": False, "detail": "No se pudo crear la actividad"}

    n_part = 0
    try:
        # Usuarios distintos; se excluye al responsable para no duplicarlo.
        ids: list[int] = []
        for uid in body.participantes or []:
            if uid is None or uid == body.responsable_id:
                continue
            if uid not in ids:
                ids.append(int(uid))

        # TODAS las filas en UNA sola sentencia (antes: 1 viaje a la BD por participante;
        # con ~26 integrantes eran hasta 26 viajes de ~0.8 s). Idempotente vía NOT EXISTS.
        partes = []
        params_p: dict = {"aid": nuevo_id}
        if ids:
            vals = ", ".join(f"(CAST(:u{i} AS integer))" for i in range(len(ids)))
            for i, uid in enumerate(ids):
                params_p[f"u{i}"] = uid
            partes.append(f"""
                SELECT :aid, u.uid, false
                  FROM (VALUES {vals}) AS u(uid)
                 WHERE NOT EXISTS (
                    SELECT 1 FROM {S}.prog_actividad_participante
                     WHERE act_pequena_id = :aid AND usuario_id = u.uid)""")
        if body.todo_equipo:
            partes.append(f"""
                SELECT :aid, CAST(NULL AS integer), true
                 WHERE NOT EXISTS (
                    SELECT 1 FROM {S}.prog_actividad_participante
                     WHERE act_pequena_id = :aid AND usuario_id IS NULL AND todo_equipo)""")
        if partes:
            await db.execute(
                f"INSERT INTO {S}.prog_actividad_participante "
                f"(act_pequena_id, usuario_id, todo_equipo) " + " UNION ALL ".join(partes),
                params_p)
        n_part = len(ids)
    except Exception as e:
        return {"ok": True, "id": nuevo_id, "participantes": n_part,
                "detail": f"Actividad creada, pero falló el registro de participantes: {str(e)[:200]}"}

    return {"ok": True, "id": nuevo_id, "participantes": n_part}
