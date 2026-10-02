# Guide d'Installation & Déploiement Local — RAGTIME (2026)

> **Projet :** RAGTIME (« Beat & Pgvector »)  
> **Classification :** Plateforme RAG Souveraine, On-Premise & Air-Gap Compliant  
> **Cible de ce Guide :** Poste de Travail Développeur Windows 11 (PowerShell 7+ / WSL2)  
> **Script Associé :** [`install/setup.ps1`](./setup.ps1)  
> **Documents de Référence :** `architecture/01-architecture.md`, `guide/plans/PLAN_DEVOPS_QA.md`

---

## 1. Vue d'Ensemble & Philosophie d'Installation

La plateforme **RAGTIME** est conçue pour fonctionner de façon 100% autonome et hermétique :
* **Zéro fuite cloud :** Aucun composant ne dépend d'API SaaS externes (OpenAI, Anthropic ou Cohere).
* **Inférence locale native :** Exécution du modèle de fondation `llama3.2:3b` et du modèle d'embedding dense 768d `nomic-embed-text` directement sur la machine hôte via **Ollama**.
* **Persistance relationnelle et vectorielle :** PostgreSQL 16 enrichi de l'extension `pgvector` avec index HNSW, exécuté sous conteneur Docker.
* **Orchestration asynchrone :** Redis 7 pour la file de tâches d'ingestion lourde pilotée par le worker ARQ.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      POSTE LOCAL WINDOWS 11 DÉVELOPPEUR                 │
│                                                                         │
│  [Frontend React / Vite] ────── Port 3000 (UI Développeur)              │
│            │ (HTTP REST / SSE)                                          │
│            ▼                                                            │
│  [Backend FastAPI / Uvicorn] ─ Port 8000 (Gateway API + /metrics)       │
│      ├───▶ [PostgreSQL 16 + pgvector] ─ Port 5432 (Docker)              │
│      ├───▶ [Redis 7 + Worker ARQ] ──── Port 6379 (Docker)              │
│      └───▶ [Ollama Runtime Local] ──── Port 11434 (Windows natif)       │
│                  ├── nomic-embed-text-v1.5 (768 dimensions)             │
│                  └── llama3.2:3b (Inférence LLM streamée SSE)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Matrice des Prérequis Matériels & Logiciels

### 2.1 Prérequis Matériels Recommandés
| Ressource | Configuration Minimale | Configuration Confort Recommandée |
|---|---|---|
| **Système d'Exploitation** | Windows 11 64-bit (Build 22000+) | Windows 11 Pro 64-bit avec WSL2 |
| **Processeur (CPU)** | 8 cœurs (support instructions AVX2) | 12 à 16 cœurs (Intel Core i7/i9 ou AMD Ryzen 7/9) |
| **Mémoire Vive (RAM)** | 16 Go DDR4 / DDR5 | 32 Go DDR5 |
| **Carte Graphique (GPU)** | Inférence CPU fallback possible | NVIDIA RTX 3060 / 4060 / 4070+ (>= 8 Go VRAM CUDA) |
| **Stockage Disque** | 20 Go disponibles (SSD NVMe) | 50 Go disponibles (SSD NVMe PCIe 4.0) |

### 2.2 Outils Logiciels Requis
| Outil | Version Minimale | Rôle dans RAGTIME | Commande de Vérification |
|---|---|---|---|
| **PowerShell** | 7.0+ (ou Windows PowerShell 5.1) | Exécution du script d'automatisation `setup.ps1` | `$PSVersionTable.PSVersion` |
| **Node.js** | $\ge 20.10.0$ LTS | Runtime JavaScript / Vite Frontend | `node --version` |
| **npm / bun** | npm $\ge 10.0$ ou Bun $\ge 1.1$ | Gestionnaire de dépendances frontend | `npm --version` |
| **Python** | $\ge 3.12.0$ 64-bit | Runtime Backend FastAPI, MLOps & Scripts QA | `python --version` |
| **Docker Desktop** | $\ge 4.25$ (Moteur Docker $\ge 25.0$) | Conteneurs Postgres pgvector et Redis 7 | `docker --version` |
| **Ollama Windows** | $\ge 0.4.0$ | Serveur local d'inférence LLM & Embeddings | `ollama --version` |

