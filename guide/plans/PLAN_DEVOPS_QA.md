# Plan de Création DevOps, MLOps & QA Automation — RAGTIME (2026)

> **Agent Responsable :** Agent DevOps, MLOps & QA Automation  
> **Documents Faisant Autorité :**  
> - `architecture/01-architecture.md` (Architecture Système & Invariants Souverains)  
> - `architecture/02-roadmap.md` (Feuille de Route & Jalons Stratégiques)  
> - `architecture/03-backlog-agents.md` (Backlog Inter-Agents & Matrice TNR Complète)  
> - `architecture/07-security-model.md` (Modèle de Menaces STRIDE & Conformité SecNumCloud)  
> - `architecture/specifications/SPECIFICATION_FONCTIONNELLE_PAR_ECRAN.md` (Spécification des 6 Écrans, Écran 5 Télémétrie, Écran 6 Live Test Console)  
> - `guide/GUIDE_COLLABORATION_AGENTS.md` (Protocoles Inter-Agents & Séquencement de Run)  
> - `guide/plans/PLAN_FRONTEND.md` (Standard de Méthodologie, User Stories, Gherkin & SOLID)  
> **Conformité & Rigueur :** Principes SOLID, Clean Architecture Hexagonale, Packaging Air-Gap Strict, CI/CD GitHub Actions Déterministe Sans GPU, Benchmarks GPU/VRAM & Couverture TNR Intégrale (29+ Tests de Non-Régression au Vert).

---

## 1. Préambule de l'Architecte & Mandat de Souveraineté

Le projet **RAGTIME** est une plateforme industrielle d'IA générative et de RAG (Retrieval-Augmented Generation) opérant dans des contextes à criticité maximale (OIV, institutions de souveraineté, secteurs santé, défense et juridique).  
En tant qu'**Agent DevOps, MLOps & QA Automation**, ton mandat est d'assurer l'étanchéité opérationnelle, l'excellence de l'infrastructure logicielle, la fidélité télémétrique et l'intégrité de la qualité logicielle :

1. **Garantie Air-Gap Absolue :** Tout déploiement en production doit pouvoir s'effectuer sans le moindre accès au réseau Internet public. Zéro appel CDN, zéro téléchargement de poids ou d'images Docker au runtime. Les conteneurs, dépendances Python/Node et modèles LLM GGUF / embeddings sont packagés dans des archives autonomes auto-suffisantes.
2. **Excellence CI/CD Sans Dépendance Matérielle GPU :** La validation continue dans GitHub Actions s'exécute sur des runners cloud standards (`ubuntu-latest`) sans GPU dédié. Tout le cycle de validation (linting, typage strict, tests unitaires, contrats OpenAPI, suite complète des TNR) repose sur des mocks déterministes à haute fidélité pour Ollama et une base PostgreSQL/pgvector éphémère.
3. **Vérité Métrique & Télémétrie MLOps Certifiée (TNR-10) :** L'Écran 5 (« Télémétrie & Logs ») et les dashboards Prometheus n'affichent aucune valeur simulée ou aléatoire en conditions réelles : les latences TTFT, débits de tokens, empreintes VRAM et états de santé sont branchés sur les métriques instrumentées du moteur backend et des sondes NVML.
4. **Zéro Régression Tolérée (TNR 100% au Vert) :** Aucun incrément logiciel ne peut être promu en production si la matrice complète des Tests de Non-Régression (TNR-01 à TNR-31) n'est pas validée à 100% dans la console en direct (`LiveTestConsole.tsx`) et dans le runner de tests automatisé (`scripts/run_tnr_suite.py`).

---

## 2. Cartographie des 3 Environnements Cibles de Déploiement

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 1. ENVIRONNEMENT DÉV LOCAL                             │
│  • OS Hôte : Windows 11 (PowerShell 7+ / WSL2)                                         │
│  • Runtime LLM : Ollama Windows natif (port 11434) -> llama3.2:3b & nomic-embed-text   │
│  • Conteneurs : Docker Desktop (PostgreSQL 16 + pgvector, Redis 7)                     │
│  • Orchestration : setup.ps1 (1-clic prérequis, .env, pull modèles, healthcheck)      │
│  • Live Reload : Vite (Frontend React port 3000) + Uvicorn (FastAPI Python port 8000)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼ (Push GitHub / Pull Request)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              2. PIPELINE CI/CD GITHUB ACTIONS                          │
│  • Runner : ubuntu-latest (Environnement Cloud Standardisé, Zéro GPU requis)          │
│  • Mock Engine : Fast-Mock Ollama déterministe (embeddings 768d + SSE chunks simulés)  │
│  • Services CI : Docker Service Container postgres:16-pgvector + redis:7               │
│  • Étapes : Lint (ESLint, Ruff), Typecheck (TSC strict, Mypy), OpenAPI Diff Check      │
│  • Tests : Pytest (Backend cov > 85%), Vitest (Frontend), Matrice Complète 29+ TNR     │
│  • Artefacts : Rapports de couverture, JSON d'audit TNR certifié, bundles dist/        │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼ (Release Souveraine / Packaging Air-Gap)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            3. ENVIRONNEMENT PROD SOUVERAIN (AIR-GAP)                   │
│  • Système Cible : Bare-Metal / K8s / Rocky Linux 9 ou Debian 12 Hardened              │
│  • Accélération Matérielle : NVIDIA RTX 4090 / A100 via NVIDIA Container Toolkit       │
│  • Réseau : VLAN Privé 100% étanche, Zéro accès Internet, Résolution DNS interne       │
│  • Sécurité Conteneurs : Utilisateur non-root (ragtime:10001), filesystem ro, TLS 1.3 │
│  • Supervision : Prometheus Scraper (/metrics) + Alertmanager + Télémétrie NVML VRAM   │
│  • Packaging : Script package_airgap.py générant les tarballs images + modèles GGUF    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Principes Directeurs & Invariants DevOps, MLOps & QA

