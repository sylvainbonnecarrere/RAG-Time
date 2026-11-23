"""
RAGTIME Worker & Queue — Gestionnaire d'ingestion asynchrone Redis / ARQ (US-BACK-04 & US-BACK-05)
Coordonne l'extraction, le nettoyage mécanique déterministe, le chunking multi-stratégies
et la persistance des fragments sous PostgreSQL pgvector avec RLS.
"""

import asyncio
import logging
import uuid
from typing import Any, ClassVar

from app.core.config import settings
from app.core.database import get_tenant_session
from app.infrastructure.rag.deterministic_cleaner import DeterministicCleanerAdapter
from app.infrastructure.rag.multi_strategy_chunker import MultiStrategyChunkerAdapter
from app.infrastructure.rag.trafilatura_extractor import TrafilaturaExtractorAdapter
from app.models.chunks import DocumentChunk
from app.models.documents import Document, DocumentVersion
from app.models.presets import RagPreset
from arq.connections import ArqRedis, RedisSettings, create_pool
from sqlalchemy import select, update

logger = logging.getLogger(__name__)


async def process_document_ingestion(
    ctx: dict[str, Any],
    document_id: str,
    version_id: str,
    tenant_id: str,
    raw_content: str | None = None,
    is_web_scrape: bool = False,
    source_url: str | None = None,
) -> dict[str, Any]:
    """
    Tâche worker ARQ d'ingestion documentaire complète :
    1. Extraction Trafilatura ou parsing direct
    2. Nettoyage mécanique déterministe (Unicode NFC, invisibles)
    3. Partitionnement sémantique selon le preset actif du tenant
    4. Insertion par lots dans document_chunks avec métadonnées JSONB et SHA-256
    5. Mise à jour de document_versions et documents
    """
    doc_uuid = uuid.UUID(document_id)
    ver_uuid = uuid.UUID(version_id)
    ten_uuid = uuid.UUID(tenant_id)

    logger.info(
        "Début du traitement ARQ pour doc=%s version=%s tenant=%s (scrape=%s)",
        document_id,
        version_id,
        tenant_id,
        is_web_scrape,
    )

    cleaner = DeterministicCleanerAdapter()
    chunker = MultiStrategyChunkerAdapter()

    extracted_text = ""
    doc_title = None

    # Étape 1 : Extraction du texte
    if is_web_scrape and source_url:
        extractor = TrafilaturaExtractorAdapter()
        if raw_content:
            extracted_doc = extractor.parse_html(raw_content, url=source_url)
        else:
            extracted_doc = extractor.parse_url(source_url)
        extracted_text = extracted_doc.text
        doc_title = extracted_doc.title
    else:
        extracted_text = raw_content or ""

    # Étape 2 : Nettoyage mécanique déterministe
    clean_result = cleaner.clean(extracted_text)
    cleaned_text = clean_result.cleaned_text

    async with get_tenant_session(ten_uuid) as session:
        # Récupération du preset actif pour le tenant
        stmt_preset = (
            select(RagPreset)
            .where(RagPreset.tenant_id == ten_uuid, RagPreset.is_active == True)
            .limit(1)
        )
        res_preset = await session.execute(stmt_preset)
        preset = res_preset.scalars().first()

        strategy = preset.chunking_strategy if preset else "fixed_sliding"
        chunk_size = preset.chunk_size if preset else 512
        chunk_overlap = preset.chunk_overlap if preset else 64
        prefix_titles = preset.prefix_section_title if preset else True

        # Étape 3 : Chunking multi-stratégies
        raw_chunks = chunker.chunk(
            text=cleaned_text,
            strategy=strategy,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            prefix_section_title=prefix_titles,
            metadata={"source_url": source_url} if source_url else {},
        )

        # Étape 4 : Création des entités DocumentChunk sous PostgreSQL
        # Pour le Jalon 2, vecteur zéro ou déterministe 768d avant le Jalon 3 (nomic-embed)
        zero_vector = [0.0] * 768

        db_chunks = []
        for rc in raw_chunks:
            db_chunk = DocumentChunk(
                document_id=doc_uuid,
                version_id=ver_uuid,
                tenant_id=ten_uuid,
                chunk_index=rc.chunk_index,
                content=rc.content,
                context_prefix=rc.context_prefix,
                strategy_used=rc.strategy_used,
                section_title=rc.section_title,
                sha256_hash=rc.sha256_hash,
                token_count=rc.token_count,
                embedding=zero_vector,
                chunk_metadata={
                    "char_start": rc.char_start,
                    "char_end": rc.char_end,
                    "clean_duration_ms": clean_result.duration_ms,
                    "strategy": rc.strategy_used,
                },
            )
            db_chunks.append(db_chunk)

        session.add_all(db_chunks)

        # Étape 5 : Mise à jour de document_versions et documents
        await session.execute(
            update(DocumentVersion)
            .where(DocumentVersion.id == ver_uuid)
            .values(
                status="indexed",
                chunks_count=len(db_chunks),
            )
        )

        doc_update_vals: dict[str, Any] = {
            "total_chunks": len(db_chunks),
            "cleaning_stats": {
                "original_length": clean_result.original_length,
                "cleaned_length": clean_result.cleaned_length,
                "removed_chars": clean_result.removed_chars,
                "duration_ms": clean_result.duration_ms,
            },
        }
        if doc_title:
            doc_update_vals["description"] = f"Titre extrait: {doc_title}"

        await session.execute(
            update(Document)
            .where(Document.id == doc_uuid)
            .values(**doc_update_vals)
        )

    logger.info(
        "Ingestion ARQ achevée avec succès : doc=%s, version=%s, %d chunks créés",
        document_id,
        version_id,
        len(db_chunks),
    )
    return {
        "document_id": document_id,
        "version_id": version_id,
        "chunks_count": len(db_chunks),
        "status": "completed",
    }


