"""
RAGTIME Domain — Port ChunkerPort & Dataclass RawChunk
Définit le contrat d'interface pour le partitionnement sémantique multi-stratégies
selon l'architecture hexagonale et les spécifications referenceChunkEmbed.md.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ChunkingStrategyEnum(StrEnum):
    FIXED_SLIDING = "fixed_sliding"
    SENTENCE_BOUNDARY = "sentence_boundary"
    MARKDOWN_AST = "markdown_ast"


@dataclass(frozen=True)
class RawChunk:
    """
    Représente un fragment textuel découpé, enrichi de ses métadonnées
    et de son empreinte cryptographique SHA-256.
    """
    chunk_index: int
    content: str
    sha256_hash: str
    token_count: int
    strategy_used: str
    context_prefix: str | None = None
    section_title: str | None = None
    char_start: int | None = None
    char_end: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class ChunkerPort(ABC):
    """
    Port Hexagonal pour le découpage de documents en fragments sémantiques.
    Garantit l'indépendance du domaine vis-à-vis des bibliothèques de segmentation.
    """

    @abstractmethod
    def chunk(
        self,
        text: str,
        strategy: str = ChunkingStrategyEnum.FIXED_SLIDING,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        prefix_section_title: bool = True,
        metadata: dict[str, Any] | None = None,
    ) -> list[RawChunk]:
        """
        Segmente le texte brut assaini selon la stratégie spécifiée.

        :param text: Texte brut normalisé (NFC, débarrassé des invisibles).
        :param strategy: 'fixed_sliding', 'sentence_boundary', ou 'markdown_ast'.
        :param chunk_size: Taille cible unitaire (en tokens ou mots selon la stratégie).
        :param chunk_overlap: Recouvrement entre chunks consécutifs (strictement < chunk_size / 2).
        :param prefix_section_title: Active l'injection du fil d'Ariane contextuel pour markdown_ast.
        :param metadata: Métadonnées documentaires additionnelles à propager dans chaque chunk.
        :return: Liste ordonnée de fragments `RawChunk` certifiés.
        """
