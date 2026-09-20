from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    database_url: str = "postgresql+psycopg://dds:dds@localhost:5432/dds"
    jwt_secret: str
    token_minutes: int = 480
    ml_mode: str = "mock"
    ml_url: str = "http://localhost:8090"
    ml_timeout: float = 5.0
    demo_password: str = "DdsDemo2026!"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


settings = Settings()
if len(settings.jwt_secret) < 32:
    raise ValueError("JWT_SECRET must contain at least 32 characters")
