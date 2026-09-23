# RAGTIME — Spécification Fonctionnelle Exhaustive par Écran
> **Référence Absolue pour les Agents Collaborateurs & Développeurs Frontend/Backend**  
> *Dernière mise à jour : Phase 8 (Intégration Presets d'Ingestion, Embedding Scellé & Découpage Dynamique)*

---

## Sommaire Exécutif

Ce document répertorie **l'intégralité des fonctionnalités, interactions, composants, flux de données et règles de non-régression (TNR)** pour chaque écran de la plateforme souveraine RAGTIME.  
Il a été conçu pour permettre aux agents collaborateurs de comprendre immédiatement l'arborescence, les invariants mathématiques et les interactions croisées sans risque d'omission ou de régression fonctionnelle.

### Arborescence Globale des Écrans

1. [Écrans Périphériques & Vitrines](#1-écrans-périphériques--vitrines)
   - 1.1 [Showcase / Landing Page (`LandingHero.tsx`, `BentoGrid.tsx`)](#11-showcase--landing-page)
   - 1.2 [Authentification & Contrôle d'Accès RBAC (`AuthLoginView.tsx`, `AuthModal.tsx`)](#12-authentification--contrôle-daccès-rbac)
   - 1.3 [Plan & Roadmap Technique Frontend (`FrontendProposalView.tsx`)](#13-plan--roadmap-technique-frontend)
   - 1.4 [Console de Démonstration Interactive (`InteractiveConsoleDemo.tsx`)](#14-console-de-démonstration-interactive)
2. [Cœur Métier : Les 6 Écrans de « Mon espace RAG » (`V1WorkspaceView.tsx`)](#2-cœur-métier--les-6-écrans-de-mon-espace-rag)
   - 2.1 [Barre Transverse de Domaine (`TenantWorkspaceBar.tsx`)](#21-barre-transverse-de-domaine)
   - 2.2 [Écran 1 : Chat RAG Sourcé (`SourcedChatView.tsx`)](#22-écran-1--chat-rag-sourcé)
   - 2.3 [Écran 2 : Ingestion et Jobs ARQ (`DocumentIngestionView.tsx`)](#23-écran-2--ingestion-et-jobs-arq)
   - 2.4 [Écran 3 : Studio Presets RAG (`RagPresetStudioView.tsx`)](#24-écran-3--studio-presets-rag)
   - 2.5 [Écran 4 : Audit & Traçabilité (`RagAuditExplorerView.tsx`)](#25-écran-4--audit--traçabilité)
   - 2.6 [Écran 5 : Télémétrie & Logs (`TelemetryDashboardView.tsx`)](#26-écran-5--télémétrie--logs)
   - 2.7 [Écran 6 : Tests & Évaluation (`LiveTestConsole.tsx`)](#27-écran-6--tests--évaluation)
3. [Composants Transversaux, Tiroirs & Modales Dédiées](#3-composants-transversaux-tiroirs--modales-dédiées)

---

## 1. Écrans Périphériques & Vitrines

### 1.1 Showcase / Landing Page
- **Fichiers sources :** `src/components/v1/LandingHero.tsx`, `src/components/v1/BentoGrid.tsx`, `src/components/v1/Footer.tsx`
- **Rôle métier :** Présentation publique des garanties de souveraineté numérique, démonstration de l'architecture technique sans authentification requise.
- **Fonctionnalités & Interactions :**
  - **Hero Header :** Badge dynamique `Cluster pgvector Actif (768d)`, titre principal typographique à fort contraste, description du pipeline hybride on-premise (PostgreSQL + pgvector, FastAPI, Ollama/vLLM, ARQ Worker).
  - **Barre d'Orientation Rapide :** Champ de recherche simulé permettant de tester une question type ou de cliquer sur les suggestions pour ouvrir la modal de démonstration de citation.
  - **Bento Grid (6 Piliers d'Architecture) :**
    1. *Souveraineté 100% On-Premise* : Zéro fuite cloud, étanchéité RGPD et ISO 27001. Clic déclenche `AirGapModal`.
    2. *Cloisonnement Multi-Tenant RLS* : Ségrégation stricte des espaces métiers par `tenant_id` et Row-Level Security.
    3. *Moteur Hybride BM25 + pgvector RRF* : Fusion réciproque de rang $1/(60+r)$ alliant mot-clé exact et sémantique dense.
    4. *Citations & Empreintes Cryptographiques SHA-256* : Traçabilité inaltérable à la page et au chunk près. Clic déclenche `CitationModal`.
    5. *Mode Air-Gap & Déconnexion Réseau* : Fonctionnement hors ligne en environnement clos sécurisé.
    6. *Télémétrie Prometheus Native* : Exposition des métriques de latence TTFT, débit tokens/s et état de santé du cluster. Clic déclenche `ArchitectureInfoModal`.
  - **Barre de Navigation Globale (`Navbar.tsx`) :**
    - Logo Ragtime (croche musicale stylisée centrée optiquement, sans bordure parasite).
    - Liens de navigation : `Showcase`, `Mon espace RAG` (conditionné à l'authentification), `Plan & Roadmap`, `Démo Interactive`.
    - Bouton d'action contextuel `Ouvrir le Chat RAG` qui bascule sur Mon espace RAG > Chat RAG, et **se masque automatiquement** lorsque l'utilisateur est déjà sur cet écran précis.
    - Sélecteur de profil / commutation de rôle RBAC démo (Administrateur, Lead Data Scientist, Auditeur) et bouton de déconnexion.

---

### 1.2 Authentification & Contrôle d'Accès RBAC
- **Fichiers sources :** `src/components/v1/AuthLoginView.tsx`, `src/components/v1/AuthModal.tsx`, `src/context/AuthContext.tsx`
- **Rôle métier :** Accès sécurisé aux espaces de travail RAG cloisonnés par rôle et permissions.
- **Fonctionnalités & Interactions :**
  - **Formulaire de Connexion POC :** Identifiant (email) et mot de passe avec validation de schéma (`validateAuthCredentials`).
  - **Comptes Démo en Accès Rapide :**
    - *Administrateur / Owner* (`admin@ragtime.internal`) : Droits complets (création/suppression de domaines, ingestion, modification des presets, purge d'audit).
    - *Lead Data Scientist* (`lead-ds@ragtime.internal`) : Création/ajustement des presets RAG, lancement d'ingestions, tests et comparaison d'embeddings.
    - *Auditeur / Viewer* (`viewer@ragtime.internal`) : Consultation du chat sourcé, inspection des citations et logs d'audit en lecture seule.
  - **Persistance & Sécurité :** Session mémorisée dans `sessionStorage` (TNR-11), purge complète au clic sur Déconnexion (TNR-13), redirection automatique des utilisateurs non authentifiés (TNR-12).

---

### 1.3 Plan & Roadmap Technique Frontend
- **Fichier source :** `src/components/v1/FrontendProposalView.tsx`
- **Rôle métier :** Tableau de bord de gouvernance projet affichant l'état d'avancement des 8 phases d'implémentation frontend et des User Stories associées.
- **Fonctionnalités & Interactions :**
  - Synthèse métrique globale : % de complétion, nombre de User Stories implémentées (US-FRONT-01 à US-FRONT-39), total des tests TNR au vert (29/29).
  - Déroulé chronologique interactif des 8 phases (Fondations, Ingestion, Presets, RRF, Historique/SSE, Trafilatura/Dry-Run, Embeddings/RLS).
  - Détail de chaque User Story avec composants modifiés, règles d'acceptation et critères de validation.

---

### 1.4 Console de Démonstration Interactive
- **Fichier source :** `src/components/v1/InteractiveConsoleDemo.tsx`
- **Rôle métier :** Environnement bac à sable pour simuler le comportement du cluster RAG en conditions réelles sans injecter de données réelles.
- **Fonctionnalités & Interactions :**
  - Émulateur de flux de tokens SSE avec réglage de la vitesse de restitution.
  - Comparateur visuel temps réel de la recherche vectorielle pure vs recherche hybride RRF.
  - Journaliseur d'événements SSE standardisés (`stream_start`, `query_analyzed`, `chunks_retrieved`, `token`, `source_citation`, `metrics`, `done`).

---

## 2. Cœur Métier : Les 6 Écrans de « Mon espace RAG »

L'espace de travail est structuré par `src/components/v1/V1WorkspaceView.tsx`.  
Il est encadré au sommet par la barre d'espace de travail `TenantWorkspaceBar.tsx` et propose 6 onglets métier spécialisés :

```
┌────────────────────────────────────────────────────────────────────────┐
│ TenantWorkspaceBar : Sélecteur de Domaine | Instructions Système | +   │
├───────────┬──────────────┬─────────────┬───────────┬───────────┬───────┤
│ 1. Chat   │ 2. Ingestion │ 3. Presets  │ 4. Audit  │ 5. Télém. │ 6.Test│
│ Sourcé    │ & Jobs ARQ   │ Studio      │ & Traçab. │ & Logs    │ & Eval│
└───────────┴──────────────┴─────────────┴───────────┴───────────┴───────┘
```

---

### 2.1 Barre Transverse de Domaine (`TenantWorkspaceBar.tsx`)
- **Composant :** `src/components/v1/TenantWorkspaceBar.tsx`
- **Rôle métier :** Gestionnaire contextuel du tenant actif. Règle d'or TNR-02 : toute commutation de domaine réinitialise immédiatement le cache local et injecte le header `X-Tenant-ID`.
- **Fonctionnalités :**
  - **Menu Déroulant des Domaines Métiers :** Sélection du domaine courant (ex: `Finance & Fiscalité`, `Défense & Stratégie`, `Santé & Médical`).
  - **Badges Contextuels :** Catégorie métier avec couleur dédiée, nombre de documents indexés dans le domaine.
  - **Bouton « Personnalisation système » :** Ouvre la modal `DomainConfigModal.tsx` pour modifier le prompt système injecté au LLM pour ce domaine spécifique.
  - **Bouton « Nouveau Domaine » :** Ouvre `DomainConfigModal.tsx` en mode création avec validation de nom, slug, catégorie et modèle d'embedding initial.
  - **Garde de Sécurité TNR-10 :** Empêche la suppression du dernier domaine restant.

---

### 2.2 Écran 1 : Chat RAG Sourcé (`SourcedChatView.tsx`)
- **Composant :** `src/components/v1/SourcedChatView.tsx`
- **Rôle métier :** Interface conversationnelle souveraine avec génération augmentée par récupération, streaming SSE réel et traçabilité mathématique des citations.
- **Fonctionnalités Détaillées :**
  1. **Zone de Discussion & Flux Conversationnel :**
     - Saisie de requêtes textuelles avec validation déterministe (`validateChatQuery`, 3 à 500 caractères, anti-XSS).
     - Streaming SSE FastAPI via `useSSEStream` consommant les 8 événements normalisés.
     - Affichage fluide des tokens générés avec curseur animé de streaming.
     - Bouton d'interruption immédiate du flux en cours (`Arrêter la génération`).
  2. **Badges de Citations Thermiques Cosinus (US-FRONT-30) :**
     - Sous chaque réponse de l'assistant, affichage de chips cliquables `[Document, p.X]`.
     - Code couleur thermique automatique selon le score cosinus :
       - $\ge 0.85$ : Émeraude vif (pertinence maximale).
       - $0.70 - 0.84$ : Cyan / Vert d'eau (pertinence forte).
       - $0.60 - 0.69$ : Ambre chaleureux (pertinence modérée).
       - $< 0.60$ : Rose / Rouge d'alerte (faible pertinence ou sous le seuil).
     - **Popover au Survol :** Affiche le score exact (ex: `0.874`), le $\Delta$ par rapport au Top-1 (`Δ = -0.021`), le seuil de coupure du preset et le statut de certification.
     - **Clic sur une Citation :** Déploie le tiroir latéral `ChunkInspectorDrawer.tsx` avec thermomètre linéaire continu de 0.50 à 1.00 (`VisualVectorSimilarityInspector.tsx`).
  3. **Sélecteur de Preset RAG Actif & Modal d'Information (US-FRONT-39) :**
     - Sélecteur déroulant du preset appliqué à la session de chat.
     - Icône d'information `Info` ouvrant le modal `PresetInfoModal.tsx` pour consulter le modèle d'embedding, la stratégie de découpage et les paramètres du moteur sans quitter la discussion.
  4. **Gestion Avancée de l'Historique Conversationnel (US-FRONT-26) :**
     - Toggle `Historique activé / désactivé` avec persistance `localStorage` isolée par `tenant_id`.
     - Bouton `Récupérer / Supprimer conversations ({count})` ouvrant le panneau des sessions passées :
       - Recherche de conversations archivées par mot-clé, date ou question.
       - Bouton `Récupérer` : Recharge instantanément l'intégralité des messages et citations dans l'interface active.
       - Bouton `Exporter` direct en Markdown ou JSON sans obligation de réouvrir la session.
       - Bouton `Supprimer` individuel ou purge complète `Tout supprimer` avec double-confirmation.
  5. **Barre d'Actions Conversationnelle (US-FRONT-28) :**
     - `Enregistrer la session` : Archive l'échange avec horodatage.
     - `Copier l'échange` : Dépose la conversation complète formatée avec citations dans le presse-papier.
     - `Exporter` : Menu déroulant proposant Markdown (.md avec frontmatter et checksums SHA-256), JSON (schéma certifié) ou Texte brut (.txt).
     - `Effacer l'affichage` : Réinitialise l'écran sans affecter les archives stockées.
  6. **État Vierge (Zero Document / Onboarding) :**
     - Si le domaine ne contient aucun document indexé, le chat est verrouillé avec avertissement pédagogique invitant à basculer vers l'écran d'ingestion (TNR-09).

---

### 2.3 Écran 2 : Ingestion et Jobs ARQ (`DocumentIngestionView.tsx`)
- **Composant :** `src/components/v1/DocumentIngestionView.tsx`
- **Rôle métier :** Hub d'alimentation documentaire, extraction web, nettoyage déterministe, simulation Dry-Run, suivi des workers asynchrones ARQ et gestion du cycle de vie des fichiers.
- **Fonctionnalités Détaillées :**
  1. **Bannière d'Affichage Explicite du Preset RAG Actif (US-FRONT-27-BIS) :**
     - Affiche en permanence la configuration active du domaine cible :
       - Modèle d'embedding (dimensions, cosine pgvector).
       - Stratégie et paramètres de chunking (taille, overlap, fil d'Ariane AST).
       - Seuil cosinus minimal et Top-K retrieval.
       - Statut d'immutabilité : `🔒 Espace Scellé` ({N} documents indexés) ou `🔓 Espace Vierge Modifiable`.
     - Sélecteur rapide de bascule si plusieurs presets coexistent pour le domaine.
     - Bouton `Fiche Technique` ouvrant `PresetInfoModal.tsx`.
     - Bouton de redirection directe vers le `Studio Presets RAG`.
  2. **Source d'Ingestion Bi-Canal (Fichiers vs URL Web) :**
     - *Onglet Fichiers Locaux :* Zone de glisser-déposer (Drag & Drop) et sélecteur de fichier prenant en charge PDF, Markdown, SQL, TXT (limite 25 Mo).
     - *Onglet Extraction Web Trafilatura 2.0 (`WebUrlExtractionForm.tsx`) :*
       - Saisie d'URL avec validation RFC et protection anti-SSRF.
       - Bascule Précision (élimination totale du boilerplate web) vs Rappel.
       - Toggles d'options : tableaux Markdown, hyperliens, texte alternatif d'images, capture des métadonnées canoniques.
  3. **Console de Nettoyage Déterministe (`CleaningOptionsPanel.tsx`) :**
     - 4 filtres mécaniques : Normalisation Unicode NFC, Éradication des caractères invisibles (`\u200B` à `\u200F`, `\uFEFF`), Assainissement des balises HTML résiduelles, Condensation des espaces et retours chariot multiples.
     - Bouton `Inspecteur Diff A/B` ouvrant `CleaningDiffModal.tsx` avec comparaison côte-à-côte et décompte des caractères neutralisés.
  4. **Simulateur Dry-Run Pré-Indexation (`PreIndexingDryRunModal.tsx`) :**
     - Simulation en mémoire sans écriture en base.
     - Estimation du nombre de chunks, décompte de tokens et empreinte VRAM pgvector HNSW.
     - Histogramme de distribution des tailles et aperçu paginé des premiers chunks générés avec leur préfixe hiérarchique.
  5. **Suivi Asynchrone de la File d'Attente ARQ (`useDocumentUploader.ts`) :**
     - Suivi de la progression par étape : `En attente`, `Extraction`, `Découpage`, `Vectorisation (Embedding)`, `Indexation pgvector`.
     - Affichage du pourcentage d'avancement et gestion des erreurs de worker sans gel d'interface.
  6. **Table Documentaire par Domaine (`DomainDocumentsTable.tsx`) :**
     - Bascule vue groupée (tous les domaines) vs domaine actif uniquement.
     - Recherche textuelle et recherche exacte par empreinte SHA-256.
     - Filtrage par type de fichier (PDF, Markdown, SQL, Tous).
     - Pagination dynamique (`TablePaginationBar.tsx`, 5/10/25/50 items par page) et tri multi-colonnes.
     - Bouton `Consulter` ouvrant `DocumentConsultModal.tsx` (métadonnées, versions v1/v2, aperçu des chunks découpés).
     - Bouton `Supprimer` ouvrant `ConfirmDeleteDialog.tsx` avec purge en cascade des chunks et embeddings associés.
     - Bouton `Simuler v+1` pour tester l'incrémentation de version d'un document existant.

---

### 2.4 Écran 3 : Studio Presets RAG (`RagPresetStudioView.tsx`)
- **Composant :** `src/components/v1/RagPresetStudioView.tsx`
- **Rôle métier :** Laboratoire de configuration des profils d'indexation et de recherche. Gouverné par la Règle d'Or d'Immutabilité Conditionnelle TNR-18.
- **Fonctionnalités Détaillées :**
  1. **Catalogue des Presets du Domaine :**
     - Liste des presets existants avec badges `Actif`, numéro de version ($v1$, $v2$), et date de mise à jour.
     - Bouton d'activation d'un preset avec répercussion instantanée sur le domaine.
  2. **Sélecteur de Modèle d'Embedding & Règle d'Espace Vierge (US-FRONT-36) :**
     - Choix parmi les modèles souverains documentés : `nomic-embed-text-v1.5` (768d), `bge-m3` (1024d), `text-embedding-3-small` (1536d), `all-MiniLM-L6-v2` (384d).
     - **Verrouillage Scellé (TNR-18) :**
       - Si le domaine contient $\ge 1$ document : sélecteur d'embedding verrouillé avec cadenas `🔒 Modèle Scellé` pour empêcher l'hétérogénéité dimensionnelle de l'espace vectoriel.
       - Si le domaine est vierge (0 document) : sélection libre du modèle.
  3. **Formulaire de Découpage Multi-Stratégies (US-FRONT-37) :**
     - *Stratégie Fenêtre Glissante (Fixed Sliding) :* Curseur `chunk_size` (128 à 2048 tok), curseur `chunk_overlap` (0 à 500 tok) avec contrôle strict de l'invariant `overlap < size / 2`.
     - *Stratégie Phrastique Sémantique (Sentence Boundary) :* Curseur `max_sentence_tokens` (64 à 512 tok), toggle « Respecter les abréviations françaises » (M., Mme., Dr., etc.). Overlap fixe masqué.
     - *Stratégie Sections Markdown AST :* Sélecteur de profondeur de titres (`# H1` à `### H3`), toggle « Préfixer automatiquement le fil d'Ariane de section » (`[Section > Sous-section]`).
  4. **Paramétrage du Moteur de Retrieval & Banc d'Essai Cosinus :**
     - Curseur de seuil minimal d'admissibilité (`similarity_threshold`, 0.50 à 0.95).
     - Curseur Top-K (1 à 20 chunks retenus).
     - Toggle Reranker Cross-Encoder BGE.
     - **Banc d'essai thermique interactif :** Affichage d'un jeu de 4 chunks d'exemple réagissant en temps réel au curseur de seuil pour visualiser immédiatement les chunks inclus (vert) ou rejetés (rouge/hachuré).
  5. **Versionnage Immuable $v+1$ :**
     - Tout ajustement d'un preset sur un domaine déjà alimenté crée un nouvel enregistrement snapshot $v+1$ sans écraser la version antérieure (TNR-05).

---

### 2.5 Écran 4 : Audit & Traçabilité (`RagAuditExplorerView.tsx`)
- **Composant :** `src/components/v1/RagAuditExplorerView.tsx`
- **Rôle métier :** Console d'inspection de conformité, d'auditabilité algorithmique et de traçabilité des requêtes utilisateurs.
- **Fonctionnalités Détaillées :**
  1. **Journal d'Audit des Requêtes :**
     - Table exhaustive consignant chaque requête adressée au cluster avec son horodatage ISO, le domaine émetteur, le preset utilisé, le temps de réponse (TTFT et total), et le statut de complétion.
  2. **Analyse de Pertinence & Scores Cosinus :**
     - Score moyen et score maximum des chunks mobilisés par requête.
     - Indicateurs de dispersion sémantique.
  3. **Visualisation des Chunks Mobilisés :**
     - Dépliage d'une requête pour inspecter individuellement chaque chunk extrait.
     - Bouton d'ouverture directe vers le tiroir `ChunkInspectorDrawer.tsx` avec positionnement sur la réglette thermique.
  4. **Filtres de Recherche & Export :**
     - Filtre par domaine, par intervalle de dates, et par seuil de score minimal.
     - Export du journal au format JSON auditable ou CSV pour intégration SIEM / GRC d'entreprise.

---

### 2.6 Écran 5 : Télémétrie & Logs (`TelemetryDashboardView.tsx`)
- **Composant :** `src/components/v1/TelemetryDashboardView.tsx`
- **Rôle métier :** Supervision MLOps, santé de l'infrastructure souveraine et alerting préventif.
- **Fonctionnalités Détaillées :**
  1. **Indicateurs de Santé des 4 Services Socles :**
     - *FastAPI Gateway* : Disponibilité API REST & SSE, statut HTTP 200.
     - *PostgreSQL + pgvector* : Connexions actives, disponibilité des index HNSW 768d.
     - *Ollama / vLLM LLM Engine* : Modèle local chargé en VRAM, disponibilité GPU.
     - *Redis / ARQ Worker* : File d'attente d'ingestion et débit de traitement.
  2. **Métriques Prometheus en Temps Réel :**
     - Latence TTFT (Time To First Token) : p50, p95, p99.
     - Débit de génération : Tokens par seconde (tok/s).
     - Taux d'utilisation de la VRAM GPU et de la mémoire vive partagée.
     - Volume de requêtes par minute (RPM).
  3. **Système d'Alerting Visuel Proactif :**
     - Déclenchement automatique de badges d'alerte ambre/rouge en cas de dérive :
       - TTFT > 800 ms
       - Débit < 15 tok/s
       - Contexte VRAM > 85%
  4. **Historique des Latences & Export Télémétrique :**
     - Table paginée et triable des événements de latence récents.
     - Bouton `Export Télémétrie Souveraine` générant un fichier JSON conforme OpenTelemetry / Prometheus.

---

### 2.7 Écran 6 : Tests & Évaluation (`LiveTestConsole.tsx`)
- **Composant :** `src/components/v1/LiveTestConsole.tsx`
- **Rôle métier :** Banc de test en direct, validation continue de non-régression et métriques de fidélité RAG.
- **Fonctionnalités Détaillées :**
  1. **Matrice des 29 Tests de Non-Régression (TNR-01 à TNR-29) :**
     - Affichage interactif du statut de chaque test (100% Validé).
     - Filtrage par catégorie : Contrat d'API, Cloisonnement Tenant, Streaming SSE, Immutabilité des Presets, Télémétrie, Hybride RRF, Nettoyage/Dry-Run.
     - Clic sur un test pour afficher son invariant technique, sa condition déclenchante et son comportement validé.
  2. **Comparateur Split-Screen RRF vs Recherche Dense (TNR-15) :**
     - Saisie d'une requête complexe pour comparer côte-à-côte les résultats de la recherche vectorielle pure face à la fusion hybride BM25 + pgvector.
     - Calcul du gain relatif de pertinence et mise en évidence des chunks repêchés par le mot-clé exact.
  3. **Banc d'Essai de Neutralisation des Injections Invisibles :**
     - Injecteur de texte expérimental contenant des espaces de largeur nulle (`\u200B`) ou du texte masqué pour vérifier en direct la neutralisation mécanique par le sanitizer déterministe.
  4. **Métriques d'Évaluation de Fidélité (Faithfulness & Relevance) :**
     - Calcul du ratio d'affirmations étayées par les sources (Faithfulness Score).
     - Indice d'alignement de la réponse avec la question posée (Answer Relevance).

---

## 3. Composants Transversaux, Tiroirs & Modales Dédiées

| Composant | Fichier Source | Rôle & Déclenchement |
|---|---|---|
| **Tiroir d'Inspection Latérale** | `src/components/v1/ChunkInspectorDrawer.tsx` | Inspecte un chunk cité : texte intégral, métadonnées JSONB, SHA-256, stratégie d'extraction, et thermomètre continu `VisualVectorSimilarityInspector.tsx`. |
| **Thermomètre Cosinus Visuel** | `src/components/v1/VisualVectorSimilarityInspector.tsx` | Jauge linéaire 0.50 - 1.00 avec positionnement exact du chunk, marqueur Top-1 et zone hachurée d'exclusion. |
| **Fiche Synthèse Preset** | `src/components/v1/PresetInfoModal.tsx` | Synthèse rapide des caractéristiques d'un preset (embedding, chunking, retrieval, immutabilité) déclenchée depuis le Chat ou l'Ingestion. |
| **Simulateur Dry-Run** | `src/components/v1/PreIndexingDryRunModal.tsx` | Simulation de segmentation documentaire en mémoire avec calcul VRAM pgvector et carrousel des 3 premiers chunks. |
| **Inspecteur Diff A/B** | `src/components/v1/CleaningDiffModal.tsx` | Comparateur textuel côte-à-côte montrant le texte brut face au texte assaini avec décompte d'octets et de caractères invisibles retirés. |
| **Consultation Document** | `src/components/v1/DocumentConsultModal.tsx` | Visualisation des métadonnées du document, de ses versions successives et des chunks indexés. |
| **Configuration Domaine** | `src/components/v1/DomainConfigModal.tsx` | Création ou mise à jour d'un domaine : nom, slug, catégorie métier, modèle d'embedding initial et prompt système personnalisé. |
| **Confirmation Suppression** | `src/components/v1/ConfirmDeleteDialog.tsx` | Modal de sécurité empêchant toute suppression accidentelle de document ou de conversation. |
| **Barre de Pagination** | `src/components/v1/TablePaginationBar.tsx` | Pagination universelle avec sélecteur de taille (5, 10, 25, 50), sauts de page et tri dynamique. |
| **Modal Air-Gap** | `src/components/v1/AirGapModal.tsx` | Fiche explicative des garanties de déconnexion réseau totale et certification souveraine. |
| **Modal Architecture** | `src/components/v1/ArchitectureInfoModal.tsx` | Schéma explicatif du pipeline RAG souverain et des composants du cluster. |

---

## 4. Règles d'Or & Invariants pour les Agents Collaborateurs

1. **Isolation Stricte du Tenant (RLS & Context) :**  
   Ne jamais exécuter de requête ou de recherche sans associer le `tenant_id` actif. La commutation de domaine doit purger immédiatement les caches locaux.
2. **Règle d'Immutabilité Vectorielle (TNR-18) :**  
   Ne jamais permettre la modification du modèle d'embedding ou de la dimensionnalité sur un domaine possédant déjà des documents indexés (`documents_count > 0`). Si l'utilisateur souhaite un nouveau modèle, il doit initialiser un nouveau domaine ou ré-indexer.
3. **Invariant de Fenêtrage :**  
   Pour la stratégie de fenêtre glissante, `chunk_overlap` doit obligatoirement respecter : $\text{overlap} < \frac{\text{chunk\_size}}{2}$.
4. **Zéro Échappement Hors-Sol :**  
   Si un domaine ne possède aucun document, le chat doit refuser la génération hors-sol et guider l'utilisateur vers l'ingestion documentaire (TNR-09).
5. **Anti-Slop Visuel & Design System :**  
   Respecter scrupuleusement la palette sombre souveraine (`#0B0B0C`, `#121214`), l'échelle typographique mathématique, les contrastes WCAG AA et bannir les clichés visuels génériques.
