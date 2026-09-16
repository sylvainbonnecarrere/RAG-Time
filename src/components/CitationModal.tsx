import React from 'react';
import { X, FileText, CheckCircle2, Shield, Hash, Database, ExternalLink, Copy, Check } from 'lucide-react';
import { CitationSource } from '../types';

interface CitationModalProps {
  source: CitationSource | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ source, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!source) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(source.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#121214] border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="citation-inspector-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 font-mono">
                  {source.documentName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {source.documentType}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {source.location} {source.pageNumber ? `(Page ${source.pageNumber})` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            id="btn-close-citation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Audit & Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                Score Vectoriel
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-emerald-400 font-mono">
                  {(source.similarityScore * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">cosine</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                Score Lexical
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-blue-400 font-mono">
                  {source.lexicalScore ? `${(source.lexicalScore * 100).toFixed(1)}%` : 'N/A'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Postgres</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                Score Fusion (RRF)
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-indigo-300 font-mono">
                  {source.rerankScore ? `${(source.rerankScore * 100).toFixed(1)}%` : 'Top 1'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">RRF</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                Tokens & Taille
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-zinc-200 font-mono">
                  {source.tokensCount}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">tokens</span>
              </div>
            </div>
          </div>

          {/* Proof of Grounding / Chunk Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Extrait Source Inaltéré (Grounding Verifiable)
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 px-2 py-1 rounded border border-zinc-800"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copié !' : 'Copier l\'extrait'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-indigo-900/30 font-mono text-zinc-300 leading-relaxed text-[13px] relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 text-[9px] bg-indigo-950/80 text-indigo-300 border-b border-l border-indigo-900/40 rounded-bl font-mono">
                CHUNK_ID: {source.chunkId}
              </div>
              <p className="pt-2">"{source.excerpt}"</p>
            </div>
          </div>

          {/* Technical Metadata & Isolation Invariants */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Garantie d'Isolation Multi-Tenant & Métadonnées JSONB
            </span>
            <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 font-mono text-[11px] text-zinc-400 overflow-x-auto">
              <pre>{JSON.stringify(source.metadata, null, 2)}</pre>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800/60 bg-zinc-900/20 flex items-center justify-between text-xs text-zinc-500">
          <span>Contrat d'audit V1.1 • Vérifié par l'adaptateur pgvector</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors font-medium"
          >
            Fermer l'inspecteur
          </button>
        </div>

      </div>
    </div>
  );
};
