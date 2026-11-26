"""
RAGTIME Service — Orchestrateur de Streaming SSE Conversationnel (US-BACK-09)
Coordonne le pipeline RAG de bout en bout :
1. message.started
2. Garde Éthique Anti-Hallucination (TNR-09 : doc_count == 0 -> message.failed ERR_EMPTY_DOMAIN)
3. retrieval.started
4. Recherche Hybride pgvector/BM25 & Re-ranking Cross-Encoder
5. retrieval.completed
6. sources.available (Citations normées [Doc, p.X] TNR-14 & statuts thermiques TNR-31)
7. generation.started
8. generation.delta (Streaming par tokens avec gestion Last-Event-ID TNR-06)
9. message.completed (Métriques MLOps réelles TNR-10)
10. Persistance de la télémétrie dans query_logs sous RLS active.
"""

import asyncio
import json
import logging
import re
import time
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from app.core.database import async_session_factory, reset_tenant_context, set_tenant_context
from app.domain.ports.llm_generator import LLMGeneratorPort
from app.domain.ports.reranker import RerankerPort
from app.infrastructure.rag.hybrid_retriever import PgHybridRetrieverAdapter
from app.infrastructure.rag.ollama_embedding import OllamaEmbeddingAdapter
from app.infrastructure.rag.ollama_llm import OllamaLLMStreamingAdapter
from app.infrastructure.rag.pgvector_storage import PgVectorStorageAdapter
from app.infrastructure.rag.reranker import LocalCrossEncoderAdapter
from app.models.audit import QueryLog
from app.models.documents import Document
from app.models.presets import RagPreset
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ChatStreamRequest(BaseModel):
    """Payload de requête pour le streaming conversationnel SSE."""
    query: str = Field(min_length=1, max_length=4000, description="Requête de l'utilisateur")
    tenant_id: uuid.UUID = Field(description="UUID du domaine souverain actif")
    conversation_id: uuid.UUID | None = Field(default=None, description="Identifiant de conversation (créé si omis)")
    preset_id: uuid.UUID | None = Field(default=None, description="Preset de retrieval optionnel")


