/**
 * Configuration et Référentiel des Modèles d'Embedding & Stratégies de Chunking
 * RAGTIME Souverain (2026) - US-FRONT-36, US-FRONT-37 & US-FRONT-38
 */

export interface EmbeddingModelMeta {
  id: string;
  name: string;
  provider: string;
  dimensions: number;
  dimensionLabel: string;
  description: string;
  vramEstimate: string;
  badge: string;
  badgeColor: string;
  sovereign: boolean;
  recommendedFor: string;
}

export const SUPPORTED_EMBEDDING_MODELS: EmbeddingModelMeta[] = [
  {
    id: 'nomic-embed-text-v1.5 (768d)',
    name: 'nomic-embed-text-v1.5',
    provider: 'Nomic AI (Local / Souverain)',
    dimensions: 768,
    dimensionLabel: '768d',
    description: 'Modèle souverain local optimisé pour le français et le multilingue avec Matryoshka Embeddings.',
    vramEstimate: '~1.2 GB VRAM',
    badge: 'Recommandé Souverain',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    sovereign: true,
    recommendedFor: 'Documentation générale, contrats légaux, guides internes (par défaut).',
  },
  {
    id: 'BAAI / bge-m3 (1024d)',
    name: 'BAAI / bge-m3',
    provider: 'BAAI Open Source (Local / Souverain)',
    dimensions: 1024,
    dimensionLabel: '1024d',
    description: 'Modèle tri-mode d\'élite : dense vectoriel (1024d), sparse lexical (BM25) et multi-vector (ColBERT).',
    vramEstimate: '~2.8 GB VRAM',
    badge: 'Multi-Vectoriel Dense/Sparse',
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    sovereign: true,
    recommendedFor: 'Grandes bases de connaissances hétérogènes, mix technique et juridique.',
  },
  {
    id: 'e5-mistral-7b-instruct (4096d)',
    name: 'e5-mistral-7b-instruct',
    provider: 'Microsoft / Mistral (Local / Souverain)',
    dimensions: 4096,
    dimensionLabel: '4096d',
    description: 'Grand modèle d\'embedding basé sur Mistral 7B pour documents complexes et recherche conceptuelle profonde.',
    vramEstimate: '~7.2 GB VRAM',
    badge: 'Raisonnement & Thèses',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    sovereign: true,
    recommendedFor: 'Publications médicales, thèses scientifiques et raisonnement abstrait.',
  },
  {
    id: 'text-embedding-3-small (1536d)',
    name: 'text-embedding-3-small',
    provider: 'OpenAI (API Cloud Externe)',
    dimensions: 1536,
    dimensionLabel: '1536d',
    description: 'Service API hébergé propriétaire OpenAI. Requiert une connexion Internet sortante (non air-gap).',
    vramEstimate: 'API Cloud Managée',
    badge: 'Cloud Externe',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    sovereign: false,
    recommendedFor: 'Prototypage rapide sans accélération GPU locale requise.',
  },
];

export function getEmbeddingModelMeta(modelId: string): EmbeddingModelMeta {
  const match = SUPPORTED_EMBEDDING_MODELS.find(
    (m) => m.id === modelId || m.name === modelId || modelId.startsWith(m.name)
  );
  return match || SUPPORTED_EMBEDDING_MODELS[0];
}

/**
 * Réponses architecturales formelles pour l'utilisateur et l'UI (US-FRONT-38)
 */
export const ARCHITECTURAL_TENANT_ISOLATION_EXPLANATION = {
  title: 'Architecture Multi-Tenant pgvector : Pourquoi une base mutualisée et non une BDD par utilisateur ?',
  keyTakeaway: 'Le partitionnement logique avec Row-Level Security (RLS) et filtrage strict par tenant_id garantit une étanchéité souveraine absolue tout en évitant l\'effondrement des ressources GPU/RAM de la base.',
  reasons: [
    {
      title: '1. Surcharge mémoire et pool de connexions (PgBouncer)',
      detail: 'Chaque base de données PostgreSQL distincte instancie son propre catalogue système et mobilise ses propres shared_buffers et processus autovacuum. Créer une BDD par utilisateur saturerait rapidement les connexions système et la RAM du serveur.',
    },
    {
      title: '2. Index HNSW pgvector et saturation VRAM/RAM',
      detail: 'Les graphes vectoriels HNSW nécessitent de résider en mémoire vive pour garantir une latence sous les 15ms. Une base unique avec index partagé ou partitionné par domaine optimise l\'utilisation du cache vectoriel sans dispersion d\'empreinte.',
    },
    {
      title: '3. Isolation logique inviolable par RLS (Row-Level Security)',
      detail: 'PostgreSQL applique au niveau du moteur SQL la règle : WHERE tenant_id = current_setting(\'app.current_tenant_id\')::uuid. Aucune requête ne peut mathématiquement lire les chunks d\'un autre tenant.',
    },
    {
      title: '4. Maintien et migrations de schéma unifiées',
      detail: 'Les montées de version (nouveaux champs de reranking, métadonnées sémantiques) sont déployées de manière atomique en une seule transaction sans risque de dérive de schéma (schema drift) entre utilisateurs.',
    },
  ],
};
