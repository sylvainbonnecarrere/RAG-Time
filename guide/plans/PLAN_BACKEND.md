# Plan de Création Backend — RAGTIME (2026)

> **Agent Responsable :** Développeur Backend Senior (FastAPI / SQLModel / Alembic / ARQ)  
> **Documents Faisant Autorité :** `architecture/01-architecture.md`, `architecture/03-backlog-agents.md`, `architecture/07-security-model.md`, `guide/GUIDE_COLLABORATION_AGENTS.md`, `architecture/specifications/Recommandations.md`, `architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md`  
> **Conformité & Rigueur :** Principes SOLID, Architecture Hexagonale, Tests Unitaires (Pytest async), BDD/TDD, Row-Level Security (RLS) et Tests de Non-Régression (TNR)

---

## 1. Principes Directeurs & Invariants Backend

1. **Architecture Hexagonale Stricte :** Séparation étanche entre les contrôleurs REST/SSE (Adapters primaires), le domaine métier (Services/Actions), les modèles (SQLModel) et les ports secondaires d'infrastructure (PostgreSQL pgvector, Redis ARQ, Ollama).
2. **Isolation Cryptographique & Multi-Tenant (RLS Native) :**
   - Toute table multi-tenant (`documents`, `document_versions`, `document_chunks`, `audit_logs`, `rag_presets`) est protégée par PostgreSQL Row-Level Security via `current_setting('app.current_tenant_id', true)::uuid = tenant_id`.
   - Zéro requête SQL sans injection préalable du contexte de session du tenant.
   - Encapsulation transactionnelle stricte avec `RESET app.current_tenant_id;` pour neutraliser le risque de fuite de contexte sur le pool de connexions `asyncpg`.
3. **Contrat SSE Standardisé :**
   - L'endpoint `/api/v1/chat/conversations/{id}/stream` émet les 8 événements normalisés (`message.started` à `message.completed`).
   - Prise en charge obligatoire de l'en-tête `Last-Event-ID` pour la reprise sans doublon de token.
4. **Ingestion Asynchrone Découplée (ARQ / Redis) :**
   - Toute opération d'extraction, nettoyage ou chunking lourd est déléguée aux workers ARQ asynchrones sans bloquer l'Event Loop ASGI FastAPI.
5. **Garantie d'Immutabilité TNR-18 (Double Barrière) :**
   - Barrière 1 : Service Pydantic refusant la modification d'un preset si `document_chunks` contient des données pour ce tenant (`409 Conflict`).
   - Barrière 2 : Trigger PostgreSQL `BEFORE UPDATE ON rag_presets` bloquant toute écrasement in-place.

---

## 2. Découpage en User Stories Backend (US-BACK-01 à US-BACK-12)

---

### Jalon BDD & Socle de Sécurité RLS (Priorité 1)

#### US-BACK-01 : Schéma Relationnel Initial, Extensions & Migrations Alembic
- **User Story :** En tant qu'architecte BDD, je veux initialiser les extensions PostgreSQL (`vector`, `pgcrypto`) et les modèles SQLModel pour les tables maîtresses (`tenants`, `documents`, `document_versions`, `document_chunks`, `rag_presets`, `audit_logs`) via des migrations Alembic déterministes.
- **Tâche PR :** `feat(db): initialize postgres schema with pgvector extension, sqlmodel models, and alembic migrations`
- **Pattern & SOLID :** *Single Responsibility Principle*, *Data Mapper / ORM Pattern*.
- **Critères d'Acceptation :**
  - Activation de `CREATE EXTENSION IF NOT EXISTS vector;` et `pgcrypto`.
  - Colonne `embedding vector(768)` indexée en HNSW (`USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)`).
  - Indexation GIN sur `metadata JSONB` des chunks.
  - Table `audit_logs` horodatée pour la traçabilité intégrale des requêtes.
- **Tests Préalables (TDD - Pytest) :**
  - `test_db_schema.py` : Vérifie la création correcte de toutes les tables et index HNSW.
  - `tnr_db_migration.py` : Validation de l'idempotence des migrations Alembic `upgrade` et `downgrade`.

