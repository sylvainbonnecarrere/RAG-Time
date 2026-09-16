import { CitationSource, IngestionSource, SitePageProposal, FrontendMilestone } from '../types';

export const MOCK_CITATIONS: CitationSource[] = [
  {
    id: 'cite-1',
    documentName: '01-architecture.md',
    documentType: 'markdown',
    location: 'Section 6 - Ports principaux',
    pageNumber: 3,
    similarityScore: 0.942,
    lexicalScore: 0.887,
    rerankScore: 0.961,
    excerpt: 'L\'architecture par ports isole le domaine des adaptateurs d\'infrastructure (FastAPI, pgvector, Ollama). Le DocumentParserPort et le ChunkerPort garantissent un découpage déterministe avec persistance des métadonnées JSONB et checksum SHA256.',
    tokensCount: 420,
    chunkId: 'chk_7f82a91b-44c1-4820-9ad4',
    metadata: {
      tenant_id: 'tenant_enterprise_alpha',
      parser_version: 'v1.4.0',
      embedding_dim: 1024,
      model: 'bge-m3-local'
    }
  },
  {
    id: 'cite-2',
    documentName: '02-roadmap.md',
    documentType: 'markdown',
    location: 'V1.1 - Audit et Pédagogie',
    pageNumber: 3,
    similarityScore: 0.895,
    lexicalScore: 0.832,
    rerankScore: 0.912,
    excerpt: 'Règle de présentation obligatoire : l\'interface affiche les étapes observables du pipeline (recherche effectuée → sources retenues → génération démarrée). Aucune boîte noire non vérifiable.',
    tokensCount: 380,
    chunkId: 'chk_93e110c2-55d8-4bc2-881e',
    metadata: {
      tenant_id: 'tenant_enterprise_alpha',
      similarity_metric: 'cosine',
      threshold: 0.75,
      retrieval_top_k: 4
    }
  },
  {
    id: 'cite-3',
    documentName: 'audit-securite-2026.pdf',
    documentType: 'pdf',
    location: 'Page 14 - Cloisonnement Multi-Tenant',
    pageNumber: 14,
    similarityScore: 0.918,
    lexicalScore: 0.890,
    rerankScore: 0.945,
    excerpt: 'Chaque vecteur et chaque chunk est strictement tagué par son tenant_id UUID au moment de l\'ingestion. Les requêtes de recherche pgvector injectent le filtre SQL obligatoire dans le plan d\'exécution.',
    tokensCount: 512,
    chunkId: 'chk_bb203e44-11fa-4098-a281',
    metadata: {
      tenant_id: 'tenant_enterprise_alpha',
      storage_key: '/data/documents/tenant_alpha/doc_audit/v1/source',
      sha256: '9f83...c712'
    }
  },
  {
    id: 'cite-4',
    documentName: 'contrats_clients_2026.sql',
    documentType: 'sql',
    location: 'Table transactions & clauses',
    pageNumber: 1,
    similarityScore: 0.874,
    lexicalScore: 0.865,
    rerankScore: 0.899,
    excerpt: 'SELECT clause_id, content, validity_date FROM enterprise_contracts WHERE tenant_id = current_tenant() AND status = \'ratified\';',
    tokensCount: 290,
    chunkId: 'chk_cc881144-88aa-4712-bf99',
    metadata: {
      tenant_id: 'tenant_enterprise_alpha',
      source_adapter: 'PostgreSQL-Connector',
      rows_indexed: 1420
    }
  }
];

