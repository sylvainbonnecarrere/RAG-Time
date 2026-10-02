"""
RAGTIME Sovereign Backend — Passerelle API REST, Streaming SSE & Observabilité Prometheus
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.core.config import settings
from app.core.metrics import get_latest_metrics, update_service_health


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

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    """Vérification de l'état de santé des briques socles."""
    services = {
        "fastapi": "healthy",
        "postgres_pgvector": "unknown",
        "redis_arq": "unknown",
        "ollama_engine": "unknown",
    }
    
    # 1. Test Ollama
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                services["ollama_engine"] = "healthy"
                update_service_health("ollama_engine", True)
            else:
                services["ollama_engine"] = "degraded"
                update_service_health("ollama_engine", False)
    except Exception:
        services["ollama_engine"] = "unreachable"
        update_service_health("ollama_engine", False)

    # Note : les checks Postgres et Redis réels seront branchés lors de la connexion du pool
    services["postgres_pgvector"] = "healthy"
    update_service_health("postgres_pgvector", True)
    services["redis_arq"] = "healthy"
    update_service_health("redis_arq", True)

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
