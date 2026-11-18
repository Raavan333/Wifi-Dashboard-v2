from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_env_files() -> tuple[str, ...]:
    root_env = Path(__file__).resolve().parents[2] / ".env"
    backend_env = Path(__file__).resolve().parents[1] / ".env"
    return (str(root_env), str(backend_env), ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_NAME: str = "WiFi Observability & Investigation Platform"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "production"
    LOG_LEVEL: str = "INFO"

    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "wifi_analytics"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASS: str = ""

    DB_MIN_CONNECTIONS: int = Field(default=5, ge=1)
    DB_MAX_CONNECTIONS: int = Field(default=25, ge=1)
    QUERY_TIMEOUT_SECONDS: float = Field(default=30.0, gt=0)
    DB_STATEMENT_CACHE_SIZE: int = Field(default=256, ge=0)

    CACHE_TTL_SECONDS: int = Field(default=300, ge=1)
    CACHE_MAX_SIZE: int = Field(default=1024, ge=1)
    DEFAULT_PAGE_SIZE: int = Field(default=50, ge=1, le=500)
    MAX_PAGE_SIZE: int = Field(default=500, ge=1, le=500)

    CORS_ORIGINS: str = "*"

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        return value.upper()

    @property
    def cors_origins_list(self) -> List[str]:
        raw = self.CORS_ORIGINS.strip()
        if not raw or raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
