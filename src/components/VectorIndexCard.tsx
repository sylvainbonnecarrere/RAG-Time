import React, { useState } from 'react';
import { Database, ShieldCheck, Terminal, Cpu, CheckCircle2, Lock, FileCode, Check } from 'lucide-react';

export const VectorIndexCard: React.FC = () => {
  const [tab, setTab] = useState<'status' | 'code' | 'query'>('status');
  const [copied, setCopied] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sqlCode = `-- Schéma PostgreSQL 16 + pgvector avec isolation tenant
CREATE TABLE chunk_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,
    document_version_id UUID NOT NULL,
    chunk_id UUID NOT NULL UNIQUE,
    embedding vector(1024) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index HNSW optimisé pour la distance cosinus
CREATE INDEX idx_vector_tenant_hnsw 
ON chunk_embeddings 
USING hnsw (embedding vector_cosine_ops)
WHERE tenant_id IS NOT NULL;`;

  return (
    <div className="flex flex-col h-full justify-between" id="insight-vector-index">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">
              Insight 2 • Vector Index & Structuration
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            pgvector 16.2
          </span>
        </div>

        <h3 className="text-xl font-bold text-zinc-50 tracking-tight mb-2">
          Indexation Vectorielle Durcie & Isolation Tenant
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          Chaque embedding est intimement lié à un couple immuable (modèle, dimension, métrique). Les requêtes de recherche pgvector appliquent une isolation mathématique par tenant_id dès la couche dépôt.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80 mb-4 text-xs font-mono">
          <button
            onClick={() => setTab('status')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'status' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Statut & Métriques
          </button>
          <button
            onClick={() => setTab('code')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'code' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Schéma pgvector
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {tab === 'status' ? (
        <div className="space-y-3 font-mono text-xs">
          
          {/* Status Metrics Box */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
              <span className="text-zinc-400">Chunking Progress</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Validé
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
              <span className="text-zinc-400">Tokens Embedded</span>
              <span className="text-zinc-100 font-semibold">1,489,200 tokens</span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
              <span className="text-zinc-400">Embedding Model</span>
              <span className="text-indigo-400">bge-m3 (dim: 1024)</span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
              <span className="text-zinc-400">Distance Metric</span>
              <span className="text-zinc-200">Cosine (vector_cosine_ops)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Cloisonnement</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Tenant-Locked (Zero Leak)
              </span>
            </div>
          </div>

          {/* Quick Info Terminal */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Table: <span className="text-zinc-300">chunk_embeddings</span></span>
            <span className="text-indigo-400">HNSW Index Ready</span>
          </div>

        </div>
      ) : (
        <div className="relative font-mono text-[11px]">
          <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-zinc-300 overflow-x-auto leading-relaxed max-h-56">
            <code>{sqlCode}</code>
          </pre>
          <button
            onClick={() => copyCode(sqlCode)}
            className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[10px] hover:bg-zinc-700 transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : null}
            {copied ? 'Copié' : 'Copier SQL'}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1 font-mono">
          <Terminal className="w-3 h-3 text-zinc-400" />
          <span>Contrat VectorStorePort strict</span>
        </span>
        <span className="text-zinc-400">Pas de comparatif cross-index</span>
      </div>

    </div>
  );
};