#### US-BACK-02 : Activation et Enrôlement de la Row-Level Security (RLS) Multi-Tenant & Gestion du Pooling
- **User Story :** En tant que garant de la souveraineté, je veux appliquer les politiques PostgreSQL RLS sur l'ensemble des tables métier basées sur `app.current_tenant_id` avec réinitialisation garantie à la libération de connexion et émission d'un en-tête d'information de session pour avertir l'utilisateur (popup UI) en cas de réinitialisation automatique.
- **Tâche PR :** `feat(security-rls): enforce postgres row-level security policies across all tenant tables with safe connection pool reset`
- **Pattern & SOLID :** *Defense-in-Depth*, *Fail-Safe Default Pattern*.
- **Critères d'Acceptation :**
  - `ALTER TABLE documents ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;`
  - Politique : `CREATE POLICY tenant_isolation_policy ON document_chunks FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);`
  - Gestionnaire de contexte asynchrone SQLAlchemy `async with tenant_context(tenant_id):` assurant la configuration et la réinitialisation systématique (`RESET app.current_tenant_id;`) à la libération de la connexion.
  - Détection de rupture de contexte et transmission de l'en-tête `X-Tenant-Session-Reset: true` afin que le frontend affiche une notification explicite à l'utilisateur.
- **Tests Préalables (TDD - Pytest) :**
  - `test_rls_isolation.py` : Tentative d'extraction de données du tenant B avec le contexte du tenant A renvoyant 0 ligne.
  - `tnr_tenant_isolation_sql.py` (TNR-02) : Test de non-régression validant l'étanchéité SQL absolue.

#### US-BACK-03 : Trigger SQL et Contrainte d'Immutabilité du Preset (TNR-18)
- **User Story :** En tant qu'analyste RAG, je veux qu'un trigger PostgreSQL bloque toute mise à jour de la configuration de chunking ou d'embedding sur un preset actif si des vecteurs existent déjà pour ce tenant, forçant la création d'un preset $v+1$.
- **Tâche PR :** `feat(db-trigger): implement postgresql immutability trigger on rag_presets table for TNR-18`
- **Pattern & SOLID :** *Immutability Pattern*, *Database Invariant Enforcement*.
- **Critères d'Acceptation :**
  - Trigger `trg_freeze_preset_on_ingested_docs` vérifiant `SELECT count(*) FROM document_chunks WHERE tenant_id = OLD.tenant_id`.
  - Si le compte est $> 0$ et que `embedding_model`, `chunk_size` ou `chunk_overlap` est modifié, déclenchement d'une exception SQL `RAISE EXCEPTION 'CANNOT_MODIFY_FROZEN_PRESET'`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_preset_immutability_trigger.py` : Tentative de modification directe d'un preset alimenté levant une exception SQL.
  - `tnr_preset_freeze_sql.py` (TNR-18) : Validation de l'invariant mathématique scellé.

---

### Jalon Ingestion Asynchrone & Workers ARQ (Priorité 2)

#### US-BACK-04 : Endpoint d'Upload Documentaire & File d'Attente Redis / ARQ
- **User Story :** En tant qu'utilisateur téléversant des documents, je veux un endpoint `POST /api/v1/documents/upload` qui réceptionne le fichier multipart, calcule et valide le SHA-256 côté serveur, enregistre le document en statut `pending` et enrôle un job d'ingestion dans Redis / ARQ.
- **Tâche PR :** `feat(ingestion-api): multipart upload endpoint with sha256 checksum and ARQ job dispatching`
- **Pattern & SOLID :** *Command Pattern*, *Producer-Consumer Pattern*.
- **Critères d'Acceptation :**
  - Vérification des Magic Bytes (`magicBytes.ts` côté backend avec `python-magic`) rejetant les fichiers non autorisés.
  - Calcul du hash SHA-256 et comparaison avec le hash fourni par le client.
  - Enrôlement dans la queue Redis `arq:queue` avec identifiant `job_id` (UUID v4).
  - Retour HTTP 202 Accepted avec DTO `AsyncIngestionJobProgress`.
