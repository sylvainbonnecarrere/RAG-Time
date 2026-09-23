/**
 * Badge de Citation Thermique avec Popover Cosinus - US-FRONT-30 & TNR-25
 * Pastille chromatique dynamique calculée d'après le score cosinus
 * avec popover détaillé au survol (Score, Confiance, Δ Top-1, Seuil Preset).
 */

import React, { useState } from 'react';
import { getThermalColorInfo } from './VisualVectorSimilarityInspector';
import { Target, Info, Sparkles, AlertCircle } from 'lucide-react';

export interface CosineScoreBadgeProps {
  score: number;
  top1Score?: number;
  threshold?: number;
  label?: string;
  onClick?: () => void;
  showPercent?: boolean;
}

export const CosineScoreBadge: React.FC<CosineScoreBadgeProps> = ({
  score,
  top1Score,
  threshold = 0.70,
  label,
  onClick,
  showPercent = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const safeScore = Math.max(0, Math.min(1, score));
  const safeTop1 = top1Score !== undefined ? Math.max(0, Math.min(1, top1Score)) : safeScore;
  const deltaTop1 = safeScore - safeTop1;
  const isTop1 = Math.abs(deltaTop1) < 0.0005;

  const thermal = getThermalColorInfo(safeScore);
  const Icon = thermal.icon;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer shadow-xs ${
          thermal.badgeBg
        } hover:brightness-110`}
        title="Survoler pour visualiser la métrique cosinus et le delta Top-1"
      >
        <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
        {label && <span className="font-sans font-medium">{label}</span>}
        <span className="font-bold">
          {showPercent ? `${(safeScore * 100).toFixed(1)}%` : safeScore.toFixed(3)}
        </span>
      </button>

      {/* Popover de Prévisualisation Cosinus au Survol */}
      {isHovered && (
        <div className="absolute left-0 bottom-full mb-1.5 w-64 p-3 bg-[#18181b] border border-zinc-700/90 rounded-xl shadow-2xl z-50 text-xs text-zinc-200 animate-in fade-in-50 zoom-in-95 pointer-events-none">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-100 text-[11px]">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>Proximité Vectorielle pgvector</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-400">768d Cosinus</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Score de similarité :</span>
              <span className="font-mono font-bold text-zinc-100">
                {(safeScore * 100).toFixed(1)}% ({safeScore.toFixed(3)})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Écart Top-1 :</span>
              <span
                className={`font-mono font-semibold ${
                  isTop1 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isTop1 ? 'Top-1 (Référence)' : `Δ = ${deltaTop1.toFixed(3)}`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Seuil minimal preset :</span>
              <span className="font-mono text-zinc-300">&ge; {threshold.toFixed(2)}</span>
            </div>

            <div className={`mt-2 pt-2 border-t border-zinc-800/80 flex items-center gap-1.5 ${thermal.textColor}`}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-[10px]">{thermal.label}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