---

## 3. Matrice d'Attribution des Ports Réseau Locaux

Avant de démarrer l'installation, assurez-vous que les ports suivants sont disponibles sur votre machine :

| Port Hôte | Protocole | Service RAGTIME | Usage |
|---|---|---|---|
| **3000** | TCP / HTTP | Frontend Vite (React) | Interface web utilisateur |
| **8000** | TCP / HTTP | Backend FastAPI & Swagger | Endpoints REST, flux SSE & `/metrics` |
| **5432** | TCP / PostgreSQL | PostgreSQL 16 + pgvector | BDD relationnelle & index vectoriel HNSW |
| **6379** | TCP / Redis | Redis 7 Server | Broker de messages et queue de jobs ARQ |
| **11434** | TCP / HTTP | Ollama API Daemon | Inférence LLM locale & génération embeddings |
| **9090** | TCP / HTTP | Prometheus Scraper (Optionnel) | Monitoring local & métriques MLOps |
| **9093** | TCP / HTTP | Alertmanager (Optionnel) | Gestion des alertes de dégradation de perf |

---

## 4. Démarrage Automatisé en 1-Clic via PowerShell

Le script [`install/setup.ps1`](./setup.ps1) automatise l'intégralité du processus de diagnostic et d'initialisation.

### Étape 1 : Diagnostic Préalable (Mode Lecture Seule)
Pour vérifier que tous les prérequis sont satisfaits sans modifier votre système :
```powershell
powershell.exe -ExecutionPolicy Bypass -File .\install\setup.ps1 -CheckOnly
```

### Étape 2 : Initialisation Complète
Pour exécuter l'installation complète (génération `.env`, démarrage des services Docker et téléchargement des modèles LLM) :
```powershell
powershell.exe -ExecutionPolicy Bypass -File .\install\setup.ps1
```

### Options Disponibles sur `setup.ps1` :
* `-CheckOnly` : Inspecte l'état des dépendances matérielles et logicielles sans apporter aucune modification.
* `-SkipModels` : Ne télécharge pas les modèles Ollama (utile si vous les possédez déjà ou si votre connexion est restreinte).
* `-SkipDocker` : N'instancie pas les conteneurs Docker (pour tester uniquement les briques Python/Node locales).
* `-ForceEnv` : Écrase le fichier `.env` existant avec de nouveaux secrets cryptographiques locaux.

---

## 5. Démarrage Manuel Pas-à-Pas (Alternative au Script)

Si vous préférez orchestrer les composants manuellement ou comprendre chaque brique en profondeur, suivez les étapes ci-dessous :

### 5.1 Configuration de l'Environnement
Copiez le fichier de gabarit vers le fichier actif :
```powershell
Copy-Item .env.example .env
```
*Le fichier `.env` contient les mots de passe et configurations de connexion par défaut adaptés au développement local.*

### 5.2 Démarrage des Conteneurs d'Infrastructure
Démarrez PostgreSQL 16 (avec extension `pgvector`) et Redis 7 :
```powershell
docker compose up -d postgresql redis
```
Vérifiez l'état de santé :
```powershell
docker compose ps
```

### 5.3 Initialisation du Runtime Ollama & Téléchargement des Modèles
Assurez-vous qu'Ollama est démarré en arrière-plan :
```powershell
# Vérifier la disponibilité de l'API
curl http://localhost:11434/api/tags
```
Téléchargez les deux modèles requis par l'architecture souveraine :
```powershell
# 1. Modèle d'Embedding dense 768 dimensions (obligatoire pour pgvector)
ollama pull nomic-embed-text

# 2. Modèle de Langage 3.2 Milliards de paramètres (génération sourcée et streamée)
ollama pull llama3.2:3b
```

