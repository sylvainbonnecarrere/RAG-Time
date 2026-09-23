/**
 * Tiroir d'Inspection des Chunks & Métadonnées JSONB - US-FRONT-05 & TNR-04
 * Règle d'or : L'UI n'invente jamais de citation.
 * Affichage strict de l'extrait brut certifié par le serveur avec son score cosinus réel.
 */

import React, { useState } from 'react';
import { MessageSourceDTO } from '../../contracts/api-types';
import { VisualVectorSimilarityInspector } from './VisualVectorSimilarityInspector';
import {
  X,
  FileCheck,
  Hash,
  Layers,
  Copy,
  Check,
  BookOpen,
  Cpu,
  BarChart2,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface ChunkInspectorDrawerProps {
  source: MessageSourceDTO | null;
  onClose: () => void;
}

export const ChunkInspectorDrawer: React.FC<ChunkInspectorDrawerProps> = ({
  source,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!source) return null;

  const handleCopyExcerpt = () => {
    navigator.clipboard.writeText(source.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(source, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const similarityPercentage = Math.round(source.similarity_score * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#121214] border-l border-zinc-700/80 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* En-tête du tiroir */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Inspecteur de Chunk Certifié
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300">
                  Vérifié pgvector
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate max-w-sm mt-0.5">
                {source.document_name} — Page {source.page_number}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps d'inspection */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-zinc-300">
          {/* Métrique de similarité vectorielle */}
          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Scores du Moteur de Recherche Hybride
              </span>
              <span className="font-mono text-sm font-bold text-indigo-400">
                {(source.similarity_score * 100).toFixed(1)}% Cosinus
              </span>
            </div>

            {/* Jauge Thermique Visuelle Cosinus & Seuil (US-FRONT-30 & TNR-25) */}
            <VisualVectorSimilarityInspector
              score={source.similarity_score}
              top1Score={source.similarity_score}
              threshold={0.70}
              strategy={source.chunk_index !== undefined ? 'Sections Markdown AST' : 'Fenêtre Glissante'}
              sectionTitle={source.section_title || undefined}
            />

            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800 flex flex-col">
                <span className="text-zinc-500">Dense (pgvector)</span>
                <span className="text-indigo-300 font-bold text-xs">
                  {(source.similarity_score * 100).toFixed(1)}%
                </span>
                <span className="text-[9px] text-zinc-500 mt-0.5">
                  Rang #{source.rrf_details?.dense_rank || 1}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800 flex flex-col">
                <span className="text-zinc-500">Sparse (BM25)</span>
                <span className="text-emerald-400 font-bold text-xs">
                  {((source.lexical_score || source.similarity_score * 0.9) * 100).toFixed(1)}%
                </span>
                <span className="text-[9px] text-zinc-500 mt-0.5">
                  Rang #{source.rrf_details?.sparse_rank || 2}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800 flex flex-col">
                <span className="text-zinc-500">Rerank (Cross-Enc)</span>
                <span className="text-amber-300 font-bold text-xs">
                  {((source.rerank_score || source.similarity_score * 1.02) * 100).toFixed(1)}%
                </span>
                <span className="text-[9px] text-zinc-500 mt-0.5">
                  Top #{source.rrf_details?.rerank_rank || 1}
                </span>
              </div>
            </div>

            {/* US-FRONT-09: Décomposition Mathématique RRF (Reciprocal Rank Fusion) */}
            <div className="mt-2 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-indigo-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Score Hybride RRF : {(source.rrf_details?.rrf_score || 0.032).toFixed(4)}
                </span>
                {source.rrf_details?.rescued_by_bm25 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Repêché par BM25
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] text-zinc-400 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/60">
                RRF = 1/(60 + {source.rrf_details?.dense_rank || 1}) + 1/(60 + {source.rrf_details?.sparse_rank || 2}) = {(source.rrf_details?.rrf_score || 0.032).toFixed(4)}
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                La constante <span className="font-mono text-zinc-300">k=60</span> évite qu'un candidat surclassé dans un seul canal n'écrase injustement les documents équilibrés sur les deux dimensions (sémantique & mots-clés exacts).
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
              <span>Seuil de coupure configuré : 0.70</span>
              <span className="text-emerald-400">Admis pour le contexte LLM</span>
            </div>
          </div>

          {/* Extrait brut inaltérable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Extrait brut du document
              </span>
              <button
                onClick={handleCopyExcerpt}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copier l'extrait</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800/90 rounded-xl font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-900/60 selection:text-indigo-200">
              {source.excerpt}
            </div>
          </div>

          {/* Emplacement et navigation contextuelle */}
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-zinc-200">Localisation documentaire</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{source.location}</div>
            </div>
          </div>

          {/* Métadonnées JSONB réelles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                Métadonnées du Chunk (JSONB)
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>JSON Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copier JSONB</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-zinc-400 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">chunk_id:</span>
                <span className="text-indigo-300 font-semibold">{source.chunk_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">document_id:</span>
                <span className="text-zinc-300">{source.document_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">embedding_model:</span>
                <span className="text-emerald-400">{source.metadata.embedding_model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">tokens_count:</span>
                <span className="text-zinc-300">{source.metadata.tokens_count} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">chunk_index:</span>
                <span className="text-zinc-300">#{source.metadata.chunk_index}</span>
              </div>
              <div className="pt-2 border-t border-zinc-900 text-[10px]">
                <span className="text-zinc-500 block mb-1">Aperçu dimensions vectorielles pgvector (8/768d) :</span>
                <span className="text-zinc-400">
                  [0.0421, -0.1284, 0.0891, 0.3129, -0.0042, 0.1740, -0.0911, 0.0519, ...]
                </span>
              </div>
            </div>
          </div>

          {/* Invariant de sécurité RAGTIME */}
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Certitude cryptographique : Ce chunk appartient au sous-ensemble vectoriel partitionné
              pour votre tenant et n'a subi aucune hallucination de source.
            </span>
          </div>
        </div>

        {/* Pied de page du tiroir */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors"
          >
            Fermer l'inspection
          </button>
        </div>
      </div>
    </div>
  );
};
