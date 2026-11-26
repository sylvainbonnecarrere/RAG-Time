"""
RAGTIME Domain Ports — Exportation des contrats d'interfaces hexagonaux.
"""

from app.domain.ports.chunker import ChunkerPort, ChunkingStrategyEnum, RawChunk
from app.domain.ports.document_parser import DocumentParserPort, ExtractedDocument
from app.domain.ports.dry_run import (
    DryRunAnalysis,
    DryRunSimulatorPort,
    SemanticAudit,
    TokenHistogram,
    VramEstimation,
)
from app.domain.ports.hybrid_search import (
    HybridChunkResult,
    HybridSearchPort,
    compute_rrf_scores,
)
from app.domain.ports.llm_generator import LLMGenerationMetrics, LLMGeneratorPort
from app.domain.ports.reranker import (
    RerankedChunk,
    RerankerPort,
    calculate_top1_deltas,
    classify_thermal_status,
    format_citation_label,
)
from app.domain.ports.text_cleaner import CleaningResult, TextCleanerPort
from app.domain.ports.vector_storage import (
    EmbeddingModelPort,
    ScoredChunk,
    VectorStoragePort,
)

__all__ = [
    "ChunkerPort",
    "ChunkingStrategyEnum",
    "CleaningResult",
    "DocumentParserPort",
    "DryRunAnalysis",
    "DryRunSimulatorPort",
    "EmbeddingModelPort",
    "ExtractedDocument",
    "HybridChunkResult",
    "HybridSearchPort",
    "LLMGenerationMetrics",
    "LLMGeneratorPort",
    "RawChunk",
    "RerankedChunk",
    "RerankerPort",
    "ScoredChunk",
    "SemanticAudit",
    "TextCleanerPort",
    "TokenHistogram",
    "VectorStoragePort",
    "VramEstimation",
    "calculate_top1_deltas",
    "classify_thermal_status",
    "compute_rrf_scores",
    "format_citation_label",
]
