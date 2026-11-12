"""
RAGTIME Infrastructure Adapter — Extraction Web Trafilatura 2.0 (US-IA-01 & TNR-26)
Conformité stricte referenceChunkEmbed.md, Écran 2 Ingestion, et confinement anti-SSRF.
"""

import json
from typing import Any

import trafilatura
from app.core.security import assert_url_safe
from app.domain.ports.document_parser import DocumentParserPort, ExtractedDocument


class TrafilaturaExtractorAdapter(DocumentParserPort):
    """
    Adaptateur d'infrastructure pour l'extraction de contenu web et HTML via Trafilatura 2.0.
    Garantit l'élimination du boilerplate, la préservation des tables Markdown,
    et le confinement réseau anti-SSRF.
    """

    def parse_html(self, html_content: str, *, favor_precision: bool = True) -> ExtractedDocument:
        """
        Extrait le contenu propre, les tableaux Markdown et les métadonnées depuis du HTML.
        En RAG souverain, favor_precision=True est actif par défaut pour éliminer les bruits.
        """
        if not html_content or not html_content.strip():
            return ExtractedDocument(text="", markdown="")

        # 1. Extraction structurée JSON avec métadonnées
        raw_json = trafilatura.extract(
            html_content,
            output_format="json",
            with_metadata=True,
            favor_precision=favor_precision,
        )

        # 2. Extraction Markdown pour préserver les tableaux tabulaires et la structure
        extracted_markdown = (
            trafilatura.extract(
                html_content,
                output_format="markdown",
                with_metadata=False,
                favor_precision=favor_precision,
            )
            or ""
        )

        if not raw_json:
            # Fallback direct si l'extraction JSON échoue mais que le Markdown contient du texte
            text_fallback = extracted_markdown.strip()
            return ExtractedDocument(
                text=text_fallback,
                markdown=extracted_markdown,
            )

        try:
            data: dict[str, Any] = json.loads(raw_json)
        except (json.JSONDecodeError, TypeError):
            data = {}

        title = data.get("title") or "Document sans titre"
        author = data.get("author")
        date = data.get("date")
        language = data.get("language")
        text = data.get("text") or extracted_markdown

        # Métadonnées annexes stockées de manière transparente
        metadata: dict[str, Any] = {
            "fingerprint": data.get("fingerprint"),
            "filedate": data.get("filedate"),
            "sitename": data.get("sitename") or data.get("source-hostname"),
            "description": data.get("description"),
            "categories": data.get("categories"),
            "tags": data.get("tags"),
        }
        # Purge des entrées None ou vides pour alléger le JSONB
        metadata = {k: v for k, v in metadata.items() if v}

        return ExtractedDocument(
            text=text,
            markdown=extracted_markdown,
            title=title,
            author=author,
            date=date,
            language=language,
            metadata=metadata,
        )

    def parse_url(self, url: str, *, favor_precision: bool = True) -> ExtractedDocument:
        """
        Extrait le contenu principal depuis une URL web distante.
        Garde-fou Bloquant : Interdit tout appel réseau si l'URL ne satisfait pas assert_url_safe.
        """
        # 1. Confinement réseau strict & Détection Anti-SSRF (TNR-26 / US-SEC-04)
        assert_url_safe(url)

        # 2. Récupération sécurisée du contenu HTML
        downloaded_html = trafilatura.fetch_url(url)
        if not downloaded_html:
            return ExtractedDocument(
                text="",
                markdown="",
                source_url=url,
            )

        # 3. Extraction standardisée
        doc = self.parse_html(downloaded_html, favor_precision=favor_precision)
        return ExtractedDocument(
            text=doc.text,
            markdown=doc.markdown,
            title=doc.title,
            author=doc.author,
            date=doc.date,
            language=doc.language,
            source_url=url,
            metadata=doc.metadata,
        )
