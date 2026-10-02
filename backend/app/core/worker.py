"""
RAGTIME Worker — Configuration ARQ pour les tâches d'ingestion asynchrone lourde
"""

import asyncio
from typing import Any, Dict
from arq.connections import RedisSettings
from app.core.config import settings


async def process_document_ingestion(ctx: Dict[str, Any], document_id: str, tenant_id: str) -> Dict[str, Any]:
    """Tâche d'ingestion asynchrone d'un document (Extraction, Chunking, Embedding, Indexation)."""
    # Placeholder pour le worker ARQ réel
    await asyncio.sleep(0.1)
    return {"document_id": document_id, "tenant_id": tenant_id, "status": "completed"}


class WorkerSettings:
    functions = [process_document_ingestion]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 10
    poll_delay = 0.5