export const INGESTION_SOURCES: IngestionSource[] = [
  {
    id: 'src-1',
    name: '01-architecture.md',
    type: 'markdown',
    size: '184 KB',
    chunksCount: 42,
    status: 'indexed',
    lastSynced: 'Il y a 4 min'
  },
  {
    id: 'src-2',
    name: 'rapport-annuel-q4.pdf',
    type: 'pdf',
    size: '12.4 MB',
    chunksCount: 318,
    status: 'indexed',
    lastSynced: 'Il y a 12 min'
  },
  {
    id: 'src-3',
    name: 'base-clients-production.sql',
    type: 'sql',
    size: '4.8 MB',
    chunksCount: 156,
    status: 'processing',
    lastSynced: 'En cours...'
  },
  {
    id: 'src-4',
    name: 'notion-knowledge-engineering',
    type: 'notion',
    size: '1.2 MB',
    chunksCount: 88,
    status: 'ready',
    lastSynced: 'Il y a 1h'
  }
];

export const SITE_PAGES_PROPOSAL: SitePageProposal[] = [
  {
    id: 'page-landing',
    name: 'Landing Page & Showcase RAG',
    route: '/',
    role: 'Vitrine technologique & Conversion B2B',
    importance: 'Espace Public & Sécurité',
    description: 'Présentation épurée démontrant la supériorité du RAG auto-hébergé : ingestion unifiée, index vectoriel pgvector et démonstrateur de réponses avec citations vérifiables.',
    keyComponents: ['Hero avec barre de prompt réactive', 'Grille Bento Asymétrique', 'Hub d\'Ingestion visuel', 'Chat interactif sourcé', 'Preuves d\'audit et conformité']
  },
  {
    id: 'page-auth',
    name: 'Authentification & POC Connexion',
    route: '/auth/login',
    role: 'Sécurisation, hachage Argon2id et accès à Mon Espace RAG',
    importance: 'Espace Public & Sécurité',
    description: 'Flux de connexion sans friction connecté à fastapi-users (Argon2id). Formulaire complet avec email/password, validation démo toujours active et injection automatique de X-Tenant-ID.',
    keyComponents: ['Formulaire d\'authentification durci', 'POC Démo avec complétion rapide en 1 clic', 'Guard de routes protégeant l\'espace RAG', 'Injection automatique du header X-Tenant-ID']
  },
  {
    id: 'page-workspace',
    name: 'Console RAG / Assistant Sourcé',
    route: '/app/chat',
    role: 'Cœur applicatif de recherche et de synthèse',
    importance: 'Mon Espace RAG',
    description: 'Interface de chat en streaming Server-Sent Events (SSE) avec affichage en temps réel des 5 étapes du pipeline, badges de citations cliquables et tiroir d\'inspection de source.',
    keyComponents: ['Client SSE avec reconnexion automatique', 'Badges de citation interactifs', 'Tiroir d\'inspection d\'extraits (Chunk Viewer)', 'Indicateur de latence TTFT et tokens/s']
  },
  {
    id: 'page-ingestion',
    name: 'Gestion documentaire & Ingestion par Domaine',
    route: '/app/documents',
    role: 'Gestion des sources, fichiers et partitionnement par domaine',
    importance: 'Mon Espace RAG',
    description: 'Upload glisser-déposer de PDF/Markdown/SQL, suivi des versions de documents sans écrasement, statut de la file asynchrone ARQ/Redis et gestion complète des domaines.',
    keyComponents: ['Uploader multi-formats drag & drop', 'Tableau d\'historique des versions', 'Statut des jobs ARQ (pending, processing, indexed)', 'Dialogue de création, édition et suppression sécurisée de domaines']
  },
  {
    id: 'page-presets',
    name: 'Studio des Presets RAG (rag_config)',
    route: '/app/presets',
    role: 'Configuration fine des pipelines RAG',
    importance: 'Mon Espace RAG',
    description: 'Interface de réglage versionnée : stratégie de chunking (fixe/récursif), taille et overlap, seuil de similarité cosinus, budget de tokens et politique de fallback en cas de manque de sources.',
    keyComponents: ['Éditeur visuel de chunk_size et overlap', 'Sélecteur de modèle Ollama et modèle d\'embedding', 'Gestion des versions de preset (immuables v+1)', 'Simulateur de budget de contexte']
  },
  {
    id: 'page-audit',
    name: 'Inspecteur de Chunks & Audit Pédagogique',
    route: '/app/audit',
    role: 'Transparence algorithmique & Confiance',
    importance: 'Audit & Observabilité',
    description: 'Outil de visualisation des chunks générés, métadonnées JSONB associées, scores de similarité cosinus et étapes observables (recherche → sources retenues → prompt contextuel).',
    keyComponents: ['Explorateur de chunks découpés', 'Visualiseur de métadonnées et checksums SHA-256', 'Comparateur de scores (vectoriel dense vs lexical BM25)', 'Chronologie des étapes d\'inférence']
  },
  {
    id: 'page-metrics',
    name: 'Observabilité, Télémétrie Locale & RRF',
    route: '/app/observability',
    role: 'Monitoring opérationnel et transparence hybride',
    importance: 'Audit & Observabilité',
    description: 'Suivi des temps d\'ingestion, latence TTFT (Time To First Token), débit tokens/seconde du runtime Ollama, consommation VRAM, simulateur RRF et export souverain JSON en 1 clic.',
    keyComponents: ['Jauges de performance Ollama locale', 'Visualiseur mathématique RRF (k=60)', 'Healthchecks des 4 composants cluster', 'Export souverain JSON RAGTIME_SOVEREIGN_V1']
  }
];

