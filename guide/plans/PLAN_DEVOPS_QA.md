# Plan de Création DevOps, MLOps & QA Automation — RAGTIME (2026)

> **Agent Responsable :** Agent DevOps, MLOps & QA Automation  
> **Documents Faisant Autorité :** `architecture/01-architecture.md`, `architecture/02-roadmap.md`, `architecture/03-backlog-agents.md`, `architecture/07-security-model.md`, `guide/GUIDE_COLLABORATION_AGENTS.md`, `architecture/specifications/Recommandations.md`, `architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md`  
> **Conformité & Rigueur :** Principes SOLID, Packaging Air-Gap, Intégration Continue GitHub Actions, Benchmarks GPU/VRAM & Tests de Non-Régression (TNR)

---

## 1. Vision & Architecture des Environnements de Déploiement

Le système **RAGTIME** (« Beat & Pgvector ») doit pouvoir opérer sur 3 cibles d'exécution distinctes avec un niveau de sécurité et de performance identique :

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 1. ENVIRONNEMENT DÉV LOCAL                             │
│  • OS Client : Windows 11 (PowerShell 7+ / WSL2)                                       │
│  • Runtime LLM : Ollama Windows natif (ou WSL2 GPU) -> llama3.2:3b / nomic-embed       │
│  • Micro-services : Docker Desktop (PostgreSQL 16 + pgvector, Redis 7)                 │
│  • Hot Reloading : Vite (Frontend React) + Uvicorn (FastAPI Python 3.12)               │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼ (Push GitHub / Pull Request)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              2. PIPELINE CI/CD GITHUB ACTIONS                          │
│  • Runner Cloud : ubuntu-latest (sans GPU dédié)                                       │
│  • Mock Engine : Fast-Mock Ollama & Test-DB In-Memory / pgvector Docker                │
│  • Workflows : Linting, Typecheck TSC, Tests Unitaires (Pytest/Vitest), Suite TNR     │
│  • Artifacts : Validation du schéma OpenAPI, Bundles Frontend & Images Docker Test    │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼ (Release Souveraine / Packaging Air-Gap)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            3. ENVIRONNEMENT PROD SOUVERAIN (AIR-GAP)                   │
│  • Infrastructure : Bare-Metal / K8s / Rocky Linux 9 Hardened                          │
│  • GPU Acceleration : NVIDIA RTX 4090 / A100 via NVIDIA Container Toolkit (CUDA)       │
│  • Isolement Réseau : VLAN Privé étanche, Zéro accès Internet, Images Tarball importées │
│  • Monitoring : Prometheus Scraper (/metrics) + Alertmanager + Télémétrie VRAM         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Découpage en User Stories DevOps / MLOps / QA (US-DEVOPS-01 à 10)

---

### US-DEVOPS-01 : Scripting d'Installation & Setup Environnement Local (Windows / PowerShell)
- **User Story :** En tant que développeur travaillant sous Windows, je veux exécuter un script d'initialisation PowerShell (`setup.ps1`) qui vérifie les prérequis matériels/logiciels (Python 3.12, Node.js 20+, Ollama Windows, Docker Desktop), configure l'environnement `.env` local et démarre les services d'infrastructure en 1 clic.
- **Tâche PR :** `feat(dev-setup): Windows PowerShell automated environment setup script and local prerequisite checker`
- **Critères d'Acceptation :**
  - Script `setup.ps1` présent à la racine du projet, commenté et réutilisable.
  - Vérification automatisée des versions : Python $\ge 3.12$, Node $\ge 20$, Docker running, Ollama daemon actif sur port 11434.
  - Copie automatique du `.env.example` vers `.env` si absent avec génération des clés secrètes locales.
  - Téléchargement automatisé des modèles Ollama requis (`ollama pull llama3.2:3b` et `ollama pull nomic-embed-text`).
- **Livrable Code :** `setup.ps1`

---

### US-DEVOPS-02 : Packaging Multi-Conteneurs Docker Compose Souverain (Dev & Prod Air-Gap)
- **User Story :** En tant qu'opérateur système, je veux disposer d'une configuration `docker-compose.yml` orchestrant l'ensemble des 5 briques logicielles (PostgreSQL 16 + pgvector, Redis 7, Backend FastAPI, Worker ARQ, Frontend Vite/Nginx) avec support du GPU pass-through NVIDIA pour l'inférence ultra-rapide.
- **Tâche PR :** `feat(docker): sovereign multi-container docker compose setup with NVIDIA GPU pass-through and healthchecks`
- **Critères d'Acceptation :**
  - Image PostgreSQL basée sur `pgvector/pgvector:pg16` avec volume persistant et scripts d'inits SQL.
  - Healthchecks configurés pour tous les conteneurs (dépendance `condition: service_healthy` sur FastAPI vis-à-vis de Postgres et Redis).
  - Support GPU NVIDIA via la section `deploy.resources.reservations.devices` (driver nvidia/cuda).
  - Isolation réseau via bridge interne `ragtime_network`.
