# Handover Technique — Agent IA & RAG vers Agent Backend
## Clôture des US Vectorielles (US-IA-04, US-IA-05, US-IA-06) & Transmission pour US-BACK-09

> **Date :** 24 Novembre 2026  
> **Émetteur :** Agent Ingénieur IA & RAG Souverain  
> **Destinataire :** Agent Développeur Backend  
> **Statut Global :** 131/131 tests unitaires et d'intégration validés, 31/31 TNRs au vert (100%), 0 erreur linter.

---

### 1. Synthèse des Livrables IA & RAG Livrés (Jalon 3)

Le socle complet de vectorisation, de recherche hybride et de re-ranking local a été conçu, développé et validé selon les règles de l'Architecture Hexagonale et les contraintes strictes SecNumCloud/ANSSI :

#### A. US-IA-04 : Port `VectorStoragePort` & Adaptateurs pgvector HNSW
* **Contrats du domaine :** [backend/app/domain/ports/vector_storage.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/vector_storage.py) (`EmbeddingModelPort`, `VectorStoragePort`, `ScoredChunk`).
* **Adaptateur d'embedding local :** [backend/app/infrastructure/rag/ollama_embedding.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/ollama_embedding.py) (`OllamaEmbeddingAdapter`).
  - Cible `nomic-embed-text-v1.5` en 768 dimensions avec normalisation $L_2$ unitaire ($\|v\|_2 = 1.0$).
  - Fallback local déterministe unitaire sans GPU pour la CI et les environnements déconnectés.
* **Adaptateur pgvector :** [backend/app/infrastructure/rag/pgvector_storage.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/pgvector_storage.py) (`PgVectorStorageAdapter`).
  - Recherche cosinus `<=>` optimisée sous index HNSW ($m=16, ef=64$) avec `SET LOCAL hnsw.ef_search = 64`.
  - Cloisonnement Row-Level Security PostgreSQL garanti (`tenant_id = :tenant_id`).
* **Banc d'essai TDD :** [backend/tests/test_pgvector_storage.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/tests/test_pgvector_storage.py) (3 tests validés).

