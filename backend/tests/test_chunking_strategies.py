"""
RAGTIME Tests — Suite TDD de validation du Chunker Multi-Stratégies (US-IA-03).
Vérifie la conformité avec :
- TNR-28 : chunk_overlap < chunk_size / 2
- TNR-30 : Préfixage hiérarchique markdown [Section > Titre]
- TNR-04 : Hachage SHA-256 certifié de chaque fragment
- Préservation des abréviations françaises en découpage phrastique
"""

import pytest
from app.domain.ports.chunker import ChunkingStrategyEnum
from app.infrastructure.rag.multi_strategy_chunker import MultiStrategyChunkerAdapter


@pytest.fixture
def chunker() -> MultiStrategyChunkerAdapter:
    return MultiStrategyChunkerAdapter()


def test_fixed_sliding_window_strategy_and_overlap_invariant(chunker: MultiStrategyChunkerAdapter):
    """
    Vérifie la stratégie de fenêtre glissante :
    - Découpage continu avec overlap
    - Respect strict de l'invariant TNR-28 (rejet si overlap >= size / 2)
    """
    # 1. Test violation de l'invariant TNR-28
    with pytest.raises(ValueError, match="TNR-28 Invariant Violé"):
        chunker.chunk(
            text="Un texte d'exemple pour tester la violation d'overlap.",
            strategy=ChunkingStrategyEnum.FIXED_SLIDING,
            chunk_size=100,
            chunk_overlap=50,  # 50 >= 100/2 -> Rejet formel
        )

    with pytest.raises(ValueError, match="TNR-28 Invariant Violé"):
        chunker.chunk(
            text="Un texte d'exemple.",
            strategy=ChunkingStrategyEnum.FIXED_SLIDING,
            chunk_size=100,
            chunk_overlap=60,  # 60 > 50 -> Rejet formel
        )

    # 2. Test découpage nominal avec overlap conforme
    corpus = " ".join([f"mot_{i}" for i in range(1, 101)])  # 100 mots
    chunks = chunker.chunk(
        text=corpus,
        strategy=ChunkingStrategyEnum.FIXED_SLIDING,
        chunk_size=30,
        chunk_overlap=10,  # 10 < 15 -> Conforme
    )

    assert len(chunks) >= 4
    assert chunks[0].chunk_index == 0
    assert chunks[0].strategy_used == "fixed_sliding"
    assert chunks[0].content.startswith("mot_1 mot_2")
    # Vérification du pas : chunks[0] mots 1..30, chunks[1] mots 21..50
    assert "mot_21" in chunks[0].content
    assert "mot_21" in chunks[1].content
    assert chunks[1].chunk_index == 1


def test_sentence_boundary_preserves_french_abbreviations(chunker: MultiStrategyChunkerAdapter):
    """
    Vérifie que le découpage phrastique ne casse pas les abréviations courantes françaises
    (M., Mme., Dr., etc.) et regroupe les phrases intelligibles jusqu'au budget de mots.
    """
    texte = (
        "Le Dr. Martin et M. Dupont ont rencontré Mme. Valérie au laboratoire. "
        "Cette réunion avait pour but d'analyser les résultats préliminaires (cf. page 12). "
        "Les conclusions confirment l'efficacité du protocole expérimental. "
        "Une publication dans la revue Lancet est prévue pour l'automne."
    )

    # Si découpé avec un petit budget (ex: 2 phrases par chunk)
    chunks = chunker.chunk(
        text=texte,
        strategy=ChunkingStrategyEnum.SENTENCE_BOUNDARY,
        chunk_size=25,  # mots max
        chunk_overlap=0,
    )

    # Vérification que "Dr." ou "M." ou "Mme." ou "cf." n'ont pas provoqué de découpage prématuré
    assert any("Le Dr. Martin et M. Dupont ont rencontré Mme. Valérie au laboratoire." in c.content for c in chunks)
    for c in chunks:
        assert not c.content.endswith("Dr.")
        assert not c.content.endswith("M.")
        assert not c.content.endswith("Mme.")
        assert not c.content.endswith("cf.")


def test_markdown_ast_hierarchical_context_breadcrumbs(chunker: MultiStrategyChunkerAdapter):
    """
    Vérifie l'extraction par sections Markdown et l'injection du fil d'Ariane hiérarchique
    [Section > Sous-Section] (TNR-30).
    """
    doc_markdown = """# Architecture Souveraine
Introduction générale sur la souveraineté des données.

## Base de Données
### Index HNSW
Les index HNSW opèrent en 768 dimensions pour la recherche cosinus pgvector.

### Isolation RLS
Chaque tenant bénéficie d'une barrière cryptographique et logique étanche.

## Inférence Locale
Ollama exécute les modèles Llama 3.2 sans aucune fuite vers l'extérieur.
"""

    chunks = chunker.chunk(
        text=doc_markdown,
        strategy=ChunkingStrategyEnum.MARKDOWN_AST,
        chunk_size=100,
        prefix_section_title=True,
    )

    assert len(chunks) >= 4

    # Recherche du chunk concernant HNSW
    hnsw_chunks = [c for c in chunks if "Index HNSW" in (c.section_title or "")]
    assert len(hnsw_chunks) == 1
    hnsw_chunk = hnsw_chunks[0]

    # Invariant TNR-30 : Le contenu doit être préfixé par le fil d'Ariane
    assert hnsw_chunk.context_prefix == "Architecture Souveraine > Base de Données > Index HNSW"
    assert hnsw_chunk.content.startswith("[Architecture Souveraine > Base de Données > Index HNSW]")
    assert "Les index HNSW opèrent en 768 dimensions" in hnsw_chunk.content

    # Recherche du chunk Inférence Locale
    llm_chunks = [c for c in chunks if "Inférence Locale" in (c.section_title or "")]
    assert len(llm_chunks) == 1
    assert llm_chunks[0].context_prefix == "Architecture Souveraine > Inférence Locale"
    assert llm_chunks[0].content.startswith("[Architecture Souveraine > Inférence Locale]")


def test_sha256_cryptographic_hash_and_offsets(chunker: MultiStrategyChunkerAdapter):
    """
    Vérifie que chaque fragment dispose d'une empreinte cryptographique SHA-256 valide
    (64 hexadécimaux) et de positions de caractères valides.
    """
    texte = "Premier paragraphe indépendant.\n\nDeuxième paragraphe avec des informations critiques."
    chunks = chunker.chunk(
        text=texte,
        strategy=ChunkingStrategyEnum.FIXED_SLIDING,
        chunk_size=5,
        chunk_overlap=1,
    )

    for c in chunks:
        assert isinstance(c.sha256_hash, str)
        assert len(c.sha256_hash) == 64
        # Caractères hexadécimaux
        int(c.sha256_hash, 16)
        assert c.token_count > 0
        assert c.char_start is not None
        assert c.char_end is not None
        assert c.char_end >= c.char_start


def test_edge_cases_empty_text_and_unknown_strategy(chunker: MultiStrategyChunkerAdapter):
    """
    Vérifie la robustesse face aux entrées vides ou stratégies inconnues.
    """
    assert chunker.chunk("", strategy=ChunkingStrategyEnum.FIXED_SLIDING) == []
    assert chunker.chunk("   \n\n  ", strategy=ChunkingStrategyEnum.SENTENCE_BOUNDARY) == []

    with pytest.raises(ValueError, match="Stratégie de chunking inconnue"):
        chunker.chunk("Texte", strategy="inconnue_strat")