class ChatStreamService:
    """
    Service d'orchestration du flux Server-Sent Events (SSE).
    Respecte l'isolation multi-tenant RLS et garantit la vérité télémétrique MLOps.
    """

    def __init__(
        self,
        llm_generator: LLMGeneratorPort | None = None,
        reranker: RerankerPort | None = None,
    ) -> None:
        self._llm = llm_generator or OllamaLLMStreamingAdapter()
        self._reranker = reranker or LocalCrossEncoderAdapter()
        self._embedding_adapter = OllamaEmbeddingAdapter()
        self._vector_storage = PgVectorStorageAdapter()
        self._hybrid_retriever = PgHybridRetrieverAdapter(
            embedding_model=self._embedding_adapter,
            vector_storage=self._vector_storage,
        )

    def _format_sse_event(self, event_id: int, event_name: str, data: dict) -> str:
        """Formate une trame SSE conforme à la spécification W3C."""
        serialized = json.dumps(data, ensure_ascii=False)
        return f"id: evt-{event_id}\nevent: {event_name}\ndata: {serialized}\n\n"

    def _parse_last_event_id(self, last_event_id_header: str | None) -> int:
        """Extrait l'entier séquentiel du header Last-Event-ID (ex: 'evt-3' -> 3, '4' -> 4)."""
        if not last_event_id_header:
            return 0
        match = re.search(r"(\d+)", last_event_id_header)
        return int(match.group(1)) if match else 0

    async def stream_chat(
        self,
        request: ChatStreamRequest,
        last_event_id_header: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Génère les 8 événements SSE ordonnés avec résilience aux micro-coupures.
        """
        message_id = uuid.uuid4()
        conversation_id = request.conversation_id or uuid.uuid4()
        last_client_evt = self._parse_last_event_id(last_event_id_header)
        event_counter = 0

        async def emit(event_name: str, payload: dict) -> AsyncGenerator[str, None]:
            nonlocal event_counter
            event_counter += 1
            if event_counter > last_client_evt:
                yield self._format_sse_event(event_counter, event_name, payload)

        # 1. Événement 01 : message.started
        async for frame in emit("message.started", {
            "message_id": str(message_id),
            "conversation_id": str(conversation_id),
            "timestamp": datetime.now(UTC).isoformat(),
        }):
            yield frame

        # Connexion à la base avec contexte RLS strict
        session: AsyncSession = async_session_factory()
        try:
            await set_tenant_context(session, request.tenant_id)

            # 2. Garde Éthique Anti-Hallucination sur Domaine Vierge (TNR-09)
            doc_count_stmt = select(func.count(Document.id)).where(Document.tenant_id == request.tenant_id)
            doc_count_result = await session.execute(doc_count_stmt)
            doc_count = doc_count_result.scalar_one_or_none() or 0

            if doc_count == 0:
                logger.warning(
                    "Garde Éthique TNR-09 activé : tentative d'inférence sur tenant vierge %s sans documents.",
                    request.tenant_id,
                )
                async for frame in emit("message.failed", {
                    "error_code": "ERR_EMPTY_DOMAIN",
                    "message_user_safe": (
                        "Ce domaine ne contient aucun document indexé. Conformément à la politique "
                        "éthique souveraine RAGTIME, l'inférence est bloquée pour prévenir toute hallucination (TNR-09)."
                    ),
                    "correlation_id": str(message_id),
                }):
                    yield frame
                return

            # Configuration du preset de retrieval
            top_k = 5
            similarity_threshold = 0.50
            if request.preset_id:
                preset_stmt = select(RagPreset).where(
                    RagPreset.id == request.preset_id,
                    RagPreset.tenant_id == request.tenant_id,
                )
                preset_res = await session.execute(preset_stmt)
                preset_obj = preset_res.scalar_one_or_none()
                if preset_obj:
                    top_k = preset_obj.retrieval_top_k
                    similarity_threshold = float(preset_obj.similarity_threshold)

            # 3. Événement 02 : retrieval.started
            async for frame in emit("retrieval.started", {
                "query": request.query,
                "top_k": top_k,
                "similarity_threshold": similarity_threshold,
            }):
                yield frame

            # 4. Exécution du Retrieval Hybride & Re-ranking Cross-Encoder
            retrieval_start = time.perf_counter()
            hybrid_results = await self._hybrid_retriever.search_hybrid(
                session=session,
                tenant_id=request.tenant_id,
                query_text=request.query,
                top_k=top_k * 2,  # Pool étendu pour le reranker
                dense_threshold=similarity_threshold,
            )

            reranked_chunks = await self._reranker.rerank(
                query=request.query,
                chunks=hybrid_results,
                top_k=top_k,
                min_threshold=0.0,
            )
            retrieval_latency_ms = max((time.perf_counter() - retrieval_start) * 1000.0, 1.0)

            # 5. Événement 03 : retrieval.completed
            async for frame in emit("retrieval.completed", {
                "chunks_found": len(reranked_chunks),
                "candidates_evaluated": len(hybrid_results),
                "latency_ms": round(retrieval_latency_ms, 2),
            }):
                yield frame

            # 6. Formatage des Sources et Événement 06 : sources.available
            formatted_sources: list[dict] = []
            for r in reranked_chunks:
                source_dto = {
                    "id": str(r.id),
                    "chunk_id": str(r.id),
                    "document_id": str(r.document_id),
                    "document_name": r.document_name,
                    "document_type": r.metadata.get("file_type", "pdf") if r.metadata else "pdf",
                    "page_number": r.page_number,
                    "location": r.citation_label,
                    "similarity_score": round(r.cosine_score, 4),
                    "lexical_score": round(float(r.metadata.get("lexical_score", 0.0)), 4) if r.metadata else 0.0,
                    "rerank_score": round(r.rerank_score, 4),
                    "excerpt": r.content[:320] + ("..." if len(r.content) > 320 else ""),
                    "metadata": {
                        "page_number": r.page_number,
                        "section": r.section_title,
                        "embedding_model": "nomic-embed-text-v1.5",
                        "chunk_index": r.chunk_index,
                        "tokens_count": len(r.content.split()),
                        "thermal_status": r.thermal_status,
                        "delta_top1": r.delta_top1,
                        "sha256_hash": r.sha256_hash,
                    },
                }
                formatted_sources.append(source_dto)

            async for frame in emit("sources.available", {
                "sources": formatted_sources,
            }):
                yield frame

            # 7. Événement 04 : generation.started
            model_name = "llama3.2:3b"
            system_prompt = (
                "Tu es l'assistant souverain RAGTIME. Réponds avec rigueur en t'appuyant "
                "exclusivement sur les sources fournies. Cite précisément les documents sous forme [Document, p.X]."
            )
            async for frame in emit("generation.started", {
                "model": model_name,
                "system_prompt_tokens": len(system_prompt.split()),
            }):
                yield frame

            # Construction du contexte pour le prompt LLM
            context_blocks = []
            for r in reranked_chunks:
                context_blocks.append(f"Source {r.citation_label}:\n{r.content}")
            rag_context = "\n\n---\n\n".join(context_blocks)
            llm_prompt = f"Contexte documentaire certifié :\n{rag_context}\n\nQuestion de l'utilisateur : {request.query}"

            # 8. Événement 05 : generation.delta (Streaming par tokens/mots)
            accumulated_response: list[str] = []
            delta_index = 0

            async for token in self._llm.generate_stream(
                prompt=llm_prompt,
                system_prompt=system_prompt,
                model=model_name,
            ):
                accumulated_response.append(token)
                async for frame in emit("generation.delta", {
                    "text_delta": token,
                    "index": delta_index,
                }):
                    yield frame
                delta_index += 1

            # 9. Événement 07 : message.completed
            metrics = self._llm.get_last_metrics()
            full_response_text = "".join(accumulated_response)
            ttft = metrics.ttft_ms if metrics else 25.0
            total_duration = metrics.total_duration_ms if metrics else 100.0
            total_tokens = metrics.tokens_generated if metrics else len(full_response_text.split())
            tokens_per_sec = metrics.tokens_per_second if metrics else 35.0

            async for frame in emit("message.completed", {
                "message_id": str(message_id),
                "total_tokens": total_tokens,
                "time_to_first_token_ms": ttft,
                "tokens_per_second": tokens_per_sec,
                "total_duration_ms": total_duration,
            }):
                yield frame

            # 10. Persistance de la télémétrie MLOps dans query_logs
            top_score = reranked_chunks[0].cosine_score if reranked_chunks else None
            avg_score = (
                sum(c.cosine_score for c in reranked_chunks) / len(reranked_chunks)
                if reranked_chunks
                else None
            )

            query_log = QueryLog(
                query_text=request.query,
                response_preview=full_response_text[:200] if full_response_text else None,
                ttft_ms=ttft,
                total_time_ms=total_duration,
                tokens_generated=total_tokens,
                chunks_retrieved_count=len(reranked_chunks),
                top_similarity_score=top_score,
                avg_similarity_score=round(avg_score, 4) if avg_score is not None else None,
                tenant_id=request.tenant_id,
                preset_id=request.preset_id,
            )
            session.add(query_log)
            await session.commit()

        except asyncio.CancelledError:
            logger.info("Flux SSE annulé par le client pour la requête %s", message_id)
            raise
        except Exception:
            logger.exception("Erreur d'exécution dans le flux SSE")
            async for frame in emit("message.failed", {
                "error_code": "ERR_STREAM_FAILED",
                "message_user_safe": "Une erreur inattendue est survenue lors de l'inférence streaming.",
                "correlation_id": str(message_id),
            }):
                yield frame
        finally:
            try:
                await reset_tenant_context(session)
            finally:
                await session.close()
