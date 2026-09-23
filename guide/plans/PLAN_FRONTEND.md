# Plan de Création Front-end — RAGTIME (2026)

> **Agent Responsable :** Développeur Frontend Next.js / UX-UI Senior  
> **Document Faisant Autorité :** `03-backlog-agents.md`, `01-architecture.md`, `07-security-model.md`, `objectifs-stack-agents.md`  
> **Conformité & Rigueur :** Principes SOLID, Design Patterns GoF/React, Tests Unitaires (Vitest/RTL) et Tests de Non-Régression (TNR)

---

## 1. Principes Directeurs & Invariants Front-end

1. **Zéro Typage Manuel :** Aucun type métier ne doit être écrit à la main. Tous les DTO proviennent du schéma OpenAPI versionné généré par FastAPI (`openapi-typescript`).
2. **Contrat SSE Strict (8 Événements Requis) :** Le client SSE traite formellement : `message.started`, `retrieval.started`, `retrieval.completed`, `generation.started`, `generation.delta`, `sources.available`, `message.completed`, `message.failed`.
3. **Tolérance aux Pannes & Reconnexion :** Gestion native du header `Last-Event-ID`, déduplication des deltas et annulation explicite via `AbortController`.
4. **Citations Inaltérables :** L'UI ne fabrique aucune citation artificielle. Les badges `[Document, p.X]` pointent strictement vers les `message_source` certifiées par le serveur.
5. **Design System Tailwind v4 (Dark Mode Premium) :**
   - Canvas de base : `#09090b` (texturé).
   - Bento Box & Cartes : `#121214` avec bordure `border-zinc-800/60`.
   - Accent « Focus RAG » : `#4f46e5` / `#6366f1` (actions primaires, focus clavier, highlights de recherche).
   - Typographie : Geist Sans (corps & display) + JetBrains Mono (tokens, hashes SHA256, chunks).

---

## 2. Architecture Logicielle & Principes SOLID Appliqués au Front-end

Pour garantir une maintenabilité irréprochable et faciliter les tests automatisés, le frontend applique rigoureusement les principes **SOLID** et les **Design Patterns** établis :

### 2.1 Principes SOLID Côté Client
- **S — Single Responsibility Principle (SRP) :**
  - Séparation stricte : *Présentation pure* (Composants visuels déclaratifs) vs *Logique d'état* (Custom Hooks) vs *Communication Réseau* (Adapters/Ports).
  - Un composant d'affichage ne réalise jamais d'appel `fetch` direct.
