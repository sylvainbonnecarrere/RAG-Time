/**
 * Logo Vectorisé RAGTIME - Inspiré du Jazz Ragtime (Rythme Ternaire & Syncope)
 * Fusionne la syncope des touches de piano / portée musicale et les vecteurs de chunks RAG.
 */

import React from 'react';

interface RagtimeLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const RagtimeLogo: React.FC<RagtimeLogoProps> = ({
  className = '',
  size = 36,
  showText = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Emblème SVG Conceptuel : Portée Ternaire Syncopée & Blocs Vectoriels */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#181824] via-[#101018] to-[#0a0a0f] border border-amber-500/30 shadow-lg shadow-amber-500/10 group-hover:border-amber-400/60 transition-all duration-300 overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        {/* Halo ambiant doré subtil évoquant les cuivres et le laiton de la Nouvelle-Orléans */}
        <div className="absolute inset-0 bg-radial-gradient from-amber-500/15 via-transparent to-transparent opacity-80" />

        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[85%] h-[85%] relative z-10"
        >
          {/* Lignes de portée musicale (Staff lines) avec ondulation rythmique */}
          <line
            x1="6"
            y1="14"
            x2="42"
            y2="14"
            stroke="#6366f1"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            strokeDasharray="1 1.5"
          />
          <line
            x1="6"
            y1="22"
            x2="42"
            y2="22"
            stroke="#818cf8"
            strokeWidth="1.2"
            strokeOpacity="0.5"
          />
          <line
            x1="6"
            y1="30"
            x2="42"
            y2="30"
            stroke="#f59e0b"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <line
            x1="6"
            y1="38"
            x2="42"
            y2="38"
            stroke="#fbbf24"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            strokeDasharray="1 1.5"
          />

          {/* Triolet de 3 notes syncopées RAGTIME (sans clé) */}
          {/* Note 1 : Tête de note 1 (pgvector block dense) */}
          <ellipse
            cx="13"
            cy="31"
            rx="3.6"
            ry="2.6"
            transform="rotate(-20 13 31)"
            fill="url(#gold-grad)"
          />
          <line
            x1="16"
            y1="30"
            x2="16"
            y2="13"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Note 2 : Tête de note syncopée décalée (Ternaire Ragtime) */}
          <ellipse
            cx="24"
            cy="24"
            rx="3.6"
            ry="2.6"
            transform="rotate(-20 24 24)"
            fill="url(#indigo-grad)"
          />
          <line
            x1="27"
            y1="23"
            x2="27"
            y2="9"
            stroke="#818cf8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Note 3 : Tête de note haute */}
          <ellipse
            cx="35"
            cy="18"
            rx="3.4"
            ry="2.5"
            transform="rotate(-20 35 18)"
            fill="url(#gold-grad)"
          />
          <line
            x1="38"
            y1="17"
            x2="38"
            y2="6"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Double Ligature Supérieure de Triolet (Beams en cascade ternaire) */}
          <path
            d="M 16 13 L 27 9 L 38 6"
            stroke="#f59e0b"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 16 17 L 27 13 L 38 10"
            stroke="#818cf8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Chiffre 3 discret de triolet au-dessus de la ligature */}
          <text
            x="27"
            y="5"
            textAnchor="middle"
            fill="#fbbf24"
            fontSize="5.5"
            fontFamily="monospace"
            fontWeight="bold"
            opacity="0.85"
          >
            3
          </text>

          {/* Définitions des dégradés Cuivre/Or et Indigo souverain */}
          <defs>
            <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="indigo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typographie de marque optionnelle */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-50 font-bold tracking-tight text-base font-mono">
              RAGTIME
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-semibold uppercase tracking-wider">
              Beat & Pgvector
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-mono">
            Sovereign On-Premise RAG
          </span>
        </div>
      )}
    </div>
  );
};