- **Livrable Code :** `docker-compose.yml`, `docker-compose.override.yml`, `docker/postgres/init.sql`

---

### US-DEVOPS-03 : Pipeline CI/CD GitHub Actions (Lint, Typecheck, Build & OpenAPI Check)
- **User Story :** En tant que Tech Lead, je veux qu'à chaque Push ou Pull Request sur GitHub, un pipeline d'intégration continue valide la qualité du code (ESLint, TSC mode strict, Flake8/Ruff, Black) et vérifie l'absence de régression sur le schéma OpenAPI.
- **Tâche PR :** `ci(github-actions): workflow integration for linting, typechecking, frontend build, and openapi diff detection`
- **Critères d'Acceptation :**
  - Workflow `.github/workflows/ci.yml` s'exécutant sur `ubuntu-latest`.
  - Étape 1 : Checkout & Setup Node.js 20 + Python 3.12.
  - Étape 2 : Linting & Formattage Frontend (`npm run lint`) + Typecheck TypeScript (`tsc --noEmit`).
  - Étape 3 : Linting & Typing Backend (`ruff check .`, `mypy app`).
  - Étape 4 : Détection de rupture de contrat OpenAPI (TNR-01).
- **Livrable Code :** `.github/workflows/ci.yml`

---

### US-DEVOPS-04 : Runner de Tests CI Sans GPU (Mock Ollama & Pytest/Vitest Integration)
- **User Story :** En tant qu'ingénieur QA, je veux exécuter l'ensemble des suites de tests unitaires et d'intégration dans l'environnement GitHub Actions (sans carte GPU dédiée) en utilisant des mocks déterministes pour Ollama et une instance PostgreSQL/pgvector éphémère.
- **Tâche PR :** `ci(testing): headless CI test runner with deterministic Ollama mocks and Postgres container`
- **Critères d'Acceptation :**
  - Configuration du service Docker Postgres/pgvector au sein du workflow GitHub Actions.
  - Injection d'un mock Python pour Ollama renvoyant des embeddings prédéfinis 768d et des flux textuels SSE simulés mais déterministes.
  - Exécution complète de `pytest` (Backend) et `npm run test:ci` (Vitest Frontend).
  - Rapport de couverture de code généré en artefact.
- **Livrables Code :** `.github/workflows/test.yml`, `backend/tests/conftest.py`

---

### US-DEVOPS-05 : Matrice d'Automation des 25+ Tests de Non-Régression (Banc d'Essai TNR)
- **User Story :** En tant que Responsable Qualité, je veux un script d'automatisation exécutant séquentiellement la matrice des 25 Tests de Non-Régression (TNR-01 à TNR-25) et produisant un rapport d'audit certifié au format JSON/Markdown.
- **Tâche PR :** `feat(qa-tnr): automated test runner for the complete 25+ TNR matrix with certified report generation`
- **Critères d'Acceptation :**
  - Script `scripts/run_tnr_suite.py` capable d'exécuter et vérifier les 25 règles bloquantes (Isolation tenant TNR-02, Versionnage TNR-03, Sanitization TNR-07, Immutabilité TNR-18, etc.).
  - Génération d'un artefact `tnr_report.json` certifiant le succès à 100% avant toute mise en production.
- **Livrable Code :** `scripts/run_tnr_suite.py`

---

### US-DEVOPS-06 : Exposition des Métriques Prometheus (`/metrics`) & Télémétrie MLOps
- **User Story :** En tant qu'opérateur MLOps, je veux que le backend FastAPI et le moteur RAG exposent des métriques Prometheus standardisées sur l'endpoint `/metrics` afin de surveiller la latence (TTFT), le débit (tokens/s) et l'utilisation mémoire GPU/RAM.
- **Tâche PR :** `feat(mlops-prometheus): prometheus metrics endpoint exposition for inference TTFT, tokens/sec, and GPU memory`
- **Critères d'Acceptation :**
  - Déclaration des compteurs et histogrammes Prometheus (`prometheus_client`) dans le backend FastAPI :
    - `ragtime_ttft_seconds` (Histogramme du Time To First Token).
    - `ragtime_tokens_per_second` (Gauge du débit de génération).
    - `ragtime_vram_usage_bytes` (Gauge mémoire GPU NVML).
    - `ragtime_tenant_queries_total` (Compteur de requêtes par tenant).
  - Scraping configuré via file `prometheus.yml`.
- **Livrables Code :** `backend/app/core/metrics.py`, `docker/prometheus/prometheus.yml`

---

### US-DEVOPS-07 : Configuration de l'Alertmanager & Seuils de Dégradation Performance
- **User Story :** En tant qu'administrateur système, je veux configurer des règles d'alerte Prometheus (Alertmanager) déclenchant des notifications visuelles en cas de dégradation critique des performances du cluster RAG.
- **Tâche PR :** `feat(alerting): prometheus alert rules for high TTFT, GPU VRAM saturation, and service downtime`
- **Critères d'Acceptation :**
  - Règle 1 : `TTFTTooHigh` déclenchée si TTFT > 800 ms pendant plus de 2 minutes.
  - Règle 2 : `VRAMNearSaturation` déclenchée si allocation VRAM > 85%.
  - Règle 3 : `ServiceDown` déclenchée si FastAPI, Ollama ou Postgres est injoignable > 30s.
