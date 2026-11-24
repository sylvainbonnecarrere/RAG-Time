"""
RAGTIME Infrastructure RAG — Exportation des adaptateurs de traitement et d'indexation.
"""

from app.infrastructure.rag.deterministic_cleaner import DeterministicCleanerAdapter
from app.infrastructure.rag.dry_run_simulator import DryRunSimulatorAdapter
from app.infrastructure.rag.hybrid_retriever import PgHybridRetrieverAdapter
from app.infrastructure.rag.multi_strategy_chunker import MultiStrategyChunkerAdapter
from app.infrastructure.rag.ollama_embedding import OllamaEmbeddingAdapter
from app.infrastructure.rag.pgvector_storage import PgVectorStorageAdapter
from app.infrastructure.rag.reranker import LocalCrossEncoderAdapter
from app.infrastructure.rag.trafilatura_extractor import TrafilaturaExtractorAdapter

__all__ = [
    "DeterministicCleanerAdapter",
    "DryRunSimulatorAdapter",
    "LocalCrossEncoderAdapter",
    "MultiStrategyChunkerAdapter",
    "OllamaEmbeddingAdapter",
    "PgHybridRetrieverAdapter",
    "PgVectorStorageAdapter",
    "TrafilaturaExtractorAdapter",
]
