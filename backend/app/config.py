"""Configuración de la WebApp MEL · Efecto Áncash (Pydantic Settings)."""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="EA_", extra="ignore")

    app_name: str = "EA WebApp MEL"
    debug: bool = False

    # Base de datos (schema efectoancash). Déjalo vacío para correr sin BD (modo UI).
    database_url: str = ""          # postgresql+asyncpg://user:pass@host:5432/mi_base
    schema: str = "efectoancash"

    # Auth
    secret_key: str = "cambiame-en-produccion"
    session_cookie: str = "ea_sesion"
    session_max_age: int = 60 * 60 * 24 * 30      # 30 días
    max_intentos: int = 5
    bloqueo_min: int = 15

    @property
    def frontend_dir(self) -> Path:
        return Path(__file__).resolve().parents[2] / "frontend"


@lru_cache
def get_settings() -> Settings:
    return Settings()
