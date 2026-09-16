import React, { useState } from 'react';
import { Search, ArrowRight, ShieldCheck, Terminal, Cpu, Database, Sparkles, CheckCircle2 } from 'lucide-react';
import { CitationSource } from '../types';
import { MOCK_CITATIONS } from '../data/mockRagData';

interface HeroSectionProps {
  onSearchQuery: (query: string) => void;
  onOpenCitation: (source: CitationSource) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearchQuery, onOpenCitation }) => {
  const [inputVal, setInputVal] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const promptSuggestions = [
    {
      title: "Comment fonctionne l'isolation multi-tenant dans pgvector ?",
      tag: "Sécurité",
      refCitation: MOCK_CITATIONS[2]
    },
    {
      title: "Quels sont les ports applicatifs garantissant le découplage ?",
      tag: "Architecture",
      refCitation: MOCK_CITATIONS[0]
    },
    {
      title: "Quelles sont les métriques observables sans chaîne de pensée simulée ?",
      tag: "Audit V1.1",
      refCitation: MOCK_CITATIONS[1]
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearchQuery(inputVal.trim());
    } else {
      onSearchQuery(promptSuggestions[0].title);
    }
  };

  return (
    <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden" id="hero-section">
      
      {/* Subtle Radial Glow in background (simulating distant light source) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-radial-subtle pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-radial-glow pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        
        {/* Release Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-[11px] text-zinc-400">RAGTIME Enterprise 2026</span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-300 font-medium">Auto-hébergé & 100% Souverain</span>
        </div>

        {/* Display Typography Heading */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-50 max-w-4xl mx-auto leading-[1.15] mb-6">
          L'Intelligence Augmentée par la Recherche,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400">
            Ancrée dans Vos Données Vérifiables.
          </span>
        </h1>

        {/* Refined Body Lead */}
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Une plateforme RAG industrielle et multi-tenant conçue pour l'auto-hébergement strict.
          Zéro fuite de données vers des tiers, génération contrôlée par citations auditables et 
          observabilité intégrale du pipeline pgvector.
        </p>

        {/* The "Focus RAG" Prompt Bar (Surgical Electric Accent) */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSubmit} className="relative group">
            
            {/* Outer subtle glow on focus */}
            <div className="absolute -inset-0.5 bg-indigo-600/30 rounded-2xl blur-sm opacity-50 group-focus-within:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-center bg-[#121214] border border-zinc-700/80 rounded-xl p-2 shadow-2xl transition-all group-focus-within:border-indigo-500/80">
              <div className="p-2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                <Search className="w-5 h-5" />
              </div>

              <input
                id="hero-search-prompt"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Interroger la base documentaire vérifiée (ex: architecture, conformité, contrats)..."
                className="w-full bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
              />

              {/* The Key CTA Button with Indigo Focus */}
              <button
                type="submit"
                id="btn-hero-execute-rag"
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-zinc-50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0 active:scale-95"
              >
                <span>Recherche RAG</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Prompt Pill Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Suggestions vérifiées :</span>
            {promptSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputVal(item.title);
                  onOpenCitation(item.refCitation);
                }}
                className="px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-[11px] font-mono transition-colors flex items-center gap-1"
                id={`btn-suggestion-${idx}`}
              >
                <span className="text-indigo-400">[{item.tag}]</span>
                <span className="truncate max-w-[220px]">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Enterprise Security Reassurance Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-6 border-t border-zinc-900 text-xs">
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40 text-zinc-400 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Isolation Multi-Tenant</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40 text-zinc-400 font-mono text-[11px]">
            <Database className="w-4 h-4 text-blue-400" />
            <span>PostgreSQL 16 + pgvector</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40 text-zinc-400 font-mono text-[11px]">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Ollama Windows / WSL2</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40 text-zinc-400 font-mono text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-indigo-300" />
            <span>Citations 100% Auditables</span>
          </div>
        </div>

      </div>
    </section>
  );
};
