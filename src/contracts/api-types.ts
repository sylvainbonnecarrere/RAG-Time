/**
 * Schémas d'Interface OpenAPI stricts - RAGTIME (2026)
 * Générés depuis /openapi.json (FastAPI / Pydantic v2)
 * Règle d'or : Zéro typage manuel dans les composants UI
 */

export type UUID = string;

export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';

export type DomainCategory =
  | 'general'
  | 'tech'
  | 'legal'
  | 'health'
  | 'science'
  | 'education'
  | 'hr'
  | 'finance'
  | 'custom';

export interface TenantDTO {
  id: UUID;
  name: string;
  slug: string;
  domain: string;
  domain_category: DomainCategory;
  description?: string;
  system_instructions?: string;
  default_embedding_model?: string;
  created_at: string;
  is_active: boolean;
  role: TenantRole;
  documents_count: number;
}

export interface UserDTO {
  id: UUID;
  email: string;
  name: string;
  tenant_id: UUID;
  roles: TenantRole[];
  token?: string;
}

export type DocumentType = 'pdf' | 'markdown' | 'sql' | 'notion';

export type JobStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface DocumentVersionDTO {
  version_number: number;
  sha256_checksum: string;
  file_size_bytes: number;
  created_at: string;
  status: JobStatus;
  chunks_count: number;
  error_message?: string;
}

export interface DocumentDTO {
  id: UUID;
  tenant_id: UUID;
  domain_id?: UUID;
  domain_name?: string;
  name: string;
  file_type: DocumentType;
  current_version: number;
  versions: DocumentVersionDTO[];
  created_at: string;
  updated_at: string;
  total_chunks: number;
  status: JobStatus;
  preview_content?: string;
  description?: string;
}

export interface RagDomainDTO {
  id: UUID;
  tenant_id: UUID;
  name: string;
  slug: string;
  category: DomainCategory;
  description?: string;
  system_instructions?: string;
  created_at: string;
  documents_count: number;
}

export type ChunkingStrategy = 'sliding_window' | 'sentence_boundary' | 'markdown_sections';
export type TokenizerFamily = 'cl100k_base' | 'o200k_base' | 'regex_whitespace';

export interface RagPresetDTO {
  id: UUID;
  tenant_id: UUID;
  name: string;
  version: number;
  is_active: boolean;
  description?: string;
  chunk_size: number; // 256 - 1024 tokens
  chunk_overlap: number; // 20 - 200 tokens
  similarity_threshold: number; // 0.50 - 0.95
  retrieval_top_k: number; // 1 - 20
  reranking_enabled: boolean;
  embedding_model: string;
  created_at: string;
  updated_at: string;

  // Options dynamiques de partitionnement (US-FRONT-37)
  chunking_strategy?: ChunkingStrategy;
  prefix_section_title?: boolean;
  parent_child_enabled?: boolean;

  // Options Spécifiques Fenêtre Glissante
  tokenizer_family?: TokenizerFamily;
  word_boundary_trim?: boolean;

  // Options Spécifiques Découpage Phrastique
  sentences_per_chunk?: number; // 2 - 12 phrases
  sentence_overlap?: number; // 0 - 3 phrases
  respect_strong_punctuation?: boolean;
  min_sentence_tokens?: number; // 20 - 100
  max_sentence_tokens?: number; // 250 - 800
  preserve_abbreviations?: boolean;

  // Options Spécifiques Sections Markdown AST
  markdown_heading_levels?: ('h1' | 'h2' | 'h3')[];
  prefix_breadcrumbs?: boolean;
  protect_atomic_blocks?: boolean;
  max_section_tokens?: number; // 512 - 1500
}

export interface ChunkMetadataDTO {
  page_number?: number;
  section?: string;
  table_name?: string;
  author?: string;
  embedding_model: string;
  chunk_index: number;
  tokens_count: number;
}

export interface RrfScoreDetails {
  dense_rank: number;
  sparse_rank: number;
  rrf_score: number;
  k_constant: number;
  rescued_by_bm25: boolean;
  dense_similarity: number;
  sparse_score: number;
  rerank_rank?: number;
}

export interface MessageSourceDTO {
  id: UUID;
  chunk_id: UUID;
  document_id: UUID;
  document_name: string;
  document_type: DocumentType;
  page_number?: number;
  location: string;
  similarity_score: number; // Cosine similarity [0.0 - 1.0]
  lexical_score?: number;
  rerank_score?: number;
  rrf_details?: RrfScoreDetails;
  excerpt: string;
  metadata: ChunkMetadataDTO;
}

export type SSEEventType =
  | 'message.started'
  | 'retrieval.started'
  | 'retrieval.completed'
  | 'generation.started'
  | 'generation.delta'
  | 'sources.available'
  | 'message.completed'
  | 'message.failed';

export interface SSEBaseEvent<T = unknown> {
  event: SSEEventType;
  id: string; // Used for Last-Event-ID reconnect
  data: T;
}

export interface MessageStartedPayload {
  message_id: UUID;
  conversation_id: UUID;
  timestamp: string;
}

export interface RetrievalStartedPayload {
  query: string;
  top_k: number;
  similarity_threshold: number;
}

export interface RetrievalCompletedPayload {
  chunks_found: number;
  candidates_evaluated: number;
  latency_ms: number;
}

export interface GenerationStartedPayload {
  model: string;
  system_prompt_tokens: number;
}

export interface GenerationDeltaPayload {
  text_delta: string;
  index: number;
}

export interface SourcesAvailablePayload {
  sources: MessageSourceDTO[];
}

