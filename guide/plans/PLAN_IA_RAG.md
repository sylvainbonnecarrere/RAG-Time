# Plan de Création Ingénierie IA & RAG Souverain — RAGTIME (2026)

> **Agent Responsable :** Agent Ingénieur IA & RAG Souverain  
> **Documents Faisant Autorité :** `architecture/01-architecture.md`, `architecture/02-roadmap.md`, `architecture/03-backlog-agents.md`, `architecture/specifications/referenceChunkEmbed.md`, `architecture/specifications/Recommandations.md`, `architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md`  
> **Conformité & Rigueur :** Principes SOLID, Architecture Hexagonale, Tests Unitaires (Pytest), BDD/TDD, Algorithmes RRF & Cross-Encoder, Règle d'Or Anti-Hallucination

---

## 1. Principes Directeurs & Invariants IA / RAG

1. **Hygiène Stricte du Corpus Source :**  
   « Un corpus sale produit un RAG sale ». L'extraction et le nettoyage mécanique (Unicode NFC, élimination des points de code invisibles) sont obligatoires avant toute tokenisation.
2. **Ports Hexagonaux RAG Découplés :**  
   Les briques IA implémentent scrupuleusement les 4 ports d'abstraction :
   - `DocumentParserPort` (Extraction structurée multi-formats).
   - `ChunkerPort` (Partitionnement sémantique multi-stratégies).
   - `VectorStoragePort` (Indexation et similarité cosinus pgvector HNSW).
   - `LLMInferencePort` (Génération augmentée locale Ollama / vLLM).
3. **Recherche Hybride Éprouvée & RRF :**  
   Fusion mathématique des rangs réciproques $RRF(d) = \sum \frac{1}{60 + r(d)}$ combinant le rappel sémantique dense (pgvector) et la précision lexicale claire (BM25 plein texte PostgreSQL).
4. **Zéro Pensée Simulée (Zero Fake CoT) :**  
   Toutes les étapes du pipeline RAG observables dans l'UI (Reçu $\to$ pgvector $\to$ Isolation $\to$ Chunks $\to$ Ollama) correspondent à des mesures réelles horodatées, sans aucune chaîne de pensée artificielle inventée.
5. **Anti-Hallucination Formelle sur Espace Vierge (TNR-09) :**  
   Interdiction mathématique d'interroger le modèle si le domaine actif ne contient aucun document indexé (`documents_count == 0`).

---

## 2. Découpage en User Stories IA / RAG (US-IA-01 à US-IA-10)

---

### Jalon Prétraitement Documentaire & Hygiène (Priorité 1)

#### US-IA-01 : Pipeline d'Extraction Trafilatura 2.0 & Conversion Tabulaire Markdown [STATUT : VALIDÉ (JALON 2)]
- **User Story :** En tant qu'ingénieur RAG, je veux extraire le texte principal des pages web et documents HTML via Trafilatura 2.0 en éliminant 100% du boilerplate (bannières, scripts, menus) et en convertissant fidèlement les tableaux HTML en Markdown tabulaire pour préserver le contexte des données chiffrées.
- **Tâche PR :** `feat(rag-trafilatura): integrate Trafilatura 2.0 content extraction with markdown table formatter`
- **Pattern & SOLID :** *Strategy Pattern* (`DocumentParserPort`), *Single Responsibility Principle*.
- **Critères d'Acceptation :**
  - Extraction avec `favor_precision=True` par défaut (mode recommandé RAG).
  - Préservation des balises de tableaux HTML transformées en Markdown standard (`| Col 1 | Col 2 |`).
  - Extraction conjointe des métadonnées canoniques (titre, date de publication, auteur, langue).
  - Confinement réseau strict via `assert_url_safe` neutralisant toute attaque SSRF en amont de l'appel réseau.
- **Tests Préalables & Preuve de Validation :**
  - `backend/tests/test_trafilatura_extractor.py` : 5 tests validant l'élimination du bruit, conversion de table Markdown, interception SSRF, et fallback gracieux.
  - Invariant `TNR-26` validé à 100%.
  - Implémentation : [backend/app/domain/ports/document_parser.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/document_parser.py) et [backend/app/infrastructure/rag/trafilatura_extractor.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/trafilatura_extractor.py).

