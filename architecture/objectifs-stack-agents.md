# Objectifs Stratégiques & Stack Technique Officielle — RAGTIME

> **Statut :** Spécification Cadre de la Stack Souveraine  
> **Classification :** Référence Technique Globale  
> **Signature de Marque Officielle :** « Beat & Pgvector »

---

## 1. Objectifs Majeurs du Projet

1. **Souveraineté Numérique Totale** : Exploitation d'un système RAG d'entreprise sans aucune dépendance envers des fournisseurs de cloud tiers ou des API fermées (OpenAI, Anthropic, Google Cloud).
2. **Confidentialité Rigoureuse & Confinement On-Premise** : Traitement des données classifiées et sensibles directement au sein de l'infrastructure privée de l'organisation.
3. **Auditabilité Algorithmique Intégrale** : Chaque bribe d'information restituée par l'intelligence artificielle doit être traçable jusqu'au fichier d'origine, à son numéro de page et à son empreinte SHA-256.
4. **Vitesse d'Exécution & Efficacité Matérielle** : Optimisation fine de la mémoire GPU (VRAM) et des latences (TTFT < 400 ms en conditions nominales).

---

## 2. Cartographie de la Stack Technologique

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONT-END CLIENT                              │
│   • React 18+ & Vite (Compilation rapide, ESM)                          │
│   • TypeScript Strict (Typage dérivé OpenAPI sans écriture manuelle)    │
│   • Tailwind CSS v4 (Thème sombre souverain, contrastes AA/AAA)         │
│   • Lucide React (Iconographie vectorielle standardisée)                │
│   • Recharts & D3 (Visualisations interactives d'audit et télémétrie)   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │  (HTTP REST + SSE Streaming)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             BACK-END API                                │
│   • Python 3.12 (Typage statique poussé, async natif)                   │
│   • FastAPI (Haute performance ASGI, génération automatique OpenAPI v3) │
│   • Pydantic v2 (Validation déterministe des DTO et payloads)           │
│   • SQLModel & Alembic (ORM asynchrone et migrations versionnées)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────────────────┐   ┌───────────────────────────────┐
│     TÂCHES ASYNCHRONES (WORKERS)    │   │      STOCKAGE & VECTEURS      │
│   • Redis 7 (Queue mémoire haute v.)│   │   • PostgreSQL 16             │
│   • ARQ Worker (Python async natif) │   │   • pgvector (Index HNSW 768d)│
│   • Parsing lourd & chunking multi-p│   │   • Stockage FS Immuable SHA  │
└─────────────────────────────────────┘   └───────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MOTEURS D'INFÉRENCE IA SOUVERAINS                    │
│   • Ollama / llama.cpp / vLLM (Runtime C++ optimisé AVX-512 & CUDA)     │
│   • Llama 3.2:3B Instruct (Modèle de génération textuelle local)        │
│   • nomic-embed-text-v1.5 (Vecteurs d'embeddings denses 768 dimensions) │
│   • bge-reranker-base (Cross-Encoder local pour réordonnancement Top-K) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Matrice de Dimensionnement Matériel (Sizing)

| Composant | Rôle | Empreinte VRAM / RAM | Cible de Performance |
|---|---|---|---|
| **Llama 3.2:3B Instruct (Q4_K_M)** | Génération de réponses | ~2.4 Go VRAM | 40 à 65 tokens / seconde |
| **nomic-embed-text-v1.5** | Calcul d'embeddings denses | ~1.1 Go VRAM | < 35 ms par chunk de 512t |
| **bge-reranker-base** | Re-ranking Cross-Encoder | ~1.2 Go VRAM | < 45 ms pour le Top-10 |
| **pgvector HNSW Cache** | Recherche vectorielle en mémoire | ~2 Go RAM système | < 15 ms sur 500 000 chunks |
| **PostgreSQL 16 + Redis** | Métadonnées & Tâches ARQ | ~1 Go RAM système | < 5 ms requêtes relationnelles |
| **Total Empreinte GPU** | VRAM Minimale Requise | **~4.7 Go VRAM** | **Opérationnel sur RTX 4060 / 4090 / A100** |

---

## 4. Charte d'Intégration & Conventions

- **Baseline Officielle** : La mention de baseline au logo officiel est impérativement **« Beat & Pgvector »**, matérialisant l'alliance de la cadence temps réel asynchrone et de l'indexation vectorielle dans PostgreSQL.
- **Règle Zéro API Externe** : Aucune dépendance réseau externe au cluster (aucun CDN, aucun appel télémétrique vers des tiers).
