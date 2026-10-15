JALON 1 : SOCLE BDD, MIGRATIONS & ISOLATION MULTI-TENANT RLS (Semaine 1)
├── DevOps : Script setup.ps1 Windows + docker-compose.dev.yml (Postgres pgvector + Redis)
├── Backend : Schéma SQLModel, extensions vector/pgcrypto, migrations Alembic (US-BACK-01)
├── Sécurité : Politiques RLS PostgreSQL (US-SEC-01) + Hachage Argon2id (US-SEC-02)
└── Backend : Trigger d'immutabilité vectorielle TNR-18 (US-BACK-03)
    └── JALON DE VALIDATION : Tests Pytest RLS & TNR-02 / TNR-18 au vert.

JALON 2 : PIPELINE D'INGESTION, TRAFILATURA & WORKERS ARQ (Semaine 2)
├── Sécurité : Filtre de validation anti-SSRF déterministe (US-SEC-04)
├── IA/RAG : Extraction Trafilatura 2.0 (US-IA-01) + Nettoyage NFC & invisibles (US-IA-02)
├── IA/RAG : Chunker multi-stratégies avec overlap < size/2 et fil d'Ariane (US-IA-03)
├── Backend : Endpoints Upload & Web-Scrape + Queue Redis/ARQ (US-BACK-04, 05)
└── IA/Backend : Simulateur Dry-Run en mémoire sans persistance (US-BACK-07, US-IA-08)
    └── JALON DE VALIDATION : Tests TNR-26, TNR-27, TNR-28, TNR-29 au vert.

JALON 3 : MOTEUR VECTORIEL HYBRIDE RRF & STREAMING SSE FASTAPI (Semaine 3)
├── IA/RAG : Indexation pgvector HNSW 768d nomic-embed (US-IA-04)
├── IA/RAG : Recherche hybride Dense/Sparse BM25 + Algorithme RRF k=60 (US-IA-05)
├── IA/RAG : Re-ranking Cross-Encoder bge-reranker et calcul Δ Top-1 (US-IA-06)
├── Backend : Contrôleur SSE /stream avec 8 événements et Last-Event-ID (US-BACK-09)
├── Backend : Presets nommés par domaine et initialisation usine (US-BACK-10)
└── IA/RAG : Inférence locale Ollama Llama 3.2:3B sans pensée simulée (US-IA-07, 09)
    └── JALON DE VALIDATION : Tests TNR-04, TNR-06, TNR-07, TNR-09, TNR-25, TNR-31 au vert.

JALON 4 : RACCORDEMENT FRONTEND RÉEL & VALIDATION IN-APP (Semaine 4)
├── Backend : Export du schéma officiel /openapi.json
├── Frontend : Régénération des types TypeScript (npm run generate:api)
├── Frontend : Raccordement direct d'apiClient.ts et useSSEStream.ts aux endpoints réels
└── Frontend/QA : Exécution des 29 tests sur LiveTestConsole.tsx
    └── JALON DE VALIDATION : 100% des tests validés sur l'interface (29/29 TNR).

JALON 5 : INDUSTRIALISATION AIR-GAP, TÉLÉMÉTRIE MLOPS & CI/CD (Semaine 5)
├── DevOps : Workflow GitHub Actions avec tests CI sans GPU (US-DEVOPS-03, 04)
├── DevOps : Scraper Prometheus /metrics (TTFT, tokens/s, VRAM) et Alertes (US-DEVOPS-06, 07)
├── Sécurité : Scans statiques SAST (Bandit, Trivy, TruffleHog) (US-SEC-10)
└── DevOps : Bundle Air-Gap hors-ligne (tarballs Docker + modèles GGUF) (US-DEVOPS-08, 10)
    └── JALON FINAL : Déploiement souverain validé sur serveur isolé.
