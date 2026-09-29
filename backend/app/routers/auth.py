from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel

from ..config import get_settings
from .. import security
from ..deps import current_user

router = APIRouter(prefix="/auth", tags=["auth"])
_cfg = get_settings()


class LoginIn(BaseModel):
    email: str
    password: str
    remember: bool = False


@router.post("/login")
async def login(body: LoginIn, response: Response):
    email = (body.email or "").strip().lower()
    seg = security.bloqueado(email)
    if seg > 0:
        raise HTTPException(status_code=429, detail=f"Bloqueado. Reintenta en {seg//60+1} min.")
    user = await security.get_user(email)
    if not user or not security.verify_password(user.get("hash"), body.password):
        restantes = security.registrar_fallo(email)
        raise HTTPException(status_code=401, detail=f"Credenciales incorrectas. Intentos restantes: {restantes}.")
    security.limpiar_intentos(email)
    data = {"email": user["email"], "nombre": user["nombre"], "rol": user["rol"],
            "rol_codigo": user.get("rol_codigo", "")}
    token = security.make_session(data)
    max_age = _cfg.session_max_age if body.remember else None
    response.set_cookie(_cfg.session_cookie, token, httponly=True, samesite="lax", max_age=max_age, path="/")
    return data


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(_cfg.session_cookie, path="/")
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    return current_user(request)
