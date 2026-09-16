import React from 'react';
import { ShieldCheck, Terminal, Cpu, Database, Lock, GitBranch } from 'lucide-react';
import { RagtimeLogo } from './RagtimeLogo';

interface FooterProps {
  onNavigateToPlan: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateToPlan }) => {
  return (
    <footer className="border-t border-zinc-800/60 bg-[#09090b] text-zinc-500 py-12 px-4 sm:px-6 lg:px-8 text-xs font-mono">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left branding */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <RagtimeLogo size={24} />
            <span className="text-zinc-200 font-semibold tracking-tight text-sm">
              RAGTIME 2026
            </span>
          </div>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <span className="text-zinc-400">
            Plateforme RAG auto-hébergée, souveraine et multi-tenant.
          </span>
        </div>

        {/* Center tech stack pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
            FastAPI 3.12+
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
            pgvector 16
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
            ARQ + Redis
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
            Ollama Natif
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-indigo-400">
            Tailwind v4
          </span>
        </div>

        {/* Right compliance & links */}
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateToPlan}
            className="text-zinc-400 hover:text-zinc-200 underline underline-offset-4 transition-colors"
          >
            Spécification Front
          </button>
          <span className="text-zinc-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zéro Tiers Cloud</span>
          </span>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-500 gap-2">
        <span>© 2026 RAGTIME. Conception & Architecture : <strong className="text-zinc-300 font-semibold">Bonnecarrere Sylvain</strong>.</span>
        <span>Conformité SecNumCloud • Isolation Tenant renforcée par modèle relationnel pgvector.</span>
      </div>
    </footer>
  );
};
