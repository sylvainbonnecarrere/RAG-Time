"""
RAGTIME Infrastructure — Adaptateur DryRunSimulatorAdapter (US-IA-08 & TNR-29)
Implémente DryRunSimulatorPort avec chaînage 100% en mémoire vive :
1. Nettoyage déterministe (NFC, éradication invisibles)
2. Partitionnement multi-stratégies
3. Analyse statistique des tokens (médiane, quantiles, histogrammes)
4. Audit de dilution sémantique
5. Calcul du dimensionnement VRAM HNSW 768d/1024d
"""

import math
from typing import Any

from app.domain.ports.chunker import ChunkerPort
from app.domain.ports.dry_run import (
    DryRunAnalysis,
    DryRunSimulatorPort,
    SemanticAudit,
    TokenHistogram,
    VramEstimation,
)
from app.domain.ports.text_cleaner import TextCleanerPort
from app.infrastructure.rag.deterministic_cleaner import DeterministicCleanerAdapter
from app.infrastructure.rag.multi_strategy_chunker import MultiStrategyChunkerAdapter


class DryRunSimulatorAdapter(DryRunSimulatorPort):
    """
    Simulateur de partitionnement et de dimensionnement VRAM en mémoire vive.
    Garantit zéro appel de persistance SQL.
    """

    def __init__(
        self,
        cleaner: TextCleanerPort | None = None,
        chunker: ChunkerPort | None = None,
    ):
        self._cleaner = cleaner or DeterministicCleanerAdapter()
        self._chunker = chunker or MultiStrategyChunkerAdapter()

    @staticmethod
    def compute_vram(total_chunks: int, dimension: int = 768) -> VramEstimation:
        """
        Calcul arithmétique de l'empreinte VRAM pgvector HNSW :
        - raw_bytes = chunks * dimension * 4 octets (float32)
        - hnsw_bytes = round(raw_bytes * 1.5) (graphe d'adjacence M=16, efConstruction=64)
        - total_bytes = raw_bytes + hnsw_bytes
        """
        raw_vector_bytes = total_chunks * dimension * 4
        hnsw_overhead_bytes = round(raw_vector_bytes * 1.5)
        total_vram_bytes = raw_vector_bytes + hnsw_overhead_bytes
        total_vram_mb = round(total_vram_bytes / (1024 * 1024), 3)

        # Seuil d'alerte VRAM (ex: index > 12 Go requiert une carte GPU spécifique)
        requires_high_memory = total_vram_mb > 12000.0

        return VramEstimation(
            dimension=dimension,
            raw_vector_bytes=raw_vector_bytes,
            hnsw_overhead_bytes=hnsw_overhead_bytes,
            total_vram_bytes=total_vram_bytes,
            total_vram_mb=total_vram_mb,
            requires_high_memory_gpu=requires_high_memory,
        )

    @staticmethod
    def compute_histogram(token_counts: list[int]) -> TokenHistogram:
        """
        Calcule les métriques statistiques de dispersion des tailles de fragments.
        """
        if not token_counts:
            return TokenHistogram(
                total_tokens=0,
                min_tokens=0,
                max_tokens=0,
                median_tokens=0.0,
                avg_tokens=0.0,
                percentile_25=0.0,
                percentile_75=0.0,
            )

        sorted_tokens = sorted(token_counts)
        n = len(sorted_tokens)
        total_tokens = sum(sorted_tokens)
        avg_tokens = round(total_tokens / n, 1)

        # Médiane
        if n % 2 == 1:
            median_tokens = float(sorted_tokens[n // 2])
        else:
            median_tokens = round((sorted_tokens[n // 2 - 1] + sorted_tokens[n // 2]) / 2.0, 1)

        # Percentiles p25 et p75
        p25_idx = math.floor(0.25 * (n - 1))
        p75_idx = math.floor(0.75 * (n - 1))
        p25 = float(sorted_tokens[p25_idx])
        p75 = float(sorted_tokens[p75_idx])

        # Répartition en tranches (buckets)
        b_less_60 = sum(1 for t in sorted_tokens if t < 60)
        b_60_150 = sum(1 for t in sorted_tokens if 60 <= t <= 150)
        b_151_300 = sum(1 for t in sorted_tokens if 151 <= t <= 300)
        b_301_500 = sum(1 for t in sorted_tokens if 301 <= t <= 500)
        b_501_800 = sum(1 for t in sorted_tokens if 501 <= t <= 800)
        b_more_800 = sum(1 for t in sorted_tokens if t > 800)

        return TokenHistogram(
            total_tokens=total_tokens,
            min_tokens=sorted_tokens[0],
            max_tokens=sorted_tokens[-1],
            median_tokens=median_tokens,
            avg_tokens=avg_tokens,
            percentile_25=p25,
            percentile_75=p75,
            bucket_less_than_60=b_less_60,
            bucket_60_to_150=b_60_150,
            bucket_151_to_300=b_151_300,
            bucket_301_to_500=b_301_500,
            bucket_501_to_800=b_501_800,
            bucket_more_than_800=b_more_800,
        )

    @staticmethod
    def audit_semantics(histogram: TokenHistogram, total_chunks: int) -> SemanticAudit:
        """
        Audit d'équilibre sémantique :
        - Détection de fragments < 60 tokens (perte d'ancrage sémantique)
        - Détection de fragments > 800 tokens (dilution du vecteur d'embedding)
        """
        under_chunked = histogram.bucket_less_than_60
        over_chunked = histogram.bucket_more_than_800

        if total_chunks == 0:
            return SemanticAudit(
                under_chunked_count=0,
                over_chunked_count=0,
                is_balanced=True,
                diagnostic="Corpus vide.",
            )

        is_balanced = (under_chunked == 0) and (over_chunked == 0)

        diags = []
        if under_chunked > 0:
            diags.append(
                f"{under_chunked} fragment(s) de moins de 60 tokens détecté(s) (risque de perte d'ancrage contextuel)."
            )
        if over_chunked > 0:
            diags.append(
                f"{over_chunked} fragment(s) de plus de 800 tokens détecté(s) (risque de dilution vectorielle)."
            )

        diagnostic = "Partitionnement sémantique parfaitement équilibré." if is_balanced else " ; ".join(diags)

        return SemanticAudit(
            under_chunked_count=under_chunked,
            over_chunked_count=over_chunked,
            is_balanced=is_balanced,
            diagnostic=diagnostic,
        )

    def simulate(
        self,
        text: str,
        strategy: str = "fixed_sliding",
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        prefix_section_title: bool = True,
        embedding_dim: int = 768,
        preview_limit: int = 3,
    ) -> DryRunAnalysis:
        """
        Exécute la simulation complète in-memory.
        """
        if not text or not text.strip():
            hist = self.compute_histogram([])
            vram = self.compute_vram(0, embedding_dim)
            audit = self.audit_semantics(hist, 0)
            return DryRunAnalysis(
                total_chunks=0,
                histogram=hist,
                vram=vram,
                semantic_audit=audit,
                preview_chunks=[],
            )

        # 1. Nettoyage mécanique déterministe
        clean_result = self._cleaner.clean(text)

        # 2. Partitionnement multi-stratégies
        raw_chunks = self._chunker.chunk(
            text=clean_result.cleaned_text,
            strategy=strategy,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            prefix_section_title=prefix_section_title,
        )

        total_chunks = len(raw_chunks)
        token_counts = [c.token_count for c in raw_chunks]

        # 3. Métriques d'histogramme
        hist = self.compute_histogram(token_counts)

        # 4. Dimensionnement VRAM
        vram = self.compute_vram(total_chunks, embedding_dim)

        # 5. Audit sémantique
        audit = self.audit_semantics(hist, total_chunks)

        # 6. Échantillons de prévisualisation
        preview = raw_chunks[:preview_limit]

        meta: dict[str, Any] = {
            "invisibles_removed": clean_result.invisibles_removed,
            "html_tags_removed": clean_result.html_tags_removed,
            "original_char_count": clean_result.original_char_count,
            "cleaned_char_count": clean_result.cleaned_char_count,
            "reduction_percentage": clean_result.reduction_percentage,
            "strategy": strategy,
        }

        return DryRunAnalysis(
            total_chunks=total_chunks,
            histogram=hist,
            vram=vram,
            semantic_audit=audit,
            preview_chunks=preview,
            metadata=meta,
        )
