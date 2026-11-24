"""
RAGTIME Infrastructure — Adaptateur de Recherche Hybride Dense/Sparse & Fusion RRF (US-IA-05)
Combine la recherche vectorielle sémantique pgvector HNSW (768d nomic-embed) et la
recherche textuelle lexicale PostgreSQL BM25 (tsvector/ts_rank_cd) via la fusion RRF k=60.
"""

import json
import logging
import uuid
from typing import Any

from app.domain.ports.hybrid_search import (
    HybridChunkResult,
    HybridSearchPort,
    compute_rrf_scores,
)
from app.domain.ports.vector_storage import EmbeddingModelPort, VectorStoragePort
from app.infrastructure.rag.pgvector_storage import PgVectorStorageAdapter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class PgHybridRetrieverAdapter(HybridSearchPort):
    """
    Adaptateur d'infrastructure pour la recherche hybride dense/sparse sous PostgreSQL 16.
    Garantit l'herméticité multi-tenant RLS et la résilience face aux erreurs lexicales.
    """

    def __init__(
        self,
        embedding_model: EmbeddingModelPort,
        vector_storage: VectorStoragePort | None = None,
    ) -> None:
        self._embedding_model = embedding_model
        self._vector_storage = vector_storage or PgVectorStorageAdapter()

    async def search_hybrid(
        self,
        session: AsyncSession,
        tenant_id: uuid.UUID,
        query_text: str,
        query_vector: list[float] | None = None,
        top_k: int = 5,
        k_constant: int = 60,
        dense_threshold: float = 0.5,
        dense_limit: int = 20,
        sparse_limit: int = 20,
        dense_weight: float = 1.0,
        sparse_weight: float = 1.0,
    ) -> list[HybridChunkResult]:
        """
        Exécute la recherche hybride :
        1. Évaluation et normalisation de la requête textuelle
        2. Recherche vectorielle sémantique dense (pgvector HNSW)
        3. Recherche lexicale clairsemée (PostgreSQL BM25 / tsvector)
        4. Fusion réciproque de rangs RRF (k=60)
        5. Tri descendant, attribution des rangs finaux et limitation à top_k
        """
        clean_query = query_text.strip() if query_text else ""
        if not clean_query:
            return []

        # 1. Calcul ou réutilisation du vecteur dense d'embedding
        if query_vector is None:
            query_vector = await self._embedding_model.embed_text(clean_query)

        # 2. Exécution de la recherche dense sémantique (pgvector)
        dense_raw_chunks = await self._execute_dense_search(
            session=session,
            tenant_id=tenant_id,
            query_vector=query_vector,
            threshold=dense_threshold,
            limit=dense_limit,
        )

        # 3. Exécution de la recherche lexicale clairsemée (FTS tsvector / BM25)
        sparse_raw_chunks = await self._execute_sparse_search(
            session=session,
            tenant_id=tenant_id,
            query_text=clean_query,
            limit=sparse_limit,
        )

        dense_ranked_ids = [c["id"] for c in dense_raw_chunks]
        sparse_ranked_ids = [c["id"] for c in sparse_raw_chunks]

        # 4. Calcul des scores RRF
        rrf_scores = compute_rrf_scores(
            dense_ranked_ids=dense_ranked_ids,
            sparse_ranked_ids=sparse_ranked_ids,
            k=k_constant,
            dense_weight=dense_weight,
            sparse_weight=sparse_weight,
        )

        # 5. Réconciliation des métadonnées et construction des résultats
        candidates_map: dict[uuid.UUID, dict[str, Any]] = {}
        dense_rank_map = {cid: idx + 1 for idx, cid in enumerate(dense_ranked_ids)}
        sparse_rank_map = {cid: idx + 1 for idx, cid in enumerate(sparse_ranked_ids)}

        for c in dense_raw_chunks:
            cid = c["id"]
            candidates_map[cid] = c

        for c in sparse_raw_chunks:
            cid = c["id"]
            if cid not in candidates_map:
                candidates_map[cid] = c
            else:
                # Enrichissement avec le score sparse
                candidates_map[cid]["sparse_score"] = c.get("sparse_score")

        # Tri par score RRF décroissant
        sorted_candidates = sorted(
            candidates_map.values(),
            key=lambda item: rrf_scores.get(item["id"], 0.0),
            reverse=True,
        )

        results: list[HybridChunkResult] = []
        for final_idx, item in enumerate(sorted_candidates[:top_k], start=1):
            cid = item["id"]
            raw_meta = item.get("metadata", {})
            if isinstance(raw_meta, str):
                try:
                    meta_dict = json.loads(raw_meta)
                except Exception:  # noqa: BLE001
                    meta_dict = {}
            elif isinstance(raw_meta, dict):
                meta_dict = raw_meta
            else:
                meta_dict = {}

            results.append(
                HybridChunkResult(
                    id=cid,
                    document_id=item["document_id"],
                    version_id=item["version_id"],
                    chunk_index=item["chunk_index"],
                    content=item["content"],
                    context_prefix=item.get("context_prefix"),
                    section_title=item.get("section_title"),
                    sha256_hash=item.get("sha256_hash", ""),
                    token_count=item.get("token_count", 0),
                    page_number=item.get("page_number"),
                    metadata=meta_dict,
                    dense_rank=dense_rank_map.get(cid),
                    sparse_rank=sparse_rank_map.get(cid),
                    dense_similarity=item.get("dense_similarity"),
                    sparse_score=item.get("sparse_score"),
                    rrf_score=round(rrf_scores.get(cid, 0.0), 6),
                    final_rank=final_idx,
                )
            )

        return results

    async def _execute_dense_search(
        self,
        session: AsyncSession,
        tenant_id: uuid.UUID,
        query_vector: list[float],
        threshold: float,
        limit: int,
    ) -> list[dict[str, Any]]:
        """Interroge l'index HNSW pgvector avec calcul de similarité cosinus."""
        try:
            await session.execute(text("SET LOCAL hnsw.ef_search = 64;"))
        except Exception as exc:  # noqa: BLE001
            logger.debug("SET LOCAL hnsw.ef_search non supporté : %s", exc)

        query = text("""
            SELECT 
                id,
                document_id,
                version_id,
                chunk_index,
                content,
                context_prefix,
                section_title,
                sha256_hash,
                token_count,
                page_number,
                metadata,
                (1.0 - (embedding <=> CAST(:vector AS vector))) AS similarity
            FROM document_chunks
            WHERE tenant_id = :tenant_id
              AND (1.0 - (embedding <=> CAST(:vector AS vector))) >= :threshold
            ORDER BY embedding <=> CAST(:vector AS vector) ASC
            LIMIT :limit;
        """)

        vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"
        result = await session.execute(
            query,
            {
                "vector": vector_str,
                "tenant_id": tenant_id,
                "threshold": threshold,
                "limit": limit,
            },
        )
        rows = result.fetchall()
        chunks: list[dict[str, Any]] = []
        for r in rows:
            chunks.append({
                "id": r.id,
                "document_id": r.document_id,
                "version_id": r.version_id,
                "chunk_index": r.chunk_index,
                "content": r.content,
                "context_prefix": r.context_prefix,
                "section_title": r.section_title,
                "sha256_hash": r.sha256_hash,
                "token_count": r.token_count,
                "page_number": r.page_number,
                "metadata": r.metadata,
                "dense_similarity": round(float(r.similarity), 4),
            })
        return chunks

    async def _execute_sparse_search(
        self,
        session: AsyncSession,
        tenant_id: uuid.UUID,
        query_text: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        """
        Interroge PostgreSQL Full-Text Search (BM25 lexical).
        Combine le dictionnaire 'french' (lemmatisation) et 'simple' (codes techniques, UUIDs, sigles)
        avec transformation disjonctive (OR) pour repêcher les termes exacts au sein d'une question.
        """
        query = text("""
            WITH parsed_query AS (
                SELECT 
                    replace(plainto_tsquery('french', :query)::text, ' & ', ' | ')::tsquery AS q_fr,
                    replace(plainto_tsquery('simple', :query)::text, ' & ', ' | ')::tsquery AS q_si
            )
            SELECT 
                c.id,
                c.document_id,
                c.version_id,
                c.chunk_index,
                c.content,
                c.context_prefix,
                c.section_title,
                c.sha256_hash,
                c.token_count,
                c.page_number,
                c.metadata,
                GREATEST(
                    ts_rank_cd(to_tsvector('french', c.content), pq.q_fr),
                    ts_rank_cd(to_tsvector('simple', c.content), pq.q_si)
                ) AS lexical_rank
            FROM document_chunks c, parsed_query pq
            WHERE c.tenant_id = :tenant_id
              AND (
                  (pq.q_fr != ''::tsquery AND to_tsvector('french', c.content) @@ pq.q_fr)
                  OR (pq.q_si != ''::tsquery AND to_tsvector('simple', c.content) @@ pq.q_si)
              )
            ORDER BY lexical_rank DESC
            LIMIT :limit;
        """)

        try:
            result = await session.execute(
                query,
                {
                    "tenant_id": tenant_id,
                    "query": query_text,
                    "limit": limit,
                },
            )
            rows = result.fetchall()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Erreur lors de la recherche lexicale FTS : %s", exc)
            return []

        chunks: list[dict[str, Any]] = []
        for r in rows:
            chunks.append({
                "id": r.id,
                "document_id": r.document_id,
                "version_id": r.version_id,
                "chunk_index": r.chunk_index,
                "content": r.content,
                "context_prefix": r.context_prefix,
                "section_title": r.section_title,
                "sha256_hash": r.sha256_hash,
                "token_count": r.token_count,
                "page_number": r.page_number,
                "metadata": r.metadata,
                "sparse_score": round(float(r.lexical_rank), 4),
            })
        return chunks
