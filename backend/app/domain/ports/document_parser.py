"""
RAGTIME Domain Ports — Contrat d'Extraction Documentaire Structurée (US-IA-01)
Architecture Hexagonale : Port Secondaire Driven pour l'ingestion multi-formats.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ExtractedDocument:
    """Représentation canonique du document extrait avant assainissement et chunking."""

    text: str
    markdown: str
    title: str = "Document sans titre"
    author: str | None = None
    date: str | None = None
    language: str | None = None
    source_url: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_empty(self) -> bool:
        """Indique si l'extraction n'a produit aucun texte exploitable."""
        return not self.text or not self.text.strip()


class DocumentParserPort(ABC):
    """Port hexagonal pour les adaptateurs d'extraction de contenu (Trafilatura, PyMuPDF, etc.)."""

    @abstractmethod
    def parse_html(self, html_content: str, *, favor_precision: bool = True) -> ExtractedDocument:
        """Extrait le contenu principal depuis une chaîne de caractères HTML."""
        ...

    @abstractmethod
    def parse_url(self, url: str, *, favor_precision: bool = True) -> ExtractedDocument:
        """
        Extrait le contenu principal depuis une URL web.
        Doit garantir le confinement réseau et la protection anti-SSRF préalable.
        """
        ...