### 5.4 Installation des Dépendances Frontend
À la racine du projet :
```powershell
npm install
```
Lancement du serveur de développement Vite :
```powershell
npm run dev
```
L'interface est accessible sur [http://localhost:3000](http://localhost:3000).

### 5.5 Initialisation du Backend Python (FastAPI)
```powershell
# Création d'un environnement virtuel Python isolé
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Installation des dépendances backend (lorsque backend/requirements.txt est présent)
pip install -r backend/requirements.txt

# Démarrage de l'API FastAPI avec rechargement à chaud
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 6. Vérification de la Santé du Système

Une fois l'ensemble des briques démarré, exécutez ces vérifications pour attester de la conformité de l'environnement :

1. **Vérification Frontend :** Ouvrez votre navigateur sur `http://localhost:3000`. Vous devez voir la Landing Page avec le badge `Cluster pgvector Actif (768d)`.
2. **Vérification In-App TNR (Écran 6) :**
   - Connectez-vous via l'accès rapide Administrateur (`admin@ragtime.internal`).
   - Rendez-vous sur « Mon espace RAG » > Onglet **Tests & Évaluation**.
   - Cliquez sur **« Lancer la Suite de Tests »** : l'ensemble des 29+ TNR doit passer au vert (**100% validé**).
3. **Vérification Télémétrie & Logs (Écran 5) :**
   - Consultez l'onglet **Télémétrie & Logs** : les métriques TTFT, débits de tokens et sondes des 4 services doivent répondre favorablement.
4. **Vérification des Métriques Prometheus :**
   ```powershell
   curl -s http://localhost:8000/metrics | Select-String "ragtime_"
   ```

---

## 7. Guide de Dépannage Courant (Troubleshooting)

### Problème 1 : Docker Desktop n'est pas démarré ou le socket est introuvable
* **Symptôme :** Erreur `error during connect: In the default daemon configuration on Windows, the docker client must be run with elevated privileges`.
* **Solution :** Lancez Docker Desktop depuis le menu Démarrer de Windows et attendez que l'icône de la baleine dans la barre des tâches passe au vert permanent (« Docker Desktop is running »).

### Problème 2 : Port déjà utilisé (ex: Port 5432 ou 6379 en conflit)
* **Symptôme :** `bind: address already in use`.
* **Cause :** Une instance PostgreSQL ou Redis locale native tourne déjà sur votre machine Windows.
* **Solution :**
  - Identifiez le processus occupant le port : `netstat -ano | findstr :5432`
  - Arrêtez le service Windows natif : `Stop-Service postgresql*` ou modifiez le port exposé dans `docker-compose.override.yml`.

### Problème 3 : Ollama renvoie une erreur de connexion sur le port 11434
* **Symptôme :** `No connection could be made because the target machine actively refused it`.
* **Solution :** Démarrez Ollama depuis le menu Démarrer ou lancez la commande `ollama serve` dans un terminal dédié.

### Problème 4 : Erreur d'exécution de script PowerShell (`Execution_Policies`)
* **Symptôme :** `File setup.ps1 cannot be loaded because running scripts is disabled on this system`.
* **Solution :** Autorisez temporairement l'exécution pour la session :
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  # Ou lancez avec le flag Bypass :
  powershell.exe -ExecutionPolicy Bypass -File .\install\setup.ps1
  ```

---

## 8. Contacts & Support Équipe

* **Architecte & Tech Lead :** Référent architecture système et invariants SOLID.
* **Agent DevOps / MLOps & QA :** Maintenance de `install/setup.ps1`, `docker-compose.yml`, GitHub Actions et suite TNR.
* **Agent Frontend :** Composants React, streaming SSE et vues graphiques.
