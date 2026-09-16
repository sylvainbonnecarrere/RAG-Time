export interface CitationSource {
  id: string;
  documentName: string;
  documentType: 'pdf' | 'markdown' | 'sql' | 'notion';
  location: string;
  pageNumber?: number;
  similarityScore: number;
  lexicalScore?: number;
  rerankScore?: number;
  rerankGainPercent?: number;
  isDeduplicated?: boolean;
  excerpt: string;
  tokensCount: number;
  chunkId: string;
  metadata: Record<string, string | number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  latencyMs?: number;
  citations?: CitationSource[];
  isStreaming?: boolean;
}

export interface IngestionSource {
  id: string;
  name: string;
  type: 'pdf' | 'sql' | 'notion' | 'markdown';
  size: string;
  chunksCount: number;
  status: 'indexed' | 'processing' | 'pending' | 'ready';
  lastSynced: string;
}

export interface SitePageProposal {
  id: string;
  name: string;
  route: string;
  role: string;
  importance: 'Espace Public & Sécurité' | 'Mon Espace RAG' | 'Audit & Observabilité' | 'Indispensable V1' | 'Audit V1.1' | 'Avancé V1.2' | 'Admin & Infra';
  description: string;
  keyComponents: string[];
}

export interface FrontendMilestone {
  phase: string;
  name: string;
  target: string;
  deliverables: string[];
  risksAndMitigations: string;
}
