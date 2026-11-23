"""
RAGTIME Tests — Suite TDD Moteur de Simulation Dry-Run Pré-Indexation (US-IA-08 & TNR-29)
Vérifie :
- Calcul arithmétique de la VRAM pgvector HNSW en 768d (nomic-embed) et 1024d (bge-m3)
- Calcul de l'histogramme des tokens (distribution par tranches, médiane, percentiles)
- Audit d'équilibre sémantique (détection des anomalies < 60 tokens et > 800 tokens)
- Invariant strict TNR-29 : Découpage in-memory sans effet de bord
"""

import pytest
from app.domain.ports.chunker import ChunkingStrategyEnum
from app.infrastructure.rag.dry_run_simulator import DryRunSimulatorAdapter


@pytest.fixture
def simulator() -> DryRunSimulatorAdapter:
    return DryRunSimulatorAdapter()


def test_vram_estimation_formula(simulator: DryRunSimulatorAdapter):
    """
    Validation mathématique stricte de la formule VRAM HNSW (TNR-29) :
    - raw_bytes = chunks * dimension * 4
    - hnsw_bytes = round(raw_bytes * 1.5)
    - total_bytes = raw_bytes + hnsw_bytes
    """
    # Cas 1 : 1000 chunks en 768 dimensions (nomic-embed-text)
    vram_768 = simulator.compute_vram(total_chunks=1000, dimension=768)
    expected_raw_768 = 1000 * 768 * 4  # 3 072 000 octets
    expected_hnsw_768 = round(expected_raw_768 * 1.5)  # 4 608 000 octets
    expected_total_768 = expected_raw_768 + expected_hnsw_768  # 7 680 000 octets

    assert vram_768.raw_vector_bytes == expected_raw_768
    assert vram_768.hnsw_overhead_bytes == expected_hnsw_768
    assert vram_768.total_vram_bytes == expected_total_768
    assert vram_768.total_vram_mb == round(expected_total_768 / (1024 * 1024), 3)
    assert not vram_768.requires_high_memory_gpu

    # Cas 2 : 500 chunks en 1024 dimensions (bge-m3)
    vram_1024 = simulator.compute_vram(total_chunks=500, dimension=1024)
    expected_raw_1024 = 500 * 1024 * 4  # 2 048 000 octets
    assert vram_1024.raw_vector_bytes == expected_raw_1024
    assert vram_1024.hnsw_overhead_bytes == round(expected_raw_1024 * 1.5)


def test_token_histogram_and_quantiles(simulator: DryRunSimulatorAdapter):
    """
    Vérifie le calcul statistique de la distribution des tokens :
    - Somme, minimum, maximum, moyenne, médiane
    - Répartition dans les tranches de granularité
    """
    # Échantillon de tokens : 5 fragments
    tokens = [45, 120, 250, 480, 850]
    hist = simulator.compute_histogram(tokens)

    assert hist.total_tokens == 45 + 120 + 250 + 480 + 850
    assert hist.min_tokens == 45
    assert hist.max_tokens == 850
    assert hist.median_tokens == 250.0
    assert hist.avg_tokens == round((45 + 120 + 250 + 480 + 850) / 5, 1)

    # Vérification des tranches
    assert hist.bucket_less_than_60 == 1      # 45
    assert hist.bucket_60_to_150 == 1         # 120
    assert hist.bucket_151_to_300 == 1        # 250
    assert hist.bucket_301_to_500 == 1        # 480
    assert hist.bucket_501_to_800 == 0
    assert hist.bucket_more_than_800 == 1     # 850


def test_semantic_audit_detects_under_and_over_chunking(simulator: DryRunSimulatorAdapter):
    """
    Vérifie l'audit sémantique prévenant la perte de contexte (< 60 tok)
    et la dilution vectorielle (> 800 tok).
    """
    # 1. Distribution déséquilibrée
    tokens_unbalanced = [30, 40, 200, 900]
    hist_unbalanced = simulator.compute_histogram(tokens_unbalanced)
    audit_unbalanced = simulator.audit_semantics(hist_unbalanced, total_chunks=4)

    assert not audit_unbalanced.is_balanced
    assert audit_unbalanced.under_chunked_count == 2
    assert audit_unbalanced.over_chunked_count == 1
    assert "ancrage contextuel" in audit_unbalanced.diagnostic
    assert "dilution vectorielle" in audit_unbalanced.diagnostic

    # 2. Distribution équilibrée
    tokens_balanced = [120, 250, 340, 410]
    hist_balanced = simulator.compute_histogram(tokens_balanced)
    audit_balanced = simulator.audit_semantics(hist_balanced, total_chunks=4)

    assert audit_balanced.is_balanced
    assert audit_balanced.under_chunked_count == 0
    assert audit_balanced.over_chunked_count == 0
    assert "parfaitement équilibré" in audit_balanced.diagnostic


def test_simulate_full_pipeline_in_memory(simulator: DryRunSimulatorAdapter):
    """
    Vérifie l'exécution complète du pipeline in-memory :
    - Nettoyage NFC préalable
    - Découpage Markdown AST avec fil d'Ariane
    - Restitution de l'analyse complète
    """
    corpus = """# Guide Souverain
Introduction générale sur l'architecture SecNumCloud.

## Module pgvector
L'index HNSW opère sur des vecteurs de dimension 768.

## Sécurité Anti-SSRF
Toute URL pointant vers le réseau local ou les métadonnées AWS est formellement bloquée.
"""
    analysis = simulator.simulate(
        text=corpus,
        strategy=ChunkingStrategyEnum.MARKDOWN_AST,
        chunk_size=100,
        prefix_section_title=True,
    )

    assert analysis.total_chunks >= 3
    assert analysis.histogram.total_tokens > 0
    assert analysis.vram.total_vram_bytes > 0
    assert len(analysis.preview_chunks) <= 3
    assert analysis.preview_chunks[0].context_prefix is not None
