# 01 — Architecture Système & Cadre Fonctionnel RAGTIME

> **Statut :** Document de Référence et d'Autorité  
> **Classification :** Souverain / On-Premise / Confidentiel Défense & Entreprise  
> **Version :** 2.4 (2026)  
> **Philosophie :** Zéro Fuite de Données, Pas de Cloud Propriétaire, Inférence 100% Locale, Traçabilité Algorithmique Intégrale.

---

## 1. Vision Stratégique & Mandat de Souveraineté

Le projet **RAGTIME** (Retrieval-Augmented Generation Transparent, Isolé, Modulaire et Éthique) répond au besoin critique des institutions publiques, des opérateurs d'importance vitale (OIV) et des industries sensibles : exploiter la puissance des modèles de fondation génératifs (LLM) sur leurs corpus documentaires confidentiels (PDF, Markdown, bases SQL, contrats, notes techniques) **sans jamais émettre le moindre octet vers des API externes**.

### 1.1 Invariants Faisant Force de Loi
1. **Air-Gap Compliant & Souveraineté Totale** : Le système doit pouvoir opérer déconnecté de tout réseau public, sur infrastructure bare-metal ou cluster Kubernetes privé.
2. **Cloisonnement Multi-Tenant Cryptographique et Relationnel** : L'accès aux documents et à leurs vecteurs est partitionné de manière étanche par `tenant_id` (domaine d'application). Aucun utilisateur ne peut extraire ou interroger des connaissances d'un autre domaine sans mandat RBAC explicite.
3. **Zéro Hallucination & Preuve Mathématique des Citations** : Toute réponse produite par le modèle est adossée à des extraits textuels authentiques issus de `pgvector` avec indication de la page, du score de similarité cosinus, et de l'empreinte cryptographique SHA-256 du document source.
4. **Interdiction de la Pensée Simulée** : Les étapes observables du pipeline RAG sont véridiques, mesurées et streamées en temps réel (SSE). Aucune fausse chaîne de réflexion n'est générée.

---

## 2. Architecture Hexagonale & Ports d'Abstraction

Le socle logiciel RAGTIME est articulé autour des principes de la **Clean Architecture** (Architecture Hexagonale), isolant rigoureusement le cœur métier des dépendances d'infrastructure matérielle et logicielle.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                   API DRIVERS (PRIMAIRES)                   │
       │  FastAPI REST Endpoints  │  SSE Streaming Controller  │ UI  │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                    DOMAINE MÉTIER (CORE)                    │
       │                                                             │
       │   • Tenant & Domain Context Manager                         │
       │   • Document Lifecycle & Immutable Versioning Engine        │
       │   • Hybrid Retrieval Orchestrator (Dense + Sparse BM25)     │
       │   • Reciprocal Rank Fusion (RRF) & Cross-Encoder Reranker   │
       │   • Citation & Anti-Hallucination Guardrails                │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
       ┌──────────────────────────────┴──────────────────────────────┐
       │                 PORTS DRIVEN (SECONDAIRES)                  │
       │                                                             │
       │  ┌───────────────────────┐       ┌───────────────────────┐  │
       │  │  DocumentParserPort   │       │      ChunkerPort      │  │
       │  └───────────┬───────────┘       └───────────┬───────────┘  │
       │  ┌───────────┴───────────┐       ┌───────────┴───────────┐  │
       │  │   VectorStoragePort   │       │   LLMInferencePort    │  │
       │  └───────────┬───────────┘       └───────────┬───────────┘  │
       └──────────────┼───────────────────────────────┼──────────────┘
                      │                               │
                      ▼                               ▼
       ┌──────────────────────────┐       ┌──────────────────────────┐
       │    ADAPTATEURS INFRA     │       │    ADAPTATEURS MODÈLE    │
       │  PostgreSQL 16 + pgvector│       │  Ollama / vLLM           │
       │  Redis 7 + Worker ARQ    │       │  Llama 3.2:3B Instruct   │
       │  Stockage FS Immuable    │       │  nomic-embed-text-v1.5   │
       └──────────────────────────┘       └──────────────────────────┘