#### US-IA-02 : Pipeline Déterministe d'Assainissement (NFC & Invisibles) [STATUT : VALIDÉ (JALON 2)]
- **User Story :** En tant qu'ingénieur de données, je veux exécuter une passe de nettoyage mécanique déterministe en 4 étapes ordonnées (Unicode NFC $\to$ Purge balises résiduelles $\to$ Éradication des caractères invisibles $\to$ Normalisation des espaces) pour empêcher les divergences vectorielles indétectables à l'œil.
- **Tâche PR :** `feat(rag-cleaning): deterministic mechanical cleaning pipeline with unicode NFC and zero-width purge`
- **Pattern & SOLID :** *Pipeline Pattern*, *Interceptor Pattern*.
- **Critères d'Acceptation :**
  - Normalisation Unicode canonique composée (`unicodedata.normalize('NFC', text)`).
  - Purge stricte des caractères invisibles corrupteurs : `\u200B` à `\u200F` (zero-width), `\u202A` à `\u202E` (directionnels), `\uFEFF` (BOM), `\u00AD` (soft hyphen).
  - Préservation intégrale des formules scientifiques et mathématiques (ex: `p < 0.05` et `s > 0.75`).
  - Condensation des espaces multiples et normalisation des paragraphes.
- **Tests Préalables & Preuve de Validation :**
  - `backend/tests/test_cleaning_pipeline.py` : 5 tests unitaires vérifiant l'unification NFC, la purge de 5+ caractères invisibles, la conservation de formules mathématiques et la condensation des espaces.
  - Invariant `TNR-27` validé à 100%.
  - Implémentation : [backend/app/domain/ports/text_cleaner.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/text_cleaner.py) et [backend/app/infrastructure/rag/deterministic_cleaner.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/deterministic_cleaner.py).

#### US-IA-03 : Implémentation du Port `ChunkerPort` & Partitionnement Multi-Stratégies [STATUT : VALIDÉ (JALON 2)]
- **User Story :** En tant qu'analyste RAG, je veux segmenter les documents selon l'une des 3 stratégies configurées sur le preset actif (Fenêtre glissante avec overlap, Découpage phrastique respectant la grammaire française, ou Sections Markdown AST avec préfixe hiérarchique) afin d'isoler des unités sémantiques cohérentes.
- **Tâche PR :** `feat(rag-chunking): multi-strategy chunker port implementation (sliding window, sentence boundary, markdown AST)`
- **Pattern & SOLID :** *Strategy Pattern*, *Factory Pattern*.
- **Critères d'Acceptation :**
  - *Fenêtre Glissante :* Respect strict de l'invariant `chunk_overlap < chunk_size / 2` (`TNR-28`).
  - *Phrastique Sémantique :* Découpage sur ponctuation forte sans casser les abréviations françaises courantes (M., Mme., Dr., al., etc.).
  - *Sections Markdown :* Découpage sur les titres `#` avec injection obligatoire du fil d'Ariane au début du chunk (`[Titre > Sous-titre] Contenu...`) (`TNR-30`).
  - Chaque chunk se voit attribuer un hash cryptographique SHA-256 de son contenu propre (`TNR-04`).
- **Tests Préalables & Preuve de Validation :**
  - `backend/tests/test_chunking_strategies.py` : 5 tests unitaires validant l'invariant `overlap < size / 2`, la préservation des abréviations françaises, le fil d'Ariane hiérarchique Markdown AST, l'empreinte SHA-256 (64 hex) et la gestion des cas limites.
  - Invariants `TNR-28` et `TNR-30` validés à 100%.
  - Implémentation : [backend/app/domain/ports/chunker.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/chunker.py) et [backend/app/infrastructure/rag/multi_strategy_chunker.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/multi_strategy_chunker.py).

---

### Jalon Vectorisation, Recherche Hybride & Re-ranking (Priorité 2)

