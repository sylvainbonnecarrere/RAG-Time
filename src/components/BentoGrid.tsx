import React from 'react';
import { IngestionHubDemo } from './IngestionHubDemo';
import { VectorIndexCard } from './VectorIndexCard';
import { SourcedChatCard } from './SourcedChatCard';
import { CitationSource } from '../types';
import { Shield, Sliders, Cpu, Activity, CheckCircle2, ChevronRight, Server, HardDrive, Lock } from 'lucide-react';

interface BentoGridProps {
  onSelectCitation: (citation: CitationSource) => void;
  onNavigateToPlan: () => void;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ onSelectCitation, onNavigateToPlan }) => {
  return (
    <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="bento-grid-section">
      
      {/* Section Header */}
      <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Architecture & Insights Clés
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50 font-sans">
            La Bento Grid RAGTIME : Ingénierie & Preuves Tangibles
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Découvrez les piliers d'un système RAG souverain : de l'ingestion asynchrone sécurisée à la citation auditable sans hallucination.
          </p>
        </div>

        <button
          onClick={onNavigateToPlan}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors self-center sm:self-auto"
        >
          <span>Consulter le plan front complet</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Asymmetric Bento Grid: 3 columns on Desktop, 1 column on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* ========================================================================= */}
        {/* CARD 1 (Spans 2 columns on Desktop): INSIGHT 1 - Ingestion Connectée     */}
        {/* ========================================================================= */}
        <div 
          className="md:col-span-2 p-6 rounded-2xl bg-[#121214] border border-zinc-800/60 shadow-lg relative overflow-hidden transition-all"
          id="bento-card-ingestion"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial-subtle pointer-events-none opacity-40" />
          <IngestionHubDemo />
        </div>

        {/* ========================================================================= */}
        {/* CARD 2 (1 column): Hardware & Edge Sovereignty                          */}
        {/* ========================================================================= */}
        <div 
          className="p-6 rounded-2xl bg-[#121214] border border-zinc-800/60 shadow-lg flex flex-col justify-between transition-all"
          id="bento-card-hardware"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">
                Souveraineté Matérielle
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                Local Runtime
              </span>
            </div>

            <h3 className="text-xl font-bold text-zinc-50 tracking-tight mb-2">
              Zéro Dépendance Cloud
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Exécution locale sous Windows 10/WSL2 avec Ollama natif et Docker Compose. Cible de développement validée sur GTX 980 Ti (6 Go VRAM) avec budget de contexte mesuré de 16k tokens.
            </p>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Moteur LLM
                </span>
                <span className="text-zinc-200">Ollama Natif</span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  Backend API
                </span>
                <span className="text-zinc-200">FastAPI (Python 3.12)</span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Isolation
                </span>
                <span className="text-zinc-200">Argon2id + Tenants</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>RAM: 32 Go alloués</span>
            <span className="text-emerald-400">CI sans dépendance GPU</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 3 (1 column): INSIGHT 2 - Vector Index (pgvector)                  */}
        {/* ========================================================================= */}
        <div 
          className="p-6 rounded-2xl bg-[#121214] border border-zinc-800/60 shadow-lg transition-all"
          id="bento-card-vector"
        >
          <VectorIndexCard />
        </div>

        {/* ========================================================================= */}
        {/* CARD 4 (Spans 2 columns on Desktop): INSIGHT 3 - La Réponse Sourcée      */}
        {/* ========================================================================= */}
        <div 
          className="md:col-span-2 p-6 rounded-2xl bg-[#121214] border border-zinc-800/60 shadow-lg relative overflow-hidden transition-all"
          id="bento-card-sourced-chat"
        >
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-radial-glow pointer-events-none opacity-50" />
          <SourcedChatCard onSelectCitation={onSelectCitation} />
        </div>

        {/* ========================================================================= */}
        {/* CARD 5 (Spans 3 columns on Desktop): Pipeline Observable V1.1 (Audit)   */}
        {/* ========================================================================= */}
        <div 
          className="md:col-span-3 p-6 rounded-2xl bg-[#121214] border border-zinc-800/60 shadow-lg relative"
          id="bento-card-audit"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Transparence Algorithmique • Règle V1.1 Obligatoire
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-100">
                Pipeline RAG Transparent : 5 Étapes Réelles Observables
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Aucune simulation de "pensée interne". L'utilisateur peut inspecter les faits techniques stricts de chaque milliseconde.
              </p>
            </div>

            <div className="px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 self-start md:self-auto">
              Contrat SSE : Last-Event-ID Supporté
            </div>
          </div>

          {/* Observable Pipeline Steps Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs">
            
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>ÉTAPE 01</span>
                <span className="text-zinc-400">12ms</span>
              </div>
              <div className="font-semibold text-zinc-200">Question Reçue</div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Vérification tenant & validation du Preset RAG actif.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>ÉTAPE 02</span>
                <span className="text-zinc-400">48ms</span>
              </div>
              <div className="font-semibold text-zinc-200">Vectorisation</div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Modèle <code className="text-indigo-400 font-mono">bge-m3</code> génère l'embedding de requête.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>ÉTAPE 03</span>
                <span className="text-emerald-400 text-[10px]">94.2%</span>
              </div>
              <div className="font-semibold text-zinc-200">Recherche pgvector</div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Filtrage HNSW strict sur <code className="text-zinc-300 font-mono">tenant_id</code> (top_k: 4).
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span>ÉTAPE 04</span>
                <span className="text-zinc-400">820 tok</span>
              </div>
              <div className="font-semibold text-zinc-200">Sources Retenues</div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Contrôle du budget de contexte et seuil de similarité (0.75).
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-indigo-900/40 space-y-1.5">
              <div className="flex items-center justify-between text-indigo-400 text-[10px]">
                <span>ÉTAPE 05</span>
                <span className="text-emerald-400">38 tok/s</span>
              </div>
              <div className="font-semibold text-indigo-300">Génération Sourcée</div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Streaming SSE Ollama avec balises de citations dynamiques.
              </div>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
};
