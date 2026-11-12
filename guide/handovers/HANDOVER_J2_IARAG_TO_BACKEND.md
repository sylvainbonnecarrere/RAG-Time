# Document de Passage de Relais (Handover) — IA/RAG vers Backend (Jalon 2)

> **Date :** 12 Novembre 2026  
> **Émetteur :** Agent Ingénieur IA & RAG Souverain  
> **Destinataire :** Agent Développeur Backend FastAPI / SQLAlchemy  
> **Jalon :** JALON 2 — Pipeline d'Ingestion, Trafilatura & Workers ARQ  
> **Tâches Amont Réalisées :** US-IA-01, US-IA-02, US-IA-03  
> **Tâches Aval Destinataire :** US-BACK-04 (Upload & Ingestion Pipeline), US-BACK-05 (Web Scrape & ARQ Task Queue)  
> **Tâches Suivantes Prévues en Co-développement :** US-BACK-07 & US-IA-08 (Simulateur Dry-Run Pré-Indexation TNR-29)

---

## 1. Contexte & Synthèse des Travaux Préparatoires IA/RAG

Le socle hexagonal du traitement documentaire et du partitionnement sémantique a été développé, validé par TDD (100% de réussite sur 98 tests backend, typage Mypy strict à zéro erreur, Ruff conforme) et scellé sur la branche `main`.

L'Agent Backend dispose désormais des adaptateurs prêts à l'emploi et injectables pour construire les endpoints d'API et les tâches asynchrones d'ingestion Redis / ARQ.

### Architecture Hexagonale Disponible

```
backend/app/
├── domain/
│   └── ports/
│       ├── document_parser.py   # DocumentParserPort, ExtractedDocument
│       ├── text_cleaner.py      # TextCleanerPort, CleaningResult
│       └── chunker.py           # ChunkerPort, RawChunk, ChunkingStrategyEnum
└── infrastructure/
    └── rag/
        ├── trafilatura_extractor.py  # TrafilaturaExtractorAdapter (US-IA-01)
        ├── deterministic_cleaner.py  # DeterministicCleanerAdapter (US-IA-02)
        └── multi_strategy_chunker.py # MultiStrategyChunkerAdapter (US-IA-03)
```

---

## 2. API & Composants Mis à Disposition du Backend

### 2.1 Extraction Web & Fichiers (`DocumentParserPort` / `TrafilaturaExtractorAdapter`)
* **Emplacement :** `backend/app/infrastructure/rag/trafilatura_extractor.py`
* **Méthodes :**
  * `parse_html(html_content: str, url: str | None = None) -> ExtractedDocument`
  * `parse_url(url: str) -> ExtractedDocument` *(Vérifie automatiquement `assert_url_safe` avant tout appel HTTP)*.
* **Format produit :** `ExtractedDocument(title, text, date, author, url, raw_metadata)`. Les tableaux HTML sont automatiquement convertis en tableaux Markdown tabulaires `| Col 1 | Col 2 |`.

### 2.2 Assainissement Déterministe (`TextCleanerPort` / `DeterministicCleanerAdapter`)
* **Emplacement :** `backend/app/infrastructure/rag/deterministic_cleaner.py`
* **Méthode :** `clean(text: str) -> CleaningResult`
* **Garanties :** Normalisation Unicode NFC, suppression des balises orphelines sans altérer les formules mathématiques (`p < 0.05`), éradication des invisibles (`\u200B` à `\u200F`, `\uFEFF`, etc.) et normalisation des espacements (`\n\n` max).
* **Format produit :** `CleaningResult(cleaned_text, original_length, cleaned_length, removed_chars, duration_ms)`.

### 2.3 Partitionnement Multi-Stratégies (`ChunkerPort` / `MultiStrategyChunkerAdapter`)
* **Emplacement :** `backend/app/infrastructure/rag/multi_strategy_chunker.py`
* **Méthode :**
  ```python
  chunk(
      text: str,
      strategy: str = "fixed_sliding", # ou "sentence_boundary", "markdown_ast"
      chunk_size: int = 512,
      chunk_overlap: int = 64,         # Doit respecter chunk_overlap < chunk_size / 2 (TNR-28)
      prefix_section_title: bool = True,
      metadata: dict[str, Any] | None = None,
  ) -> list[RawChunk]
  ```
