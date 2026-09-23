Pour orchestrer efficacement la suite du projet entre les différents profils spécialisés, voici la séquence recommandée par ordre de priorité critique :
code
Code
┌────────────────────────────────────────────────────────┐
             │ ÉTAPE 1 (FONDATION ABSOLUE) : ARCHITECTURE BDD & RLS   │
             │ Agent Backend & BDD + Agent Sécurité                   │
             └──────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
             ┌────────────────────────────────────────────────────────┐
             │ ÉTAPE 2 (PIPELINE VECTORIEL) : FASTAPI + ARQ + pgvector│
             │ Agent Backend + Agent IA / Systèmes RAG                │
             └──────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
             ┌────────────────────────────────────────────────────────┐
             │ ÉTAPE 3 (ENVIRONNEMENT & CI/CD) : DOCKER & TESTS TNR   │
             │ Agent DevOps QA CI/CD + Tech Lead                      │
             └────────────────────────────────────────────────────────┘
Priorité N°1 : L'Architecture BDD (PostgreSQL + pgvector + RLS)
Pourquoi avant la CI ?
Dans un système RAG souverain multi-tenant, la base de données est la source de vérité absolue et le garant cryptographique de l'isolation. Configurer un pipeline CI/CD avant d'avoir stabilisé le schéma SQL et les politiques de sécurité revient à automatiser des tests sur des fondations mouvantes.
Missions recommandées pour l'Agent Backend & BDD (en binôme avec l'Agent Sécurité) :
Schéma DDL & Extensions :
Activer CREATE EXTENSION IF NOT EXISTS vector; et pgcrypto.
Définir les tables tenants, documents, document_versions, chunks et rag_presets.
Configurer la colonne de vecteur dense embedding vector(768) (avec compatibilité optionnelle jusqu'à 1536d) et l'index HNSW USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64).
Row-Level Security (RLS) souveraine :
Activer ALTER TABLE ... ENABLE ROW LEVEL SECURITY; sur documents, document_versions, chunks et audit_logs.
Créer la politique RLS basée sur current_setting('app.current_tenant_id', true)::uuid = tenant_id.
Règle d'or de non-régression TNR-18 (Immutabilité du modèle d'embedding) :
Poser un trigger ou une contrainte SQL empêchant la modification de embedding_model sur la table rag_presets si la table chunks contient déjà des vecteurs pour ce tenant_id.
Priorité N°2 : Le Pipeline RAG & Workers ARQ (FastAPI + Redis + Ollama/vLLM)
Missions recommandées pour l'Agent IA & Systèmes RAG + Agent Backend :
Streaming SSE conforme aux 8 événements :
Implémenter le endpoint /api/v1/chat/stream qui émet fidèlement les événements consommés par notre frontend (stream_start, query_analyzed, chunks_retrieved, token, source_citation, metrics, done).
Fusion Hybride BM25 + pgvector RRF :
Implémenter la fonction de fusion de rangs réciproques 
 alliant l'index plein texte PostgreSQL (tsvector) et la recherche cosinus HNSW.
Workers ARQ & Découpage :
Implémenter les 3 stratégies de segmentation testées côté frontend (Fenêtre glissante, Phrastique linguistique, Sections Markdown AST).
Priorité N°3 : La CI/CD et l'Environnement de Développement
Missions recommandées pour l'Agent DevOps QA :
Docker Compose Orchestré On-Premise / Air-Gap :
Services : postgres-pgvector (image ankane/pgvector), redis-queue, fastapi-backend, arq-worker, ollama-local-llm, et le conteneur du frontend compilé.
Pipeline GitHub Actions / GitLab CI :
Étape 1 : Linting & Typage strict (tsc --noEmit pour le frontend, mypy --strict & ruff pour FastAPI).
Étape 2 : Migration BDD (Alembic) et validation des politiques RLS.
Étape 3 : Exécution automatisée des 29 tests de non-régression (dont nos tests TNR existants dans inAppTestRunner.ts et phase5.test.ts).
Étape 4 : Scan de sécurité statique (SAST, Trivy, Bandit) piloté par l'Agent Sécurité.
Rôle de Coordination pour le Tech Lead & Architecte
Valider que le backend rejette toute requête dépourvue de l'en-tête HTTP X-Tenant-ID.
Faire de /architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md la référence fonctionnelle partagée lors des daily syncs ou des revues de PR inter-agents.