# Protocole de Passage de Relais DevOps ➔ Backend (Jalon 1)

> **Date :** Octobre 2026  
> **Émetteur :** Agent DevOps, MLOps & QA Automation  
> **Destinataire :** Agent Développeur Backend Senior  
> **Documents Faisant Autorité :**  
> - [PLAN_BACKEND.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_BACKEND.md)  
> - [AGENT_BACKEND.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/agents/AGENT_BACKEND.md)  
> - [SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md](file:///c:/AITest/RAGTIME/RAG-Time/architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md)  
> - `architecture/01-architecture.md` & `architecture/07-security-model.md`  

---

## 1. État des Lieux & Infrastructure Livrée (Certifiée Conforme)

L'Agent DevOps / QA confirme la mise à disposition de l'infrastructure socle locale :

| Composant | Point d'Accès Local | Statut & Paramètres Vérifiés |
|---|---|---|
| **PostgreSQL 16 + pgvector** | `localhost:5432` (`ragtime_db`) | Conteneur `ragtime-postgres` sain, extension `vector 0.8.7` activée |
| **Redis 7 (Broker & Cache)** | `localhost:6379` (db 0) | Conteneur `ragtime-redis` sain, mode AOF activé |
| **Ollama Local Inférence** | `http://localhost:11434` | Modèles préchargés : `llama3.2:3b` et `nomic-embed-text` (768d) |
| **Variables d'Environnement** | `.env` racine | Initialisé avec `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY` unique |
| **Script de Vérification 1-Clic** | `python scripts/verify_backend_readiness.py` | Statut **100% OK** (exécutable à tout moment) |

---

## 2. Feuille de Route pour l'Agent Backend — Jalon 1 (Priorité 1)

Conformément à la méthodologie en **5 étapes** définie dans [AGENT_BACKEND.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/agents/AGENT_BACKEND.md) et au [PLAN_BACKEND.md](file:///c:/AITest/RAGTIME/RAG-Time/guide/plans/PLAN_BACKEND.md), voici les chantiers à réaliser dans l'ordre :

### Étape 1 : US-BACK-01 — Schéma SQLModel, Extensions & Migrations Alembic
- **Objectif :** Définir les modèles relationnels et vectoriels dans `backend/app/models/` :
  - `tenants` (id UUID, name, slug, role, is_active, created_at)
  - `documents` (id UUID, tenant_id UUID, title, filename, file_type, sha256_hash, version, status, created_at)
  - `document_versions` (id UUID, document_id UUID, tenant_id UUID, version, sha256_hash, created_at)
  - `document_chunks` (id UUID, document_id UUID, tenant_id UUID, chunk_index, content, token_count, page_number, embedding vector(768), metadata JSONB)
  - `rag_presets` (id UUID, tenant_id UUID, name, is_default, chunk_size, chunk_overlap, embedding_model, created_at)
  - `audit_logs` (id UUID, tenant_id UUID, action, user_id, payload JSONB, created_at)
- **Indexations Critiques :**
  - Index HNSW sur `document_chunks.embedding` : `USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)`.
  - Index GIN sur `document_chunks.metadata`.
- **Alembic :** Initialiser `alembic/` pour générer la migration initiale déterministe.

### Étape 2 : US-BACK-02 — Row-Level Security (RLS) & Gestion du Connection Pooling
- **Politiques RLS :**
  - Activer `ROW LEVEL SECURITY` sur toutes les tables multi-tenant.
  - Règle d'or : `current_setting('app.current_tenant_id', true)::uuid = tenant_id`.
- **Piège Majeur (Connection Pooling asyncpg) :**
  - Tout emprunt de connexion doit positionner la variable de session : `SET LOCAL app.current_tenant_id = :tenant_id;`.
  - À la libération ou restitution au pool, exécuter **impérativement** `RESET app.current_tenant_id;` pour prévenir toute pollution inter-tenant.
  - Détecter les ruptures ou réinitialisations de contexte et émettre l'en-tête HTTP `X-Tenant-Session-Reset: true` afin que le frontend informe l'utilisateur (popup explicite).

### Étape 3 : US-BACK-03 — Trigger d'Immutabilité du Preset (TNR-18)
- **Double Barrière :**
  - Trigger PostgreSQL `trg_freeze_preset_on_ingested_docs` vérifiant si `document_chunks` contient déjà des vecteurs pour ce tenant.
  - Interdire formellement toute mise à jour de la taille/overlap de chunk ou du modèle d'embedding sur un espace alimenté (`RAISE EXCEPTION 'CANNOT_MODIFY_FROZEN_PRESET'`).

---

## 3. Commandes Utiles pour l'Agent Backend

```bash
# Vérifier que tous les services socles sont opérationnels
python scripts/verify_backend_readiness.py

# Exécuter les tests unitaires et le banc TNR
python backend/tests/run_tests.py
python scripts/run_tnr_suite.py
```
