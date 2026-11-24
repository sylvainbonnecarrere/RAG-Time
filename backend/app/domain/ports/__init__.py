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
    "RawChunk",
    "ScoredChunk",
    "SemanticAudit",
    "TextCleanerPort",
    "TokenHistogram",
    "VectorStoragePort",
    "VramEstimation",
]
