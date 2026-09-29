"""Reportes: registrar la ejecución de una sub-actividad (datos reales).

Tablas: efectoancash.prog_reporte (INSERT), prog_actividad_pequena (UPDATE de estado),
        core_evento (append-only), core_catalogo_item (estado 'ejecutado').
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

from ..config import get_settings
from .. import db, security
from ..queries import (ESTADO_EJECUTADO_SQL, cat_item, normaliza_semaforo,
                       normaliza_tipo_incidencia)

router = APIRouter(tags=["reportes"])
S = get_settings().schema
_cfg = get_settings()


class ReporteIn(BaseModel):
    subactividad_id: int
    descripcion: str = ""
    logro: str = ""
    docentes: int = 0
    familias: int = 0
    estudiantes: int = 0
    otros: int = 0
    otros_detalle: Optional[str] = None      # detalle de quiénes son "Otros" participantes
    incidencia: bool = False
    tipo: Optional[str] = None
    naturaleza: Optional[str] = None        # Naturaleza/familia (CONV/SALUD/DER/GEST)
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    semaforo: Optional[str] = None
    observacion: Optional[str] = None
    diagnostico_previo: Optional[str] = None
    # 4.2 móvil: campos del bloque Incidencia / Alerta
    tipo_especifico: Optional[str] = None      # "Tipo de incidencia" / "Tipo de alerta"
    derivacion: Optional[bool] = None          # Incidencia: ¿requiere derivación inmediata?
    informacion_nee: Optional[str] = None      # Alerta NEE: información adicional
    descripcion_caso: Optional[str] = None     # Descripción del caso (incidencia o alerta)


@router.post("/reportes")
async def registrar(body: ReporteIn, request: Request):
    tok = request.cookies.get(_cfg.session_cookie)
    u = security.read_session(tok) if tok else None
    email = (u or {}).get("email")
    try:
        rows = await db.fetch(f"""
            INSERT INTO {S}.prog_reporte
              (act_pequena_id, descripcion, logro, n_docentes, n_familias,
               n_estudiantes, n_otros, detalle_otros, estado, enviado_en)
            VALUES (:aid, :desc, :logro, :doc, :fam, :est, :otros, :det_otros, 'enviado', now())
            RETURNING id
        """, {"aid": body.subactividad_id, "desc": body.descripcion, "logro": body.logro,
              "doc": body.docentes, "fam": body.familias, "est": body.estudiantes, "otros": body.otros,
              "det_otros": (body.otros_detalle or "")[:300] or None},
            commit=True)
        rid = rows[0]["id"] if rows else None

        await db.execute(f"""
            UPDATE {S}.prog_actividad_pequena
               SET estado_id = {ESTADO_EJECUTADO_SQL}
             WHERE id = :aid
        """, {"aid": body.subactividad_id})

        if body.incidencia:
            await db.execute(f"""
                INSERT INTO {S}.prog_incidencia
                  (reporte_id, tipo, naturaleza_id, categoria_id, subcategoria_id, nivel_semaforo_id,
                   diagnostico_previo, descripcion, tipo_especifico, derivacion, informacion_nee)
                VALUES (:rid, :tipo,
                        {cat_item('NATURALEZA_INCIDENCIA', 'nat')},
                        {cat_item('CATEGORIA_INCIDENCIA', 'cat')},
                        {cat_item('SUBCATEGORIA_INCIDENCIA', 'sub')},
                        {cat_item('NIVEL_SEMAFORO', 'sem')},
                        :diag, :obs, :tipoesp, :deriv, :infonee)
            """, {"rid": rid, "tipo": normaliza_tipo_incidencia(body.tipo or "incidencia"),
                  "nat": (body.naturaleza or "").strip().upper() or None,
                  "cat": (body.categoria or "").strip().upper() or None,
                  "sub": (body.subcategoria or "").strip().upper() or None,
                  "sem": normaliza_semaforo(body.semaforo),
                  "diag": (body.diagnostico_previo or "")[:20] or None,
                  "obs": body.descripcion_caso or body.observacion,
                  "tipoesp": (body.tipo_especifico or "")[:160] or None,
                  "deriv": body.derivacion,
                  "infonee": body.informacion_nee})

        await db.execute(f"""
            INSERT INTO {S}.core_evento (entidad, entidad_id, accion, usuario_id, payload, fecha)
            VALUES ('prog_reporte', :rid, 'Reporte',
                    (SELECT id FROM {S}.core_usuario WHERE lower(email) = lower(:e) LIMIT 1),
                    :txt, now())
        """, {"rid": rid, "e": email or "",
              "txt": f"Reporte registrado · sub-actividad {body.subactividad_id}: {body.descripcion or 'sin descripción'}"})
    except Exception as e:
        return {"ok": False, "detail": str(e)[:200]}
    return {"ok": True, "reporte_id": rid, "subactividad": body.subactividad_id}