1. **Air-Gap Strict & Zéro Appel Externe :** Aucun conteneur ou script de production ne doit faire de requête DNS ou HTTP vers l'extérieur. Toutes les dépendances (pip wheels, npm tarballs, images docker, modèles Ollama) sont intégrées ou importées en amont.
2. **CI Sans GPU Obligatoire :** Aucun test de pipeline ne doit dépendre d'une carte graphique physique. Le simulateur Fast-Mock Ollama fournit des réponses textuelles et des vecteurs 768d mathématiquement reproductibles.
3. **Vérité Télémétrique (TNR-10) :** Les métriques Prometheus exposées sur `/metrics` découlent d'instrumentations réelles (`time.perf_counter()` pour le TTFT, compteurs de tokens streamés, sondes pynvml pour la mémoire GPU).
4. **Validation des TNR Avant Toute Release :** La suite complète des 29+ TNR doit être exécutable en 1 commande (`python scripts/run_tnr_suite.py`) et afficher un score de passage de 100% (29/29).
5. **Sécurité SecNumCloud & Hardening :**
   - Exécution sous utilisateur système non privilégié `ragtime:ragtime` (UID/GID 10001).
   - Nginx frontal configuré avec TLS 1.3 exclusif, CSP stricte et suites cryptographiques PFS.
   - Images Docker minimales multi-stage sans compilateur ni shell interactif en production.
6. **Idempotence & Répétabilité :** Tout script d'installation (`setup.ps1`, `install_airgap.sh`, `backup_pgvector.sh`) doit être strictement idempotent (relançable indéfiniment sans corruption d'état).

---

## 4. Architecture Logicielle & Principes SOLID Appliqués à l'Infrastructure

Pour garantir la pérennité et la clarté du code d'infrastructure, de pipeline et de test, les principes **SOLID** sont appliqués comme suit :

* **Single Responsibility Principle (SRP) :**
  - Chaque conteneur remplit une fonction dédiée unique (PostgreSQL pour la persistance vectorielle, Redis pour la queue de messages, FastAPI pour l'API métier, Ollama pour le moteur d'inférence, Prometheus pour la collecte métrique).
  - Chaque script de pipeline (`setup.ps1`, `run_tnr_suite.py`, `package_airgap.py`, `backup_pgvector.sh`) répond à une responsabilité isolée et documentée.
* **Open/Closed Principle (OCP) :**
  - Le banc d'essai TNR (`run_tnr_suite.py`) est conçu sur un registre modulaire de tests : l'ajout d'un nouveau test (ex: TNR-32) s'effectue par simple déclaration sans modifier le moteur d'orchestration central.
  - Le scraper Prometheus et le module de métriques permettent d'enregistrer de nouveaux collecteurs sans refondre l'architecture `/metrics`.
* **Liskov Substitution Principle (LSP) :**
  - Le mock de test Ollama implémente exactement l'interface REST d'Ollama (`/api/generate`, `/api/embeddings`, `/api/tags`). Le backend FastAPI fonctionne de façon indiscernable face à un Ollama réel ou un mock CI.
  - Les adaptateurs de base de données de test (Postgres Docker vs Postgres local) respectent les mêmes migrations Alembic et contraintes d'étanchéité multi-tenant.
* **Interface Segregation Principle (ISP) :**
  - Ségrégation stricte des sondes de santé des conteneurs : `/health/liveness` (vitalité du processus), `/health/readiness` (connectivité Postgres/Redis/Ollama effective), et `/metrics` (télémétrie Prometheus dédiée).
* **Dependency Inversion Principle (DIP) :**
  - Le backend et les scripts de test dépendent d'abstractions configurables par variables d'environnement (`OLLAMA_BASE_URL`, `DATABASE_URL`, `REDIS_URL`, `METRICS_ENABLED`) plutôt que de dépendances codées en dur.

---

## 5. Découpage Détaillé en User Stories DevOps / MLOps / QA (US-DEVOPS-01 à US-DEVOPS-10)

---

### US-DEVOPS-01 : Scripting d'Installation & Setup Environnement Local (Windows / PowerShell)

