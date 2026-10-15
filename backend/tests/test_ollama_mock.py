"""
Tests Unitaires du Mock Déterministe Ollama (US-DEVOPS-04)
Vérifie la dimensionnalité 768d, la normalisation unitaire L2 et le déterminisme.
"""

import math

import pytest
from tests.mocks.ollama_mock import generate_deterministic_embedding


@pytest.mark.asyncio
async def test_deterministic_embedding_properties():
    text1 = "Architecture souveraine pgvector et Ollama"
    text2 = "Architecture souveraine pgvector et Ollama"
    text3 = "Un texte complètement différent sur la santé"

    # Déterminisme strict : même texte => exactement même vecteur
    vec1 = generate_deterministic_embedding(text1, dimensions=768)
    vec2 = generate_deterministic_embedding(text2, dimensions=768)
    vec3 = generate_deterministic_embedding(text3, dimensions=768)

    assert len(vec1) == 768
    assert vec1 == vec2
    assert vec1 != vec3

    # Normalisation L2 : norme = 1.0 (tolérance flottante 1e-5)
    norm = math.sqrt(sum(x * x for x in vec1))
    assert math.isclose(norm, 1.0, rel_tol=1e-5)


@pytest.mark.asyncio
async def test_mock_ollama_client(mock_ollama):
    # Tags
    tags = await mock_ollama.get_tags()
    assert "models" in tags
    assert len(tags["models"]) >= 2
    model_names = [m["name"] for m in tags["models"]]
    assert "llama3.2:3b" in model_names

    # Embeddings
    emb = await mock_ollama.generate_embeddings("nomic-embed-text", "Requête test")
    assert len(emb) == 768

    # Streaming
    tokens = []
    async for token in mock_ollama.stream_generate("llama3.2:3b", "Explique RAG"):
        tokens.append(token)
    assert len(tokens) > 0
    full_text = "".join(tokens)
    assert "réponse certifiée" in full_text
