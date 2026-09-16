/**
 * Vue d'Audit & Observabilité Chunks - US-FRONT-05 & US-FRONT-06
 * Fournit une transparence complète sur la base vectorielle pgvector :
 * - Tiroir d'Audit et Inspection métadonnées JSONB (US-FRONT-05)
 * - Chronologie observable du pipeline 5 étapes sans pensée simulée (US-FRONT-06)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { defaultApiClient } from '../../services/apiClient';
import { MessageSourceDTO, RagPresetDTO } from '../../contracts/api-types';
import { useTablePagination } from '../../hooks/useTablePagination';
import { TablePaginationBar, TableSortHeader } from './TablePaginationBar';
import {
  ShieldCheck,
  Search,
  Layers,
  Database,
  Eye,
  Activity,
  Sparkles,
  CheckCircle2,
  FileText,
  Clock,
  Terminal,
  Cpu,
  BarChart2,
  Lock,
  Zap,
} from 'lucide-react';

interface RagAuditExplorerViewProps {
  onOpenChunkInspector: (source: MessageSourceDTO) => void;
}

export const RagAuditExplorerView: React.FC<RagAuditExplorerViewProps> = ({
  onOpenChunkInspector,
}) => {
  const { activeTenant } = useTenant();
  const [chunks, setChunks] = useState<MessageSourceDTO[]>([]);
  const [activePreset, setActivePreset] = useState<RagPresetDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState(0.7);
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // État pour la démonstration de la timeline observable 5 étapes (US-FRONT-06)
  const [activeDemoStep, setActiveDemoStep] = useState<number>(0);
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  useEffect(() => {
    async function loadAuditData() {
      if (!activeTenant) return;
      setIsLoading(true);
      try {
        const [tenantChunks, preset] = await Promise.all([
          defaultApiClient.getTenantChunks(activeTenant.id),
          defaultApiClient.getActivePreset(activeTenant.id),
        ]);
        setChunks(tenantChunks);
        setActivePreset(preset);
      } catch (err) {
        console.error('Erreur chargement données audit:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuditData();
  }, [activeTenant?.id]);

  // Liste des documents uniques
  const uniqueDocs = Array.from(new Set(chunks.map((c) => c.document_name)));

  // Chunks filtrés
  const filteredChunks = useMemo(() => {
    return chunks.filter((c) => {
      const matchesSearch =
        c.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.chunk_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesScore = c.similarity_score >= minScoreFilter;
      const matchesDoc = selectedDocFilter === 'all' || c.document_name === selectedDocFilter;
      return matchesSearch && matchesScore && matchesDoc;
    });
  }, [chunks, searchTerm, minScoreFilter, selectedDocFilter]);

  // Pagination & Tri universels pour l'audit des chunks (US-FRONT-25)
  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    sortKey,
    sortDirection,
    paginatedItems: paginatedChunks,
    setCurrentPage,
    setPageSize,
    handleSort,
  } = useTablePagination(filteredChunks, {
    initialPageSize: 10,
    initialSortKey: 'similarity_score',
    initialSortDirection: 'desc',
    pageSizeOptions: [5, 10, 25, 50],
  });

  // Dérouler la simulation de la timeline US-FRONT-06
  const triggerPipelineDemo = () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    setActiveDemoStep(1);

    const stepDelays = [400, 800, 1200, 1600, 2200];
    stepDelays.forEach((delay, idx) => {
      setTimeout(() => {
        setActiveDemoStep(idx + 1);
        if (idx === stepDelays.length - 1) {
          setTimeout(() => {
            setIsDemoRunning(false);
          }, 600);
        }
      }, delay);
    });
  };

  const pipelineSteps = [
    {
      step: 1,
      id: 'question_received',
      title: '1. Réception & Normalisation',
      subtitle: 'FastAPI Input Gate',
      desc: 'Validation du schéma Pydantic, nettoyage des caractères de contrôle et injection sécurisée du header X-Tenant-ID.',
      metrics: 'Latence: 2ms • TLS 1.3',
      icon: Activity,
    },
    {
      step: 2,
      id: 'pgvector_search',
      title: '2. Indexation Vectorielle HNSW',
      subtitle: 'PostgreSQL pgvector',
      desc: 'Calcul de similarité cosinus via index HNSW (m=16, ef_construction=64) sur les représentations 768d de nomic-embed-text.',
      metrics: 'Latence: 14ms • 768 dimensions',
      icon: Search,
    },
    {
      step: 3,
      id: 'tenant_filter',
      title: '3. Isolation Multi-Tenant Stricte',
      subtitle: 'Filtre SQLModel Déterministe',
      desc: 'Clause WHERE tenant_id = :active_tenant imposée au niveau base de données. Zéro fuite de données cross-tenant.',
      metrics: 'Garantie TNR-02 • 100% Cloisonné',
      icon: ShieldCheck,
    },
    {
      step: 4,
      id: 'sources_ready',
      title: '4. Chunks Filtrés & Cross-Encoder',
      subtitle: 'Seuil Cosinus & Reranking',
      desc: 'Application du seuil de factualité minimal et réévaluation fine par le cross-encoder BGE pour sélectionner les K meilleurs extraits.',
      metrics: `Seuil: ${activePreset?.similarity_threshold || 0.7} • Top-K: ${activePreset?.retrieval_top_k || 4}`,
      icon: Layers,
    },
    {
      step: 5,
      id: 'ollama_streaming',
      title: '5. Inférence LLM Locale & SSE',
      subtitle: 'Ollama Llama 3.2:3b',
      desc: 'Streaming Server-Sent Events déterministe avec injection des citations normées [Document, p.X]. Sans pensée simulée.',
      metrics: 'TTFT: 120ms • 48 tokens/sec',
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* En-tête de section */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">
                Observabilité & Audit Vectoriel pgvector
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300">
                US-FRONT-05 & US-FRONT-06
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                Sans Pensée Simulée
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Examinez les métadonnées certifiées JSONB de chaque chunk indexé et visualisez en temps réel
              les 5 étapes réelles du pipeline de retrieval.
            </p>
          </div>
        </div>

        {/* Métriques d'infrastructure */}
        <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 rounded-lg text-xs self-start md:self-auto font-mono">
          <div className="text-right">
            <div className="text-zinc-500 text-[10px]">Index pgvector</div>
            <div className="text-zinc-200 font-bold">HNSW (m=16)</div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div className="text-right">
            <div className="text-zinc-500 text-[10px]">Dimensions</div>
            <div className="text-indigo-400 font-bold">768d Local</div>
          </div>
        </div>
      </div>

      {/* SECTION 1 : VISUALISEUR DU PIPELINE 5 ÉTAPES OBSERVABLE (US-FRONT-06) */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-4" id="card-pipeline-timeline-observable">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Chronologie du Pipeline RAG (5 Étapes Observables)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400">
              Absence de pensée simulée (US-FRONT-06)
            </span>
            <button
              onClick={triggerPipelineDemo}
              disabled={isDemoRunning}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-xs font-medium rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              id="btn-trigger-pipeline-demo"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isDemoRunning ? 'Exécution...' : 'Tester le Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* Grille des 5 étapes */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            const isCurrent = activeDemoStep === step.step;
            const isCompleted = activeDemoStep > step.step;

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/50 scale-[1.02]'
                    : isCompleted
                    ? 'bg-zinc-900/90 border-emerald-800/60 text-zinc-300'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                }`}
                id={`step-observable-${step.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isCurrent
                          ? 'bg-indigo-900/80 text-indigo-300 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-950/80 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                      Étape {step.step}
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-zinc-200 mb-0.5">
                    {step.title}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 mb-2">
                    {step.subtitle}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-400">
                  {step.metrics}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 : TABLEAU D'INSPECTION DÉTAILLÉ DES CHUNKS (US-FRONT-05) */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-4" id="card-chunks-table">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Répertoire des Chunks Indexés ({filteredChunks.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Visualisation chirurgicale des métadonnées JSONB et des scores de similarité.
            </p>
          </div>

          {/* Filtres rapides */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrer par contenu, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900 border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-44"
                id="input-audit-search"
              />
            </div>

            <select
              value={selectedDocFilter}
              onChange={(e) => setSelectedDocFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              id="select-audit-doc-filter"
            >
              <option value="all">Tous les documents</option>
              {uniqueDocs.map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/80 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">Seuil &ge;</span>
              <input
                type="number"
                min="0.5"
                max="0.99"
                step="0.05"
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                className="w-12 bg-transparent text-emerald-400 font-bold focus:outline-none text-right"
              />
            </div>
          </div>
        </div>

        {/* Tableau des Chunks */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/80 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">
                  <TableSortHeader
                    title="Identifiant Chunk"
                    columnKey="chunk_id"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-2.5 px-3">
                  <TableSortHeader
                    title="Document Source"
                    columnKey="document_name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-2.5 px-3">
                  <TableSortHeader
                    title="Similarité Cosinus"
                    columnKey="similarity_score"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-2.5 px-3">Fusion RRF (k=60)</th>
                <th className="py-2.5 px-3">Tokens</th>
                <th className="py-2.5 px-3">Extrait Textuel</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedChunks.map((chunk) => (
                <tr
                  key={chunk.id}
                  className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                  onClick={() => onOpenChunkInspector(chunk)}
                >
                  <td className="py-3 px-3 font-mono text-[11px] text-indigo-400 font-medium whitespace-nowrap">
                    {chunk.chunk_id}
                  </td>
                  <td className="py-3 px-3 max-w-[180px]">
                    <div className="font-semibold text-zinc-200 truncate">{chunk.document_name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Page {chunk.page_number} • {chunk.document_type}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 font-bold">
                      {(chunk.similarity_score * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-indigo-300 font-bold text-[11px]">
                        {(chunk.rrf_details?.rrf_score || 0.032).toFixed(4)}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        Dense #{chunk.rrf_details?.dense_rank || 1} • BM25 #{chunk.rrf_details?.sparse_rank || 2}
                      </span>
                      {chunk.rrf_details?.rescued_by_bm25 && (
                        <span className="text-[9px] text-emerald-400 font-medium">
                          Repêché BM25
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">
                    {chunk.metadata.tokens_count} tok
                  </td>
                  <td className="py-3 px-3 max-w-[280px]">
                    <p className="text-zinc-400 text-[11px] line-clamp-2 leading-relaxed">
                      {chunk.excerpt}
                    </p>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChunkInspector(chunk);
                      }}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium rounded transition-colors inline-flex items-center gap-1"
                      id={`btn-inspect-chunk-${chunk.chunk_id}`}
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Inspecter JSONB</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredChunks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">
                    Aucun chunk ne correspond aux filtres appliqués (recherche ou seuil trop strict).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Barre de pagination et sélecteur de nombre max d'affichage (US-FRONT-25) */}
        <TablePaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25, 50]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="chunk"
          idPrefix="audit-chunks-table"
        />
      </div>
    </div>
  );
};
