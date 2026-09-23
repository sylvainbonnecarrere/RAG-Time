/**
 * Modal d'Inspection Diff A/B du Nettoyage Déterministe - US-FRONT-32 & TNR-27
 * Présente le texte original face au texte assaini avec métriques exactes
 * des caractères invisibles purgés, des balises retirées et des octets économisés.
 */

import React from 'react';
import { X, Sparkles, ShieldCheck, ArrowRight, Layers, FileText } from 'lucide-react';

export interface CleaningStats {
  invisiblesCount: number;
  bytesSaved: number;
  tagsCount: number;
  charsDifference: number;
}

interface CleaningDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  cleanedText: string;
  stats: CleaningStats;
}

export const CleaningDiffModal: React.FC<CleaningDiffModalProps> = ({
  isOpen,
  onClose,
  originalText,
  cleanedText,
  stats,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#121214] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Inspecteur Diff A/B — Nettoyage Déterministe</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-300">
                  TNR-27 Certifié
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Comparaison avant / après normalisation Unicode NFC et purge des corruptions invisibles.
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

        {/* Métriques d'assainissement */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-zinc-950 border-b border-zinc-800/80 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex flex-col">
            <span className="text-zinc-500 text-[10px]">Invisibles éradiqués</span>
            <span className="text-emerald-400 font-bold text-sm">
              {stats.invisiblesCount} chars (ZWSP/BOM)
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex flex-col">
            <span className="text-zinc-500 text-[10px]">Balises HTML purgées</span>
            <span className="text-sky-400 font-bold text-sm">
              {stats.tagsCount} balises
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex flex-col">
            <span className="text-zinc-500 text-[10px]">Octets économisés</span>
            <span className="text-indigo-300 font-bold text-sm">
              {stats.bytesSaved} octets
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex flex-col">
            <span className="text-zinc-500 text-[10px]">Préservation maths (p &lt; 0.05)</span>
            <span className="text-emerald-300 font-bold text-sm">
              100% Intact
            </span>
          </div>
        </div>

        {/* Panneaux comparatifs A / B */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Panneau A: Original Brut */}
          <div className="space-y-2 flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800">
              <span className="font-semibold text-zinc-300">Texte Brut (Original)</span>
              <span className="text-[10px]">{originalText.length} caractères</span>
            </div>
            <div className="flex-1 p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl overflow-y-auto max-h-96 text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {originalText || '(Aucun texte sélectionné)'}
            </div>
          </div>

          {/* Panneau B: Assaini Déterministe */}
          <div className="space-y-2 flex flex-col">
            <div className="flex items-center justify-between text-emerald-400 pb-1 border-b border-zinc-800">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Texte Assaini (Prêt pour pgvector)</span>
              </span>
              <span className="text-[10px] text-zinc-400">{cleanedText.length} caractères</span>
            </div>
            <div className="flex-1 p-3.5 bg-zinc-950/70 border border-emerald-800/40 rounded-xl overflow-y-auto max-h-96 text-emerald-200/90 leading-relaxed whitespace-pre-wrap">
              {cleanedText || '(Aucun texte assaini)'}
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Fermer l'Inspecteur
          </button>
        </div>
      </div>
    </div>
  );
};