- **Tests Préalables (TDD - Pytest) :**
  - `test_upload_endpoint.py` : Téléversement d'un PDF valide renvoyant le code 202 et un job UUID.
  - `tnr_document_versioning_backend.py` (TNR-03) : Upload homonyme créant une version $v+1$ sans écrasement.

#### US-BACK-05 : Endpoint d'Ingestion Web & Scraper Trafilatura 2.0 Sécurisé
- **User Story :** En tant qu'utilisateur important un article web, je veux soumettre une URL sur `POST /api/v1/documents/web-scrape` pour lancer l'extraction Trafilatura avec protection anti-SSRF et conversion en Markdown tabulaire.
- **Tâche PR :** `feat(web-scrape): secure Trafilatura extraction endpoint with anti-SSRF filter and markdown table formatting`
- **Pattern & SOLID :** *Adapter Pattern*, *Defensive Programming*.
- **Critères d'Acceptation :**
  - Résolution DNS stricte de l'URL cible : rejet formel des IP de bouclage (`127.0.0.1`), plages privées RFC 1918 et adresses de métadonnées (`169.254.169.254`).
  - Appel de Trafilatura en mode `favor_precision=True` avec support de `lxml-html-clean`.
  - Capture des métadonnées (titre canonique, date, auteur).
- **Tests Préalables (TDD - Pytest) :**
  - `test_anti_ssrf.py` : Tentatives de requêtes vers `http://localhost:8000` et `http://192.168.1.1` rejetées avec HTTP 400.
  - `tnr_trafilatura_extraction.py` (TNR-26) : Vérification de la conversion de tableaux HTML en tableaux Markdown.

#### US-BACK-06 : Worker ARQ d'Ingestion (Extraction, Nettoyage NFC, Chunking & Indexation pgvector)
- **User Story :** En tant que worker asynchrone ARQ, je veux dépiler les tâches d'ingestion et exécuter séquentiellement le nettoyage déterministe (Unicode NFC, éradication d'invisibles), le découpage selon la stratégie du preset actif, le calcul des embeddings nomic-embed et l'insertion par lots dans `document_chunks`.
- **Tâche PR :** `feat(arq-worker): complete ingestion pipeline worker with clean, chunk, embed, and batch insert`
- **Pattern & SOLID :** *Pipeline Pattern*, *Observer Pattern* (mise à jour de progression Redis).
- **Critères d'Acceptation :**
  - Progression mise à jour dans Redis : `extracting` $\to$ `cleaning` $\to$ `chunking` $\to$ `embedding` $\to$ `indexing` $\to$ `completed`.
  - Insertion SQL par lots (batch size de 100 chunks) pour préserver les performances de l'index HNSW.
  - Gestion résiliente des exceptions avec mise à jour du statut `failed` et message d'erreur sécurisé.
- **Tests Préalables (TDD - Pytest) :**
  - `test_arq_worker_pipeline.py` : Exécution complète du worker sur un corpus de test avec vérification du nombre de chunks insérés.
  - `tnr_cleaning_invisibles.py` (TNR-27) : Vérification de l'absence de caractères de contrôle dans les chunks en base.

#### US-BACK-07 : Endpoint de Simulation Dry-Run Pré-Indexation
- **User Story :** En tant qu'analyste RAG, je veux appeler `POST /api/v1/documents/dry-run` pour prévisualiser en direct le nombre de chunks, l'estimation de tokens et l'empreinte VRAM pgvector sans persistance en base de données.
- **Tâche PR :** `feat(dry-run-api): in-memory pre-indexing dry run simulation endpoint`
- **Pattern & SOLID :** *Command Pattern* (idempotence sans effet de bord).
- **Critères d'Acceptation :**
  - Exécution du pipeline en mémoire vive pure sans appel SQL `INSERT`.
  - Calcul de l'estimation mémoire VRAM : $\text{chunks} \times 768 \times 4$ octets bruts $+$ index HNSW.
  - Restitution paginée des 3 premiers chunks générés.