#### US-IA-04 : Implémentation du Port `VectorStoragePort` (pgvector HNSW 768d) [STATUT : VALIDÉ (JALON 3)]
- **User Story :** En tant que moteur vectoriel, je veux transformer les chunks de texte en vecteurs d'embedding denses de 768 dimensions via `nomic-embed-text-v1.5` local, et exécuter la recherche cosinus indexée en HNSW sous PostgreSQL 16.
- **Tâche PR :** `feat(rag-vector-storage): pgvector HNSW adapter with local nomic-embed-text embeddings`
- **Pattern & SOLID :** *Adapter Pattern*, *Repository Pattern*.
- **Critères d'Acceptation :**
  - Appel local du modèle d'embedding via Ollama (`/api/embeddings`) ou runtime déterministe unitaire sans fuite externe.
  - Normalisation unitaire $L_2$ stricte ($\|v\|_2 = 1.0$) garantissant la commutativité entre distance cosinus et produit scalaire.
  - Insertion SQL dans la colonne `embedding vector(768)` avec rattachement hiérarchique au document, version et tenant.
  - Requête de similarité cosinus exploitant l'opérateur `<=>` et l'index HNSW ($m=16, ef=64$) avec configuration `SET LOCAL hnsw.ef_search = 64`.
  - Isolation Row-Level Security (RLS) PostgreSQL stricte : aucune fuite de chunk inter-tenant lors de la recherche vectorielle (`TNR-02`, `TNR-04`).
- **Tests Préalables & Preuve de Validation :**
  - `backend/tests/test_pgvector_storage.py` : 3 tests unitaires et d'intégration validant la dimensionnalité 768d et la normalisation $L_2$, la recherche K-NN cosinus (Top-1 thématique, calcul de similarité $1.0 - \text{distance}$) et l'isolation hermétique multi-tenant RLS (0 fuite).
  - Intégration worker : [backend/app/core/worker.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/core/worker.py) vectorise et persiste automatiquement les chunks lors du job d'ingestion ARQ.
  - Invariant `TNR-04` validé à 100%.
  - Implémentation : [backend/app/domain/ports/vector_storage.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/vector_storage.py), [backend/app/infrastructure/rag/ollama_embedding.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/ollama_embedding.py) et [backend/app/infrastructure/rag/pgvector_storage.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/pgvector_storage.py).

