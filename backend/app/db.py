"""Acceso a datos. Usa SQLAlchemy async; si no hay DATABASE_URL, la app corre sin BD."""
from __future__ import annotations
import logging
from typing import Any, Optional

log = logging.getLogger("ea.db")

_engine = None
_sessionmaker = None
_available = False


def init(config) -> None:
    """Inicializa el engine async. Silencioso si no hay cadena de conexión."""
    global _engine, _sessionmaker, _available
    if not config.database_url:
        log.warning("DB no configurada (EA_DATABASE_URL vacío) → modo UI sin datos.")
        return
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        _engine = create_async_engine(config.database_url, pool_pre_ping=True, pool_size=5, max_overflow=5)
        _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False)
        _available = True
        log.info("DB configurada: %s", _mask(config.database_url))
    except Exception as e:  # pragma: no cover
        log.error("No se pudo inicializar la DB: %s", e)


def available() -> bool:
    return _available


async def fetch(sql: str, params: Optional[dict[str, Any]] = None,
                commit: bool = False) -> list[dict]:
    """Ejecuta un SELECT y devuelve filas como dicts. Lanza si la BD no está disponible.

    `commit=True` para INSERT/UPDATE ... RETURNING: sin él la sesión se cierra sin
    confirmar y el cambio se pierde (bug detectado en POST /reportes).
    """
    from sqlalchemy import text
    if not _available:
        raise RuntimeError("Base de datos no disponible")
    async with _sessionmaker() as s:  # type: ignore[misc]
        res = await s.execute(text(sql), params or {})
        filas = [dict(r._mapping) for r in res.fetchall()]
        if commit:
            await s.commit()
        return filas


async def execute(sql: str, params: Optional[dict[str, Any]] = None) -> Any:
    """Ejecuta un INSERT/UPDATE/DELETE (con RETURNING opcional)."""
    from sqlalchemy import text
    if not _available:
        raise RuntimeError("Base de datos no disponible")
    async with _sessionmaker() as s:  # type: ignore[misc]
        res = await s.execute(text(sql), params or {})
        await s.commit()
        return getattr(res, "rowcount", None)


def _mask(url: str) -> str:
    import re
    return re.sub(r"://([^:]+):[^@]+@", r"://\1:***@", url)