- **Tests Préalables (TDD - Pytest) :**
  - `test_dry_run_endpoint.py` : Vérification qu'aucun enregistrement n'a été créé dans la table `document_chunks`.
  - `tnr_dryrun_isolation.py` (TNR-29) : Test d'isolation totale sans effet de bord.

---

### Jalon API REST, Recherche Hybride & Streaming SSE (Priorité 3)

#### US-BACK-08 : Moteur de Recherche Hybride PostgreSQL (Full-Text BM25 + pgvector Cosine RRF)
- **User Story :** En tant qu'utilisateur posant une question, je veux que le backend exécute conjointement la recherche vectorielle dense HNSW et la recherche textuelle plein texte PostgreSQL (`tsvector`), puis fusionne les rangs selon l'algorithme RRF ($k=60$) pour remonter les chunks les plus pertinents.
- **Tâche PR :** `feat(retrieval): hybrid search engine with pgvector dense cosine and full-text BM25 RRF fusion`
- **Pattern & SOLID :** *Strategy Pattern*, *Composite Pattern*.
- **Critères d'Acceptation :**
  - Requête vectorielle dense : `SELECT id, content, embedding <=> :query_vec AS cosine_dist FROM document_chunks ORDER BY cosine_dist LIMIT :top_k*2;`
  - Requête lexicale sparse : `SELECT id, ts_rank(to_tsvector('french', content), plainto_tsquery('french', :query)) AS rank_sparse FROM document_chunks ...;`
  - Calcul déterministe de la formule : $RRF(d) = \frac{1}{60 + r_{dense}} + \frac{1}{60 + r_{sparse}}$.
  - Élimination des doublons et réordonnancement Top-K certifié.
- **Tests Préalables (TDD - Pytest) :**
  - `test_rrf_fusion.py` : Vérification mathématique de la fusion des rangs et du repêchage de termes rares.
  - `tnr_rrf_consistency.py` (TNR-07) : Test de non-régression sur la formule mathématique.

#### US-BACK-09 : Contrôleur de Streaming SSE Réel (`/api/v1/chat/conversations/{id}/stream`)
- **User Story :** En tant qu'interface conversationnelle, je veux consommer un flux Server-Sent Events (SSE) émettant les 8 événements normalisés avec transport des citations thermiques, métriques TTFT et tolérance aux micro-coupures via `Last-Event-ID`.
- **Tâche PR :** `feat(sse-streaming): production SSE controller with 8 standardized events and reconnection support`
- **Pattern & SOLID :** *Observer / Reactive Stream Pattern*, *FSM*.
- **Critères d'Acceptation :**
  - Émission ordonnée : `message.started` $\to$ `retrieval.started` $\to$ `retrieval.completed` $\to$ `generation.started` $\to$ `generation.delta` $\to$ `sources.available` $\to$ `message.completed`.
  - Prise en charge de `Last-Event-ID` pour reprise de flux sans duplication de mots.
  - Calcul et transmission des métriques d'inférence réelles (`ttft_ms`, `tokens_per_second`).
  - Annulation propre du stream en cas de déconnexion client (`asyncio.CancelledError`).
- **Tests Préalables (TDD - Pytest) :**
  - `test_sse_stream.py` : Test de streaming avec TestClient validant la structure des 8 trames d'événements.
  - `tnr_stream_reconnection.py` (TNR-06) : Vérification de la reprise sur `Last-Event-ID`.

#### US-BACK-10 : CRUD des Presets Nommés par Domaine & Sélecteur par Défaut (TNR-31)
- **User Story :** En tant qu'administrateur de domaine, je veux créer, consulter, nommer librement mes presets de retrieval (Top-K, seuil cosinus, Cross-Encoder), désigner le preset par défaut et récupérer les 3 presets d'usine lors de la création d'un domaine.
- **Tâche PR :** `feat(presets-api): named preset lifecycle management, default preset selection, and factory presets seeding`
- **Pattern & SOLID :** *Repository Pattern*, *Factory Pattern*.
- **Critères d'Acceptation :**
  - Initialisation automatique des 3 presets types lors de la création d'un tenant (« Équilibré et standard » actif par défaut).
  - Endpoint `PUT /api/v1/tenants/{id}/presets/{preset_id}/set-default` pour commuter le preset par défaut.
  - Support de noms libres personnalisés sans suffixe de versioning rigide.