- **O — Open/Closed Principle (OCP) :**
  - Les modules de rendu (rendu Markdown, visualiseurs d'extraits PDF/SQL/Markdown, formateurs de score) s'appuient sur un registre de stratégies extensible sans modification du composant hôte.
- **L — Liskov Substitution Principle (LSP) :**
  - Les clients API (`ApiClientPort`, `SSEClientPort`) respectent une interface abstraite. Un client factice (`MockApiClient` pour tests ou prévisualisation hors-ligne) est substituable au client HTTP réel (`FetchApiClient`) sans rupture de contrat.
- **I — Interface Segregation Principle (ISP) :**
  - Interfaces React fines et granulaires : les sous-composants ne reçoivent que les props nécessaires à leur rendu (évite les « mega-DTO » non modulaires).
- **D — Dependency Inversion Principle (DIP) :**
  - Injection des dépendances via React Context et Providers (`TenantProvider`, `AuthProvider`, `ApiProvider`). Les composants enfants dépendent d'abstractions d'accès aux données.

### 2.2 Design Patterns Mis en Œuvre
- **Adapter / Port Pattern :** Abstraction des endpoints FastAPI dans des adaptateurs dédiés (`DocumentApiAdapter`, `ChatApiAdapter`).
- **Observer / Reactive Stream Pattern :** Décodage et distribution des événements SSE via un gestionnaire réactif avec souscription typée.
- **Finite State Machine (FSM) :** Cycle de vie du chat en streaming modélisé par des états étanches : `IDLE -> RETRIEVING -> GENERATING -> COMPLETED | FAILED`, interdisant toute transition illicite.
- **Strategy Pattern :** Parsing et sanitization de Markdown (protection XSS) et formatage contextuel des citations (PDF vs SQL vs Markdown).
- **Container / Presentational Pattern :** Composants « Smart » connectés au contexte applicatif encapsulant des composants « Dumb » purs, déterministes et facilement testables unitairement.

---

## 3. Découpage en User Stories avec Tests Unitaires et de Non-Régression

---

### Phase 1 — V1 (MVP RAG)

#### US-FRONT-01 : Intégration du Contrat OpenAPI & Types Générés
- **User Story :** En tant que développeur front, je veux générer automatiquement mes types TypeScript à partir du schéma OpenAPI de FastAPI (`/openapi.json`) afin d'éliminer tout risque de désynchronisation.
- **Tâche PR :** `feat(contracts): generate frontend types from openapi`
- **Pattern & SOLID :** *Adapter Pattern*, *Single Source of Truth*.
- **Critères d'Acceptation :**
  - Script `npm run generate:api` opérationnel via `openapi-typescript`.
  - Zéro type TypeScript dupliqué à la main dans `src/types/`.
  - Validation stricte des payloads de requête et de réponse au `tsc --noEmit`.
- **Tests Unitaires (Vitest) :**
  - `contracts.test.ts` : Vérifie que le schéma TypeScript correspond fidèlement aux fixtures OpenAPI Pydantic.
  - `adapter.test.ts` : Vérifie le mapping correct des requêtes `POST /chat` et `POST /documents/upload`.
- **Tests de Non-Régression (TNR) :**
  - `tnr-contract-diff.test.ts` : Détection de rupture de contrat binaire dans la CI si un champ obligatoire du backend est modifié ou supprimé.

#### US-FRONT-02 : Authentification, Sélecteur d'Espace & Gestion Complète des Domaines RAG (Création, Édition, Suppression Sécurisée)
- **User Story :** En tant qu'utilisateur, je veux me connecter, sélectionner mon tenant actif et disposer d'une interface complète pour gérer mes domaines RAG (Santé, Recherche, Tech, Juridique, RH ou Sur-mesure) : création de nouveaux espaces, modification des prompts et consignes système, et suppression définitive d'un domaine obsolète avec un dialogue de warning explicite sur le caractère irréversible de la purge vectorielle.
- **Tâche PR :** `feat(ui-auth-domain): implement login, tenant selector and full domain lifecycle management (create, configure, delete with critical warning modal)`
- **Pattern & SOLID :** *Dependency Inversion* (`TenantContext`), *SRP* (`useAuthSession`, `DomainConfigModal`, `TenantWorkspaceBar`), *Fail-Safe Default Pattern* (interdiction de suppression du dernier domaine restant).
- **Critères d'Acceptation :**
  - Formulaire de connexion avec gestion des erreurs sans divulgation d'existence de compte.
  - Stockage sécurisé de la session/JWT en mémoire / cookie httpOnly.
  - Injection automatique du header `X-Tenant-ID` et du Bearer token sur chaque requête API.
  - Basculement de tenant invalidant instantanément tout cache local pour éviter les fuites de données inter-tenants (TNR-02).
  - Modal et tableau de bord interactif à 3 modes :
    1. *Tous mes domaines* : cartographie complète des espaces existants, compteur de documents, index pgvector dédié, bascule rapide en 1 clic.
    2. *Configurer le domaine* : personnalisation du nom, de la catégorie, de la description et du prompt système métier.
    3. *Créer un nouvel espace* : attribution d'un `tenant_id` cryptographiquement isolé.
  - **Suppression définitive avec Warning de Sécurité :** Dialogue d'alerte rouge avec inventaire des destructions (purge des documents, suppression des vecteurs 768d dans pgvector, suppression des révisions de presets).
  - Règle de résilience : impossible de supprimer le dernier espace actif (au moins 1 domaine doit subsister).
- **Tests Unitaires (Vitest / React Testing Library) :**
  - `LoginForm.test.tsx` : Soumission de formulaire, affichage du message d'erreur générique 401, désactivation des boutons en cours de chargement.
  - `TenantSelector.test.tsx` : Changement de sélection de tenant, mise à jour du `TenantContext`, création et suppression sécurisée de domaine.
- **Tests de Non-Régression (TNR) :**
  - `tnr-tenant-isolation-ui.test.ts` : Vérifie qu'en cas de changement de tenant, la liste des documents en mémoire et l'historique des conversations sont immédiatement purgés.
  - `tnr-domain-delete-guard.test.ts` : Vérification du blocage de suppression si `tenants.length <= 1` et purge cascade des structures documentaires lors de la suppression confirmée.

#### US-FRONT-03 : Gestion Documentaire par Domaine, Ingestion Multi-Sources & Tableaux de Suivi
- **User Story :** En tant qu'utilisateur, je veux pouvoir créer des domaines RAG différents, assigner mes documents aux domaines souhaités, puis afficher un tableau regroupé par domaine pour consulter les contenus/versions et supprimer les documents obsolètes tout en suivant les jobs d'ingestion ARQ.
- **Tâche PR :** `feat(ui-documents): add multi-domain grouping, document consultation/preview, deletion, and ARQ job tracking`
- **Pattern & SOLID :** *Strategy Pattern* (validation MIME et SHA-256 client), *Observer Pattern* (écoute du statut des tâches ARQ), *Container/Presentational* (`DocumentIngestionView`, `DocumentConsultModal`, `ConfirmDeleteDialog`).
- **Critères d'Acceptation :**
  - Possibilité de créer un nouveau domaine ou de choisir le domaine cible lors du téléversement.
  - Tableau consolidé regroupant tous les documents par domaine avec basculement rapide vers le domaine actif.
  - Dialogue de consultation (`DocumentConsultModal`) affichant l'aperçu du texte, l'historique complet des versions, le checksum SHA-256 64 caractères et les métadonnées de chunking.
  - Suppression sécurisée de document (`ConfirmDeleteDialog`) avec avertissement sur la purge irréversible des vecteurs dans PostgreSQL pgvector.
  - Suppression possible d'une version spécifique d'un document (`v1..vN`).
  - Zone drag & drop avec validation stricte de type MIME et taille (< 20 Mo) et calcul SHA-256 client sans blocage.
  - Conservation immuable de l'historique des versions (TNR-03).
- **Tests Unitaires (Vitest / React Testing Library) :**
  - `DocumentManagement.test.tsx` : Groupement des documents par domaine, calcul des totaux de chunks et tailles.
  - `DocumentConsultModal.test.tsx` : Rendu de l'aperçu texte et copie du hash SHA-256.
  - `DocumentDelete.test.tsx` : Déclenchement de la suppression et rafraîchissement réactif du tableau.
- **Tests de Non-Régression (TNR) :**
  - `tnr-document-versioning.test.ts` : Vérification que l'upload d'un document ayant le même nom incrémente en `v+1` sans effacer la version antérieure.
  - `tnr-document-domain-purge.test.ts` : Vérification qu'un document supprimé disparaît de l'agrégation de son domaine et que ses embeddings pgvector sont marqués pour purge.

#### US-FRONT-04 : Console de Chat RAG, Sélecteur Direct de Domaine & Onboarding Compte Vierge
- **User Story :** En tant qu'utilisateur, je veux pouvoir sélectionner directement depuis la page de chat le domaine RAG que je souhaite interroger parmi ceux que j'ai créés, et lorsque mon compte est nouvellement initialisé ou que le domaine sélectionné ne contient aucun document, disposer d'un guide pédagogique clair m'expliquant la démarche avec un bouton d'accès direct vers l'écran « Ingestion et Jobs ARQ ».
- **Tâche PR :** `feat(ui-chat): implement SSE streaming chat, in-chat domain switcher, and empty-state onboarding with direct ingestion routing`
- **Pattern & SOLID :** *Finite State Machine* (`useSSEStream`), *Strategy Pattern* (sanitizer Markdown & parser de balises `[Document, p.X]`), *Container/Presentational* (`SourcedChatView`, `DomainConfigModal`).
- **Critères d'Acceptation :**
  - Sélecteur de domaine interactif intégré dans l'en-tête du chat affichant le nombre de documents indexés, la catégorie métier et le persona actif.
  - Détection automatique d'un compte nouvellement initialisé ou d'un domaine sans documents (`documents_count === 0`).
  - Affichage d'un guide d'initialisation complet en 3 étapes (1. Domaines & Personas, 2. Téléversement de documents de référence, 3. Inférence locale sans hallucination).
  - Bouton d'action proéminent « Accéder à l'Écran Ingestion & Jobs ARQ » redirigeant instantanément l'utilisateur vers l'onglet documentaire.
  - Bouton secondaire « Créer un Nouveau Domaine » ouvrant la modale de configuration personnalisée.
  - Désactivation préventive de la saisie de prompt quand le domaine est vierge pour éviter toute requête sans base documentaire.
  - Hook React `useSSEStream` implémenté avec support du header `Last-Event-ID`.
  - Rendu fluide du texte en streaming sans décalage de mise en page (*layout shift*).
  - Rendu Markdown contrôlé et sanitizé (protection contre les injections XSS via `DOMPurify` / markdown sans exécution de scripts).
  - Badges de citation cliquables dans le corps du texte ouvrant le tiroir d'inspection de chunk.
  - Possibilité d'interrompre la génération via bouton d'arrêt d'urgence (`AbortController`).
- **Tests Unitaires (Vitest / React Testing Library) :**
  - `useSSEStream.test.ts` : Décodage correct des 8 types d'événements SSE, gestion de l'événement d'erreur `message.failed`.
  - `ChatMessage.test.tsx` : Rendu du markdown, conversion des tokens citations en chips interactifs cliquables.
  - `EmptyStateOnboarding.test.tsx` : Déclenchement de l'affichage du guide d'onboarding dès que `domainDocCount === 0`, vérification du clic sur le bouton de redirection vers l'ingestion.
  - `Sanitizer.test.ts` : Neutralisation stricte des balises `<script>`, `onerror`, `javascript:` contenues dans les extraits.
- **Tests de Non-Régression (TNR) :**
  - `tnr-sse-reconnection.test.ts` : Simulation d'une déconnexion réseau au token N et vérification de la reprise au bon index via `Last-Event-ID` sans duplication de mots.
  - `tnr-empty-domain-guard.test.ts` (TNR-09) : Vérification qu'un domaine sans document empêche l'envoi de prompt à l'Ollama local pour proscrire toute hallucination hors contexte.

---

### Phase 2 — V1.1 (Audit & Pédagogie) — [ÉTAT : IMPLÉMENTÉ & VALIDÉ]

#### US-FRONT-05 : Tiroir d'Audit de Chunks & Métadonnées JSONB
- **User Story :** En tant qu'auditeur, je veux cliquer sur une citation ou explorer la base vectorielle pour afficher l'extrait exact dans son document source, son score de similarité vectoriel, ses scores hybrides (dense/sparse/rerank) et ses métadonnées JSONB complètes avec vérification de non-hallucination.
- **Tâche PR :** `feat(ui-audit): chunk inspector drawer with vector/lexical score display and full JSONB metadata preview`
- **Pattern & SOLID :** *SRP* (visualiseur dédié indépendant du chat), *Presentational Component*, *Adapter Pattern*.
- **Composants Implémentés :**
  - `src/components/v1/ChunkInspectorDrawer.tsx` : Tiroir d'inspection certifié, jauge de similarité cosinus, scores hybrides (pgvector, BM25, Cross-Encoder), aperçu des 8 premières dimensions du vecteur 768d, et copie en un clic de l'extrait brut ou du JSONB complet.
  - `src/components/v1/RagAuditExplorerView.tsx` : Tableau d'audit vectoriel avec filtrage par document, recherche textuelle et seuil cosinus minimal.
- **Critères d'Acceptation Validés :**
  - Affichage de l'extrait brut certifié sans aucune troncature cachée.
  - Visualisation des métadonnées (page, SHA256, chunk_id, modèle d'embedding, tokens).
  - Graphique de score comparatif (similarité cosinus vs seuil configuré du preset).
- **Tests Unitaires & TNR Validés :**
  - `T-10` : Audit Vectoriel & Tiroir de Chunks Certifiés (TNR-04) validé dans `inAppTestRunner.ts`.

#### US-FRONT-06 : Chronologie Observable du Pipeline RAG (Sans Pensée Simulée)
- **User Story :** En tant qu'utilisateur, je veux voir les 5 étapes réelles du pipeline pendant la génération pour comprendre d'où vient la réponse sans jamais subir de fausse chaîne de pensée artificielle.
- **Tâche PR :** `feat(ui-pipeline): display observable 5-step progress bar reacting to real SSE events`
- **Pattern & SOLID :** *Observer Pattern*, *Interdiction formelle de la pensée simulée*.
- **Composants Implémentés :**
  - `src/components/v1/SourcedChatView.tsx` : Pipeline timeline réagissant en direct aux 5 événements SSE déterministes.
  - `src/components/v1/RagAuditExplorerView.tsx` : Visualiseur d'architecture démontrant les 5 étapes : 1. Reçu (FastAPI) -> 2. pgvector (HNSW m=16) -> 3. Isolation (WHERE tenant_id) -> 4. Chunks (Seuil + Reranking) -> 5. Ollama SSE (Llama 3.2:3b).
- **Critères d'Acceptation Validés :**
  - Affichage des étapes réelles basées sur les événements SSE.
  - Interdiction formelle de fabriquer une fausse chaîne de pensée (*chain of thought*) quand aucune donnée n'est reçue.
- **Tests Unitaires & TNR Validés :**
  - `T-11` : Chronologie Observable du Pipeline RAG (Sans Pensée Simulée) validé dans `inAppTestRunner.ts`.

#### US-FRONT-07 : Studio des Presets RAG & Infobulles Pédagogiques (Immutabilité TNR-05)
- **User Story :** En tant qu'administrateur, je veux ajuster les paramètres de chunking et de retrieval avec des infobulles explicatives claires et la certitude qu'une modification crée une nouvelle version immuable (v+1) sans écraser l'historique d'audit.
- **Tâche PR :** `feat(ui-presets): implement versioned preset editor with pedagogical tooltips, immutability guard, and live retrieval simulator`
- **Pattern & SOLID :** *Immutability Pattern* (un preset actif est figé et sa modification génère un nouveau numéro de version), *Strategy Pattern*.
- **Composants Implémentés :**
  - `src/components/v1/RagPresetStudioView.tsx` : Interface complète d'administration des presets RAG avec curseurs réactifs (`chunk_size` 256-1024 tok, `chunk_overlap` 20-200 tok, `similarity_threshold` 0.50-0.95, `retrieval_top_k` 1-12, toggle Cross-Encoder, sélecteur de modèle d'embedding).
  - Infobulles pédagogiques expliquant les compromis sans jargon obscur (granularité vs contexte narratif, continuité sémantique, seuil de factualité).
  - Avertissement visuel d'immutabilité : la sauvegarde incrémente automatiquement en version `v+1`.
  - Simulateur de Retrieval en direct permettant de tester instantanément une question sur le domaine et d'observer les chunks retenus vs filtrés sous le seuil.
- **Critères d'Acceptation Validés :**
  - Édition des curseurs bornés.
  - Infobulles pédagogiques accessibles et détaillées.
  - Immutabilité garantie : chaque modification enregistrée génère une nouvelle révision versionnée.
- **Tests Unitaires & TNR Validés :**
  - `T-12` : Immutabilité des Presets RAG & Versioning v+1 (TNR-05) validé dans `inAppTestRunner.ts`.

---

### Phase 3 — V1.2 (Qualité du Retrieval, Télémétrie & Transparence Hybride RRF)

#### US-FRONT-08 : Tableau de Bord d'Observabilité & Télémétrie Locale (TTFT, Débit & VRAM)
- **User Story :** En tant qu'opérateur système ou administrateur, je veux visualiser en temps réel la télémétrie du moteur d'inférence locale Ollama (Time to First Token - TTFT, débit tokens/seconde, jauge VRAM/GPU, et temps total de génération) ainsi que la santé des conteneurs d'infrastructure (PostgreSQL/pgvector, Redis/ARQ, Ollama daemon) afin d'anticiper la saturation mémoire et garantir des temps de réponse sous les 1500 ms.
- **Tâche PR :** `feat(ui-telemetry): local observability dashboard with real-time TTFT, tokens/sec gauges, VRAM/GPU metrics and service health monitors`
- **Pattern & SOLID :** *Observer Pattern*, *Adapter Pattern* (unification des métriques SSE et télémétrie FastAPI/Prometheus), *Single Responsibility Principle*.
- **Composants Implémentés :**
  - `src/components/v1/TelemetryDashboardView.tsx` : Tableau de bord télémétrique avec jauges circulaires/barres réactives (TTFT moyen, débit t/s, allocation VRAM estimée, charge mémoire GPU/CPU, état de santé des 4 composants du cluster).
  - Graphique d'historique de latence (TTFT et temps total des requêtes récentes).
  - Alertes de seuil (jaune si VRAM > 75%, rouge si TTFT > 2000 ms).
- **Critères d'Acceptation :**
  - Affichage précis du TTFT moyen calculé sur les dernières sessions.
  - Calcul et affichage en temps réel du débit de génération (ex: 28.4 tokens/s).
  - Jauge VRAM dédiée au modèle local (ex: Llama 3.2 3B en Q4_K_M ~2.2 Go / 8.0 Go alloués).
  - Badge de santé en direct pour chaque composant (pgvector HNSW, Ollama API, Worker ARQ, Redis Cache).
- **Tests Unitaires & TNR :**
  - `TelemetryCards.test.tsx` : Calculs de moyennes mobiles, seuils d'alerte et conversion correcte des unités mémoire.
  - `tnr-telemetry-metrics.test.ts` (TNR-06) : Validation des formules de calcul de débit et de TTFT.

#### US-FRONT-09 : Transparence Hybride & Visualiseur de Scores RRF (Reciprocal Rank Fusion)
- **User Story :** En tant qu'analyste de données ou auditeur, je veux visualiser la décomposition des scores de recherche hybride (rang dense sémantique pgvector cosinus vs rang clairsemé lexical BM25) et comprendre comment l'algorithme RRF ($RRF(d) = \sum \frac{1}{k + r(d)}$ avec $k=60$) a fusionné et repêché chaque extrait pour composer le prompt final, avec explication pédagogique du gain de repêchage.
- **Tâche PR :** `feat(ui-rrf): hybrid search rank visualizer with reciprocal rank fusion math breakdown and dense/sparse comparison`
- **Pattern & SOLID :** *Strategy Pattern* (calcul RRF côté client/contrat), *Presentational Component* (comparateur bicolore Dense vs Sparse).
- **Composants Implémentés :**
  - Section d'inspection RRF dans le `ChunkInspectorDrawer` et dans le tableau d'audit : rang dense (#r_dense), rang BM25 (#r_sparse), score RRF calculé et rang de sortie après reranking Cross-Encoder.
  - Simulateur interactif RRF permettant de tester l'impact de la constante $k$ (ex: $k=60$) sur la réconciliation des résultats textuels et conceptuels.
- **Critères d'Acceptation :**
  - Affichage côte à côte des rangs denses et clairsemés pour chaque chunk sélectionné.
  - Formule mathématique expliquée interactivement avec infobulle sans jargon.
  - Marquage explicite des chunks « repêchés par BM25 » qui auraient été exclus par une recherche 100% vectorielle pure.
- **Tests Unitaires & TNR :**
  - `RRFCalculator.test.ts` : Vérification du calcul déterministe $1/(60 + r)$ et du classement fusionné.
  - `tnr-rrf-consistency.test.ts` (TNR-07) : Vérification qu'un terme exact présent dans BM25 est correctement propulsé dans le top-k.

#### US-FRONT-10 : Monitoring Spécifique du Modèle Local Ollama & Mode Dégradé
- **User Story :** En tant qu'utilisateur, je veux voir quel modèle local est chargé en mémoire GPU/CPU (ex: `llama3.2:3b-instruct-q4_K_M`), sa quantification, son empreinte contextuelle (ex: context window de 8192 tokens) et être averti proactivement si une surcharge mémoire survient avec bascule explicite vers un mode dégradé local sécurisé.
- **Tâche PR :** `feat(ui-model-monitor): local model runtime telemetry, context window utilization and graceful degradation indicator`
- **Pattern & SOLID :** *State Machine*, *Defensive Programming* (détection de saturation de fenêtre de contexte).
- **Critères d'Acceptation :**
  - Carte d'identité du modèle local : nom, tag, format GGUF, type de quantification, empreinte mémoire.
  - Jauge d'utilisation de la fenêtre de contexte (tokens consommés par prompt système + chunks RAG + historique vs limite contextuelle).
  - Indicateur d'avertissement de dépassement de contexte avec stratégie d'élagage automatique des chunks de moindre score.
- **Tests Unitaires & TNR :**
  - `ModelMonitor.test.tsx` : Calcul du taux de remplissage de la fenêtre de contexte et avertissement de saturation.

#### US-FRONT-11 : Export & Sauvegarde Souveraine JSON d'un Espace Métier
- **User Story :** En tant que responsable de domaine RAG, je veux pouvoir exporter en un clic la configuration intégrale de mon espace (nom, prompt métier, presets, liste des documents et empreintes SHA-256) dans un fichier JSON signé et normalisé afin de pouvoir archiver, auditer ou restaurer mon espace en toute souveraineté sans dépendance cloud.
- **Tâche PR :** `feat(ui-domain-export): one-click sovereign JSON export of tenant configuration, presets and document hashes`
- **Pattern & SOLID :** *Data Transfer Object (DTO) Exporter*, *SRP*.
- **Critères d'Acceptation :**
  - Bouton d'export JSON présent dans la modale de gestion des domaines et le tableau de bord.
  - Fichier JSON structuré contenant les métadonnées du tenant, la révision de preset active et l'inventaire documentaire certifié.
  - Téléchargement immédiat côté navigateur sans fuite de secrets.
- **Tests Unitaires & TNR :**
  - `DomainExporter.test.ts` : Validation de la conformité du schéma JSON exporté.
  - `tnr-domain-export-schema.test.ts` (TNR-08) : Non-régression sur le format de sauvegarde.

---

### Phase 4 — Showcase Professionnel & Sécurisation de l'Accès (Auth POC & UI/UX)

#### US-FRONT-12 : Démo & Flux d'Authentification Sécurisé (POC Always-True & Multi-Profils)
- **User Story :** En tant qu'utilisateur découvrant RAGTIME, je veux disposer d'un écran d'authentification moderne et accessible avec formulaire complet (email/mot de passe), bouton d'accès démo en 1 clic et sélection rapide de profils de test (Admin Sécurité, Lead Data Scientist, Responsable RH / Juridique) afin d'expérimenter la plateforme en toute sécurité sans friction.
- **Tâche PR :** `feat(auth-poc): implement interactive login view, demo profiles, and session persistence`
- **Pattern & SOLID :** *Dependency Inversion Principle* (`AuthContext`), *Single Responsibility Principle* (`AuthLoginView`), *Fail-Safe Default*.
- **Composants Implémentés :**
  - `src/components/v1/AuthLoginView.tsx` : Vue dédiée avec carte de connexion centrée, badges de souveraineté SecNumCloud/Argon2id, messages d'information clairs sur le POC démo, et boutons de remplissage instantané en 1 clic.
  - `src/context/AuthContext.tsx` : Fournisseur de contexte avec persistance `sessionStorage`, mock résilient répondant `true` avec injection des rôles et tenants correspondants, et méthode `logout()`.
- **Critères d'Acceptation :**
  - Validation du format d'email et longueur minimale du mot de passe.
  - Prise en charge des profils démo en 1 clic.
  - Persistance de l'état connecté pendant toute la session de navigation.
  - Possibilité de se déconnecter en 1 clic via la pastille utilisateur du bandeau supérieur.
- **Tests Unitaires & TNR :**
  - `AuthLoginView.test.tsx` : Vérification de la saisie, de la sélection des profils prédéfinis et de la transmission de l'événement de succès.
  - `tnr-auth-persistence.test.ts` (TNR-11) : Vérification de la persistance de session dans `sessionStorage` et de la révocation immédiate à la déconnexion.

#### US-FRONT-13 : Guard de Navigation & Masquage de « Mon Espace RAG » Hors Connexion
- **User Story :** En tant que visiteur non authentifié, je veux consulter librement la vitrine technologique (Showcase) et la spécification d'architecture, tandis que l'accès à « Mon Espace RAG » reste masqué et protégé jusqu'à ma connexion.
- **Tâche PR :** `feat(route-guard): conditional rendering of workspace tabs and login redirection for unauthenticated users`
- **Pattern & SOLID :** *Guard Pattern*, *Open/Closed Principle*.
- **Composants Implémentés :**
  - `src/App.tsx` : Logique de guard d'accès basculant dynamiquement vers `AuthLoginView` si un utilisateur déconnecté cible l'espace RAG.
  - `src/components/Navbar.tsx` : Conditionnement de l'onglet « Mon espace RAG » au statut `isAuthenticated`, remplacement du CTA supérieur par « Se connecter » lorsque déconnecté, et affichage du badge utilisateur avec bouton de déconnexion une fois connecté.
- **Critères d'Acceptation :**
  - L'onglet « Mon espace RAG » n'apparaît dans la barre de navigation que si l'utilisateur est authentifié.
  - Le clic sur « Se connecter » affiche directement le formulaire de connexion.
  - Tout déclenchement d'action métier depuis la vitrine (recherche dans le Hero) redirige vers la connexion si non authentifié.
- **Tests Unitaires & TNR :**
  - `NavbarAuth.test.tsx` : Vérification du masquage de l'onglet workspace selon l'état d'authentification.
  - `tnr-route-guard.test.ts` (TNR-12) : Test de non-régression garantissant qu'aucune donnée de documents ou de chat ne peut être consultée sans session active.

#### US-FRONT-14 : Finitions Visuelles & Remplacement des Mentions de Développement
- **User Story :** En tant que visiteur ou décideur technique, je veux que l'interface présente une identité visuelle professionnelle et soignée sans mentions de tâches internes ("Phase 1", "Phase 2", "v1.2"), avec des contrastes renforcés et une cartographie interactive des 7 pages clés.
- **Tâche PR :** `feat(ui-polish): contrast enhancement, professional naming cleanup, and interactive 7-page showcase directory`
- **Pattern & SOLID :** *Consistent Naming*, *Design Token Discipline*.
- **Composants Implémentés :**
  - `src/index.css` : Ajustement du background body en `#4a5467` pour un contraste optimal et lisible sous la navbar `#12161f`.
  - Nettoyage des intitulés dans `Navbar.tsx`, `V1WorkspaceView.tsx`, `DocumentIngestionView.tsx`, `RagPresetStudioView.tsx`, `TelemetryDashboardView.tsx`, et `Footer.tsx`.
  - `src/components/FrontendProposalView.tsx` & `src/data/mockRagData.ts` : Mise à jour de la cartographie des 7 pages clés avec statuts « POC Live & Fonctionnel » et boutons de test direct vers chaque vue.
- **Critères d'Acceptation :**
  - Zéro badge « Phase X » visible dans l'expérience utilisateur.
  - Lisibilité accrue grâce au contraste `#4a5467` sur le body.
  - Navigation fluide et interactive depuis la cartographie des 7 pages clés.
- **Tests Unitaires & TNR :**
  - `tnr-visual-integrity.test.ts` (TNR-13) : Absence de régression d'accessibilité et de contraste.

---

### Phase 5 : Perfectionnement & Fonctionnalités Avancées (Post-Showcase)

#### US-FRONT-15 : Onboarding Interactif, Info-Bulles Didactiques & Règle d'Immutabilité des Presets
- **User Story :** En tant qu'utilisateur découvrant le RAG ou ingénieur souhaitant comprendre le paramétrage, je veux des info-bulles didactiques (« ? ») détaillant les termes techniques (Chunk Size, Overlap, Seuil Cosinus, pgvector, RRF k=60, Température LLM) et un avertissement clair m'expliquant pourquoi un Preset devient strictement immutable dès lors que des données ont été ingérées.
- **Tâche PR :** `feat(onboarding-tooltips): interactive pedagogical tooltips and preset immutability enforcement on ingested data`
- **Pattern & SOLID :** *Single Responsibility Principle*, *Immutability Rule (TNR-05)*.
- **Composants Implémentés :**
  - `src/components/v1/RagPresetStudioView.tsx` : Intégration de pastilles didactiques au survol/clic sur chaque paramètre RAG et affichage d'un panneau d'avertissement d'immutabilité quand des chunks sont présents dans l'espace actif.
  - `src/components/v1/DocumentIngestionView.tsx` : Info-bulles pédagogiques sur la taille des chunks et le recouvrement (overlap).
- **Critères d'Acceptation :**
  - Chaque paramètre clé (Chunk Size, Overlap, Seuil, Algorithme, Température) dispose d'une explication limpide et pédagogique accessible en 1 clic.
  - Si un espace contient des documents ingérés, la modification directe d'un preset actif déclenche l'avertissement TNR-05 avec proposition automatique de versionnage `v+1`.

#### US-FRONT-16 : Comparateur Visuel RRF Split-Screen (Pure Vector vs RRF Hybride)
- **User Story :** En tant que Data Scientist ou Responsable Technique, je veux comparer visuellement côte-à-côte les résultats d'une recherche vectorielle pure (pgvector dense seul) versus la fusion hybride RRF (pgvector + BM25 avec k=60) pour observer concrètement le gain de pertinence et les documents repêchés.
- **Tâche PR :** `feat(rrf-split-screen): visual comparative split-screen between pure vector and hybrid RRF rankings`
- **Pattern & SOLID :** *Strategy Pattern*, *Observer Pattern*.
- **Composants Implémentés :**
  - `src/components/v1/TelemetryDashboardView.tsx` : Ajout d'un mode de comparaison Split-Screen avec sélecteur de requêtes types, affichage en colonnes synchronisées, calcul du gain lexical (ex: +38% de pertinence) et mise en exergue des chunks repêchés par la composante lexicale.
- **Critères d'Acceptation :**
  - L'utilisateur peut basculer en mode « Comparateur Split-Screen RRF ».
  - Les deux classements (Dense seul vs RRF) sont présentés avec leurs rangs et scores respectifs.
  - Les chunks repêchés par la composante lexicale sont mis en valeur par un badge distinctif.

#### US-FRONT-17 : Exportation Souveraine des Réponses & Synthèses (Markdown & PDF/Impression)
- **User Story :** En tant qu'analyste ou auditeur, je veux exporter une synthèse générée au format Markdown (`.md`) ou sous format imprimable certifié (PDF/Print) incluant l'ensemble des citations vérifiables, scores de similarité, domaine et horodatage pour archiver ou partager mes résultats hors de l'application.
- **Tâche PR :** `feat(export-synthesis): structured markdown download and formatted printable audit view for RAG answers`
- **Pattern & SOLID :** *Data Transfer Object*, *Decorator Pattern*.
- **Composants Implémentés :**
  - `src/components/v1/SourcedChatView.tsx` : Boutons d'exportation contextuelle sur chaque message assistant (Export `.md` avec métadonnées d'audit et modalité d'impression sécurisée).
- **Critères d'Acceptation :**
  - Téléchargement instantané d'un fichier `.md` bien formaté avec en-tête d'audit RAGTIME, question, réponse synthétisée et tableau complet des sources/citations.
  - Option d'impression/export PDF via une feuille de style épurée et professionnelle.

#### US-FRONT-18 : Bascule Rapide de Rôles Démo & Cloisonnement RBAC en 1 Clic
- **User Story :** En tant que démonstrateur ou évaluateur, je veux basculer instantanément entre les 3 profils types (Admin Sécurité `admin@ragtime.fr`, Lead Data Scientist `datascientist@ragtime.fr`, Lecteur Seul `lecteur@ragtime.fr`) depuis la pastille utilisateur sans quitter l'Espace RAG pour tester les permissions sans friction.
- **Tâche PR :** `feat(demo-role-switcher): quick 1-click role switcher within user badge and auth context`
- **Pattern & SOLID :** *Role-Based Access Control (RBAC)*, *State Synchronization*.
- **Composants Implémentés :**
  - `src/context/AuthContext.tsx` : Ajout de la méthode `switchDemoRole`.
  - `src/components/Navbar.tsx` : Menu déroulant de bascule de rôle interactif dans la pastille utilisateur.
  - `src/components/v1/TenantWorkspaceBar.tsx` : Refonte visuelle avec fond `#4545c9` et harmonisation du statut de session.
- **Critères d'Acceptation :**
  - Clic sur la pastille utilisateur ouvre le sélecteur de rôles avec les 3 profils prédéfinis.
  - Le changement de profil met à jour instantanément la session et le bandeau de l'Espace RAG sans déconnexion.

#### US-FRONT-19 : Cadre Fondateur de Validation Sécurisée & Assainissement XSS/Injection
- **User Story :** En tant qu'ingénieur sécurité ou auditeur, je veux que l'ensemble des données saisies dans les formulaires soit systématiquement assaini (sanitization anti-XSS, neutralisation des balises HTML, suppression des caractères de contrôle et encodage sécurisé) avant toute exécution ou transmission réseau, garantissant un modèle zéro-trust côté client.
- **Tâche PR :** `feat(validation-framework): build zero-dependency sanitization engine and deterministic validation schemas`
- **Pattern & SOLID :** *Single Responsibility Principle*, *Fail-Safe Defaults*, *Defensive Programming*.
- **Composants Implémentés :**
  - `src/lib/validation/sanitizer.ts` : Fonctions pures d'assainissement (`sanitizeInput`, `sanitizeFilename`, `sanitizeSlug`, `sanitizePrompt`). Neutralisation stricte des balises `<script>`, `onerror`, `javascript:`, suppression des caractères invisibles ou nuls.
  - `src/lib/validation/schemas.ts` : Typage TypeScript strict (`ValidationResult<T>`) et règles métier pour l'authentification, les espaces métiers, le téléversement documentaire, les presets RAG et les requêtes de chat.
  - `src/components/v1/FormFieldFeedback.tsx` : Composant visuel réutilisable affichant erreurs (rose-400), alertes/warnings pédagogiques (amber-400) et succès de saisie avec transitions fluides sans polluer le webdesign.
- **Critères d'Acceptation :**
  - Toute chaîne contenant `<script>`, `onerror=` ou du code malveillant est assainie avant soumission.
  - Typage unifié retournant `{ isValid, errors, warnings, sanitized }`.
  - Intégration ergonomique dans le design existant respectant les contrastes et l'accessibilité.

#### US-FRONT-20 : Validation des Formulaires d'Authentification (AuthLoginView & AuthModal)
- **User Story :** En tant qu'utilisateur se connectant à RAGTIME, je veux bénéficier d'un retour visuel instantané et clair lors de la saisie de mes identifiants (format d'email conforme RFC 5322, mot de passe sécurisé >= 8 caractères) avec mise en valeur des champs en erreur et conservation du confort des profils démo en 1 clic.
- **Tâche PR :** `feat(auth-validation): inline feedback and live format checking for login forms and auth modals`
- **Pattern & SOLID :** *Presentational and Container Pattern*, *Instant Visual Feedback*.
- **Composants Implémentés :**
  - `src/components/v1/AuthLoginView.tsx` : Validation réactive sur `onBlur` et à la soumission (`validateLoginForm`), bordures dynamiques (rouge/indigo), affichage immédiat de l'erreur sous le champ concerné via `FormFieldFeedback`.
  - `src/components/v1/AuthModal.tsx` : Application des mêmes règles et composants de feedback au sein de la fenêtre modale de connexion.
- **Critères d'Acceptation :**
  - Un email sans arobase ou avec domaine invalide affiche immédiatement un message d'erreur clair.
  - Un mot de passe inférieur à 8 caractères est refusé avant tout appel réseau.
  - Les boutons de profils démo réinitialisent automatiquement les erreurs et valident le formulaire instantanément.

#### US-FRONT-21 : Validation Stricte des Espaces Métiers & Isolation Multi-Tenant (DomainConfigModal)
- **User Story :** En tant que responsable d'espace, je veux que la création et la configuration d'un domaine RAG vérifient scrupuleusement le slug technique (minuscules, chiffres et tirets uniquement), l'intitulé métier (>= 3 caractères) et la consistance du prompt système avant enregistrement.
- **Tâche PR :** `feat(tenant-validation): robust schema enforcement for workspace domain, slug, and system instructions`
- **Pattern & SOLID :** *Open/Closed Principle*, *Business Rule Guard*.
- **Composants Implémentés :**
  - `src/components/v1/DomainConfigModal.tsx` : Intégration de `validateTenantForm`, génération automatique et assainie du slug à partir de l'intitulé du domaine, validation de la catégorie métier (`tech`, `legal`, `health`, `finance`, `general`).
  - Détection proactive des prompts système trop courts (< 15 caractères) avec warning pédagogique invitant à enrichir les directives métier.
- **Critères d'Acceptation :**
  - Un slug contenant des espaces ou des caractères spéciaux non autorisés est immédiatement nettoyé et/ou signalé.
  - Les champs obligatoires non renseignés bloquent la sauvegarde avec signalement explicite.
  - Le système préserve l'isolation stricte des données et la cohérence de l'espace vectoriel.

#### US-FRONT-22 : Sécurisation & Contrôle d'Intégrité du Téléversement Documentaire (DocumentIngestionView)
- **User Story :** En tant qu'utilisateur déposant des documents dans mon espace RAG, je veux être alerté immédiatement si un fichier dépasse la taille autorisée (25 Mo), possède une extension non prise en charge ou un nom de fichier risqué (traversée de répertoire, doubles extensions masquées), avec nettoyage automatique du nom de fichier.
- **Tâche PR :** `feat(upload-validation): file extension whitelist, size quota enforcement and filename sanitization`
- **Pattern & SOLID :** *Whitelist Filter Pattern*, *Defensive Sanitation*.
- **Composants Implémentés :**
  - `src/components/v1/DocumentIngestionView.tsx` : Intégration de `validateDocumentUpload` dans la zone de glisser-déposer (`handleDrop`) et dans le sélecteur manuel de fichiers (`handleFileChange`).
  - Liste blanche stricte : `.pdf`, `.md`, `.markdown`, `.sql`, `.txt`, `.csv`, `.docx`, `.json`.
  - Assainissement du nom de fichier via `sanitizeFilename` (suppression des `../`, caractères de contrôle et caractères réservés du système de fichiers).
  - Affichage visuel des erreurs de téléversement dans un encart rouge dédié et lisible.
- **Critères d'Acceptation :**
  - Tout fichier non conforme (ex: `.exe`, `.sh`, `.bin`) est rejeté avant toute tentative d'indexation.
  - Tout fichier excédant 25 Mo ou de taille nulle (0 octet) est intercepté avec message explicite.
  - Les fichiers valides sont immédiatement assainis et prêts pour le découpage en chunks pgvector.

#### US-FRONT-23 : Validation Mathématique & Garde d'Immutabilité des Hyperparamètres RAG (RagPresetStudioView - TNR-18)
- **User Story :** En tant qu'administrateur système ou ingénieur RAG, je veux que les curseurs de presets RAG soient strictement bornés et cohérents entre eux (Chunk Size 256-1024 tok, Chunk Overlap < Chunk Size / 2, Seuil Cosinus 0.50-0.95), et que la règle d'or d'immutabilité conditionnelle (TNR-18) bloque toute tentative de modification si l'espace contient déjà des documents découpés en fragments vectoriels.
- **Tâche PR :** `feat(preset-validation): mathematical consistency checks and strict immutability guard for vector presets`
- **Pattern & SOLID :** *Mathematical Invariant Pattern*, *Conditional Immutability Guard*.
- **Composants Implémentés :**
  - `src/components/v1/RagPresetStudioView.tsx` : Intégration de `validatePresetParams(formData, isTenantEmpty)` dans `handleSavePreset`.
  - Contrôle d'invariant mathématique : `chunk_overlap < chunk_size / 2` pour éviter les duplications et redondances vectorielles.
  - Warnings pédagogiques pour les seuils cosinus extrêmes (< 0.60 trop permissif ou > 0.85 très strict).
  - Bannière d'alerte et blocage formel en cas de violation d'immutabilité lorsque des documents sont indexés (`documents_count > 0`).
  - Intégration des composants `FormFieldFeedback` sous les curseurs et champs du studio.
- **Critères d'Acceptation :**
  - Si l'espace est vierge (`0 document`) : édition libre autorisée avec validation mathématique des bornes.
  - Si l'espace est alimenté (`>= 1 document`) : sauvegarde désactivée avec badge et message d'immutabilité strict scellé.
  - Tout nom de preset vide ou invalide est signalé instantanément.

#### US-FRONT-24 : Assainissement des Requêtes Chat RAG & Prévention de Prompt Injection (SourcedChatView)
- **User Story :** En tant qu'utilisateur posant une question dans le chat, je veux que ma requête soit assainie (suppression des tentatives de contournement système `Ignore previous instructions`, suppression des balises script et limitation de longueur) et que le formulaire bloque l'envoi hors-sol si aucun document n'est présent dans le domaine actif.
- **Tâche PR :** `feat(chat-query-validation): prompt sanitization, length bounds, and context-aware chat validation`
- **Pattern & SOLID :** *Input Sanitization*, *Contextual Validation Guard*.
- **Composants Implémentés :**
  - `src/components/v1/SourcedChatView.tsx` : Intégration de `validateChatQuery` dans `handleSubmit`.
  - Assainissement par `sanitizePrompt` : neutralisation des balises, tronquage des répétitions anormales, détection des requêtes trop courtes (< 3 caractères) ou excessives (> 2000 caractères).
  - Alerte pédagogique si la question est très courte (< 10 caractères) invitant à préciser le contexte.
  - Affichage réactif de `FormFieldFeedback` directement sous le champ de saisie avec bordure d'état.
- **Critères d'Acceptation :**
  - Une requête vide ou composée uniquement d'espaces ne peut être soumise.
  - Les tentatives d'injection de scripts ou de directives contradictoires sont nettoyées.
  - Le feedback s'efface naturellement dès que l'utilisateur modifie sa saisie.

---

### Phase 6 — Industrialisation Souveraine, Raccordement Réel & UX Universelle Avancée

#### US-FRONT-25 : Expérience Universelle des Tableaux de Données (Moteur de Recherche, Nombre Max d'Affichage, Colonnes de Tri & Pagination) & Charte Graphique
- **User Story :** En tant qu'utilisateur naviguant dans n'importe quel écran de l'espace RAG contenant des listes ou des données tabulaires (documents par domaine, chunks audités, historique de télémétrie et latences), je veux disposer systématiquement d'un moteur de recherche temps réel, d'un sélecteur de nombre maximum d'éléments par page, de colonnes triables avec indicateurs visuels conformes sans erreur d'hydratation DOM, et d'une barre de pagination complète pour explorer efficacement de grands volumes de données. Par ailleurs, la baseline souveraine sur le logo officiel doit arborer avec rigueur l'intitulé exact "Beat & Pgvector".
- **Tâche PR :** `feat(table-ux): universal table search engine, pagination hook, sort headers without DOM hydration errors, and Beat & Pgvector branding update`
- **Pattern & SOLID :** *Reusable Custom Hook Pattern* (`useTablePagination`), *Presentation Component Pattern* (`TablePaginationBar`, `TableSortHeader`, `TableSearchBar`, `DomainDocumentsTable`), *Single Responsibility Principle*.
- **Composants Implémentés :**
  - `src/hooks/useTablePagination.ts` : Hook générique typé gérant l'état de pagination (page courante, taille de page, total d'items, nombre de pages) et le tri bidirectionnel multi-champs avec gestion des clés imbriquées.
  - `src/components/v1/TablePaginationBar.tsx` :
    - `TableSearchBar` : Composant visuel de recherche universelle avec indicateur de résultats filtrés / totaux, icône loupe, bouton d'effacement rapide et debounce.
    - `TablePaginationBar` : Composant visuel standardisé offrant sélecteur de taille (5, 10, 25, 50), libellé d'éléments (`1-10 sur 42 documents`), boutons de navigation fluide (Précédent / Suivant) et accès rapide aux pages.
    - `TableSortHeader` : Refactorisé en balise `<button type="button">` intégrable dans n'importe quel `<th>`, éliminant toute imbrication invalide `<th><th>` et toute erreur d'hydratation DOM.
  - `src/components/v1/DomainDocumentsTable.tsx` : Tableau documentaire réutilisable intégrant le moteur de recherche temps réel, le tri par nom, type, version, chunks, date et actions (consultation/suppression).
  - Intégration complète dans :
    - `src/components/v1/DocumentIngestionView.tsx` : Tables documentaires du domaine actif et vue consolidée inter-domaines avec moteur de recherche, filtres et pagination.
    - `src/components/v1/RagAuditExplorerView.tsx` : Table des chunks indexés (moteur de recherche par mot-clé, filtre document, seuil cosinus, tri sur colonnes sans erreur DOM, pagination).
    - `src/components/v1/TelemetryDashboardView.tsx` : Table de l'historique des latences RAG (moteur de recherche par ID requête, heure, TTFT ou tokens, tri par requête, heure, TTFT, durée, tokens générés, pagination).
  - `src/components/Navbar.tsx` & `src/components/RagtimeLogo.tsx` : Mise à jour conforme du sous-titre de marque en « Beat & Pgvector ».
- **Critères d'Acceptation :**
  - Le logo affiche distinctement et sans coquille la mention "Beat & Pgvector".
  - Les tableaux ne génèrent aucune erreur d'hydratation HTML/React en console (`<th>` imbriqué banni).
  - La saisie dans la barre de recherche filtre instantanément les lignes et ajuste la pagination sans décalage.
  - Le changement de taille de page repositionne l'utilisateur sur la page 1 si la page actuelle excède le nouveau nombre total de pages.
  - Le clic sur un en-tête alterne entre tri ascendant, descendant et conservation de la cohérence visuelle.
  - L'affichage reste fluide même avec plusieurs centaines d'enregistrements (mémoïsation React).

#### US-FRONT-26 : Console RAG Temps Réel — Raccordement FastAPI, Flux SSE Réel & Récupération / Suppression des Conversations Antérieures
- **User Story :** En tant qu'utilisateur de la console RAG Sourcée, je veux bénéficier d'un raccordement direct au flux SSE de FastAPI, disposer d'un libellé clair "Personnalisation système" à côté du bouton "Nouveau domaine", pouvoir activer/désactiver l'historique de conversation, sauvegarder, exporter, copier ou effacer mes échanges, et accéder directement à un gestionnaire complet permettant de **récupérer** ou **supprimer** des conversations antérieures enregistrées par domaine.
- **Tâche PR :** `feat(chat-history-sse): real FastAPI SSE streaming, explicit system customization label, and comprehensive conversation management (recover, delete, search, export, bulk cleanup)`
- **Pattern & SOLID :** *Reactive Stream Pattern*, *Persistent Local Storage Adapter*, *FSM* pour le cycle de vie du streaming.
- **Composants Implémentés :**
  - `src/components/v1/SourcedChatView.tsx` :
    - Libellé explicite `Personnalisation système` sur le bouton de configuration des instructions de domaine.
    - Bouton toggle `Historique activé / désactivé` mémorisé par domaine.
    - Bouton explicite `Récupérer / Supprimer conversations ({count})` dans la barre supérieure de domaine et dans la barre d'action de discussion.
    - Carte d'accès direct dans l'état d'accueil vierge du chat invitant à récupérer les conversations antérieures enregistrées.
    - Modal étendu de gestion des conversations antérieures :
      - Moteur de recherche dédié pour filtrer les conversations par mot-clé, question ou date.
      - Cartes de session détaillées avec aperçu de la question initiale et de l'extrait de réponse du modèle.
      - Bouton **"Récupérer"** rechargeant instantanément l'échange complet dans le chat actif avec notification d'action.
      - Bouton **"Exporter"** direct en Markdown ou JSON sans obligation de réouvrir la session.
      - Bouton **"Supprimer"** individuel retirant la session du stockage persistant local avec mise à jour immédiate.
      - Bouton **"Tout supprimer"** avec garde de double-confirmation pour purger l'historique archivé du domaine en toute sécurité.
    - Barre d'actions conversationnelle en cours d'échange : `Enregistrer`, `Exporter` (MD/JSON/TXT), `Copier l'échange`, `Antérieures`, `Effacer`.
    - Fallback résilient avec `defaultApiClient.streamChatQuery` gérant les 8 événements SSE normalisés.
- **Critères d'Acceptation :**
  - Le texte "Personnalisation système" est visible et accessible au clic à côté de "Nouveau domaine".
  - Un bouton explicite permettant de récupérer ou supprimer les conversations antérieures est mis à la disposition de l'utilisateur.
  - La récupération d'une conversation passée réinjecte l'intégralité des messages et citations dans l'interface de discussion.
  - La suppression retire définitivement l'échange de la liste sans nécessiter de rafraîchissement manuel de page.
  - Lorsque l'historique est activé, les échanges persistent au rechargement de page pour le domaine actif.
  - La copie de conversation dépose le texte complet formaté avec citations dans le presse-papier avec confirmation visuelle temporaire.
  - L'enregistrement archive la session avec horodatage et permet sa réouverture instantanée.

#### US-FRONT-27 : File d'Ingestion Documentaire Asynchrone (ARQ / Redis Worker Tracking)
- **User Story :** En tant qu'utilisateur téléversant des documents volumineux, je veux suivre l'état de traitement de la file d'attente asynchrone ARQ (extraction de texte, découpage de chunks, calcul d'embeddings vectoriels 768d, indexation pgvector) sans gel de l'interface utilisateur.
- **Tâche PR :** `feat(arq-ingestion): asynchronous ingestion queue tracking with Redis worker progress states`
- **Pattern & SOLID :** *Observer Pattern*, *Asynchronous Polling & SSE Task Gate*, *Separation of Concerns*.
- **Composants Implémentés :**
  - `src/contracts/api-types.ts` : Définition de `AsyncIngestionJobProgress` (`job_id`, `status: pending | extracting | chunking | embedding | indexing | completed | failed`, `progress_percentage`, `chunks_processed`, `total_chunks`, `error_message`).
  - `src/services/apiClient.ts` : Méthodes d'orchestration `getIngestionJobStatus` et `cancelIngestionJob`.
  - Intégration visuelle dans `DocumentIngestionView` : barre de progression par étape, badge de statut dynamique et notification de fin de tâche.
- **Critères d'Acceptation :**
  - Le téléversement libère immédiatement l'UI et passe en statut `En file d'attente (ARQ Worker)`.
  - La progression s'actualise sans rechargement de page jusqu'à la complétion.
  - En cas d'échec du worker, un message clair et sécurisé explique l'erreur sans divulguer de trace interne.

#### US-FRONT-28 : Export Multi-Formats Étendu des Échanges & Citations RAG
- **User Story :** En tant qu'analyste ou auditeur, je veux exporter une conversation ou une réponse RAG sourcée sous plusieurs formats standards (Markdown avec frontmatter et checksums SHA-256, JSON machine-readable certifié, et Texte brut prêt pour bureautique) afin de pouvoir réutiliser les synthèses hors de la plateforme.
- **Tâche PR :** `feat(multi-format-export): extended exports (Markdown, JSON, TXT) with certified cryptographic sources`
- **Pattern & SOLID :** *Strategy Pattern* (formateurs d'export distincts selon le type MIME demandé).
- **Composants Implémentés :**
  - Menu déroulant d'exportation contextuelle dans `SourcedChatView` et modal d'historique.
  - Stratégies d'export :
    1. **Markdown (.md)** : Contient le titre, le domaine, la date ISO, le modèle local utilisé, la question, la réponse formatée et le tableau complet des citations avec scores cosinus et hashes SHA-256.
    2. **JSON (.json)** : Objet structuré `SavedConversationSession` conforme au schéma d'échange RAGTIME avec tableau typé des sources certifiées.
    3. **Texte brut (.txt)** : Transcription lisible directe pour copier-coller dans des emails ou rapports bureautiques.
- **Critères d'Acceptation :**
  - L'export génère un téléchargement direct dans le navigateur sans transit par un serveur tiers.
  - Les noms de fichiers exportés incluent le slug du domaine et le timestamp ISO assaini (`ragtime_export_{slug}_{timestamp}.{ext}`).

#### US-FRONT-29 : Métriques Prometheus & Alerting Télémétrique de Cluster
- **User Story :** En tant qu'ingénieur MLOps ou administrateur système, je veux visualiser en temps réel les métriques Prometheus du cluster RAG (latences p50/p95/p99, débit tokens/s, statut des 4 services d'infrastructure) et recevoir des alertes visuelles si les seuils de qualité RAG sont franchis.
- **Tâche PR :** `feat(telemetry-prometheus): cluster prometheus metrics exposition and proactive threshold alerting`
- **Pattern & SOLID :** *Metric Collector Adapter*, *Threshold Alerting Strategy*.
- **Composants Implémentés :**
  - `src/contracts/api-types.ts` : Extension de `ClusterTelemetryDTO` et `PrometheusMetricEntry`.
  - `src/components/v1/TelemetryDashboardView.tsx` : Badges d'état temps réel avec seuils d'alerte configurés (TTFT > 800ms, tokens < 15 tok/s, contexte VRAM > 85%).
  - Table paginée et triable de l'historique des latences pour diagnostic d'anomalies de performance.
- **Critères d'Acceptation :**
  - Les indicateurs de santé passent en ambre/rouge dès dépassement d'un seuil critique de performance.
  - L'export souverain de télémétrie JSON intègre l'ensemble des métriques Prometheus collectées.

#### US-FRONT-27-BIS : Affichage Informatif Explicite du Preset RAG Actif & Paramètres de Vectorisation dans l'Écran d'Ingestion (Liaison Studio Presets)
- **User Story :** En tant qu'analyste, documentaliste ou ingénieur IA indexant de nouveaux contenus, je veux voir affiché de façon explicite, complète et immédiatement lisible le Preset RAG sélectionné et actif pour le domaine cible (modèle d'embedding 768d pgvector, stratégie et taille de découpage des chunks, seuil de similarité cosinus, statut d'immutabilité vectorielle), avec un accès direct à sa fiche technique et un raccourci vers le Studio Presets, afin de savoir avec certitude quels hyperparamètres gouverneront l'ingestion sans devoir basculer d'onglet.
- **Tâche PR :** `feat(ingestion-preset-banner): explicit domain RAG preset and vectorization hyperparameters informative banner with technical sheet modal and studio shortcut`
- **Pattern & SOLID :** *Contextual Informative Component*, *Single Responsibility Principle*, *Observer Pattern* (écoute réactive des changements de preset et de domaine cible).
- **Composants Implémentés :**
  - `src/components/v1/DocumentIngestionView.tsx` :
    - Bannière informative `border-indigo-900/60` positionnée au sommet de la zone d'ingestion.
    - Détection dynamique du tenant cible d'affectation (`currentUploadTargetTenant`) et synchronisation asynchrone des presets associés (`targetDomainPresets`).
    - Sélecteur rapide de permutation de preset actif si plusieurs configurations coexistent pour le domaine.
    - 4 blocs métriques d'hyperparamètres clés :
      1. **Modèle d'Embedding & Espace Vectoriel** (ex: `nomic-embed-text-v1.5`, 768 dimensions, cosine distance pgvector).
      2. **Stratégie & Découpage Chunks** (Fenêtre glissante, Phrastique grammatical, Sections Markdown AST avec tailles en tokens et overlap).
      3. **Seuil Cosinus & Retrieval** (seuil minimal d'admissibilité $\ge X.XX$, Top-K fragments, statut du reranker cross-encoder).
      4. **Statut d'Immutabilité Vectorielle** (badge `🔒 Espace Scellé` avec décompte de documents indexés vs `🔓 Espace Vierge Modifiable`).
    - Bouton d'action « Fiche Technique » ouvrant le modal `PresetInfoModal` pour consultation détaillée.
    - Bouton d'action « Gérer dans le Studio » avec redirection fluide vers l'onglet Studio Presets RAG via `onNavigateToStudio`.
    - Alignement automatique du simulateur Dry-Run (`PreIndexingDryRunModal`) sur la stratégie et les tokens du preset actif affiché.
  - `src/components/v1/V1WorkspaceView.tsx` :
    - Injection du callback `onNavigateToStudio` à `DocumentIngestionView`.
- **Critères d'Acceptation :**
  - L'écran "Ingestion et Jobs ARQ" affiche en permanence et sans ambiguïté les spécifications du preset RAG sélectionné pour le domaine de destination.
  - La modification du domaine d'affectation met à jour atomiquement la bannière informative avec le preset actif du domaine sélectionné.
  - Le clic sur « Fiche Technique » ouvre le modal `PresetInfoModal` avec les caractéristiques dimensionnelles et algorithmiques complètes.
  - Le clic sur « Gérer dans le Studio » bascule instantanément l'utilisateur sur l'écran "Studio Presets RAG".
  - Les paramètres de découpage du simulateur Dry-Run s'alignent automatiquement sur les valeurs de taille et de chevauchement du preset actif affiché.

---

## 4. Matrice de Couverture des Tests de Non-Régression (TNR)

| ID TNR | Domaine | Condition Déclenchante | Comportement Attendu |
|---|---|---|---|
| **TNR-01** | Contrat OpenAPI | Modification d'un DTO Pydantic Backend | Échec immédiat de la compilation front si rupture |
| **TNR-02** | Cloisonnement Tenant | Changement d'espace de travail | Purge totale du cache local, du store des documents et des conversations |
| **TNR-03** | Reconnexion SSE | Coupure réseau pendant le streaming | Envoi de `Last-Event-ID` et reprise sans perte ni duplication de mot |
| **TNR-04** | Sécurité XSS | Extraits documents avec balises malveillantes | Rendu textuel ou échappement strict, zéro exécution de script |
| **TNR-05** | Immutabilité Presets | Modification d'un preset en production | Création d'un snapshot `v+1` sans écrasement de l'ancien |
| **TNR-06** | Télémétrie Cluster | Instabilité du débit ou dérive TTFT | Détection sous 15s et calcul de métriques sans perte de trame |
| **TNR-07** | Fusion Hybride RRF | Conflit entre score dense et mot-clé exact | Application stricte de la formule 1/(60+r) avec repêchage vérifié |
| **TNR-08** | Export Souverain | Export JSON multi-domaines | Schema RAGTIME_SOVEREIGN_V1 certifié avec checksum SHA256 et sans secret |
| **TNR-09** | Onboarding & Domaine Vierge | Compte nouvellement initialisé ou domaine sans document | Affichage du guide d'onboarding 3 étapes et verrouillage du chat hors-sol |
| **TNR-10** | Cycle de Vie des Domaines | Tentative de suppression du dernier espace | Blocage strict par le guard de sécurité avec alerte utilisateur |
| **TNR-11** | Persistance Auth POC | Rechargement de page ou changement d'onglet | Session utilisateur préservée via `sessionStorage` |
| **TNR-12** | Guard Accès Non-Authentifié | Clic sur recherche ou URL interne sans session | Redirection automatique vers `/auth/login` et masquage de « Mon espace RAG » |
| **TNR-13** | Déconnexion & Purge | Clic sur le bouton de déconnexion | Révocation immédiate de la session, retour au Showcase et masquage de l'espace |
| **TNR-14** | Immutabilité Presets après Ingestion (Phase 5) | Tentative de modification directe d'un preset lié à des chunks existants | Verrouillage avec avertissement explicite et forçage du versionnage v+1 |
| **TNR-15** | Cohérence Algorithmique RRF vs Dense (Phase 5) | Comparaison Split-Screen d'une requête complexe | Évaluation comparative exacte 1/(k+r) vs Cosine avec gain relatif calculé |
| **TNR-16** | Export Structuré Markdown & Citations (Phase 5) | Clic sur export Markdown d'une réponse avec citations | Génération d'un fichier .md avec métadonnées conformes, sources et hashes vérifiables |
| **TNR-17** | Bascule Rapide RBAC Démo (Phase 5) | Commutation entre Owner, Lead DS et Viewer | Mise à jour atomique du state sans perte de l'espace de travail actif |
| **TNR-18** | Règle d'Or d'Immutabilité des Presets sous Condition (Phase 5) | Espace vierge (0 doc) vs Espace alimenté (>= 1 doc indexé) | Modification libre et sécurisée si vierge ; verrouillage scellé inviolable si documents vectorisés |
| **TNR-19** | Assainissement & Validation Formulaires Systématiques (Phase 5) | Saisie utilisateur sur n'importe quel formulaire du site | Validation schéma déterministe, assainissement anti-XSS et feedback visuel non-intrusif |
| **TNR-20** | Tri, Pagination & Nombre Max par Page (Phase 6) | Navigation sur tableaux documents, audit chunks ou latences | Conservation de la cohérence de page, recalcul automatique des indices et zéro débordement |
| **TNR-21** | Résilience SSE, Enregistrement & Historique par Domaine (Phase 6) | Déconnexion/reconnexion SSE ou bascule de domaine actif | Isolation stricte de l'historique par tenant et restauration sans altération de session |
| **TNR-22** | Suivi Asynchrone d'Ingestion ARQ (Phase 6) | Ingestion longue de document volumineux multi-pages | Suivi sans blocage de l'UI avec actualisation fluide de la barre de progression |
| **TNR-23** | Intégrité Cryptographique des Exports Multi-Formats (Phase 6) | Exportation Markdown / JSON / TXT d'une réponse sourcée | Présence des métadonnées, respect des schémas et calcul conforme des hashes SHA-256 |
| **TNR-24** | Réactivité de l'Alerting Télémétrique (Phase 6) | Dérive de latence TTFT > 800ms ou chute d'un service | Déclenchement visuel immédiat des alertes de dégradation cluster |
| **TNR-25** | Inspecteur Visuel Cosinus (Phase 7) | Variation du score cosinus (0.50 à 1.00) | Gradient thermique continu vert/ambre/rouge et delta exact par rapport au Top-1 |
| **TNR-26** | Extraction Trafilatura & Options (Phase 7) | Ingestion d'URL ou HTML avec bascule Précision / Rappel | Élimination totale du boilerplate sans couper le corps de l'article |
| **TNR-27** | Nettoyage Déterministe (Phase 7) | Ingestion de texte corrompu (NFD, zero-width, balises) | Normalisation NFC, éradication des invisibles et condensation d'espaces vérifiée |
| **TNR-28** | Chunking Multi-Stratégies (Phase 7) | Test comparatif Glissant vs Phrastique vs Markdown | Contrôle invariant overlap < size / 2 et maintien du contexte des phrases |
| **TNR-29** | Dry-Run Pré-Indexation (Phase 7) | Simulation d'ingestion sur document avant vectorisation | Décompte exact des tokens, estimation VRAM pgvector et zéro injection prématurée |

---

## 5. Phase 7 — Pipeline d'Ingestion Avancé, Nettoyage & Expérience Visuelle [SPÉCIFICATION EXHAUSTIVE]

### 5.1 Justification Métier, Diagnostic Architectural & Référence Technique
L'analyse approfondie menée sur espace vierge et formalisée dans `architecture/specifications/referenceChunkEmbed.md` a mis en lumière des lacunes fonctionnelles critiques dans les interfaces RAG d'entreprise :
1. **L'Ingestion "Boîte Noire"** : L'utilisateur téléverse un fichier sans aucun contrôle sur l'extraction, le nettoyage ou la stratégie de segmentation. Les bruits de structure (boilerplate web, menus, bannières) et les corruptions invisibles (Unicode NFD, zero-width spaces) polluent pgvector sans que l'auditeur ne puisse l'anticiper.
2. **L'Indexation à l'Aveugle** : Aucune étape de prévisualisation ou de simulation (Dry-Run) n'est offerte avant l'écriture définitive en base, empêchant d'estimer le budget VRAM ou le nombre de tokens.
3. **Le Manque de Granularité du Preset** : Le preset impose un découpage par fenêtre glissante fixe même sur des documents hautement structurés (articles Markdown, documentation technique avec titres hiérarchiques).
4. **L'Opacité des Scores Cosinus** : Un score de similarité cosinus brut (ex: `0.843`) reste abstrait pour l'utilisateur sans repère visuel thermique, sans mise en relation avec le seuil minimal du preset et sans mesure de la chute de pertinence par rapport au meilleur chunk Top-1.

Cette Phase 7 refond en profondeur les trois écrans opérationnels : **Chat RAG Sourcé**, **Ingestion et Jobs ARQ** et **Studio Preset RAG**.

---

### 5.2 Cartographie des Écrans Cibles & Formulaires Dynamiques

#### 1. Écran « Chat RAG Sourcé » (`SourcedChatView.tsx`)
* **Nouveautés Visuelles & Expérience Utilisateur :**
  - **Badges de Citations Thermiques** : Chaque chip de citation `[Document, p.X]` sous la bulle de l'assistant intègre une pastille chromatique dynamique calculée d'après son score cosinus ($\ge 0.85$ : émeraude vif, $0.70 - 0.84$ : cyan/vert d'eau, $0.60 - 0.69$ : ambre chaleureux, $< 0.60$ : rose d'alerte).
  - **Popover de Prévisualisation Cosinus au Survol** : En survolant le badge, une infobulle enrichie présente :
    * Le score de similarité vectorielle (ex: `0.874`),
    * Le niveau de confiance sémantique certifié (« Alignement sémantique excellent »),
    * Le $\Delta$ Top-1 ($\text{score} - \text{score}_{\text{top1}}$, ex: `Top-1 (Référence)` ou `Δ = -0.042`),
    * Le seuil minimal d'admissibilité du preset (ex: `Seuil preset: 0.700`).
  - **Tiroir d'Inspection Latéral Enrichi (`ChunkInspectorDrawer.tsx`)** :
    * Intégration du composant `VisualVectorSimilarityInspector` au sommet du panneau.
    * **Réglette Thermique Linéaire** de 0.50 à 1.00 avec marqueur mobile de position du chunk, trait repère du Top-1 et zone hachurée rouge pour les scores sous le seuil d'exclusion.
    * Badge de traçabilité de la stratégie de chunking ayant généré l'extrait (ex: `Stratégie : Sections Markdown` avec titre de section parent `[Section: Sécurité > Modèle de Menaces]`).

#### 2. Écran « Ingestion et Jobs ARQ » (`DocumentIngestionView.tsx`)
* **Nouveautés Visuelles & Expérience Utilisateur :**
  - **Sélecteur de Source d'Ingestion (Mode Bi-Canal)** :
    * *Mode Fichier Local* : Zone de glisser-déposer standard pour PDF, Markdown, TXT, SQL (max 25 Mo).
    * *Mode Scraping URL Web (Trafilatura 2.0)* : Champ de saisie d'URL avec validation RFC, détection de schéma sécurisé (`http://` ou `https://`) et protection anti-SSRF.
  - **Formulaire Dynamique d'Extraction Web (Trafilatura)** :
    * Sélecteur de stratégie d'extraction :
      - `Mode Précision` (Recommandé RAG) : Élimination heuristique intégrale du boilerplate (menus de navigation, formulaires de recherche, bannières cookies, pieds de page légaux).
      - `Mode Rappel` : Extraction brute étendue pour wikis et documentations techniques complexes.
    * Toggles d'options granulaires :
      - `include_tables` (activé par défaut) : Extrait les tableaux HTML et les convertit en format Markdown tabulaire strict pour préserver la contextualité des cellules.
      - `include_links` : Conserve les hyperliens textuels Markdown.
      - `include_images_alt` : Injecte le texte alternatif des balises `<img>`.
      - `extract_metadata` : Capture automatique du titre canonique, de l'auteur et de la date de publication.
  - **Console Déroulante de Nettoyage Déterministe** :
    * 4 commutateurs de filtrage mécanique :
      1. *Normalisation Unicode NFC* (standardisation universelle des caractères composés et accents).
      2. *Éradication des Caractères Invisibles* (purge stricte de `\u200B` à `\u200F`, `\uFEFF`, `\u00AD`).
      3. *Assainissement des Balises HTML Résiduelles* (regex sélective préservant les symboles mathématiques `<` et les blocs de code).
      4. *Normalisation Typographique des Espaces* (condensation des espaces multiples et réduction des sauts de ligne triples).
    * Bouton « Inspecteur Diff A/B » : Ouvre un modal comparatif montrant le texte d'origine face au texte épuré avec décompte exact des invisibles retirés et des octets gagnés.
  - **Simulateur Dry-Run Pré-Indexation** :
    * Bouton « Simuler le découpage (Dry-Run) » : Exécute le pipeline en mémoire sans écrire dans PostgreSQL.
    * Modal d'Audit Pré-Indexation :
      - Métriques clés : Nombre total de chunks, compte estimé de tokens, consommation de mémoire VRAM pgvector HNSW estimée.
      - Histogramme de distribution de la taille des chunks (min, médiane, max).
      - Carrousel d'aperçu des 3 premiers chunks générés avec leur préfixe hiérarchique.
  - **Déclenchement Sécurisé de l'Ingestion** :
    * Bouton d'action « Lancer l'ingestion » transmettant l'ensemble des paramètres choisis au worker asynchrone ARQ avec suivi en direct de la barre d'avancement.

#### 3. Écran « Studio Preset RAG » (`RagPresetStudioView.tsx`)
* **Nouveautés Visuelles & Expérience Utilisateur :**
  - **Sélecteur Multi-Stratégies de Chunking** :
    * Menu déroulant ou cartes de sélection :
      1. *Fenêtre Glissante (Tokens fixes)* :
         - Champs affichés : Curseur `chunk_size` (128 à 2048 tokens), Curseur `chunk_overlap` (0 à 500 tokens).
         - Invariant mathématique réactif : `chunk_overlap < chunk_size / 2` avec avertissement visuel `FormFieldFeedback` immédiat en cas de dépassement.
      2. *Découpage par Phrases (Sentence Boundary)* :
         - Champs affichés : Curseur `max_sentence_tokens` (128 à 1024 tokens), Toggle « Respecter les abréviations françaises » (M., Mme., Dr., ex., al.).
         - Masquage automatique du curseur d'overlap fixe.
      3. *Découpage par Sections Markdown* :
         - Champs affichés : Sélecteur de profondeur de titres (`# H1`, `## H2`, `### H3`), Toggle « Préfixer automatiquement le titre de section au chunk » (`[Section > Sous-section]`), Curseur de sous-découpage si une section excède `max_tokens`.
      4. *Chunking Sémantique Avancé* :
         - Curseur de sensibilité au saut sémantique (seuil cosinus de rupture).
  - **Simulateur Interactif de Similarité Cosinus** :
    * Curseur de seuil minimal d'admissibilité (`similarity_threshold`, 0.50 à 0.95) couplé à un banc d'essai visuel.
    * Affichage d'un échantillon de 4 chunks types avec jauges thermiques et calcul immédiat de leur inclusion ou exclusion selon le seuil sélectionné.
  - **Garantie d'Immutabilité Conditionnelle TNR-18** :
    * Domaine Vierge (0 doc) : Mode Édition Libre avec badge vert et sauvegarde active des hyperparamètres et de la stratégie.
    * Domaine Alimenté ($\ge 1$ doc) : Verrouillage absolu (badge ambre 🔒 Scellé) avec infobulle pédagogique expliquant l'interdiction mathématique de modifier les paramètres sous peine d'invalider la comparabilité cosinus de l'espace vectoriel existant.

---

### 5.3 Spécification Formelle des User Stories de Phase 7

#### US-FRONT-30 : Inspecteur Visuel de Similarité Vectorielle & Thermomètre Cosinus
- **User Story :** En tant qu'auditeur, analyste métier ou data scientist, je veux visualiser immédiatement la proximité cosinus de chaque chunk cité grâce à une échelle thermique intuitive, un delta par rapport au Top-1 et une confrontation au seuil du preset, afin d'évaluer la fiabilité de la réponse sans calcul mental.
- **Tâche PR :** `feat(ui-rag): visual vector similarity inspector with heat scale and top-1 delta gauge`
- **Pattern & SOLID :** *Visual Indicator Component*, *Single Responsibility Principle*.
- **Composants :**
  - `src/components/v1/VisualVectorSimilarityInspector.tsx`
  - `src/components/v1/CosineScoreBadge.tsx`
- **Critères d'Acceptation :**
  1. *Given* un chunk cité avec score cosinus de $0.874$ et un Top-1 à $0.920$, *When* l'utilisateur consulte le badge ou le tiroir d'inspection, *Then* le thermomètre affiche une coloration vert émeraude et le delta affiche exactement `Δ = -0.046`.
  2. *Given* un chunk proche du seuil minimal (ex: $0.612$ pour seuil à $0.600$), *When* l'auditeur inspecte la jauge, *Then* le repère se positionne à la limite ambre avec avertissement de confiance modérée.
  3. *Given* le survol d'une citation dans le chat, *Then* le popover s'ouvre sans latence avec le résumé des métriques cosinus.
- **Tests Associés :**
  - Unitaire : `visual-vector-similarity-inspector.test.tsx` (vérification des couleurs hex/classes tailwind selon les tranches de score).
  - TNR : **TNR-25** (`tnr-cosine-similarity-visual-scale.test.ts`).

#### US-FRONT-31 : Pipeline d'Extraction Web & Trafilatura Configurable
- **User Story :** En tant qu'utilisateur ingérant des articles de presse, des textes de loi ou des documentations web, je veux renseigner une URL et paramétrer les options Trafilatura 2.0 (Précision vs Rappel, extraction de tableaux Markdown, images, métadonnées) afin d'importer un corpus épuré de tout bruit périphérique.
- **Tâche PR :** `feat(ingestion-pipeline): configurable trafilatura extraction options and web URL scraper preview`
- **Pattern & SOLID :** *Strategy Pattern* (`IContentExtractor`), *Adapter Pattern*.
- **Composants :**
  - `src/components/v1/WebUrlExtractionForm.tsx`
- **Critères d'Acceptation :**
  1. *Given* une URL saisie par l'utilisateur, *When* le protocole est `http://` ou `https://` valide, *Then* le bouton d'extraction s'active et les options s'affichent.
  2. *Given* une tentative d'injection d'adresse privée (`http://192.168.1.1` ou `http://localhost:8000`), *Then* la validation anti-SSRF bloque la soumission avec un message de rejet explicite.
  3. *Given* le mode `favor_precision` coché, *Then* les menus, encadrés publicitaires et pieds de page sont purgés et les tableaux HTML sont convertis en Markdown structuré.
- **Tests Associés :**
  - Unitaire : `web-url-extraction-form.test.tsx` (validation des URL, toggles d'options).
  - TNR : **TNR-26** (`tnr-trafilatura-extraction-options.test.ts`).

#### US-FRONT-32 : Console de Nettoyage & Normalisation Déterministe
- **User Story :** En tant qu'ingénieur de données RAG, je veux activer les 4 filtres de nettoyage mécanique (Unicode NFC, éradication d'invisibles, purge balises HTML, normalisation d'espaces) et vérifier leur effet via un panneau comparatif avant/après en temps réel, afin de certifier l'hygiène du texte avant tokenisation.
- **Tâche PR :** `feat(ingestion-cleaning): deterministic unicode NFC normalization and invisible characters sanitizer inspector`
- **Pattern & SOLID :** *Pipeline Pattern*, *Interceptor Pattern*.
- **Composants :**
  - `src/components/v1/CleaningOptionsPanel.tsx`
  - `src/components/v1/CleaningDiffModal.tsx`
- **Critères d'Acceptation :**
  1. *Given* un texte contenant des caractères zero-width space (`\u200B`) ou un BOM (`\uFEFF`), *When* le filtre d'invisibles est activé, *Then* ces caractères sont intégralement purgés et comptabilisés dans le diagnostic.
  2. *Given* des formules mathématiques ou scientifiques contenant des symboles `<` (ex: `p < 0.05`), *When* le filtre de balises est appliqué, *Then* la formule n'est pas tronquée ni supprimée.
  3. *Given* l'ouverture du modal Diff A/B, *Then* les modifications textuelles et les octets économisés s'affichent avec mise en valeur des zones corrigées.
- **Tests Associés :**
  - Unitaire : `cleaning-sanitizer.test.ts` (test exhaustif des 4 passes de nettoyage).
  - TNR : **TNR-27** (`tnr-deterministic-cleaning-invisibles.test.ts`).

#### US-FRONT-33 : Studio Multi-Stratégies de Chunking Documentaire
- **User Story :** En tant que créateur ou administrateur de domaine, je veux sélectionner la stratégie de partitionnement la plus adaptée à la nature de mes documents (Glissante, Phrastique, Sections Markdown, Sémantique) et disposer de formulaires dynamiques contextualisés, afin d'optimiser la densité sémantique de chaque vecteur.
- **Tâche PR :** `feat(studio-chunking): multi-strategy chunker selector (sliding window, sentence-boundary, markdown-sections)`
- **Pattern & SOLID :** *Strategy Pattern*, *Factory Method Pattern*.
- **Composants :**
  - `src/components/v1/ChunkingStrategySelector.tsx`
- **Critères d'Acceptation :**
  1. *Given* la sélection de la stratégie « Sections Markdown », *When* l'option `prefix_section_title` est active, *Then* chaque chunk produit commence par le fil d'Ariane de son titre (ex: `[Titre > Sous-titre]`).
  2. *Given* la stratégie « Fenêtre Glissante », *When* l'utilisateur tente de configurer un `chunk_overlap` supérieur ou égal à la moitié de `chunk_size`, *Then* la validation bloque la saisie avec message d'invariant `chunk_overlap < chunk_size / 2`.
  3. *Given* un domaine comportant déjà des documents indexés ($\ge 1$), *When* l'utilisateur consulte le studio, *Then* la règle TNR-18 verrouille le formulaire en mode consultation immuable.
- **Tests Associés :**
  - Unitaire : `chunking-strategy-selector.test.tsx` (validation des transitions dynamiques d'options).
  - TNR : **TNR-28** (`tnr-chunking-multistrategy-invariants.test.ts`), **TNR-30** (`tnr-contextual-header-prefixing.test.ts`).

#### US-FRONT-34 : Diagnostic Pré-Indexation & Estimateur de Tokens / VRAM (Dry-Run)
- **User Story :** En tant qu'administrateur système ou architecte d'infrastructure, je veux exécuter une simulation complète (Dry-Run) sur mon document pour auditer le partitionnement, la répartition des tokens et l'empreinte VRAM pgvector HNSW avant de déclencher la vectorisation définitive.
- **Tâche PR :** `feat(ingestion-dryrun): pre-indexing dry-run simulator with token estimation and pgvector VRAM budget check`
- **Pattern & SOLID :** *Command Pattern* (Simulation idempotente sans effet de bord).
- **Composants :**
  - `src/components/v1/PreIndexingDryRunModal.tsx`
- **Critères d'Acceptation :**
  1. *Given* un document soumis au Dry-Run, *When* le calcul s'exécute, *Then* aucune ligne n'est insérée dans `documents` ou `document_chunks` (zéro persistance).
  2. *Given* 24 chunks de 512 tokens générés pour un modèle 768d, *Then* l'estimateur calcule l'empreinte mémoire exacte (vecteurs bruts : $24 \times 768 \times 4$ octets $\approx 73.7$ Ko + surcharge index HNSW $\approx 110$ Ko).
  3. *Given* la visualisation des 3 premiers extraits dans le modal, *Then* l'utilisateur peut inspecter leur contenu exact et valider la cohérence avant validation finale.
- **Tests Associés :**
  - Unitaire : `pre-indexing-dry-run-modal.test.tsx` (calculs arithmétiques de budget VRAM, carrousel d'extraits).
  - TNR : **TNR-29** (`tnr-pre-indexing-dryrun-isolation.test.ts`).

#### US-FRONT-35 : Refonte Ergonomique du Studio Preset RAG, Presets Nommés par Domaine & Indication Visible dans le Chat RAG Sourcé
- **User Story :** En tant qu'analyste ou auditeur RAG, je veux une présentation limpide et intuitive dans le Studio Preset (séparation explicite entre ce qui doit être identique comme l'Embedding, et ce qui peut varier au retrieval comme le Top-K, le seuil cosinus et le reranking), enregistrer librement des presets nommés au lieu de subir un versioning rigide v1/v2, choisir mon preset par défaut (les 3 presets types étant initialisés d'office avec « Équilibré et standard » par défaut lors de la création d'un domaine), et voir s'afficher clairement le preset retrieval sélectionné dans la console de Chat RAG Sourcé avec bascule rapide.
- **Tâche PR :** `feat(studio-preset-ux): intuitive named preset management, default preset selection, simplified block hierarchy, and visible retrieval preset in sourced chat console`
- **Pattern & SOLID :** *Strategy Pattern*, *Observer Pattern*, *Presenter Pattern*, *Separation of Concerns*.
- **Composants :**
  - `src/components/v1/RagPresetStudioView.tsx` :
    - Refonte des blocs : « Presets disponibles pour ce domaine » avec badge « Par Défaut », sélection en 1 clic, duplication/chargement dans l'éditeur et suppression sécurisée.
    - Bloc « Paramètres du modèle Retrieval » clarifié en 3 sections ordonnées :
      1. *Modèle d'Embedding (Espace Vectoriel Fixé & Certifié)* : Explication claire de la contrainte mathématique d'identité stricte entre indexation et interrogation.
      2. *Découpage Physique des Chunks (pgvector)* : Taille de chunk et chevauchement (verrouillé conditionnellement si des documents sont indexés - TNR-18).
      3. *Hyperparamètres Flexibles de Recherche (Retrieval)* : Top-K adaptatif (1 à 12), Seuil cosinus minimal (0.50 à 0.95), Reranker BGE Cross-Encoder et option Parent-Child (Small-to-Big).
    - Enregistrement flexible : « Sauvegarder les modifications », « Enregistrer comme nouveau preset » (nom personnalisé libre) et « Définir comme preset par défaut pour ce domaine ».
  - `src/components/v1/SourcedChatView.tsx` :
    - Encart interactif dédié dans la barre de contexte supérieure affichant en évidence le **Preset Retrieval Actif** : nom du preset, pastille de statut, métriques compactes (`Top-K • Seuil ≥ X.XX • Rerank`) et menu déroulant de bascule rapide en cours d'évaluation.
- **Critères d'Acceptation :**
  1. *Given* la création d'un nouveau domaine RAG, *Then* les 3 presets standards sont créés automatiquement (« Équilibré et standard », « Précis & Clauses Juridiques », « Macro-Contexte & Synthèse ») et « Équilibré et standard » est configuré par défaut (`is_active: true`).
  2. *Given* plusieurs presets disponibles pour un domaine, *Then* l'utilisateur peut définir n'importe quel preset comme preset par défaut en 1 clic.
  3. *Given* la console Chat RAG Sourcé, *Then* le preset de retrieval actif est visible immédiatement et l'utilisateur peut commuter de preset directement depuis la console sans repasser par le Studio.
  4. *Given* l'enregistrement d'un preset, *Then* aucun suffixe automatique `v1, v2` n'est imposé, l'utilisateur nomme son preset de façon autonome.
- **Tests Associés :**
  - Unitaire : `rag-preset-studio-named-presets.test.tsx` (sauvegarde, choix par défaut, bascule).
  - TNR : **TNR-31** (`tnr-named-preset-management-and-chat-indicator.test.ts`).

---

### 5.4 Matrice Complète des Tests de Non-Régression de Phase 7

| Identifiant | Nom Technique | Périmètre | Règle d'Or Bloquante |
|---|---|---|---|
| **TNR-25** | `tnr-cosine-similarity-visual-scale.test.ts` | Écran Chat & Tiroir | La jauge thermique reproduit fidèlement la gradation mathématique du score cosinus (0.50 à 1.00), et $\Delta$ Top-1 est calculé avec 3 décimales sans distorsion visuelle. |
| **TNR-26** | `tnr-trafilatura-extraction-options.test.ts` | Écran Ingestion | L'extraction Trafilatura en mode Précision filtre 100% du boilerplate sans tronquer le titre, le corps du texte ni les structures de tableaux Markdown. |
| **TNR-27** | `tnr-deterministic-cleaning-invisibles.test.ts` | Écran Ingestion | La passe de nettoyage élimine les caractères corrupteurs (`\u200B-\u200F`, `\uFEFF`, `\u00AD`) et normalise en Unicode NFC sans jamais supprimer les formules mathématiques (ex: `x < y`). |
| **TNR-28** | `tnr-chunking-multistrategy-invariants.test.ts` | Écran Studio Preset | L'invariant `chunk_overlap < chunk_size / 2` est respecté en glissant, et le découpage phrastique ne coupe jamais un mot ou une phrase en cours. |
| **TNR-29** | `tnr-pre-indexing-dryrun-isolation.test.ts` | Écran Ingestion | L'exécution du Dry-Run n'effectue aucun `INSERT` en base de données et restitue l'estimation VRAM et tokens conforme aux formules théoriques. |
| **TNR-30** | `tnr-contextual-header-prefixing.test.ts` | Écran Studio Preset | Les chunks segmentés par section Markdown reçoivent systématiquement le préfixe contextuel `[Section > Sous-titre]` sans dégrader le quota de tokens du corps. |
| **TNR-31** | `tnr-named-preset-management-and-chat-indicator.test.ts` | Écran Studio Preset & Chat | Les 3 presets types sont initialisés à la création d'un domaine avec « Équilibré et standard » par défaut, la gestion des presets nommés s'effectue sans versioning rigide, et le preset actif est synchronisé et visible dans la console Chat. |