```

### 2.1 Définition des Ports Principaux

#### 1. `DocumentParserPort` & `ContentExtractorPort`
- **Rôle** : Extraction normalisée de texte brut et métadonnées depuis les formats hétérogènes (PDF via PyMuPDF/pdfplumber, Markdown via CommonMark, SQL via sqlparse, et pages Web HTML via **Trafilatura 2.0**).
- **Garantie** : Détection d'encodage, conservation des numéros de pages, extraction des en-têtes de tableaux, élimination heuristique du boilerplate (menus, bannières, pieds de page légaux) via bascule `favor_precision` / `favor_recall`.

#### 2. `TextSanitizerPort` (Nettoyage Mécanique Déterministe)
- **Rôle** : Assainissement déterministe pré-indexation en 4 étapes strictes.
- **Garantie** : Normalisation Unicode NFC canonique, éradication des balises HTML orphelines, purge des caractères invisibles corrupteurs (`\u200B-\u200F`, `\uFEFF`, `\u00AD`) et condensation des espaces multiples.

#### 3. `MultiStrategyChunkerPort`
- **Rôle** : Segmentation sémantique et récursive selon la stratégie sélectionnée par le preset ou l'utilisateur :
  1. *Fenêtre Glissante (Sliding Window)* : découpage à tokens fixes avec recouvrement contrôlé.
  2. *Découpage par Phrases (Sentence Boundary)* : respect de la ponctuation forte sans rupture de phrases.
  3. *Découpage par Sections Markdown* : découpe sur les titres `# / ##` avec préfixage automatique du contexte.
  4. *Chunking Sémantique* : détection des ruptures de sens par distance vectorielle cosinus.
- **Règle Mathématique d'Overlap** : `chunk_overlap < (chunk_size / 2)`.
- **Garantie de Traçabilité** : Chaque chunk reçoit un identifiant UUID v4, un index séquentiel, la stratégie employée, le hash SHA-256 du parent, le préfixe contextuel injecté, et son nombre exact de tokens.

#### 4. `VectorStoragePort`
- **Rôle** : Indexation et recherche de vecteurs d'embedding denses.
- **Moteur** : PostgreSQL 16 avec extension `pgvector`.
- **Indexation** : HNSW (`m=16`, `ef_construction=64`), distance cosinus (`vector_cosine_ops`).
- **Clause d'Étanchéité** : Clause SQL `WHERE tenant_id = :current_tenant` obligatoire à la compilation de chaque requête.

#### 5. `LLMInferencePort`
- **Rôle** : Inférence locale du modèle de langage et streaming des tokens.
- **Exécutant** : Ollama / llama.cpp local (GPU NVIDIA RTX 4090 / A100 ou fallback CPU AVX-512).
- **Prompt Guardrail** : Injection du contexte strictement restreint aux extraits sourcés avec consigne de silence si l'information est introuvable.

---

## 3. Schéma Relationnel & Modèle de Données pgvector

```sql
-- 1. Table des Domaines / Tenants (Espaces de Cloisonnement)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'sante', 'juridique', 'tech', 'rh', 'sur_mesure'
    system_prompt TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des Documents (Enrichie Phase 7)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(32) NOT NULL, -- 'pdf', 'markdown', 'sql', 'html_url', 'txt'
    source_url TEXT NULL, -- URL source si extraction web Trafilatura
    extraction_method VARCHAR(64) NOT NULL DEFAULT 'native_parser', -- 'trafilatura_precision', 'trafilatura_recall', 'native_pdf', 'markdown_parser'
    description TEXT NULL,
    cleaning_stats JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "unicode_nfc": true, "invisibles_purged": 14, "html_tags_stripped": 3 }
    current_version INT NOT NULL DEFAULT 1,
    total_chunks INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Historique des Versions de Documents (Immuabilité TNR-03)
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    sha256_checksum CHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    chunks_count INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'indexed', -- 'pending', 'extracting', 'chunking', 'embedding', 'indexed', 'failed'
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

-- 4. Table des Chunks pgvector (Enrichie Multi-Stratégies Phase 7)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    context_prefix TEXT NULL, -- Préfixe contextuel injecté (ex: "[Section: Architecture > Base pgvector]")
    strategy_used VARCHAR(32) NOT NULL DEFAULT 'fixed_sliding', -- 'fixed_sliding', 'sentence_boundary', 'markdown_section', 'semantic'
    section_title VARCHAR(255) NULL, -- Titre hiérarchique détecté
    sha256_hash CHAR(64) NOT NULL,
    token_count INT NOT NULL,
    page_number INT NULL,
    embedding vector(768) NOT NULL, -- nomic-embed-text 768 dimensions
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index de performance HNSW & Partitionnement Tenant
CREATE INDEX idx_chunks_tenant_id ON document_chunks(tenant_id);
CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_chunks_metadata_gin ON document_chunks USING gin (metadata);
CREATE INDEX idx_chunks_strategy ON document_chunks(strategy_used);

-- 5. Table des Presets RAG (Immuabilité TNR-05 & TNR-18, Multi-Stratégies)
CREATE TABLE rag_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    chunking_strategy VARCHAR(32) NOT NULL DEFAULT 'fixed_sliding', -- 'fixed_sliding', 'sentence_boundary', 'markdown_section', 'semantic'
    chunk_size INT NOT NULL CHECK (chunk_size BETWEEN 128 AND 2048),
    chunk_overlap INT NOT NULL CHECK (chunk_overlap >= 0),
    similarity_threshold NUMERIC(3,2) NOT NULL CHECK (similarity_threshold BETWEEN 0.0 AND 1.0),
    retrieval_top_k INT NOT NULL CHECK (retrieval_top_k BETWEEN 1 AND 20),
    rerank_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    prefix_section_title BOOLEAN NOT NULL DEFAULT TRUE, -- Enrichissement automatique par le titre de section
    embedding_model VARCHAR(64) NOT NULL DEFAULT 'nomic-embed-text-v1.5',
    parent_preset_id UUID NULL REFERENCES rag_presets(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Pipeline d'Ingestion Documentaire en 5 Étapes Déterministes (Phase 7)

```
[Document Source : PDF / MD / SQL / URL Web]
        │
        ▼ (Étape 1 : Extraction du Contenu Principal)
