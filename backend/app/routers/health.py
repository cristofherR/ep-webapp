from fastapi import APIRouter
from .. import db

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok", "app": "EA WebApp MEL", "db": db.available()}