export const FRONTEND_ROADMAP: FrontendMilestone[] = [
  {
    phase: 'Phase 1 - Fondations UI & Tokens',
    name: 'Design System Tailwind CSS v4 & Prototypes Visuels',
    target: 'Sprint 1 (V0/V1)',
    deliverables: [
      'Implémentation stricte des tokens Dark Mode Premium (fond texturé #09090b, cartes Bento #121214, bordures fines zinc-800/60).',
      'Typographie géométrique Geist & JetBrains Mono intégrée sans dérive visuelle.',
      'Landing page responsive avec grille asymétrique desktop et repli 1 colonne mobile.',
      'Composant d\'accent Focus RAG électrique (#4f46e5 / #38bdf8) réservé aux actions clés.'
    ],
    risksAndMitigations: 'Risque de surcharge visuelle : respect absolu de la règle anti-slop (pas de néons criards ni d\'ombres floues).'
  },
  {
    phase: 'Phase 2 - Intégration Client SSE & Mocks Contrat',
    name: 'Composants Métier RAG & Ingestion',
    target: 'Sprint 2 (V1 MVP)',
    deliverables: [
      'Génération automatique des types TypeScript stricts à partir du schéma OpenAPI de FastAPI.',
      'Hook React personnalisé `useSSEStream` gérant les 7 événements obligatoires (message.started, retrieval.started, etc.) avec reprise par Last-Event-ID.',
      'Composant Chat UI avec citations encapsulées sous forme de badges cliquables [Document, p.X].',
      'Tiroir latéral (Sheet) d\'inspection immédiate des chunks avec affichage de l\'extrait et du score.'
    ],
    risksAndMitigations: 'Coupures de flux SSE : gestion de l\'état de reconnexion et affichage transparent du statut d\'échec.'
  },
  {
    phase: 'Phase 3 - Audit Pédagogique & Presets Studio',
    name: 'Transparence Algorithmique & Configuration Versionnée',
    target: 'Sprint 3 (V1.1)',
    deliverables: [
      'Visualiseur de pipeline étape par étape (pas de chaîne de pensée simulée, uniquement données réelles).',
      'Explorateur de chunks et métadonnées JSONB.',
      'Formulaire de presets RAG avec infobulles pédagogiques expliquant les compromis de chunking.',
      'Système d\'exportation des conversations et sources pour audit conformité RGPD.'
    ],
    risksAndMitigations: 'Complexité cognitive : infobulles claires et visualisations visuelles intuitives sans jargon excessif.'
  }
];