- **User Story :** En tant que développeur sous Windows 11, je veux exécuter un script PowerShell unique (`install/setup.ps1`) accompagné de sa documentation d'installation exhaustive (`install/install.md`) qui vérifie l'ensemble des prérequis système (Python 3.12, Node.js 20, Ollama Windows natif, Docker Desktop), initialise le fichier `.env` avec des clés cryptographiques locales, télécharge les modèles LLM requis et vérifie la connectivité des services en 1 clic.
- **Tâche PR :** `feat(dev-setup): Windows PowerShell automated environment setup script, installation guide and local prerequisite checker`
- **Pattern & SOLID :** *Facade Pattern* (orchestration simplifiée des sous-systèmes), *Idempotent Command Pattern*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Exécution initiale sur poste de développement Windows
    Étant donné un poste Windows 11 avec PowerShell 7+
    Quand le développeur exécute .\install\setup.ps1
    Alors le script vérifie la présence de Python >= 3.12, Node >= 20, Docker running et Ollama sur le port 11434
    Et il crée le fichier .env à partir de .env.example avec des secrets générés localement
    Et il lance le téléchargement des modèles Ollama requis (llama3.2:3b et nomic-embed-text)
    Et il confirme la santé de l'environnement avec un code de sortie 0.

  Scénario: Mode vérification sans altération (-CheckOnly)
    Quand le développeur exécute .\install\setup.ps1 -CheckOnly
    Alors le script inspecte l'état des dépendances sans modifier de fichier ni télécharger de modèle
    Et produit un rapport de diagnostic clair en console.

  Scénario: Consultation de la documentation d'installation
    Étant donné un nouvel arrivant sur le projet
    Quand il consulte install/install.md
    Alors il dispose d'un guide pas-à-pas exhaustif détaillant les prérequis matériels/logiciels, la matrice de ports, les étapes manuelles et automatisées, et le dépannage courant.
  ```
- **Tests Unitaires & Intégration :**
  - `tests/scripts/test_setup_ps1.py` : Test d'exécution PowerShell (vérification des codes d'erreur, des paramètres et des variables).
  - Validation de l'idempotence : exécuter deux fois de suite sans erreur ni écrasement de `.env` déjà personnalisé.
- **Tests de Non-Régression (TNR) :**
  - `TNR-SETUP-01` : Préservation des secrets existants dans `.env` lors d'un re-run.
- **Livrables Code :** `install/setup.ps1`, `install/install.md`, `.env.example`

---

### US-DEVOPS-02 : Packaging Multi-Conteneurs Docker Compose Souverain (Dev & Prod Air-Gap)

- **User Story :** En tant qu'architecte d'infrastructure, je veux orchestrer l'ensemble des briques applicatives via `docker-compose.yml` (PostgreSQL 16 avec extension pgvector, Redis 7, Backend FastAPI, Worker ARQ, Frontend Vite/Nginx) avec support GPU NVIDIA natif, pont réseau interne sécurisé et healthchecks conditionnels.
- **Tâche PR :** `feat(docker): sovereign multi-container docker compose setup with NVIDIA GPU pass-through and healthchecks`
- **Pattern & SOLID :** *Microservices Architecture*, *Separation of Concerns*, *Dependency Injection via Environment*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Démarrage ordonné des conteneurs
    Étant donné la commande docker compose up -d
    Quand les conteneurs sont instanciés
    Alors postgresql (avec pgvector 16) et redis sont démarrés en premier
    Et fastapi attend que postgresql et redis soient dans un état healthy avant de démarrer
    Et le worker arq et le frontend se lancent une fois l'API prête
    Et tous les conteneurs partagent le réseau isolé ragtime_network sans exposition de ports internes superflus.

  Scénario: Détection et utilisation du GPU NVIDIA
    Étant donné un serveur hôte équipé de NVIDIA Container Toolkit
    Quand docker compose up démarre avec le profil GPU
    Alors Ollama ou le backend accède aux périphériques CUDA via deploy.resources.reservations.devices.
  ```
- **Tests Unitaires & Intégration :**
  - Validation syntaxique et lint du docker-compose : `docker compose config`.
  - Test d'initialisation de la BDD : exécution de `docker/postgres/init.sql` vérifiant l'activation de `CREATE EXTENSION IF NOT EXISTS vector;` et la création de l'utilisateur non-root.
- **Tests de Non-Régression (TNR) :**
  - `TNR-DOCKER-01` : Tous les conteneurs passent leur healthcheck sous 60 secondes.
  - `TNR-DOCKER-02` : Persistance des volumes `pgdata` et `redisdata` après `docker compose down` puis `docker compose up`.
- **Livrables Code :** `docker-compose.yml`, `docker-compose.override.yml`, `docker/postgres/init.sql`

---

### US-DEVOPS-03 : Pipeline CI/CD GitHub Actions (Lint, Typecheck, Build & OpenAPI Check)

