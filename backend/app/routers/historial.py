"""Mi historial: eventos (append-only) de core_evento.

Tablas: efectoancash.core_evento.
Salida: la forma que espera el front (views.js → historial): {f, tipo, txt}.
Si el usuario tiene sesión, se muestran sus eventos + los globales (usuario_id nulo).
"""
from fastapi import APIRouter, Request

from ..config import get_settings
from .. import db, security
from ..queries import fecha_hora

router = APIRouter(tags=["historial"])
S = get_settings().schema
_cfg = get_settings()


def _email(request: Request) -> str | None:
    tok = request.cookies.get(_cfg.session_cookie)
    u = security.read_session(tok) if tok else None
    return (u or {}).get("email")


@router.get("/historial")
async def historial(request: Request, limit: int = 50):
    lim = min(max(limit, 1), 200)
    sql = f"""
        SELECT e.id, e.fecha, e.accion, e.entidad, e.entidad_id, e.payload, e.usuario_id,
               trim(coalesce(p.nombres,'') || ' ' || coalesce(p.apellidos,'')) AS quien
          FROM {S}.core_evento e
          LEFT JOIN {S}.core_usuario u ON u.id = e.usuario_id
          LEFT JOIN {S}.core_persona  p ON p.id = u.persona_id
         WHERE (:email = '' OR e.usuario_id IS NULL OR u.email = :email)
         ORDER BY e.fecha DESC
         LIMIT :lim
    """
    try:
        filas = await db.fetch(sql, {"email": _email(request) or "", "lim": lim})
    except Exception:
        return []
    return [{
        "f": fecha_hora(r.get("fecha")),
        "tipo": r.get("accion") or "Evento",
        "txt": r.get("payload") or "",
        "entidad": r.get("entidad") or "",
        "quien": r.get("quien") or "",
    } for r in filas]