class IngestionQueueService:
    """
    Service d'enrôlement des jobs d'ingestion dans Redis / ARQ.
    Gère la tolérance aux pannes et le mode déconnecté pour les environnements de test.
    """

    _redis_pool: ArqRedis | None = None

    @classmethod
    async def get_pool(cls) -> ArqRedis | None:
        if cls._redis_pool is None:
            try:
                cls._redis_pool = await asyncio.wait_for(
                    create_pool(RedisSettings.from_dsn(settings.REDIS_URL)),
                    timeout=1.5,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Connexion Redis ARQ indisponible (%s). Mode asynchrone direct activé.", exc)
                return None
        return cls._redis_pool

    @classmethod
    async def enqueue_ingestion(
        cls,
        document_id: uuid.UUID,
        version_id: uuid.UUID,
        tenant_id: uuid.UUID,
        raw_content: str | None = None,
        is_web_scrape: bool = False,
        source_url: str | None = None,
    ) -> uuid.UUID:
        """
        Enrôle le job dans Redis si disponible, ou planifie la tâche en tâche de fond ASGI.
        Retourne un UUID unique identifiant le job.
        """
        job_id = uuid.uuid4()
        pool = await cls.get_pool()

        if pool:
            try:
                await pool.enqueue_job(
                    "process_document_ingestion",
                    str(document_id),
                    str(version_id),
                    str(tenant_id),
                    raw_content=raw_content,
                    is_web_scrape=is_web_scrape,
                    source_url=source_url,
                    _job_id=str(job_id),
                )
                logger.info("Job ARQ enrôlé dans Redis avec succès: job_id=%s", job_id)
                return job_id
            except Exception as exc:  # noqa: BLE001
                logger.warning("Échec enqueue_job Redis (%s). Exécution asynchrone locale.", exc)

        # Exécution locale asynchrone en arrière-plan sans bloquer l'appelant
        asyncio.create_task(
            process_document_ingestion(
                ctx={},
                document_id=str(document_id),
                version_id=str(version_id),
                tenant_id=str(tenant_id),
                raw_content=raw_content,
                is_web_scrape=is_web_scrape,
                source_url=source_url,
            )
        )
        return job_id


class WorkerSettings:
    functions: ClassVar[list] = [process_document_ingestion]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 10
    poll_delay = 0.5
