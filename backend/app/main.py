"""
RAGTIME Sovereign Backend — Passerelle API REST, Streaming SSE & Observabilité Prometheus
"""

from contextlib import asynccontextmanager

import httpx
import redis.asyncio as aioredis
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import TenantContextMiddleware, engine
from app.core.metrics import get_latest_metrics, update_service_health
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarrage de l'application
    update_service_health("fastapi", True)
    yield
    # Arrêt propre
    update_service_health("fastapi", False)


app = FastAPI(
    title="RAGTIME API",
    description="Plateforme RAG Souveraine & On-Premise (Beat & Pgvector)",
    version="1.0.0",
    lifespan=lifespan,
)

# Enregistrement des middlewares
app.add_middleware(TenantContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Branchement des routeurs applicatifs
app.include_router(api_v1_router)


@app.get("/")
async def root():
    return {
        "app": "RAGTIME",
        "status": "operational",
        "version": "1.0.0",
        "environment": settings.RAGTIME_ENV,
    }


@app.get("/health")
async def health_check():
    """Vérification dynamique de l'état de santé effectif des 4 briques socles."""
    services = {
        "fastapi": "healthy",
        "postgres_pgvector": "unreachable",
        "redis_arq": "unreachable",
        "ollama_engine": "unreachable",
    }
    
    # 1. Probe Ollama
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                services["ollama_engine"] = "healthy"
                update_service_health("ollama_engine", True)
            else:
                services["ollama_engine"] = "degraded"
                update_service_health("ollama_engine", False)
    except (httpx.HTTPError, OSError):
        services["ollama_engine"] = "unreachable"
        update_service_health("ollama_engine", False)

    # 2. Probe PostgreSQL + pgvector
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1;"))
        services["postgres_pgvector"] = "healthy"
        update_service_health("postgres_pgvector", True)
    except (SQLAlchemyError, OSError):
        services["postgres_pgvector"] = "unreachable"
        update_service_health("postgres_pgvector", False)

    # 3. Probe Redis
    try:
        r_client = aioredis.from_url(settings.REDIS_URL, socket_timeout=2.0)
        pong = await r_client.ping()
        if pong:
            services["redis_arq"] = "healthy"
            update_service_health("redis_arq", True)
        else:
            services["redis_arq"] = "degraded"
            update_service_health("redis_arq", False)
        await r_client.aclose()
    except (aioredis.RedisError, OSError):
        services["redis_arq"] = "unreachable"
        update_service_health("redis_arq", False)

    all_healthy = all(status == "healthy" for status in services.values())
    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": services,
    }


@app.get("/metrics")
async def prometheus_metrics():
    """Endpoint standard de scraping Prometheus."""
    metrics_data, content_type = get_latest_metrics()
    return Response(content=metrics_data, media_type=content_type)
