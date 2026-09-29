"""Dependencias FastAPI: usuario actual y RBAC."""
from __future__ import annotations
from fastapi import Request, HTTPException

from .config import get_settings
from . import security

_cfg = get_settings()


def current_user(request: Request) -> dict:
    token = request.cookies.get(_cfg.session_cookie)
    data = security.read_session(token) if token else None
    if not data:
        raise HTTPException(status_code=401, detail="No autenticado")
    return data


def require(*roles: str):
    def dep(request: Request) -> dict:
        user = current_user(request)
        if roles and user.get("rol") not in roles:
            raise HTTPException(status_code=403, detail="Sin permiso")
        return user
    return dep