- **Livrable Code :** `docker/prometheus/alert.rules.yml`

---

### US-DEVOPS-08 : Bundle de Déploiement Air-Gap Offline (Export Images Docker & Modèles LLM)
- **User Story :** En tant qu'ingénieur de déploiement en zone souveraine/déconnectée, je veux exécuter un script de packaging offline (`package_airgap.py`) qui extrait toutes les images Docker au format `.tar.gz` et télécharge les fichiers GGUF/modèles Ollama pour une installation 100% autonome sans accès Internet.
- **Tâche PR :** `feat(airgap-bundle): offline packaging script for docker image tarballs and Ollama GGUF model archives`
- **Critères d'Acceptation :**
  - Script `scripts/package_airgap.py` sauvegardant les images `postgres:16`, `redis:7`, `fastapi`, `vite` en archive `.tar.gz`.
  - Export du volume de modèles Ollama (`llama3.2-3b.tar.gz`, `nomic-embed.tar.gz`).
  - Script d'installation côté serveur cible `install_airgap.sh` restaurant les conteneurs et modèles sans appel réseau.
- **Livrables Code :** `scripts/package_airgap.py`, `scripts/install_airgap.sh`

---

### US-DEVOPS-09 : Stratégie de Backup & Restauration Immuable BDD PostgreSQL pgvector
- **User Story :** En tant qu'administrateur BDD, je veux un script de sauvegarde et restauration cryptographique (`backup_pgvector.sh`) garantissant la préservation immuable des tables relationnelles, des documents et de l'index vectoriel HNSW.
- **Tâche PR :** `feat(db-backup): automated pgdump and vector index restoration scripts with SHA-256 verification`
- **Critères d'Acceptation :**
  - Export de la BDD PostgreSQL via `pg_dump` au format custom compressé (`.dump`).
  - Validation du SHA-256 du fichier de sauvegarde.
  - Script de restauration rapide `restore_pgvector.sh` réindexant les vecteurs `pgvector` et vérifiant l'intégrité des contraintes multi-tenants.
- **Livrables Code :** `scripts/backup_pgvector.sh`, `scripts/restore_pgvector.sh`

---

### US-DEVOPS-10 : Hardening Systèmes & Conteneurs (Debian Hardened, Non-Root Users & TLS 1.3)
- **User Story :** En tant qu'Agent Sécurité & DevOps, je veux durcir les images Docker finales (exécution sous utilisateur non-privilégié `ragtime`, suppression des outils de dev, TLS 1.3 obligatoire sous Nginx) conformément aux exigences SecNumCloud 3.2.
- **Tâche PR :** `security(hardening): production multi-stage dockerfiles with non-root execution and TLS 1.3 Nginx configuration`
- **Critères d'Acceptation :**
  - Multi-stage build dans `Dockerfile` frontend et backend.
  - Création et utilisation de l'utilisateur système `ragtime:ragtime` (UID/GID 10001) sans privilèges root.
  - Image finale minimale (distroless ou alpine/debian-slim).
  - Nginx configuré avec TLS 1.3 exclusif et suites de chiffrement à confidentialité persistante.
- **Livrables Code :** `Dockerfile.backend`, `Dockerfile.frontend`, `docker/nginx/nginx.conf`

---

## 3. Matrice d'Exécution des Tests de Non-Régression (TNR DevOps)

| ID TNR | Périmètre DevOps | Condition Déclenchante | Validation Attendue |
|---|---|---|---|
| **TNR-01** | Contrat OpenAPI | Modification DTO Backend | Validation CI `openapi-diff` sans échec |
| **TNR-06** | Résilience SSE | Micro-coupure réseau | Reprise via `Last-Event-ID` dans les tests d'intégration |
| **TNR-10** | Télémétrie Cluster | Scraping `/metrics` | Présence effective des métriques TTFT et VRAM |
| **TNR-25** | Air-Gap Offline | Test en environnement déconnecté | Démarrage complet et inférence locale à 100% hors-ligne |

---

## 4. Plan de Vérification & Exécution CI/CD

### Commandes de Validation Automatisées :
```bash
# 1. Validation de l'environnement local Windows PowerShell
.\setup.ps1 -CheckOnly

# 2. Lancement de la stack Docker Compose locale
docker-compose up -d --build

# 3. Exécution des tests CI sans GPU (Mode Mock Ollama)
pytest backend/tests/ -v --cov=app
npm run test:ci

# 4. Validation de la matrice complète des TNR
python scripts/run_tnr_suite.py

# 5. Diagnostic des métriques Prometheus
curl -s http://localhost:8000/metrics | grep ragtime_
```