* **Format produit :** `RawChunk` contenant :
  * `chunk_index`: int
  * `content`: str (avec fil d'Ariane contextuel `[Section > Titre]` si Markdown AST - TNR-30)
  * `sha256_hash`: str (empreinte cryptographique 64 caractères hex - TNR-04)
  * `token_count`: int
  * `context_prefix`: str | None
  * `section_title`: str | None
  * `char_start`: int, `char_end`: int
  * `metadata`: dict

---

## 3. Ce qui est Attendu de l'Agent Backend (US-BACK-04 & US-BACK-05)

### 3.1 US-BACK-04 : Endpoint d'Upload & Envoi en Queue ARQ
* **Objectif :** Créer l'endpoint `POST /api/v1/documents/upload` acceptant des fichiers (PDF, TXT, MD, HTML).
* **Enregistrement en base :**
  * Créer le document dans la table `documents` (`status="pending"`).
  * Créer la première entrée dans `document_versions` (`version=1`, `file_hash` SHA-256 du fichier brut).
* **Isolation RLS :** Obligation stricte d'exécuter dans la session liée au `tenant_id` injecté (`get_tenant_session`).
* **Envoi en file Redis :** Déléguer l'extraction, le nettoyage et le chunking à un worker ARQ (`enqueue_job("process_document_task", document_id, version_id, tenant_id)`).

### 3.2 US-BACK-05 : Endpoint Web-Scrape Sécurisé & Tâche Asynchrone ARQ
* **Objectif :** Créer l'endpoint `POST /api/v1/documents/scrape` acceptant une URL et un `tenant_id`.
* **Validation Anti-SSRF :** Valider l'URL via `assert_url_safe(url)` dès l'endpoint FastAPI avant de planifier la tâche ARQ.
* **Worker ARQ :**
  * Exécuter la chaîne : `TrafilaturaExtractorAdapter.parse_url()` $\to$ `DeterministicCleanerAdapter.clean()` $\to$ `MultiStrategyChunkerAdapter.chunk()`.
  * Persister les fragments dans `document_chunks` (sans embedding pour l'instant ou avec embedding mocké en attendant le Jalon 3 US-IA-04).
  * Mettre à jour `documents.status = "indexed"` ou `"failed"`.
  * Trace d'audit dans `query_logs` ou table d'audit.

---

## 4. Pré-requis pour la Suite : US-BACK-07 & US-IA-08 (Dry-Run In-Memory)

Une fois tes endpoints US-BACK-04 et US-BACK-05 opérationnels :
* Nous amorcerons ensemble l'**US-BACK-07 / US-IA-08** : le moteur de simulation **Dry-Run Pré-Indexation** (`POST /api/v1/documents/dry-run`).
* **Invariant Critique TNR-29 :** Cette simulation devra exécuter l'extraction, le nettoyage et le chunking **exclusivement en mémoire**, calculer l'histogramme des tokens et estimer le budget VRAM de l'index HNSW pgvector selon la formule :
  $$\text{VRAM} = \text{chunks} \times (768 \times 4 \text{ octets}) \times 1.4$$
  **Sans aucun `INSERT SQL` en base.**

---

## 5. État des Tests & Qualité de Clôture

* **Tests Backend :** 98/98 tests Pytest passés avec succès.
* **Couverture :** 85% totale (96% sur le chunker, 100% sur le cleaner, 88% sur l'extracteur).
* **Linter Ruff :** 0 erreur.
* **Typage Mypy :** 0 erreur sur 50 fichiers sources.
* **Suite TNR Souveraine :** 31/31 validés (100.0%).
* **Dépôt Git :** Branche `main` propre et à jour de tous les commits relatifs aux US-IA-01, US-IA-02 et US-IA-03.

Le relais est prêt à être pris par l'Agent Backend.
