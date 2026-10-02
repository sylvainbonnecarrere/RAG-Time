"""
RAGTIME Backend — Configuration Applicative via Pydantic Settings
Charge les variables d'environnement depuis le fichier .env ou les variables système.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Applicatif
    RAGTIME_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "default-insecure-secret-key-replace-in-env"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Backend Gateway
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Base de données PostgreSQL + pgvector
    DATABASE_URL: str = "postgresql+asyncpg://ragtime:ragtime_local_db_secret_pass@localhost:5432/ragtime_db"

    # Redis & ARQ Worker
    REDIS_URL: str = "redis://localhost:6379/0"

    # Ollama Local
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_LLM_MODEL: str = "llama3.2:3b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    OLLAMA_REQUEST_TIMEOUT_SECONDS: int = 120

    # Observabilité Prometheus
    PROMETHEUS_METRICS_ENABLED: bool = True
    PROMETHEUS_METRICS_PATH: str = "/metrics"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
