"""Seguridad: hash, sesión firmada y control de intentos (5 → bloqueo 15 min)."""
from __future__ import annotations
import hashlib, time
from typing import Optional
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from .config import get_settings
from . import db

_cfg = get_settings()
_S = _cfg.schema
_serializer = URLSafeTimedSerializer(_cfg.secret_key, salt="ea-session")


def sha256(txt: str) -> str:
    return hashlib.sha256(txt.encode("utf-8")).hexdigest()


def make_session(payload: dict) -> str:
    return _serializer.dumps(payload)


def read_session(token: str) -> Optional[dict]:
    try:
        return _serializer.loads(token, max_age=_cfg.session_max_age)
    except (BadSignature, SignatureExpired):
        return None


# --- Usuarios: enlazados a la BD Azure (schema efectoancash) ---
# nombre = nombres + " " + apellidos (core_persona); rol = core_rol.nombre.
# NO hardcodeado: cualquier cuenta de efectoancash.core_usuario puede autenticarse.
_SQL_USER = f"""
    select u.email,
           u.activo,
           u.hash_clave,
           trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')) as nombre,
           r.codigo as rol_codigo,
           r.nombre as rol
      from {_S}.core_usuario u
      left join {_S}.core_persona p on p.id = u.persona_id
      left join {_S}.core_rol     r on r.id = u.rol_id
     where lower(u.email) = lower(:email)
     limit 1
"""


def verify_password(stored: Optional[str], given: str) -> bool:
    """Valida la clave contra hash_clave.
    - "demo:<clave>": comparación en claro (cuentas de puesta en marcha).
    - 64 hex: sha256(given).
    """
    if not stored:
        return False
    if stored.startswith("demo:"):
        return stored[5:] == given
    return sha256(given) == stored


async def get_user(email: str) -> Optional[dict]:
    """Busca la cuenta en efectoancash.core_usuario (email + persona + rol)."""
    try:
        rows = await db.fetch(_SQL_USER, {"email": (email or "").strip()})
    except Exception:
        return None          # BD no disponible → sin autenticación
    if not rows:
        return None
    r = rows[0]
    if r.get("activo") is False:
        return None
    nombre = (r.get("nombre") or "").strip() or r.get("email")
    return {
        "email": r["email"],
        "nombre": nombre,
        "rol": r.get("rol") or "",
        "rol_codigo": r.get("rol_codigo") or "",
        "hash": r.get("hash_clave"),
    }


# --- Intentos fallidos por (email) ---
_intentos: dict[str, list[float]] = {}


def bloqueado(email: str) -> int:
    """Segundos restantes de bloqueo (0 si no está bloqueado)."""
    now = time.time()
    fallos = [t for t in _intentos.get(email, []) if now - t < _cfg.bloqueo_min * 60]
    _intentos[email] = fallos
    if len(fallos) >= _cfg.max_intentos:
        return int(_cfg.bloqueo_min * 60 - (now - fallos[0]))
    return 0


def registrar_fallo(email: str) -> int:
    _intentos.setdefault(email, []).append(time.time())
    restantes = max(0, _cfg.max_intentos - len(_intentos[email]))
    return restantes


def limpiar_intentos(email: str) -> None:
    _intentos.pop(email, None)