[Trafilatura 2.0 (HTML/Web) ou PyMuPDF / CommonMark]
  • Options : Mode Précision (défaut RAG) vs Mode Rappel
  • Extraction des métadonnées (titre, auteur, date, source_url)
        │
        ▼ (Étape 2 : Nettoyage Déterministe en 4 Passes - TextSanitizerPort)
  1. Normalisation Unicode NFC canonique
  2. Éradication des balises HTML orphelines (regex sécurisée sans briser Markdown/LaTeX)
  3. Purge des caractères invisibles corrupteurs (\u200B-\u200F, \uFEFF, \u00AD)
  4. Normalisation typographique des espaces (\n\n et espaces consécutifs)
        │
        ▼ (Étape 3 : Découpage Multi-Stratégies - MultiStrategyChunkerPort)
  • Fenêtre Glissante (chunk_size=512, overlap=64, invariant overlap < size/2)
  • Découpage par Phrases (segmentation par ponctuation forte, respect abréviations)
  • Découpage par Sections Markdown (coupe sur #/## avec préfixage du titre [Titre])
  • Simulation Dry-Run (prévisualisation, audit tokens & budget VRAM sans écriture SQL)
        │
        ▼ (Étape 4 : Vectorisation Dense Locale)
[Ollama / nomic-embed-text-v1.5 (768 dimensions)]
  • Normalisation L2 du vecteur dense
        │
        ▼ (Étape 5 : Indexation Transactionnelle pgvector)
[PostgreSQL 16 : INSERT INTO document_chunks + Index HNSW partitionné par tenant_id]
```

---

## 5. Pipeline d'Inférence RAG & Inspecteur de Similarité Cosinus (Phase 7)

```
[Requête Utilisateur] 
        │
        ▼ (Étape 1 : Réception Gateway & Auth JWT)
[Validation & Assainissement Prompt]
        │
        ▼ (Étape 2 : pgvector HNSW + BM25 Lexical)
[Recherche Hybride Partitionnée WHERE tenant_id = :id]
        │
        ▼ (Étape 3 : Filtrage Seuil Cosinus >= seuil_preset)
[Validation d'Isolation & Déduplication Chunks]
        │
        ▼ (Étape 4 : Re-ranking Cross-Encoder bge-reranker)
[RRF & Réordonnancement Top-K Certifié]
        │
        ▼ (Étape 5 : Stream SSE Ollama / Llama 3.2:3b)
[Génération Sourcée & Émission des 8 Événements SSE vers l'UI]
```

### 4.1 Événements SSE du Contrat d'Interface
1. `message.started` : Initialisation du cycle de streaming.
2. `retrieval.started` : Début de la recherche vectorielle pgvector.
3. `retrieval.completed` : Nombre de candidats identifiés.
4. `generation.started` : Envoi du contexte au moteur Ollama.
5. `generation.delta` : Morceau de réponse textuelle incrémentale.
6. `sources.available` : Transmission de la liste des citations certifiées.
7. `message.completed` : Fin du flux avec métriques réelles (TTFT, tokens/s).
8. `message.failed` : Diagnostic d'erreur sécurisé en cas d'interruption.

---

## 5. Exigences d'Infrastructure & Matériel Souverain

- **Serveur GPU Recommandé** : 1x NVIDIA RTX 4090 (24 Go VRAM) ou 1x NVIDIA A100 (40/80 Go).
- **Configuration CPU Fallback** : Intel Xeon Gold ou AMD EPYC (min. 16 cœurs, 64 Go RAM, AVX-512).
- **Stockage** : NVMe PCIe 4.0 (lecture séquentielle > 5000 Mo/s pour pgvector HNSW).
- **Système d'Exploitation** : Rocky Linux 9 / Debian 12 Minimal Hardened.
- **Réseau** : Cartes 10 GbE isolées sur VLAN interne dédié, aucun accès Internet requis.