- **User Story :** En tant que Tech Lead, je veux qu'à chaque commit ou Pull Request, un workflow GitHub Actions (`.github/workflows/ci.yml`) valide rigoureusement la qualité du code (ESLint, TypeScript mode strict, Ruff, Mypy) et bloque la fusion en cas de rupture de contrat OpenAPI avec le frontend.
- **Tâche PR :** `ci(github-actions): workflow integration for linting, typechecking, frontend build, and openapi diff detection`
- **Pattern & SOLID :** *Fail-Fast Quality Gate*, *Contract Verification*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Détection d'une erreur de typage ou de linting
    Étant donné une Pull Request contenant une violation de type TypeScript ou Python
    Quand le pipeline CI s'exécute sur ubuntu-latest
    Alors les jobs de linting (npm run lint, ruff check) ou de typage (tsc --noEmit, mypy) échouent
    Et la PR est marquée comme bloquante avec rapport des erreurs.

  Scénario: Détection de rupture de schéma OpenAPI (TNR-01)
    Étant donné une modification des DTOs backend supprimant ou renommant un champ obligatoire
    Quand l'étape openapi-diff compare le schéma généré avec le contrat frontend
    Alors le job échoue immédiatement avec alerte de régression de contrat.
  ```
- **Tests Unitaires & Intégration :**
  - Validation du schéma des workflows avec `actionlint`.
  - Exécution locale des étapes via scripts dédiés (`npm run lint`, `tsc --noEmit`).
- **Tests de Non-Régression (TNR) :**
  - `TNR-01` : Détection de rupture de contrat OpenAPI certifiée.
- **Livrables Code :** `.github/workflows/ci.yml`

---

### US-DEVOPS-04 : Runner de Tests CI Sans GPU (Mock Ollama & Pytest/Vitest Integration)

- **User Story :** En tant qu'ingénieur QA, je veux exécuter l'ensemble des suites de tests unitaires et d'intégration dans l'environnement GitHub Actions (sans GPU physique) en injectant un mock déterministe d'Ollama et une instance PostgreSQL/pgvector de test.
- **Tâche PR :** `ci(testing): headless CI test runner with deterministic Ollama mocks and Postgres container`
- **Pattern & SOLID :** *Liskov Substitution Principle* (Mock Ollama substituable au service réel), *Test Double / Fake Object Pattern*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Exécution des tests d'intégration sans carte graphique
    Étant donné un environnement CI GitHub Actions sans GPU
    Quand le job de test lance pytest backend/tests/ et npm run test:ci
    Alors le mock Ollama intercepte les requêtes /api/embeddings et renvoie un vecteur 768d normalisé déterministe
    Et les requêtes /api/generate reçoivent un flux SSE d'événements valides
    Et les tests s'exécutent intégralement en moins de 3 minutes avec une couverture backend > 85%.
  ```
- **Tests Unitaires & Intégration :**
  - `backend/tests/test_ollama_mock.py` : Vérifie que le mock produit des embeddings de taille 768 avec norme unitaire et des deltas textuels conformes au protocole SSE.
  - `backend/tests/conftest.py` : Fixtures Pytest pour base de données de test isolée et client API FastAPI de test (`httpx.AsyncClient`).
- **Tests de Non-Régression (TNR) :**
  - `TNR-CI-01` : Zéro échec lié à l'absence de CUDA ou de GPU dans la CI.
- **Livrables Code :** `.github/workflows/test.yml`, `backend/tests/conftest.py`, `backend/tests/mocks/ollama_mock.py`

---

### US-DEVOPS-05 : Matrice d'Automation des 29+ Tests de Non-Régression (Banc d'Essai TNR)

