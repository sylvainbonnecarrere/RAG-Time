"""
RAGTIME Infrastructure — Adaptateur PgVectorStorageAdapter (US-IA-04)
Exécute les requêtes de recherche de similarité cosinus indexées en HNSW
sous PostgreSQL 16 pgvector dans le respect strict des politiques RLS tenant.
"""

import uuid

from app.domain.ports.vector_storage import ScoredChunk, VectorStoragePort
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class PgVectorStorageAdapter(VectorStoragePort):
    """
    Adaptateur pour la recherche vectorielle K-NN pgvector HNSW.
    """

    async def search_similar(
        self,
        session: AsyncSession,
        tenant_id: uuid.UUID,
        query_vector: list[float],
        top_k: int = 5,
        threshold: float = 0.5,
    ) -> list[ScoredChunk]:
        """
        Exécute la recherche de distance cosinus <=> indexée en HNSW sur document_chunks.
        Filtre par tenant_id et seuil de similarité minimal (threshold).
        """
        # Format pgvector littéral : '[0.123, -0.456, ...]'
        vec_literal = "[" + ",".join(str(round(v, 6)) for v in query_vector) + "]"

        # Optimisation session HNSW pour PostgreSQL
        await session.execute(text("SET LOCAL hnsw.ef_search = 64;"))

        # Requête SQL directe avec opérateur de distance cosinus <=>
        # cosine_distance in [0, 2] -> similarity = 1.0 - cosine_distance
        sql = text("""
            SELECT 
                id,
                document_id,
                chunk_index,
                content,
                context_prefix,
                section_title,
                sha256_hash,
                metadata,
                (embedding <=> CAST(:query_vec AS vector)) AS cosine_distance,
                (1.0 - (embedding <=> CAST(:query_vec AS vector))) AS similarity_score
            FROM document_chunks
            WHERE tenant_id = :tenant_id
              AND (1.0 - (embedding <=> CAST(:query_vec AS vector))) >= :threshold
            ORDER BY embedding <=> CAST(:query_vec AS vector) ASC
            LIMIT :top_k;
        """)

        result = await session.execute(
            sql,
            {
                "query_vec": vec_literal,
                "tenant_id": str(tenant_id),
                "threshold": float(threshold),
                "top_k": int(top_k),
            },
        )
        rows = result.fetchall()

        scored_chunks: list[ScoredChunk] = []
        for rank, row in enumerate(rows, start=1):
            sim_score = float(row.similarity_score)
            cos_dist = float(row.cosine_distance)

            scored = ScoredChunk(
                id=row.id,
                document_id=row.document_id,
                chunk_index=row.chunk_index,
                content=row.content,
                similarity_score=round(sim_score, 4),
                cosine_distance=round(cos_dist, 4),
                context_prefix=row.context_prefix,
                section_title=row.section_title,
                sha256_hash=row.sha256_hash.strip() if row.sha256_hash else "",
                metadata=dict(row.metadata or {}),
                rank=rank,
            )
            scored_chunks.append(scored)

        return scored_chunks