#### B. US-IA-05 : Recherche Hybride Dense/Sparse & Algorithme RRF ($k=60$)
* **Contrats du domaine :** [backend/app/domain/ports/hybrid_search.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/hybrid_search.py) (`HybridSearchPort`, `HybridChunkResult`, `compute_rrf_scores`).
* **Adaptateur d'infrastructure :** [backend/app/infrastructure/rag/hybrid_retriever.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/hybrid_retriever.py) (`PgHybridRetrieverAdapter`).
  - Combine la recherche dense sémantique et la recherche lexicale PostgreSQL Full-Text `tsvector` / `ts_rank_cd`.
  - Double dictionnaire FTS (`french` pour la lemmatisation naturelle et `simple` pour les termes techniques, codes d'erreur, sigles et UUIDs).
  - Transformation disjonctive (`|`) pour repêcher les mots-clés exacts même au sein d'une question en langage naturel.
  - Fusion déterministe RRF avec constante $k=60$ :
    $$RRF(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{w_m}{k + r_m(d)}$$
* **Banc d'essai TDD :** [backend/tests/test_rrf_algorithm.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/tests/test_rrf_algorithm.py) (6 tests validés).

#### C. US-IA-06 : Re-ranking Local Cross-Encoder & Métriques Thermiques
* **Contrats du domaine :** [backend/app/domain/ports/reranker.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/reranker.py) (`RerankerPort`, `RerankedChunk`, fonctions pures `classify_thermal_status`, `format_citation_label`, `calculate_top1_deltas`).
* **Adaptateur d'infrastructure :** [backend/app/infrastructure/rag/reranker.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/reranker.py) (`LocalCrossEncoderAdapter`).
  - Cible le modèle souverain `bge-reranker-base` avec inférence rapide ($< 45\text{ ms}$).
  - Fallback local déterministe combinant affinité lexicale, alignement de n-grammes et projection sigmoïde.
  - Calcul du statut thermique :
    - $\ge 0.85$ : `emerald` (`TNR-31`)
    - $0.70$ à $0.849$ : `cyan`
    - $0.60$ à $0.699$ : `amber`
    - $< 0.60$ : `rose`
  - Calcul du $\Delta$ Top-1 : $\text{round}(\text{score}_i - \text{score}_{\text{top1}}, 3)$ (`TNR-25`). Top-1 à $0.000$, chunks suivants $\le 0.000$ (ex: $-0.027$).
  - Formatage normalisé de citation : `[Nom_Document, p.X]` (`TNR-14`).
  - Empreinte cryptographique SHA-256 certifiée (64 hex) (`TNR-04`).
* **Banc d'essai TDD :** [backend/tests/test_cross_encoder_rerank.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/tests/test_cross_encoder_rerank.py) (5 tests validés).

---

### 2. Guide d'Intégration pour l'Agent Backend (US-BACK-09)

L'**US-BACK-09** consiste à implémenter le contrôleur de flux Server-Sent Events (SSE) :
`POST /api/v1/chat/conversations/{id}/stream` (ou `GET` selon convention du routeur chat).

#### A. Chaîne d'Appel Recommandée dans le Contrôleur SSE

```python
from app.infrastructure.rag.ollama_embedding import OllamaEmbeddingAdapter
from app.infrastructure.rag.pgvector_storage import PgVectorStorageAdapter
from app.infrastructure.rag.hybrid_retriever import PgHybridRetrieverAdapter
from app.infrastructure.rag.reranker import LocalCrossEncoderAdapter

# 1. Instanciation des adaptateurs (ou injection via dépendances FastAPI)
embedder = OllamaEmbeddingAdapter()
vector_storage = PgVectorStorageAdapter()
hybrid_retriever = PgHybridRetrieverAdapter(embedding_model=embedder, vector_storage=vector_storage)
reranker = LocalCrossEncoderAdapter()

# 2. Dans le générateur asynchrone SSE sous get_tenant_session(tenant_id) :
# Événement 1 : message.started
yield format_sse("message.started", {"message_id": str(msg_id), "conversation_id": str(conv_id)})

# Événement 2 : retrieval.started
yield format_sse("retrieval.started", {"query": query_text, "strategy": preset.chunking_strategy})

# Étape A : Récupération hybride
hybrid_chunks = await hybrid_retriever.search_hybrid(
    session=session,
    tenant_id=tenant_id,
    query_text=query_text,
    top_k=preset.retrieval_top_k * 2,
    dense_threshold=float(preset.similarity_threshold),
)

# Étape B : Re-ranking Cross-Encoder
reranked_chunks = await reranker.rerank(
    query=query_text,
    chunks=hybrid_chunks,
    top_k=preset.retrieval_top_k,
    min_threshold=float(preset.similarity_threshold),
)

# Événement 3 : retrieval.completed
yield format_sse("retrieval.completed", {
    "chunks_count": len(reranked_chunks),
    "top_similarity": reranked_chunks[0].cosine_score if reranked_chunks else 0.0,
})

# Événement 4 : sources.available (Citations enrichies pour l'UI)
sources_payload = [
    {
        "chunk_id": str(c.id),
        "document_name": c.document_name,
        "page_number": c.page_number,
        "citation_label": c.citation_label,  # Ex: "[Document.pdf, p.3]" (TNR-14)
        "cosine_score": c.cosine_score,
        "rerank_score": c.rerank_score,
        "delta_top1": c.delta_top1,          # Ex: -0.027 (TNR-25)
        "thermal_status": c.thermal_status,  # "emerald" | "cyan" | "amber" | "rose" (TNR-31)
        "sha256_hash": c.sha256_hash,        # Empreinte 64 hex (TNR-04)
        "content_preview": c.content[:200],
        "is_certified": c.is_certified,
    }
    for c in reranked_chunks
]
yield format_sse("sources.available", {"sources": sources_payload})

# Événement 5 : generation.started
yield format_sse("generation.started", {"model": "llama3.2:3b"})

# Événements 6 : generation.delta (Streaming token par token avec event_id incrémental)
# Événement 7 : message.completed (Métriques réelles : ttft_ms, tokens_per_second)
```

#### B. Points d'Attention Critiques pour la Réussite de l'US-BACK-09

1. **Reprise sur Micro-coupure via `Last-Event-ID` (`TNR-06`) :**
   - Chaque événement SSE doit avoir un identifiant séquentiel : `id: 0`, `id: 1`, `id: 2`, ...
   - Si le client transmet le header HTTP `Last-Event-ID: 15`, le contrôleur doit reprendre le streaming à partir du delta 16 sans répéter les premiers tokens ni casser la session.
2. **Garde Anti-Hallucination sur Domaine Vierge (`TNR-09`) :**
   - Avant de déclencher le retrieval ou le LLM, vérifier s'il existe au moins 1 document indexé pour ce tenant : `doc_count = await get_tenant_document_count(session, tenant_id)`.
   - Si `doc_count == 0` : interdiction absolue de requêter le LLM, émettre directement l'erreur de domaine vierge et fermer le stream.
3. **Vérité Télémétrique (`TNR-10`) :**
   - Mesurer réellement le Time-To-First-Token (`ttft_ms = (t_first_token - t_start) * 1000`) et le débit réel en tokens/seconde. Aucune pensée simulée ou métrique fictive.
4. **Gestion de l'Annulation Client :**
   - Intercepter `asyncio.CancelledError` si l'utilisateur coupe la connexion SSE en cours de streaming pour fermer proprement la session et libérer la connexion du pool sans fuite (`reset_tenant_context`).

---

### 3. État des Tests et Prêt pour Démarrage Backend

* **131 tests unitaires et d'intégration validés** (`pytest backend/tests/ -v`).
* **31 tests de non-régression validés à 100%** (`python scripts/run_tnr_suite.py`).
* Le fichier temporaire d'erreur CI a été résolu et nettoyé.
* L'ensemble des ports et adaptateurs est prêt à être importé depuis `app.domain.ports` et `app.infrastructure.rag`.