#### US-IA-05 : Algorithme de Recherche Hybride Dense/Sparse & Fusion RRF ($k=60$)
- **User Story :** En tant que moteur de recherche, je veux réconcilier la recherche sémantique dense (pgvector) et la recherche lexicale clairsemée (PostgreSQL Full-Text BM25) via la formule Reciprocal Rank Fusion avec constante $k=60$ pour repêcher les documents comportant des mots-clés exacts rares.
- **Tâche PR :** `feat(rag-hybrid-rrf): hybrid retrieval engine combining dense cosine and sparse BM25 with RRF k=60`
- **Pattern & SOLID :** *Strategy Pattern*, *Rank Fusion Adapter*.
- **Critères d'Acceptation :**
  - Calcul de rang pour chaque candidat : $RRF(d) = \frac{1}{60 + r_{dense}} + \frac{1}{60 + r_{sparse}}$.
  - Repêchage validé des chunks contenant des termes métier rares (ex: codes d'erreur, références juridiques).
  - Élimination des chunks sous le seuil d'admissibilité configuré dans le preset actif.
- **Tests Préalables (TDD - Pytest) :**
  - `test_rrf_algorithm.py` : Vérification du reclassement de chunks repêchés par BM25.
  - `tnr_rrf_consistency.py` (TNR-07) : Non-régression sur le calcul de fusion réciproque.

#### US-IA-06 : Re-ranking Local Cross-Encoder `bge-reranker-base` & Métriques Cosinus
- **User Story :** En tant qu'analyste qualité RAG, je veux réordonner le Top-K contextuel via le modèle local Cross-Encoder `bge-reranker-base`, calculer le $\Delta$ par rapport au Top-1 pour chaque citation, et fournir les scores nécessaires à la jauge thermique de l'UI.
- **Tâche PR :** `feat(rag-reranker): local Cross-Encoder re-ranking with bge-reranker-base and top-1 delta metrics`
- **Pattern & SOLID :** *Decorator Pattern*, *Adapter Pattern*.
- **Critères d'Acceptation :**
  - Exécution locale du Cross-Encoder en inférence rapide (< 45 ms pour le Top-10).
  - Calcul du score cosinus absolu, du statut thermique (Émeraude $\ge 0.85$, Cyan, Ambre, Rose) et du $\Delta$ Top-1 ($\text{score} - \text{score}_{\text{top1}}$).
  - Formatage des métadonnées de citations transmises dans l'événement SSE `sources.available`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_cross_encoder_rerank.py` : Vérification de l'affinement du Top-K sans dégradation du score cosinus originel.
  - `tnr_cosine_visual_scale.py` (TNR-25) : Validation des tranches thermiques et de la précision du delta.

---

### Jalon Inférence Locale, Guardrails & Simulation (Priorité 3)

#### US-IA-07 : Connecteur LLM Inférence Locale Ollama / Llama 3.2:3B sans Pensée Simulée
- **User Story :** En tant qu'utilisateur interrogeant le système, je veux que le prompt enrichi (instruction système du domaine + chunks certifiés du tenant) soit transmis au modèle local Llama 3.2:3B Instruct via Ollama et que la réponse soit streamée token par token sans aucune fausse chaîne de réflexion inventée.
- **Tâche PR :** `feat(rag-llm-inference): local Ollama Llama 3.2 streaming connector with strictly grounded prompt injection`
- **Pattern & SOLID :** *Adapter Pattern*, *Template Method Pattern*.
- **Critères d'Acceptation :**
  - Confinement strict du prompt aux seuls extraits sourcés (consigne impérative de silence si l'information n'est pas dans le contexte).
  - Streaming asynchrone des deltas textuels sans latence de mise en mémoire tampon.
  - Calcul en direct du Time-To-First-Token (TTFT) et du débit en tokens/seconde.
- **Tests Préalables (TDD - Pytest) :**
  - `test_ollama_streaming.py` : Streaming de tokens avec mock local mesurant le TTFT et le débit.
  - `tnr_no_fake_cot.py` (TNR-10) : Vérification de l'absence de fausses chaînes de pensée.

#### US-IA-08 : Moteur de Simulation Dry-Run Pré-Indexation (Calcul Tokens & VRAM) [STATUT : VALIDÉ (JALON 2)]
- **User Story :** En tant qu'analyste RAG, je veux exécuter une simulation complète en mémoire sur un document brut pour auditer le partitionnement, la répartition des tokens et l'empreinte VRAM pgvector HNSW avant de déclencher la vectorisation définitive.
- **Tâche PR :** `feat(rag-dryrun-engine): in-memory pre-indexing dry run engine with token histogram and HNSW VRAM budget calculator`
- **Pattern & SOLID :** *Command Pattern*, *Pure Function Calculation*, *Strategy Pattern*.
- **Critères d'Acceptation :**
  - Exécution en mémoire sans écriture en base (zéro persistance SQL - `TNR-29`).
  - Calcul de l'histogramme fin de taille des chunks (min, médiane, max, percentiles p25/p75 et répartition par tranches).
  - Audit d'équilibre sémantique (détection des anomalies < 60 tokens et > 800 tokens).
  - Formule d'estimation VRAM pgvector HNSW : $\text{raw\_bytes} = \text{chunks} \times \text{dim} \times 4 \text{ octets}$, $\text{hnsw\_bytes} = \text{round}(\text{raw\_bytes} \times 1.5)$, $\text{total\_vram} = \text{raw\_bytes} + \text{hnsw\_bytes}$.
- **Tests Préalables & Preuve de Validation :**
  - `backend/tests/test_dryrun_calculator.py` : 4 tests validant la formule VRAM (768d et 1024d), l'histogramme et quantiles, l'audit d'anomalies sémantiques et la simulation in-memory complète.
  - `backend/tests/test_dry_run_endpoint.py` : 3 tests d'intégration HTTP validant l'absence totale de persistance en base (`COUNT(documents) == 0` et `COUNT(document_chunks) == 0`).
  - Invariant `TNR-29` validé à 100%.
  - Implémentation : [backend/app/domain/ports/dry_run.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/domain/ports/dry_run.py) et [backend/app/infrastructure/rag/dry_run_simulator.py](file:///c:/AITest/RAGTIME/RAG-Time/backend/app/infrastructure/rag/dry_run_simulator.py).

#### US-IA-09 : Guardrail Éthique Anti-Hallucination & Verrouillage Domaine Vierge (TNR-09)
- **User Story :** En tant que responsable de la souveraineté, je veux que le pipeline RAG intercepte et bloque formellement toute tentative de génération si le domaine interrogé ne contient aucun document indexé (`documents_count == 0`), afin d'éradiquer toute hallucination hors-sol.
- **Tâche PR :** `feat(rag-guardrail): empty-domain query interception and anti-hallucination guardrail`
- **Pattern & SOLID :** *Interceptor Pattern*, *Fail-Safe Default*.
- **Critères d'Acceptation :**
  - Interception préalable dès l'analyse de la requête.
  - Renvoi immédiat d'un statut explicite `{"status": "no_documents_indexed", "action": "upload_required"}` sans solliciter le LLM Ollama.
- **Tests Préalables (TDD - Pytest) :**
  - `test_empty_domain_guard.py` : Requête sur domaine vierge rejetée immédiatement.
  - `tnr_empty_domain_guard.py` (TNR-09) : Validation bloquante de la règle éthique.

#### US-IA-10 : Traçabilité Cryptographique des Citations & Hachage SHA-256
- **User Story :** En tant qu'auditeur légal, je veux que chaque citation restituée soit irrévocablement adossée à son extrait brut inaltéré, son numéro de page et son empreinte cryptographique SHA-256 calculée à l'ingestion, afin de garantir l'absence absolue de falsification.
- **Tâche PR :** `feat(rag-citation-integrity): cryptographic SHA-256 source traceability and verifiable citations formatting`
- **Pattern & SOLID :** *Data Integrity Pattern*, *Value Object*.
- **Critères d'Acceptation :**
  - Vérification de concordance entre le hash du chunk affiché et le hash stocké dans `document_chunks`.
  - Formatage standardisé des citations pour l'UI : `[Nom_Document, p.X]` avec métadonnées JSONB certifiées.
- **Tests Préalables (TDD - Pytest) :**
  - `test_citation_integrity.py` : Vérification du calcul SHA-256 et de l'intégrité des métadonnées de citation.
  - `tnr_chunk_metadata_integrity.py` (TNR-04) : Non-régression sur l'inaltérabilité des extraits.

---

## 3. Matrice de Couverture des Tests de Non-Régression (TNR IA / RAG)

| ID TNR | Périmètre IA / RAG | Règle d'Or Bloquante |
|---|---|---|
| **TNR-04** | Intégrité des Chunks | Extraits bruts inaltérés avec métadonnées JSONB certifiées |
| **TNR-07** | Fusion Hybride RRF | Repêchage vérifié des mots-clés exacts par la formule $1/(60+r)$ |
| **TNR-09** | Anti-Hallucination | Blocage absolu de prompt sur domaine sans document (`doc_count == 0`) |
| **TNR-10** | Télémétrie & CoT | Zéro pensée simulée ; métriques TTFT et tokens/s réelles |
| **TNR-18** | Immutabilité Presets | Scellement définitif du modèle d'embedding dès le 1er chunk indexé |
| **TNR-25** | Inspecteur Cosinus | Jauge thermique continue (0.50 à 1.00) et calcul précis de $\Delta$ Top-1 |
| **TNR-26** | Trafilatura Options | Élimination totale du boilerplate et conversion des tableaux Markdown |
| **TNR-27** | Nettoyage Déterministe | Normalisation NFC et éradication des invisibles sans perte mathématique |
| **TNR-28** | Invariants Chunking | Respect strict de `overlap < size / 2` et découpage phrastique intègre |
| **TNR-29** | Dry-Run Pré-Indexation | Simulation en mémoire sans écriture en base de données |
| **TNR-30** | Préfixage Contextuel | Injection du fil d'Ariane `[Section > Sous-titre]` sur découpage Markdown AST |
