# Document de Passage de Relais (Handover) — Backend vers Ingénieur IA & RAG Souverain

> **Date :** 23 Novembre 2026  
> **Émetteur :** Agent Développeur Backend Senior (FastAPI / SQLModel)  
> **Destinataire :** Agent Ingénieur IA & RAG Souverain  
> **Jalon :** JALON 2 — Pipeline d'Ingestion, Trafilatura & Workers ARQ  
> **Tâches Amont Réalisées :** US-BACK-04 (Upload Multipart), US-BACK-05 (Web Scrape Anti-SSRF), US-BACK-07 (Endpoint Dry-Run Simulation)  
> **Tâche Aval Destinataire :** US-IA-08 (Moteur de Simulation Dry-Run Pré-Indexation, Histogrammes de Tokens & Audit VRAM)  
> **Jalon Suivant en Ligne de Mire :** JALON 3 — Moteur Vectoriel Hybride RRF & Streaming SSE FastAPI

---

## 1. Contexte & Réalisations de l'US-BACK-07

Conformément au plan jalonné [PLAN_BACKEND.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_BACKEND.md) et aux exigences souveraines de l'architecture RAGTIME, l'endpoint REST de simulation Dry-Run a été conçu, développé et validé selon la méthodologie TDD.

### Endpoint Disponible & Fonctionnel
* **Route :** `POST /api/v1/tenants/{tenant_id}/documents/dry-run`
* **Contrôleur :** [`backend/app/api/v1/endpoints/documents.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/api/v1/endpoints/documents.py)
* **Modèles DTO :** [`backend/app/models/documents.py`](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/models/documents.py)
  * `DryRunSimulationRequest(text, strategy, chunk_size, chunk_overlap, prefix_section_title)`
  * `DryRunSimulationResponse(total_chunks, total_tokens, avg_tokens_per_chunk, min_tokens, max_tokens, raw_vector_bytes, hnsw_overhead_bytes, total_vram_bytes, preview_chunks)`
  * `DryRunChunkPreviewDTO(chunk_index, token_count, char_count, context_prefix, excerpt)`

---

## 2. Invariants d'Ingénierie Validés

1. **Isolation Absolue en Mémoire Vive (TNR-29) :**
   * L'endpoint exécute la chaîne `DeterministicCleanerAdapter.clean()` $\to$ `MultiStrategyChunkerAdapter.chunk()` **strictement en mémoire**.
   * Les tests d'intégration vérifient formellement que suite à un appel à l'endpoint de simulation :
     $$\textbf{COUNT(documents)} = 0 \quad \text{et} \quad \textbf{COUNT(document\_chunks)} = 0$$
   * Aucun `INSERT SQL` n'est déclenché en base de données.
2. **Contrôle d'Invariant de Partitionnement (TNR-28) :**
   * Rejet immédiat avec `HTTP 400 Bad Request` si la condition `chunk_overlap < chunk_size / 2` est violée.
3. **Budget Mémoire VRAM HNSW (Formule Validée Phase 7 & TNR-29) :**
   * $\text{raw\_bytes} = \text{total\_chunks} \times 768 \times 4$ octets.
   * $\text{hnsw\_bytes} = \text{round}(\text{raw\_bytes} \times 1.5)$ (surcharge des listes d'adjacence $M=16$, $ef=64$).
   * $\text{total\_vram\_bytes} = \text{raw\_bytes} + \text{hnsw\_bytes}$.

---

## 3. Ce qui est Attendu de l'Agent Ingénieur IA & RAG Souverain (US-IA-08)

Pour compléter l'**US-IA-08** :
1. **Enrichissement Statistique & Distribution des Chunks :**
   * Calculer l'histogramme fin de la taille des tokens (distribution par quantiles / tranches) pour permettre à l'UI d'afficher un graphique de répartition dans `PreIndexingDryRunModal.tsx`.
   * Intégrer les métriques avancées d'audit de dilution sémantique (chunks $< 60$ tokens = perte d'ancrage, chunks $> 800$ tokens = risque de dilution vectorielle).
2. **Dimensionnement des Modèles Locaux :**
   * Mettre en regard le budget VRAM calculé pour l'index pgvector HNSW avec l'empreinte VRAM du modèle d'embedding (`nomic-embed-text-v1.5` $\approx 560$ Mo) et du LLM local (`llama3.2:3b` en 4-bit $\approx 2.2$ Go) pour renvoyer une alerte de dépassement si $\text{VRAM}_{\text{totale}} > 85\%$.
3. **Validation & Clôture Jalon 2 :**
   * Mettre à jour `guide/plans/PLAN_IA_RAG.md` pour marquer l'**US-IA-08** comme validée.
   * Vérifier que tous les tests restent au vert et que les 31 TNR sont à 100%.

---

## 4. État des Tests & Qualité de Clôture

* **Tests Backend :** **113 tests passés avec succès (100% de réussite)**.
* **Couverture de code :** **81%** sur l'ensemble du backend.
* **Audit Statique :** `ruff check backend/` (0 erreur), `mypy backend/ --ignore-missing-imports` (0 erreur sur 54 fichiers).
* **Banc d'Essai Souverain :** **31/31 tests TNR validés (100.0%)**, confirmant TNR-28 et TNR-29.
* **Dépôt Git :** Prêt pour commit et transmission.
