"""
RAGTIME Infrastructure — Adaptateur Chunker Multi-Stratégies
Implémente ChunkerPort avec 3 algorithmes purs et déterministes :
1. Fenêtre glissante avec invariant chunk_overlap < chunk_size / 2 (TNR-28)
2. Découpage phrastique sémantique préservant les abréviations françaises
3. Sections Markdown AST avec préfixage contextuel [Section > Sous-Section] (TNR-30)
Chaque fragment génère une empreinte cryptographique SHA-256 certifiée (TNR-04).
"""

import hashlib
import re
from typing import Any, ClassVar

from app.domain.ports.chunker import ChunkerPort, ChunkingStrategyEnum, RawChunk


class MultiStrategyChunkerAdapter(ChunkerPort):
    """
    Adaptateur d'infrastructure pour le partitionnement sémantique documentaire.
    """

    # Ensemble d'abréviations françaises courantes normalisées en minuscules
    _FRENCH_ABBREVIATIONS: ClassVar[set[str]] = {
        "m.", "mme.", "mlle.", "dr.", "me.", "pr.", "prof.",
        "cf.", "ex.", "al.", "etc.", "vol.", "chap.", "art.",
        "p.", "pp.", "av.", "apr.", "fig.", "tab.", "env.", "vs.",
    }

    # Détection candidate de ponctuation forte suivie d'un espace et d'une majuscule
    _CANDIDATE_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ])")

    # Regex pour extraire les titres Markdown (# Titre)
    _MARKDOWN_HEADER_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

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
        Segmente le texte brut selon la stratégie demandée.
        """
        if not text or not text.strip():
            return []

        base_meta = metadata or {}

        if strategy == ChunkingStrategyEnum.FIXED_SLIDING:
            return self._chunk_fixed_sliding(text, chunk_size, chunk_overlap, base_meta)
        elif strategy == ChunkingStrategyEnum.SENTENCE_BOUNDARY:
            return self._chunk_sentence_boundary(text, chunk_size, chunk_overlap, base_meta)
        elif strategy == ChunkingStrategyEnum.MARKDOWN_AST:
            return self._chunk_markdown_ast(text, chunk_size, prefix_section_title, base_meta)
        else:
            raise ValueError(f"Stratégie de chunking inconnue : '{strategy}'")

    @staticmethod
    def _compute_sha256(content: str) -> str:
        """Calcule le hash cryptographique SHA-256 du texte brut."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    def _estimate_tokens(content: str) -> int:
        """
        Estimation déterministe du nombre de tokens (mots * 1.3 environ pour tokenizer BPE).
        Pour un mot ou texte court, au minimum le nombre de mots réels.
        """
        words = len(content.split())
        return max(1, int(words * 1.25))

    def _chunk_fixed_sliding(
        self,
        text: str,
        chunk_size: int,
        chunk_overlap: int,
        base_meta: dict[str, Any],
    ) -> list[RawChunk]:
        """
        Stratégie Fenêtre Glissante :
        Invariant strict : chunk_overlap < chunk_size / 2 (TNR-28).
        """
        if chunk_overlap >= (chunk_size / 2):
            raise ValueError(
                f"TNR-28 Invariant Violé: chunk_overlap ({chunk_overlap}) doit être strictement "
                f"inférieur à chunk_size / 2 ({chunk_size / 2})"
            )

        words = text.split()
        if not words:
            return []

        step = max(1, chunk_size - chunk_overlap)
        chunks: list[RawChunk] = []
        chunk_index = 0
        start_idx = 0

        while start_idx < len(words):
            end_idx = min(len(words), start_idx + chunk_size)
            chunk_words = words[start_idx:end_idx]
            content = " ".join(chunk_words)

            # Recherche des positions dans le texte d'origine
            # Approximation de position
            char_start = text.find(chunk_words[0])
            char_end = char_start + len(content) if char_start != -1 else None

            sha256 = self._compute_sha256(content)
            tokens = self._estimate_tokens(content)

            chunk = RawChunk(
                chunk_index=chunk_index,
                content=content,
                sha256_hash=sha256,
                token_count=tokens,
                strategy_used=ChunkingStrategyEnum.FIXED_SLIDING,
                char_start=char_start if char_start != -1 else 0,
                char_end=char_end if char_end is not None else len(content),
                metadata=dict(base_meta),
            )
            chunks.append(chunk)
            chunk_index += 1

            if end_idx >= len(words):
                break
            start_idx += step

        return chunks

    def _split_into_sentences(self, text: str) -> list[str]:
        """
        Découpe le texte en phrases en protégeant les abréviations françaises courantes.
        """
        raw_candidates = self._CANDIDATE_SENTENCE_BOUNDARY.split(text)
        sentences: list[str] = []
        buffer = ""

        for candidate in raw_candidates:
            if buffer:
                buffer = f"{buffer} {candidate}"
            else:
                buffer = candidate

            # Vérifier si le dernier mot du buffer se termine par une abréviation
            words = buffer.split()
            if words:
                last_word = words[-1].strip("()[]\"'«»").lower()
                if last_word in self._FRENCH_ABBREVIATIONS:
                    # C'est une abréviation, ne pas clore la phrase ici
                    continue

            sentences.append(buffer.strip())
            buffer = ""

        if buffer.strip():
            sentences.append(buffer.strip())

        return [s for s in sentences if s]

    def _chunk_sentence_boundary(
        self,
        text: str,
        chunk_size: int,
        chunk_overlap: int,
        base_meta: dict[str, Any],
    ) -> list[RawChunk]:
        """
        Stratégie Découpage Phrastique :
        Découpe sur la ponctuation forte sans casser les abréviations françaises,
        puis agrège les phrases jusqu'au quota de mots/tokens cible.
        """
        # Normalisation légère des espaces pour segmentation
        normalized = " ".join(text.split())
        if not normalized:
            return []

        # Découpage en phrases respectant les abréviations
        sentences = self._split_into_sentences(normalized)
        if not sentences:
            sentences = [normalized]

        chunks: list[RawChunk] = []
        chunk_index = 0
        current_sentences: list[str] = []
        current_word_count = 0

        for sentence in sentences:
            words = sentence.split()
            sentence_word_count = len(words)

            if current_sentences and (current_word_count + sentence_word_count > chunk_size):
                content = " ".join(current_sentences)
                sha256 = self._compute_sha256(content)
                tokens = self._estimate_tokens(content)

                char_start = text.find(current_sentences[0])
                char_end = (
                    text.find(current_sentences[-1]) + len(current_sentences[-1])
                    if char_start != -1
                    else None
                )

                chunk = RawChunk(
                    chunk_index=chunk_index,
                    content=content,
                    sha256_hash=sha256,
                    token_count=tokens,
                    strategy_used=ChunkingStrategyEnum.SENTENCE_BOUNDARY,
                    char_start=char_start if char_start != -1 else 0,
                    char_end=char_end if char_end is not None else len(content),
                    metadata=dict(base_meta),
                )
                chunks.append(chunk)
                chunk_index += 1
                current_sentences = []
                current_word_count = 0

            current_sentences.append(sentence)
            current_word_count += sentence_word_count

        if current_sentences:
            content = " ".join(current_sentences)
            sha256 = self._compute_sha256(content)
            tokens = self._estimate_tokens(content)

            char_start = text.find(current_sentences[0])
            char_end = (
                text.find(current_sentences[-1]) + len(current_sentences[-1])
                if char_start != -1
                else None
            )

            chunk = RawChunk(
                chunk_index=chunk_index,
                content=content,
                sha256_hash=sha256,
                token_count=tokens,
                strategy_used=ChunkingStrategyEnum.SENTENCE_BOUNDARY,
                char_start=char_start if char_start != -1 else 0,
                char_end=char_end if char_end is not None else len(content),
                metadata=dict(base_meta),
            )
            chunks.append(chunk)

        return chunks

    def _chunk_markdown_ast(
        self,
        text: str,
        chunk_size: int,
        prefix_section_title: bool,
        base_meta: dict[str, Any],
    ) -> list[RawChunk]:
        """
        Stratégie Markdown AST :
        Découpage par sections hiérarchiques avec pile d'en-têtes et
        injection obligatoire du fil d'Ariane contextuel [Section > Titre] (TNR-30).
        """
        lines = text.splitlines()
        chunks: list[RawChunk] = []
        chunk_index = 0

        # Pile pour maintenir l'arborescence des titres : [(niveau, titre)]
        header_stack: list[tuple[int, str]] = []
        current_body_lines: list[str] = []
        current_section_title: str | None = None

        def flush_current_section():
            nonlocal chunk_index, current_body_lines
            body_text = "\n".join(current_body_lines).strip()
            if not body_text:
                current_body_lines = []
                return

            breadcrumb = " > ".join([t for _, t in header_stack]) if header_stack else None
            
            # Préfixage contextuel si activé et si breadcrumb présent (TNR-30)
            if prefix_section_title and breadcrumb:
                final_content = f"[{breadcrumb}] {body_text}"
            else:
                final_content = body_text

            sha256 = self._compute_sha256(final_content)
            tokens = self._estimate_tokens(final_content)

            chunk = RawChunk(
                chunk_index=chunk_index,
                content=final_content,
                sha256_hash=sha256,
                token_count=tokens,
                strategy_used=ChunkingStrategyEnum.MARKDOWN_AST,
                context_prefix=breadcrumb,
                section_title=current_section_title,
                char_start=0,
                char_end=len(final_content),
                metadata=dict(base_meta),
            )
            chunks.append(chunk)
            chunk_index += 1
            current_body_lines = []

        for line in lines:
            header_match = self._MARKDOWN_HEADER_REGEX.match(line)
            if header_match:
                # Titre Markdown rencontré : on vide la section précédente
                flush_current_section()

                hashes, title = header_match.groups()
                level = len(hashes)
                title = title.strip()
                current_section_title = title

                # Ajustement de la pile hiérarchique
                while header_stack and header_stack[-1][0] >= level:
                    header_stack.pop()
                header_stack.append((level, title))
            else:
                if line.strip():
                    current_body_lines.append(line)

        # Vidage de la dernière section
        flush_current_section()

        return chunks
