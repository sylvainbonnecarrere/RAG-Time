"""
Test Runner Minimal en Bibliothèque Standard Python (unittest)
Permet de valider immédiatement les invariants mathématiques et le mock Ollama
sans exiger de paquets tiers préinstallés sur l'hôte.
"""

import math
import os
import sys
import unittest

# Ajout du répertoire backend au sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from tests.mocks.ollama_mock import generate_deterministic_embedding


class TestOllamaMockDeterministic(unittest.TestCase):
    def test_embedding_dimensions_and_determinism(self):
        text1 = "Architecture souveraine pgvector et Ollama"
        text2 = "Architecture souveraine pgvector et Ollama"
        text3 = "Un texte complètement différent sur la santé"

        vec1 = generate_deterministic_embedding(text1, dimensions=768)
        vec2 = generate_deterministic_embedding(text2, dimensions=768)
        vec3 = generate_deterministic_embedding(text3, dimensions=768)

        self.assertEqual(len(vec1), 768, "L'embedding doit comporter exactement 768 dimensions")
        self.assertEqual(vec1, vec2, "Le même texte doit produire exactement le même vecteur")
        self.assertNotEqual(vec1, vec3, "Deux textes distincts doivent produire des vecteurs distincts")

    def test_l2_normalization(self):
        text = "Test de normalisation vectorielle unitaire"
        vec = generate_deterministic_embedding(text, dimensions=768)
        norm = math.sqrt(sum(x * x for x in vec))
        self.assertAlmostEqual(norm, 1.0, places=5, msg="La norme L2 du vecteur doit être égale à 1.0")


if __name__ == "__main__":
    unittest.main()
