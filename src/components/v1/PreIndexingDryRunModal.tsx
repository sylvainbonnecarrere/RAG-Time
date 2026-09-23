/**
 * Modal de Simulation Pré-Indexation (Dry-Run) & Estimateur de Tokens/VRAM - US-FRONT-34 & TNR-29
 * Simulation 100% isolée en mémoire (zéro écriture BDD pgvector)
 * permettant d'auditer le découpage, les quotas de tokens et l'empreinte mémoire VRAM HNSW.
 */

import React, { useState } from 'react';
import {
  X,
  Play,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  HardDrive,
  Info,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export interface DryRunChunkPreview {
  chunkIndex: number;
  tokenCount: number;
  charCount: number;
  contextPrefix?: string;
  excerpt: string;
}

export interface DryRunResult {
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
  minTokens: number;
  maxTokens: number;
  rawVectorBytes: number;
  hnswOverheadBytes: number;
  totalVramBytes: number;
  previewChunks: DryRunChunkPreview[];
}

// Fonction pure d'estimation arithmétique VRAM pgvector HNSW (TNR-29)
export const computeVramBudget = (
  chunkCount: number,
  dimension: number = 768
): { rawBytes: number; hnswBytes: number; totalBytes: number } => {
  // 4 octets par float32
  const rawBytes = chunkCount * dimension * 4;
  // Surcharge HNSW (M=16, efConstruction=64 génère ~1.5x le volume des vecteurs bruts pour les listes d'adjacence)
  const hnswBytes = Math.round(rawBytes * 1.5);
  const totalBytes = rawBytes + hnswBytes;
  return { rawBytes, hnswBytes, totalBytes };
};

// Simulateur de chunking sans effet de bord (TNR-29)
export const simulateDryRun = (
  text: string,
  chunkSize: number = 512,
  chunkOverlap: number = 64,
  strategy: 'sliding_window' | 'sentence_boundary' | 'markdown_sections' = 'sliding_window'
): DryRunResult => {
  if (!text || !text.trim()) {
    return {
      totalChunks: 0,
      totalTokens: 0,
      avgTokensPerChunk: 0,
      minTokens: 0,
      maxTokens: 0,
      rawVectorBytes: 0,
      hnswOverheadBytes: 0,
      totalVramBytes: 0,
      previewChunks: [],
    };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const wordTokens = words.length * 1.3; // Ratio d'approximation standard

  // Découpage en blocs
  const chunks: DryRunChunkPreview[] = [];
  const wordsPerChunk = Math.max(20, Math.round(chunkSize / 1.3));
  const wordsOverlap = Math.max(5, Math.round(chunkOverlap / 1.3));
  const step = Math.max(10, wordsPerChunk - wordsOverlap);

  let currentIndex = 0;
  let chunkIdx = 0;

  while (currentIndex < words.length && chunkIdx < 50) {
    const chunkWords = words.slice(currentIndex, currentIndex + wordsPerChunk);
    const excerpt = chunkWords.join(' ');
    const tokens = Math.round(chunkWords.length * 1.3);

    let prefix: string | undefined;
    if (strategy === 'markdown_sections') {
      prefix = `[Section > Synthèse #${chunkIdx + 1}]`;
    }

    chunks.push({
      chunkIndex: chunkIdx + 1,
      tokenCount: tokens,
      charCount: excerpt.length,
      contextPrefix: prefix,
      excerpt: excerpt.length > 280 ? excerpt.slice(0, 280) + '...' : excerpt,
    });

    chunkIdx++;
    currentIndex += step;
  }

  const totalChunks = chunks.length;
  const totalTokens = chunks.reduce((acc, c) => acc + c.tokenCount, 0);
  const tokenCounts = chunks.map((c) => c.tokenCount);
  const minTokens = tokenCounts.length ? Math.min(...tokenCounts) : 0;
  const maxTokens = tokenCounts.length ? Math.max(...tokenCounts) : 0;
  const avgTokens = totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0;

  const vram = computeVramBudget(totalChunks, 768);

  return {
    totalChunks,
    totalTokens,
    avgTokensPerChunk: avgTokens,
    minTokens,
    maxTokens,
    rawVectorBytes: vram.rawBytes,
    hnswOverheadBytes: vram.hnswBytes,
    totalVramBytes: vram.totalBytes,
    previewChunks: chunks.slice(0, 3), // Les 3 premiers extraits
  };
};

interface PreIndexingDryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  chunkSize: number;
  chunkOverlap: number;
  strategy?: 'sliding_window' | 'sentence_boundary' | 'markdown_sections';
  onConfirmIndex?: () => void;
}

export const PreIndexingDryRunModal: React.FC<PreIndexingDryRunModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentContent,
  chunkSize,
  chunkOverlap,
  strategy = 'sliding_window',
  onConfirmIndex,
}) => {
  if (!isOpen) return null;

  const result = simulateDryRun(
    documentContent,
    chunkSize,
    chunkOverlap,
    strategy as 'sliding_window' | 'sentence_boundary' | 'markdown_sections'
  );

  const formatKo = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200" id="pre-indexing-dry-run-modal">
      <div className="w-full max-w-4xl bg-[#121214] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Simulation Pré-Indexation (Dry-Run Mémoire)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Isolation TNR-29 (Zéro Écriture BDD)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Document : <span className="text-zinc-200 font-medium">{documentTitle}</span> — Découpage {chunkSize} / {chunkOverlap} tokens
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

        {/* Corps d'audit */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-zinc-300">
          {/* Métriques Clés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase">Chunks Produits</span>
              <span className="text-indigo-300 text-lg font-bold">{result.totalChunks}</span>
              <span className="text-[9px] text-zinc-500 mt-1">pgvector partitions</span>
            </div>

            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase">Tokens Détectés</span>
              <span className="text-cyan-300 text-lg font-bold">~{result.totalTokens}</span>
              <span className="text-[9px] text-zinc-500 mt-1">Moy. {result.avgTokensPerChunk} / chunk</span>
            </div>

            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase">Vecteurs Bruts (768d)</span>
              <span className="text-emerald-300 text-lg font-bold">{formatKo(result.rawVectorBytes)}</span>
              <span className="text-[9px] text-zinc-500 mt-1">{result.totalChunks} × 768 × 4B</span>
            </div>

            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase">Budget VRAM HNSW</span>
              <span className="text-amber-300 text-lg font-bold">{formatKo(result.totalVramBytes)}</span>
              <span className="text-[9px] text-zinc-500 mt-1">Vecteurs + Index Graph</span>
            </div>
          </div>

          {/* Formule didactique VRAM */}
          <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-[11px] text-zinc-300 space-y-1">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Formule de Dimensionnement pgvector HNSW :</span>
            </div>
            <p className="font-mono text-[10px] text-zinc-400">
              VRAM = Chunks ({result.totalChunks}) × Dim (768) × 4 octets + Surcharge Graphe HNSW (×1.5) = {formatKo(result.totalVramBytes)}
            </p>
          </div>

          {/* Carrousel / Liste des 3 premiers extraits prévisualisés */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Échantillon des 3 premiers chunks générés
              </span>
              <span className="text-[10px] font-mono">Affichage certifié sans persistance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.previewChunks.map((chunk) => (
                <div
                  key={chunk.chunkIndex}
                  className="p-3.5 bg-zinc-950/90 border border-zinc-800/90 rounded-xl space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400 text-[11px]">
                        Chunk #{chunk.chunkIndex}
                      </span>
                      <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">
                        {chunk.tokenCount} tokens
                      </span>
                    </div>

                    {chunk.contextPrefix && (
                      <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40 truncate">
                        {chunk.contextPrefix}
                      </div>
                    )}

                    <p className="text-[11px] text-zinc-300 leading-relaxed italic bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                      "{chunk.excerpt}"
                    </p>
                  </div>

                  <div className="pt-2 text-[10px] text-zinc-500 font-mono">
                    {chunk.charCount} caractères
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
          >
            Fermer le Diagnostic
          </button>

          {onConfirmIndex && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onConfirmIndex();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>Valider et Lancer l'Indexation Réelle</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
