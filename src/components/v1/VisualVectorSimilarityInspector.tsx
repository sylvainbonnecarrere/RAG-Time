/**
 * Inspecteur Visuel de Similarité Vectorielle & Thermomètre Cosinus - US-FRONT-30 & TNR-25
 * Calcule fidèlement le score cosinus (0.50 à 1.00), le delta Top-1 (Δ = score - score_top1)
 * et matérialise le seuil d'admissibilité minimal sous pgvector.
 */

import React from 'react';
import { Target, ShieldAlert, CheckCircle2, AlertTriangle, Layers, Info } from 'lucide-react';

export interface VisualVectorSimilarityInspectorProps {
  score: number; // Similarité cosinus normalisée [0.0 - 1.0]
  top1Score?: number; // Score du meilleur chunk retenu (Top-1)
  threshold?: number; // Seuil d'admissibilité configuré dans le preset (ex: 0.70)
  strategy?: string; // Stratégie de chunking (ex: 'Sections Markdown', 'Fenêtre Glissante')
  sectionTitle?: string; // Titre de section parent si hiérarchique
  compact?: boolean;
}

export const getThermalColorInfo = (score: number) => {
  if (score >= 0.85) {
    return {
      label: 'Alignement sémantique excellent',
      colorName: 'emerald',
      textColor: 'text-emerald-300',
      badgeBg: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300',
      barColor: 'from-teal-500 to-emerald-400',
      icon: CheckCircle2,
    };
  }
  if (score >= 0.70) {
    return {
      label: 'Bon alignement sémantique',
      colorName: 'cyan',
      textColor: 'text-cyan-300',
      badgeBg: 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300',
      barColor: 'from-sky-500 to-cyan-400',
      icon: CheckCircle2,
    };
  }
  if (score >= 0.60) {
    return {
      label: 'Alignement modéré',
      colorName: 'amber',
      textColor: 'text-amber-300',
      badgeBg: 'bg-amber-950/70 border-amber-700/60 text-amber-300',
      barColor: 'from-amber-600 to-amber-400',
      icon: AlertTriangle,
    };
  }
  return {
    label: 'Proche du rejet / Bruit potentiel',
    colorName: 'rose',
    textColor: 'text-rose-300',
    badgeBg: 'bg-rose-950/70 border-rose-700/60 text-rose-300',
    barColor: 'from-rose-600 to-rose-400',
    icon: ShieldAlert,
  };
};

export const VisualVectorSimilarityInspector: React.FC<VisualVectorSimilarityInspectorProps> = ({
  score,
  top1Score,
  threshold = 0.70,
  strategy,
  sectionTitle,
  compact = false,
}) => {
  const safeScore = Math.max(0, Math.min(1, score));
  const safeTop1 = top1Score !== undefined ? Math.max(0, Math.min(1, top1Score)) : safeScore;
  const deltaTop1 = safeScore - safeTop1;
  const isTop1 = Math.abs(deltaTop1) < 0.0005;

  // Calcul du pourcentage sur l'échelle 0.50 -> 1.00 (largeur 0.50)
  const scorePercent = Math.max(0, Math.min(100, ((safeScore - 0.5) / 0.5) * 100));
  const thresholdPercent = Math.max(0, Math.min(100, ((threshold - 0.5) / 0.5) * 100));
  const top1Percent = Math.max(0, Math.min(100, ((safeTop1 - 0.5) / 0.5) * 100));

  const thermal = getThermalColorInfo(safeScore);
  const Icon = thermal.icon;
  const isAdmitted = safeScore >= threshold;

  return (
    <div
      className={`rounded-xl border transition-all ${
        compact
          ? 'p-3 bg-zinc-900/60 border-zinc-800 text-xs'
          : 'p-4 bg-zinc-900/90 border-zinc-800/90 shadow-md space-y-3.5 text-xs'
      }`}
      id="visual-vector-similarity-inspector"
    >
      {/* Ligne 1 : Score Cosinus, Label Pédagogique et Delta Top-1 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border flex items-center justify-center ${thermal.badgeBg}`}>
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 font-mono text-sm">
                Score Cosinus : {(safeScore * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-zinc-400">({safeScore.toFixed(3)})</span>
            </div>
            <div className={`text-[11px] font-medium flex items-center gap-1 ${thermal.textColor}`}>
              <Icon className="w-3 h-3 shrink-0" />
              <span>{thermal.label}</span>
            </div>
          </div>
        </div>

        {/* Delta Top-1 Gauge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold border flex items-center gap-1.5 ${
              isTop1
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700/60'
            }`}
            title="Écart par rapport au meilleur chunk extrait de pgvector (Top-1)"
          >
            <span className="text-zinc-400 text-[10px]">Δ Top-1 :</span>
            <span>{isTop1 ? 'Top-1 (Référence)' : `${deltaTop1 >= 0 ? '+' : ''}${deltaTop1.toFixed(3)}`}</span>
          </div>

          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isAdmitted
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {isAdmitted ? `Admis (≥ ${threshold.toFixed(2)})` : `Exclu (< ${threshold.toFixed(2)})`}
          </span>
        </div>
      </div>

      {/* Réglette Thermique Linéaire (0.50 à 1.00) avec repères */}
      <div className="space-y-1 pt-1">
        <div className="relative w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
          {/* Zone d'exclusion hachurée sous le seuil */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-rose-950/40 border-r border-rose-600/70"
            style={{ width: `${thresholdPercent}%` }}
            title={`Zone d'exclusion : scores < ${threshold.toFixed(2)}`}
          />

          {/* Dégradé thermique complet (0.50 -> 1.00) */}
          <div
            className="h-full bg-gradient-to-r from-rose-700 via-amber-600 via-cyan-500 to-emerald-400 opacity-90 rounded-full"
            style={{ width: `${scorePercent}%` }}
          />

          {/* Repère Top-1 si distinct */}
          {!isTop1 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-xs"
              style={{ left: `${top1Percent}%` }}
              title={`Position Top-1 (${safeTop1.toFixed(3)})`}
            />
          )}

          {/* Marqueur mobile du chunk courant */}
          <div
            className="absolute top-0 bottom-0 w-1.5 bg-white shadow-md rounded-full -ml-0.5"
            style={{ left: `${scorePercent}%` }}
          />
        </div>

        {/* Graduations mathématiques de 0.50 à 1.00 */}
        <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono pt-0.5">
          <span>0.50 (Bruit)</span>
          <span className="text-rose-400" style={{ marginLeft: `${Math.max(0, thresholdPercent - 15)}%` }}>
            | Seuil ({threshold.toFixed(2)})
          </span>
          <span className="text-emerald-400">1.00 (Identité)</span>
        </div>
      </div>

      {/* Badge de Stratégie & Contexte de Titre Hiérarchique (Markdown Section Chunker) */}
      {(strategy || sectionTitle) && (
        <div className="p-2 bg-zinc-950/70 border border-zinc-800/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px]">
          {strategy && (
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-zinc-400">Stratégie :</span>
              <span className="font-semibold text-indigo-300">{strategy}</span>
            </div>
          )}

          {sectionTitle && (
            <div className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 truncate max-w-xs">
              {sectionTitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