- **User Story :** En tant que Responsable Qualité, je veux un script d'exécution automatisé (`scripts/run_tnr_suite.py`) qui joue séquentiellement l'intégralité de la matrice des 29+ TNR, vérifie les invariants stricts (isolation tenant, immutabilité des presets, nettoyage déterministe, budget VRAM) et produit un rapport de certification formel en JSON et Markdown.
- **Tâche PR :** `feat(qa-tnr): automated test runner for the complete 29+ TNR matrix with certified report generation`
- **Pattern & SOLID :** *Test Suite Runner Pattern*, *Open/Closed Principle* (registre dynamique d'exécuteurs de TNR).
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Exécution complète du banc d'essai TNR
    Étant donné l'infrastructure RAGTIME active (locale ou CI)
    Quand l'opérateur exécute python scripts/run_tnr_suite.py
    Alors les 29+ TNR (TNR-01 à TNR-31) sont exécutés avec leurs assertions respectives
    Et le script produit artifacts/tnr_report.json et artifacts/tnr_report.md
    Et le statut global est SUCCESS (29/29 validés) avec code de sortie 0.
  ```
- **Tests Unitaires & Intégration :**
  - `tests/test_tnr_runner.py` : Vérification du parsing des arguments, de la gestion des erreurs individuelles de tests et de la structure du rapport JSON généré.
- **Tests de Non-Régression (TNR) :**
  - Couverture complète de `TNR-01` à `TNR-31` (synchronisé avec `src/testing/inAppTestRunner.ts` et `LiveTestConsole.tsx`).
- **Livrables Code :** `scripts/run_tnr_suite.py`, `scripts/tnr_definitions.py`

---

### US-DEVOPS-06 : Exposition des Métriques Prometheus (`/metrics`) & Télémétrie MLOps

- **User Story :** En tant qu'opérateur MLOps, je veux que le backend FastAPI expose un endpoint standard `/metrics` pour Prometheus instrumentant les métriques d'inférence en direct (TTFT p50/p95, tokens/seconde, VRAM GPU allouée, requêtes par tenant) afin d'alimenter fidèlement l'Écran 5 de supervision (`TelemetryDashboardView.tsx`).
- **Tâche PR :** `feat(mlops-prometheus): prometheus metrics endpoint exposition for inference TTFT, tokens/sec, and GPU memory`
- **Pattern & SOLID :** *Observer Pattern*, *Instrumentation Decorator Pattern*, *Single Responsibility*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Scraping des métriques RAGTIME par Prometheus
    Étant donné le backend FastAPI en fonctionnement
    Quand Prometheus effectue un GET /metrics
    Alors la réponse contient les métriques au format standard :
      - ragtime_ttft_seconds (histogramme de latence TTFT)
      - ragtime_tokens_per_second (gauge du débit de streaming)
      - ragtime_vram_usage_bytes (gauge d'occupation mémoire VRAM)
      - ragtime_tenant_queries_total (compteur étiqueté par tenant_id)
      - ragtime_service_health (gauge binaire de santé des 4 briques socles).
  ```
- **Tests Unitaires & Intégration :**
  - `backend/tests/test_metrics.py` : Vérifie l'incrémentation des métriques après une requête de chat simulée et la conformité syntaxique du format Prometheus.
- **Tests de Non-Régression (TNR) :**
  - `TNR-10` : Les métriques proviennent d'instrumentations réelles (zéro télémétrie fictive).
- **Livrables Code :** `backend/app/core/metrics.py`, `docker/prometheus/prometheus.yml`

---

### US-DEVOPS-07 : Configuration de l'Alertmanager & Seuils de Dégradation de Performance

- **User Story :** En tant qu'administrateur système, je veux configurer les règles d'alerte Prometheus et Alertmanager déclenchant des notifications immédiates en cas de dérive de performance (TTFT > 800 ms, VRAM > 85%, débit < 15 tok/s, indisponibilité d'un service socle).
- **Tâche PR :** `feat(alerting): prometheus alert rules for high TTFT, GPU VRAM saturation, and service downtime`
- **Pattern & SOLID :** *Rule Engine Pattern*, *Threshold Monitor*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Déclenchement d'une alerte de dégradation TTFT
    Étant donné un temps de réponse TTFT supérieur à 800 ms sur une fenêtre de 2 minutes
    Quand Prometheus évalue la règle TTFTTooHigh
    Alors une alerte de sévérité warning est transmise à l'Alertmanager
    Et répercutée sur le tableau de bord de l'Écran 5.

  Scénario: Déclenchement d'une alerte de saturation VRAM GPU
    Étant donné une mémoire VRAM occupée à plus de 85% de sa capacité totale
    Quand la règle VRAMNearSaturation est évaluée
    Alors une alerte de sévérité critical est émise pour prévenir le risque d'OOM (Out Of Memory).
  ```
- **Tests Unitaires & Intégration :**
  - Validation des règles PromQL avec l'outil de test officiel `promtool check rules docker/prometheus/alert.rules.yml`.
- **Tests de Non-Régression (TNR) :**
  - `TNR-24` : Réaction visuelle immédiate des seuils d'alerte (TTFT > 800ms, VRAM > 85%).
- **Livrables Code :** `docker/prometheus/alert.rules.yml`, `docker/prometheus/alertmanager.yml`

---

### US-DEVOPS-08 : Bundle de Déploiement Air-Gap Offline (Export Images Docker & Modèles LLM)

- **User Story :** En tant qu'ingénieur de déploiement en zone souveraine déconnectée, je veux exécuter un script de packaging offline (`scripts/package_airgap.py`) qui extrait toutes les images Docker en archives `.tar.gz`, sauvegarde les modèles Ollama GGUF requis (`llama3.2:3b`, `nomic-embed-text`) et fournit un script d'installation clé en main (`install_airgap.sh`) sans appel réseau.
- **Tâche PR :** `feat(airgap-bundle): offline packaging script for docker image tarballs and Ollama GGUF model archives`
- **Pattern & SOLID :** *Self-Contained Deployment Unit*, *Idempotent Installer*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Génération du bundle d'installation déconnecté
    Étant donné un poste connecté disposant de Docker et d'Ollama
    Quand l'opérateur lance python scripts/package_airgap.py --output-dir ./dist-airgap
    Alors le script exporte les images Docker (postgres, redis, backend, frontend) en archives .tar.gz
    Et exporte les poids des modèles GGUF et manifests Ollama
    Et calcule le SHA-256 de chaque archive dans un fichier manifest.sha256
    Et génère le script d'installation offline install_airgap.sh.

  Scénario: Installation sur serveur cible 100% hors-ligne
    Étant donné un serveur cible sans aucune connexion réseau
    Quand l'administrateur exécute ./install_airgap.sh
    Alors le script charge les images via docker load, restaure les modèles Ollama et démarre la stack avec succès.
  ```
- **Tests Unitaires & Intégration :**
  - `tests/test_package_airgap.py` : Vérifie la validité des commandes `docker save`, la structure de l'archive et l'intégrité du fichier de checksums SHA-256.
- **Tests de Non-Régression (TNR) :**
  - `TNR-25` : Fonctionnement 100% autonome et inférence locale vérifiée en environnement déconnecté.
- **Livrables Code :** `scripts/package_airgap.py`, `scripts/install_airgap.sh`

---

### US-DEVOPS-09 : Stratégie de Backup & Restauration Immuable BDD PostgreSQL pgvector

- **User Story :** En tant qu'administrateur de base de données, je veux disposer de scripts de sauvegarde et de restauration automatisés (`backup_pgvector.sh`, `restore_pgvector.sh`) garantissant l'intégrité transactionnelle des métadonnées, des documents et de l'index vectoriel HNSW avec vérification cryptographique SHA-256.
- **Tâche PR :** `feat(db-backup): automated pgdump and vector index restoration scripts with SHA-256 verification`
- **Pattern & SOLID :** *Backup Verification Pattern*, *Cryptographic Auditability*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Sauvegarde à chaud de la base relationnelle et vectorielle
    Étant donné l'instance PostgreSQL pgvector active avec documents indexés
    Quand le script scripts/backup_pgvector.sh est exécuté
    Alors il produit une archive compressée .dump via pg_dump avec horodatage
    Et génère l'empreinte SHA-256 du backup pour garantie d'inaltérabilité.

  Scénario: Restauration complète et reconstruction des index HNSW
    Étant donné un fichier de sauvegarde intègre validé par son SHA-256
    Quand le script scripts/restore_pgvector.sh est exécuté
    Alors la base de données est restaurée intégralement
    Et les index HNSW pgvector sont vérifiés et opérationnels pour la recherche cosinus.
  ```
- **Tests Unitaires & Intégration :**
  - `tests/test_db_backup.py` : Test de bout-en-bout création d'un jeu de données vectoriel de test, backup, purge de la BDD, restauration et assertion d'égalité sur les vecteurs et chunks.
- **Tests de Non-Régression (TNR) :**
  - `TNR-BACKUP-01` : Conservation absolue des relations multi-tenant et des index HNSW post-restauration.
- **Livrables Code :** `scripts/backup_pgvector.sh`, `scripts/restore_pgvector.sh`

---

### US-DEVOPS-10 : Hardening Systèmes & Conteneurs (Debian Hardened, Non-Root Users & TLS 1.3)

- **User Story :** En tant qu'officier de sécurité et DevOps, je veux durcir les images Docker finales de production (utilisateur non privilégié `ragtime:10001`, suppression des outils de debug, filesystem en lecture seule avec volumes temporaires restreints, terminaison TLS 1.3 Nginx) conformément aux exigences SecNumCloud 3.2.
- **Tâche PR :** `security(hardening): production multi-stage dockerfiles with non-root execution and TLS 1.3 Nginx configuration`
- **Pattern & SOLID :** *Least Privilege Principle*, *Defense in Depth*, *Hardened Minimal Surface*.
- **Critères d'Acceptation (Gherkin) :**
  ```gherkin
  Scénario: Exécution sécurisée sous utilisateur non-root
    Étant donné le conteneur backend ou frontend démarré en production
    Quand on inspecte le processus avec id ou whoami
    Alors l'UID et le GID correspondent strictement à 10001 (ragtime)
    Et l'accès aux privilèges root est formellement bloqué.

  Scénario: Configuration Nginx TLS 1.3 exclusive
    Étant donné le reverse proxy frontal Nginx
    Quand un client négocie une connexion TLS
    Alors les protocoles TLS 1.0, 1.1 et 1.2 sont rejetés
    Et seul TLS 1.3 avec cipher suites PFS est autorisé avec en-têtes HSTS stricts.
  ```
- **Tests Unitaires & Intégration :**
  - Scan de vulnérabilités Trivy dans la CI (`trivy image --severity HIGH,CRITICAL`).
  - Vérification de la configuration Nginx : `nginx -t` dans le conteneur.
- **Tests de Non-Régression (TNR) :**
  - `TNR-SEC-01` : Blocage d'exécution en tant que root dans les images de production.
- **Livrables Code :** `Dockerfile.backend`, `Dockerfile.frontend`, `docker/nginx/nginx.conf`

---

## 6. Matrice d'Exécution & Couverture des 29+ Tests de Non-Régression (TNR)

Cette matrice établit la correspondance directe entre les règles d'or bloquantes du projet, leur instrumentation DevOps et leur rendu sur les Écrans 5 et 6 :

| ID TNR | Périmètre & Invariant | Mécanisme de Validation Automatisée (DevOps/QA) | Synchronisation UI |
|---|---|---|---|
| **TNR-01** | Contrat OpenAPI : non-régression schéma | `scripts/run_tnr_suite.py` (étape `openapi-diff`) | Écran 6 (`LiveTestConsole.tsx`) |
| **TNR-02** | Isolation multi-tenant stricte | Assertions SQL `WHERE tenant_id` et purge mémoire cross-tenant | Écran 6 (`LiveTestConsole.tsx`) |
| **TNR-03** | Versionnage immuable des documents | Upload homonyme créant $v+1$ avec nouveau SHA-256 | Écran 6 & Écran 2 (Table Documents) |
| **TNR-04** | Intégrité des métadonnées JSONB chunks | Inspection des champs SHA-256, page, token count | Écran 4 (Audit) & Tiroir d'Inspection |
| **TNR-05** | Immutabilité des Presets RAG actifs | Création d'une révision incrémentale distincte | Écran 3 (Studio Presets) |
| **TNR-06** | Résilience streaming SSE & reconnexion | Reprise via header `Last-Event-ID` sans duplication | Écran 1 (Chat RAG) |
| **TNR-07** | Assainissement déterministe anti-XSS | Neutralisation des tags `<script>`, `onerror`, `javascript:` | Écran 1 & Écran 2 |
| **TNR-08** | Garde de sécurité suppression domaine | Blocage si `tenants.length <= 1` (fail-safe 1 domaine min) | Barre de Domaine (`TenantWorkspaceBar`) |
| **TNR-09** | Garde éthique anti-hallucination | Blocage de prompt si `documents_count === 0` sur le domaine | Écran 1 (Verrouillage Onboarding) |
| **TNR-10** | Vérité télémétrique du cluster | Scraping `/metrics` : métriques TTFT, tokens/s et VRAM réelles | Écran 5 (`TelemetryDashboardView.tsx`) |
| **TNR-11** | Sécurité navigation et guard auth | Redirection vers login si token absent ou session invalide | Vue Globale & `AuthModal.tsx` |
| **TNR-12** | Complexité mot de passe ANSSI | Validation regex et politique de sécurité à la saisie | Vue Auth Login |
| **TNR-13** | Purge mémoire lors de la déconnexion | Vidage intégral `sessionStorage` et tokens en mémoire | Barre de Navigation (`Navbar.tsx`) |
| **TNR-14** | Formatage nomenclature citations | Validation regex `[Document, p.X]` sans layout shift | Écran 1 (Chips Citations) |
| **TNR-15** | Rendu DOM propre sans warning d'hydratation | Contrôle strict de l'arborescence HTML / tables | Écran 6 & Console Navigateur |
| **TNR-16** | Bornes de pagination dynamique | Recalcul automatique de la page courante au changement de taille | Écran 2, 4 et 5 (Tables Paginées) |
| **TNR-17** | Traçabilité des exports multi-formats | Validation des hashes SHA-256 et masquage des secrets | Écran 1, 4 et 5 (Boutons Export) |
| **TNR-18** | Immutabilité mathématique des presets | Cadenas scellé sur domaine avec $\ge 1$ document | Écran 3 & Écran 2 (Bannière Preset) |
| **TNR-19** | Feedback contextuel validation formulaire | Affichage des erreurs via `FormFieldFeedback` | Écran 2, 3 et Modales |
| **TNR-20** | Debounce réactif recherche tableaux | Recherche avec délai sans gel d'interface | Écran 2 et 4 (Barre de Recherche) |
| **TNR-21** | Restauration intégrale sessions de chat | Rechargement des messages et citations archivées | Écran 1 (Tiroir Historique) |
| **TNR-22** | Suivi fluide jobs ARQ asynchrones | Progression par étapes (Extraction, Vectorisation, Indexation) | Écran 2 (Suivi Ingestion) |
| **TNR-23** | Validation cryptographique exports JSON | Checksums SHA-256 certifiés et conformité OpenTelemetry | Écran 5 (Export Télémétrie) |
| **TNR-24** | Réaction réactive alertes dégradation | Badges d'alerte immédiats (TTFT > 800ms, VRAM > 85%) | Écran 5 (Panneau Alertes) |
| **TNR-25** | Étalonnage thermomètre cosinus 768d | Calibration continue 0.50 à 1.00 avec delta Top-1 | Écran 1 & Tiroir `ChunkInspectorDrawer` |
| **TNR-26** | Extraction web Trafilatura 2.0 | Mode Précision éliminant le boilerplate HTML | Écran 2 (`WebUrlExtractionForm.tsx`) |
| **TNR-27** | Nettoyage déterministe caractères invisibles | Éradication `\u200B-\u200F`, `\uFEFF` et normalisation NFC | Écran 2 & Écran 6 (Banc d'Essai) |
| **TNR-28** | Invariants multi-stratégies chunking | Contrôle `overlap < size/2` et non-rupture de phrases | Écran 3 (`RagPresetStudioView.tsx`) |
| **TNR-29** | Simulation Dry-Run pré-indexation | Zéro INSERT SQL en base, estimation VRAM pgvector HNSW | Écran 2 (`PreIndexingDryRunModal.tsx`) |
| **TNR-30** | Préfixage contextuel titres de sections | Injection `[Section > Sous-section]` sur Markdown AST | Écran 2 & 3 |
| **TNR-31** | Palette thermique tripartite des scores | Calibration visuelle : Haute $\ge 0.75$, Modérée, Faible | Écran 1 (Badges Citations) |

---

## 7. Architecture d'Observabilité Prometheus, Alertmanager & Télémétrie MLOps (Écran 5)

### 7.1 Métriques Instrumentées Exposées sur `/metrics`

```prometheus
# HELP ragtime_ttft_seconds Latence du Time-to-First-Token en secondes
# TYPE ragtime_ttft_seconds histogram
ragtime_ttft_seconds_bucket{le="0.1"} 42
ragtime_ttft_seconds_bucket{le="0.3"} 156
ragtime_ttft_seconds_bucket{le="0.8"} 290
ragtime_ttft_seconds_bucket{le="+Inf"} 301
ragtime_ttft_seconds_sum 124.6
ragtime_ttft_seconds_count 301

# HELP ragtime_tokens_per_second Débit instantané de génération de tokens
# TYPE ragtime_tokens_per_second gauge
ragtime_tokens_per_second 42.8

# HELP ragtime_vram_usage_bytes Mémoire GPU allouée mesurée par NVML
# TYPE ragtime_vram_usage_bytes gauge
ragtime_vram_usage_bytes 8452489216

# HELP ragtime_service_health Statut de santé des 4 services socles (1=up, 0=down)
# TYPE ragtime_service_health gauge
ragtime_service_health{service="fastapi"} 1
ragtime_service_health{service="postgres_pgvector"} 1
ragtime_service_health{service="ollama_engine"} 1
ragtime_service_health{service="redis_arq"} 1
```

### 7.2 Règles d'Alerting Définies dans Alertmanager

1. **`TTFTTooHigh` :** Déclenchée si `histogram_quantile(0.95, sum(rate(ragtime_ttft_seconds_bucket[5m])) by (le)) > 0.8` pendant plus de 2 minutes.  
   *Sévérité :* Warning. *Impact :* Alerte visuelle ambre sur Écran 5.
2. **`VRAMNearSaturation` :** Déclenchée si `ragtime_vram_usage_bytes / ragtime_vram_total_bytes > 0.85` pendant 1 minute.  
   *Sévérité :* Critical. *Impact :* Alerte rouge immédiate pour prévenir un crash OOM du GPU.
3. **`LowTokensPerSecond` :** Déclenchée si `ragtime_tokens_per_second < 15` sur les requêtes actives.  
   *Sévérité :* Warning. *Impact :* Signalement d'une surcharge du modèle d'inférence.
4. **`CoreServiceDown` :** Déclenchée si `ragtime_service_health == 0` pendant plus de 30 secondes.  
   *Sévérité :* Critical. *Impact :* Notification d'urgence et bascule en mode dégradé.

---

## 8. Playbook de Validation & Commandes d'Exécution

```powershell
# ==============================================================================
# PLAYBOOK DE COMMANDE DEVOPS / MLOPS & QA AUTOMATION — RAGTIME
# ==============================================================================

# 1. Vérification de l'environnement local Windows (Mode Diagnostic)
powershell.exe -ExecutionPolicy Bypass -File .\install\setup.ps1 -CheckOnly

# 2. Initialisation complète de l'environnement de développement local
powershell.exe -ExecutionPolicy Bypass -File .\install\setup.ps1

# 3. Validation de la configuration Docker Compose
docker compose config --quiet

# 4. Lancement de la stack multi-conteneurs locale avec build
docker compose up -d --build

# 5. Contrôle des sondes de santé des conteneurs
docker compose ps

# 6. Exécution du linting et du typecheck strict
npm run lint
tsc --noEmit
ruff check backend/
mypy backend/

# 7. Exécution des tests unitaires et d'intégration sans GPU
pytest backend/tests/ -v --cov=backend/app --cov-report=term-missing
npm run test:ci

# 8. Exécution automatisée de la matrice complète des 29+ TNR
python scripts/run_tnr_suite.py --format json --output artifacts/tnr_report.json

# 9. Diagnostic en direct des métriques Prometheus
curl -s http://localhost:8000/metrics | Select-String "ragtime_"

# 10. Packaging du bundle Air-Gap déconnecté pour mise en production
python scripts/package_airgap.py --output-dir ./dist-airgap --compress
```

---

## 9. Synthèse des Jalons & Prochaines Étapes Opérationnelles

| Jalon | Focus Prioritaire | Livrables Majeurs | Statut |
|---|---|---|---|
| **Jalon 1** | Environnement Développeur Local Windows | `install/setup.ps1`, `install/install.md`, `.env.example`, `tests/scripts/test_setup_ps1.py` | **Terminé & Validé (Audit 100% OK)** |
| **Jalon 2** | Orchestration Docker Multi-Services & BDD | `docker-compose.yml`, `init.sql` (pgvector 16), healthchecks | Prêt pour implémentation |
| **Jalon 3** | Pipelines CI/CD GitHub Actions & Mock Ollama | `.github/workflows/ci.yml`, `test.yml`, mocks déterministes | Prêt pour implémentation |
| **Jalon 4** | Banc d'Essai & Automatisation des 29+ TNR | `scripts/run_tnr_suite.py`, certification JSON/Markdown | Prêt pour implémentation |
| **Jalon 5** | Métriques Prometheus & Alertmanager (Écran 5) | `metrics.py`, `prometheus.yml`, `alert.rules.yml` | Prêt pour implémentation |
| **Jalon 6** | Packaging Air-Gap, Sauvegarde BDD & Hardening | `package_airgap.py`, `backup_pgvector.sh`, Dockerfiles non-root | Prêt pour implémentation |