- **Tests Préalables (TDD - Pytest) :**
  - `test_preset_management.py` : Création de preset nommé et permutation du preset par défaut.
  - `tnr_named_presets.py` (TNR-31) : Non-régression sur la synchronisation des presets par domaine.

#### US-BACK-11 : Endpoints de Gestion & Purge des Conversations Antérieures
- **User Story :** En tant qu'utilisateur du chat, je veux lister, récupérer, exporter et purger mes conversations antérieures de façon sécurisée par domaine via l'API.
- **Tâche PR :** `feat(conversations-api): conversation sessions management, search, restore, and bulk purge endpoints`
- **Pattern & SOLID :** *Unit of Work Pattern*, *Audit Logger*.
- **Critères d'Acceptation :**
  - `GET /api/v1/chat/conversations` (filtrage par tenant, recherche mot-clé).
  - `DELETE /api/v1/chat/conversations/{id}` et `DELETE /api/v1/chat/conversations/purge-all`.
  - Purge en cascade des messages et des citations rattachées.
- **Tests Préalables (TDD - Pytest) :**
  - `test_conversations_api.py` : Vérification du cycle de vie et de la purge sécurisée.
  - `tnr_saved_conversations.py` (TNR-21) : Validation de l'intégrité de restauration.

#### US-BACK-12 : Cycle de Vie Sécurisé du Tenant & Guard de Dernier Domaine (TNR-10)
- **User Story :** En tant qu'administrateur, je veux créer, configurer et supprimer un domaine obsolète avec purge en cascade immédiate de tous ses documents et vecteurs pgvector, tout en étant bloqué si je tente de supprimer l'unique domaine restant.
- **Tâche PR :** `feat(tenants-lifecycle): domain management with cascade purge and last-tenant safety guard`
- **Pattern & SOLID :** *Fail-Safe Guard Pattern*, *Unit of Work*.
- **Critères d'Acceptation :**
  - Rejet avec code `400 Bad Request` et code `CANNOT_DELETE_LAST_TENANT` si `tenants.length <= 1`.
  - Purge complète des `documents`, `document_chunks` (libération mémoire HNSW) et `rag_presets` lors d'une suppression validée.
- **Tests Préalables (TDD - Pytest) :**
  - `test_tenant_delete_guard.py` : Tentative de suppression du dernier domaine levant une erreur 400.
  - `tnr_domain_delete_guard.py` (TNR-10) : Non-régression sur le blocage de sécurité.

---

## 3. Matrice de Couverture des Tests de Non-Régression (TNR Backend)

| ID TNR | Périmètre Backend | Règle d'Or Bloquante |
|---|---|---|
| **TNR-01** | Schéma OpenAPI | Rétrocompatibilité binaire des DTOs Pydantic |
| **TNR-02** | RLS Multi-Tenant | Zéro fuite SQL inter-tenants avec politique RLS active |
| **TNR-03** | Versionnage Documentaire | Incrémentation immuable en version $v+1$ sans écrasement |
| **TNR-06** | Résilience SSE | Reprise fluide du streaming avec `Last-Event-ID` |
| **TNR-07** | Fusion Hybride RRF | Application exacte de la formule $1/(60+r)$ |
| **TNR-09** | Anti-Hallucination | Rejet formel d'inférence si `doc_count == 0` |
| **TNR-10** | Cycle de Vie Domaines | Blocage strict de la suppression du dernier domaine |
| **TNR-18** | Immutabilité Presets | Verrouillage scellé (Pydantic + Trigger SQL) si documents indexés |
| **TNR-26** | Extraction Trafilatura | Élimination intégrale du boilerplate web en mode Précision |
| **TNR-27** | Nettoyage Déterministe | Éradication des caractères invisibles et normalisation NFC |
| **TNR-29** | Dry-Run Pré-Indexation | Zéro persistance en base lors de la simulation |
| **TNR-31** | Presets Nommés | Synchronisation et affectation de preset par défaut par tenant |
