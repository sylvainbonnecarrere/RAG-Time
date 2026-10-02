"""
Fast-Mock Ollama Déterministe pour la CI Sans GPU (US-DEVOPS-04)
Permet d'exécuter 100% des tests unitaires et TNR dans GitHub Actions sans GPU physique.
Fournit des embeddings 768d normalisés déterministes et un flux textuel SSE simulé.
"""

import hashlib
import math
from typing import AsyncGenerator, Dict, List


def generate_deterministic_embedding(text: str, dimensions: int = 768) -> List[float]:
    """Génère un vecteur flottant unitaire déterministe à partir du hash SHA-256 du texte."""
    sha = hashlib.sha256(text.encode("utf-8")).digest()
    raw_vector: List[float] = []
    for i in range(dimensions):
        byte_val = sha[i % len(sha)]
        # Génération d'une valeur centrée entre -1.0 et 1.0
        float_val = (byte_val / 127.5) - 1.0 + (i * 0.0001)
        raw_vector.append(float_val)

    # Normalisation L2 (norme = 1.0) pour satisfaire pgvector cosine distance
    norm = math.sqrt(sum(x * x for x in raw_vector))
    if norm > 0:
        return [x / norm for x in raw_vector]
    return raw_vector


class FastMockOllamaClient:
    """Mock léger remplaçant les appels réseau Ollama en environnement de test."""

    def __init__(self, base_url: str = "http://mock-ollama:11434"):
        self.base_url = base_url

    async def get_tags(self) -> Dict:
        """Simule GET /api/tags."""
        return {
            "models": [
                {"name": "llama3.2:3b", "model": "llama3.2:3b", "details": {"parameter_size": "3.2B"}},
                {"name": "nomic-embed-text:latest", "model": "nomic-embed-text", "details": {"parameter_size": "137M"}},
            ]
        }

    async def generate_embeddings(self, model: str, prompt: str) -> List[float]:
        """Simule POST /api/embeddings renvoyant un vecteur 768d."""
        return generate_deterministic_embedding(prompt, dimensions=768)

    async def stream_generate(self, model: str, prompt: str) -> AsyncGenerator[str, None]:
        """Simule POST /api/generate en streaming de tokens."""
        mock_tokens = ["Conformément ", "aux ", "sources ", "analysées, ", "voici ", "la ", "réponse ", "certifiée."]
        for token in mock_tokens:
            yield token