export interface MessageCompletedPayload {
  message_id: UUID;
  total_tokens: number;
  time_to_first_token_ms: number;
  tokens_per_second: number;
  total_duration_ms: number;
}

export interface MessageFailedPayload {
  error_code: string;
  message_user_safe: string;
  correlation_id: string;
}

export interface ChatMessageDTO {
  id: UUID;
  conversation_id: UUID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sources?: MessageSourceDTO[];
  status: 'idle' | 'streaming' | 'completed' | 'failed';
  metrics?: {
    ttft_ms?: number;
    tokens_per_sec?: number;
    total_tokens?: number;
  };
}

export interface IngestionJobDTO {
  job_id: UUID;
  tenant_id: UUID;
  document_id: UUID;
  document_name: string;
  version: number;
  status: JobStatus;
  progress_pct: number;
  step_description: string;
  sha256: string;
  created_at: string;
}

// ==========================================
// Types Phase 3 - V1.2 (Télémétrie & Export)
// ==========================================

export interface ServiceHealthDTO {
  service: 'pgvector' | 'ollama' | 'redis_arq' | 'fastapi';
  display_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms: number;
  details: string;
  uptime_pct: number;
}

export interface ModelTelemetryDTO {
  model_name: string;
  tag: string;
  format: string; // ex: GGUF
  quantization: string; // ex: Q4_K_M
  parameters: string; // ex: 3.2B
  context_window_total: number; // ex: 8192 tokens
  context_window_used: number; // ex: 3140 tokens
  vram_allocated_gb: number; // ex: 2.2 GB
  vram_total_gb: number; // ex: 8.0 GB
  gpu_utilization_pct: number;
  degraded_mode_active: boolean;
}

export interface ClusterTelemetryDTO {
  timestamp: string;
  avg_ttft_ms: number;
  tokens_per_sec: number;
  total_queries_today: number;
  p95_latency_ms: number;
  cache_hit_rate_pct: number;
  services: ServiceHealthDTO[];
  model: ModelTelemetryDTO;
  recent_latency_history: Array<{
    query_id: string;
    timestamp: string;
    ttft_ms: number;
    total_ms: number;
    tokens_generated: number;
  }>;
}

export interface DomainExportDTO {
  export_version: string;
  exported_at: string;
  format: 'RAGTIME_SOVEREIGN_V1';
  checksum: string;
  tenant: TenantDTO;
  active_preset: RagPresetDTO;
  presets_history: RagPresetDTO[];
  documents_inventory: Array<{
    id: UUID;
    name: string;
    file_type: DocumentType;
    version: number;
    sha256: string;
    chunks_count: number;
    created_at: string;
  }>;
}

// ==========================================
// Types Phase 6 - Conversations & Async Pipeline
// ==========================================

export interface SavedConversationSession {
  id: UUID;
  tenant_id: UUID;
  domain_name: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  messages: ChatMessageDTO[];
}

export type AsyncIngestionStep = 'queued' | 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'failed';

export interface AsyncIngestionJobProgress {
  job_id: UUID;
  document_name: string;
  tenant_id: UUID;
  step: AsyncIngestionStep;
  progress_pct: number;
  current_step_label: string;
  chunks_processed: number;
  total_chunks: number;
  error_message?: string;
  duration_ms?: number;
}

export interface PrometheusMetricEntry {
  name: string;
  help: string;
  type: 'gauge' | 'counter' | 'histogram';
  value: number;
  labels?: Record<string, string>;
}

// ==========================================
// Types Phase 7 - Qualité RAG & Souveraineté
// ==========================================

export interface RerankEvaluationDTO {
  model_name: string; // ex: 'bge-reranker-base'
  enabled: boolean;
  candidates_evaluated: number;
  top_k_selected: number;
  average_gain_pct: number;
  latency_ms: number;
}

export interface ChunkDeduplicationReportDTO {
  tenant_id: UUID;
  total_chunks_scanned: number;
  unique_chunks_indexed: number;
  duplicate_chunks_merged: number;
  deduplication_ratio_pct: number;
  vram_saved_estimate_mb: number;
  exact_hash_matches: number;
  similarity_threshold_used: number;
  last_analyzed_at: string;
}

export interface ComparativeDomainSource {
  domain_id: UUID;
  domain_name: string;
  source: MessageSourceDTO;
}

export interface ComparativeSynthesisResultDTO {
  id: UUID;
  query: string;
  domain_a: {
    id: UUID;
    name: string;
    answer: string;
    sources: MessageSourceDTO[];
    latency_ms: number;
  };
  domain_b: {
    id: UUID;
    name: string;
    answer: string;
    sources: MessageSourceDTO[];
    latency_ms: number;
  };
  synthesis_delta: string;
  convergences: string[];
  divergences: string[];
  generated_at: string;
}

export interface AirGapStatusDTO {
  is_airgap_mode: boolean;
  network_confinement: 'fully_isolated_onprem' | 'local_vlan' | 'online_hybrid';
  offline_cache_entries: number;
  offline_storage_bytes: number;
  last_sync_timestamp?: string;
  crypto_integrity_verified: boolean;
}

export interface AirGapArchiveBundleDTO {
  bundle_id: UUID;
  bundle_name: string;
  tenant_id: UUID;
  tenant_slug: string;
  version: string;
  encrypted: boolean;
  encryption_algorithm: 'AES-GCM-256' | 'none';
  sha256_bundle_checksum: string;
  documents_count: number;
  chunks_count: number;
  conversations_count: number;
  exported_at: string;
}

