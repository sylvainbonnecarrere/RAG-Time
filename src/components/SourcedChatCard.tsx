import React, { useState } from 'react';
import { Bot, User, FileText, CheckCircle2, ChevronRight, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { CitationSource } from '../types';
import { MOCK_CITATIONS } from '../data/mockRagData';

interface SourcedChatCardProps {
  onSelectCitation: (citation: CitationSource) => void;
}

export const SourcedChatCard: React.FC<SourcedChatCardProps> = ({ onSelectCitation }) => {
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);

  const sampleQueries = [
    {
      question: "Comment est garantie l'étanchéité des données et l'absence d'hallucination ?",
      answer: "L'étanchéité est assurée dès l'ingestion par un étiquetage strict par tenant_id UUID et filtrage systématique au niveau du plan d'exécution SQL pgvector",
      citation1: MOCK_CITATIONS[2], // audit-securite-2026.pdf p.14
      answerPart2: ". De plus, la réponse n'est construite qu'à partir des passages retenus dans le budget de contexte, chaque fait étant ancré dans les ports applicatifs",
      citation2: MOCK_CITATIONS[0], // 01-architecture.md §6
      answerPart3: ". Si le score de similarité cosinus descend sous le seuil configuré, le système applique la politique de réponse prudente sans inventer de contenu."
    },
    {
      question: "Quel est le comportement si les documents récupérés sont insuffisants ?",
      answer: "Conformément à la spécification du preset RAG, la taille théorique maximale du modèle n'est jamais utilisée comme budget par défaut",
      citation1: MOCK_CITATIONS[1], // 02-roadmap.md V1.1
      answerPart2: ". En cas de score inférieur au seuil de confiance, le moteur refuse de répondre ou génère un avertissement de couverture partielle, sans simuler de chaîne de pensée non vérifiable",
      citation2: MOCK_CITATIONS[0],
      answerPart3: "."
    }
  ];

  const current = sampleQueries[activeQueryIndex];

  return (
    <div className="flex flex-col h-full justify-between" id="insight-sourced-response">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">
              Insight 3 • La Réponse Sourcée
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-indigo-300">
            Zéro Hallucination Auditable
          </span>
        </div>

        <h3 className="text-xl font-bold text-zinc-50 tracking-tight mb-2">
          Citations Précises & Justification Inaltérable
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          Chaque assertion générée par le modèle local Ollama est ancrée dans un chunk récupéré. Cliquez sur les étiquettes de citation pour inspecter le texte source, le score de similarité et le contexte original.
        </p>

        {/* Quick query buttons */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-[10px] uppercase text-zinc-500 font-mono shrink-0">
            Questions test :
          </span>
          <button
            onClick={() => setActiveQueryIndex(0)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors shrink-0 ${
              activeQueryIndex === 0
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-zinc-200'
            }`}
          >
            Q1: Cloisonnement & RAG
          </button>
          <button
            onClick={() => setActiveQueryIndex(1)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors shrink-0 ${
              activeQueryIndex === 1
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-zinc-200'
            }`}
          >
            Q2: Politique de repli
          </button>
        </div>
      </div>

      {/* Simulated Chat Interface */}
      <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800/80 space-y-3.5 relative overflow-hidden font-sans">
        
        {/* User Message */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-xs leading-relaxed max-w-lg">
            {current.question}
          </div>
        </div>

        {/* Assistant Response with Clickable Sourced Citations */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <Bot className="w-3.5 h-3.5" />
          </div>

          <div className="p-3.5 rounded-xl bg-[#121214] border border-zinc-800 text-zinc-200 text-xs leading-relaxed space-y-2.5 shadow-sm">
            
            {/* Stream badge header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                Réponse sourcée (SSE complété)
              </span>
              <span>TTFT: 142ms • 38 tok/s</span>
            </div>

            {/* Answer body with interactive citation chips */}
            <p className="text-zinc-300 leading-relaxed">
              {current.answer}{' '}
              {/* Clickable Citation Chip 1 */}
              <button
                id={`btn-cite-${current.citation1.id}`}
                onClick={() => onSelectCitation(current.citation1)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-medium transition-all group shadow-sm align-baseline cursor-pointer"
                title="Cliquer pour inspecter la source et le score"
              >
                <span>[{current.citation1.documentName}, {current.citation1.location}]</span>
                <ArrowUpRight className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
              </button>
              {current.answerPart2}{' '}
              {/* Clickable Citation Chip 2 */}
              <button
                id={`btn-cite-${current.citation2.id}`}
                onClick={() => onSelectCitation(current.citation2)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-medium transition-all group shadow-sm align-baseline cursor-pointer"
                title="Cliquer pour inspecter la source et le score"
              >
                <span>[{current.citation2.documentName}, {current.citation2.location}]</span>
                <ArrowUpRight className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
              </button>
              {current.answerPart3}
            </p>

            {/* Citations tray indicator */}
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>2 sources vérifiées intégrées au contexte</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Cliquez sur un badge pour auditer
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Footer hint */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Contrat SSE : <code className="text-zinc-400 font-mono">sources.available</code></span>
        <span className="text-zinc-400 font-mono">Confiance: Élevée (94.2%)</span>
      </div>

    </div>
  );
};
