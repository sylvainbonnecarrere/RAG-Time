import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, CheckCircle2, Shield, ArrowUpRight, RefreshCw, Terminal, Activity, FileText } from 'lucide-react';
import { MOCK_CITATIONS } from '../data/mockRagData';
import { CitationSource } from '../types';

interface InteractiveConsoleDemoProps {
  onSelectCitation: (source: CitationSource) => void;
}

export const InteractiveConsoleDemo: React.FC<InteractiveConsoleDemoProps> = ({ onSelectCitation }) => {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      role: 'assistant' as const,
      content: "Système RAGTIME initialisé. Connecté à l'index pgvector (bge-m3, 1024 dim) et au runtime local Ollama. Toutes les réponses sont strictement délimitées par les chunks de votre tenant d'entreprise.",
      citations: [] as CitationSource[],
      timestamp: '07:00:12',
      metrics: { ttft: '110ms', speed: '42 tok/s' }
    }
  ]);

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const predefinedPrompts = [
    "Quels sont les mécanismes de non-régression prévus pour V1.2 ?",
    "Comment le DocumentParserPort traite-t-il les fichiers PDF ?",
    "Quelles sont les garanties contre les fuites vers des LLM cloud ?"
  ];

  const handleSend = (textToSend?: string) => {
    const question = textToSend || input;
    if (!question.trim() || isGenerating) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: question,
      citations: [],
      timestamp: new Date().toLocaleTimeString(),
      metrics: undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    // Simulate observable pipeline steps (V1.1 requirement)
    setActiveStep('1. Question reçue & validation tenant');

    setTimeout(() => {
      setActiveStep('2. Vectorisation via bge-m3');
    }, 300);

    setTimeout(() => {
      setActiveStep('3. Recherche pgvector filtrée par tenant_id');
    }, 600);

    setTimeout(() => {
      setActiveStep('4. Sélection des passages & contrôle budget');
    }, 900);

    setTimeout(() => {
      setActiveStep('5. Streaming SSE de la réponse');
      
      const assistantMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant' as const,
        content: `D'après les spécifications de RAGTIME (voir citations ci-dessous), l'isolation et la fiabilité sont régies par des invariants stricts : chaque chunk est tracé avec son checksum SHA256, son rang de similarité et son tenant_id. Le budget de contexte restreint empêche toute divergence et garantit qu'aucune donnée d'entreprise ne transite en dehors de l'infrastructure locale.`,
        citations: [MOCK_CITATIONS[0], MOCK_CITATIONS[1]],
        timestamp: new Date().toLocaleTimeString(),
        metrics: { ttft: '148ms', speed: '39.4 tok/s' }
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsGenerating(false);
      setActiveStep(null);
    }, 1300);
  };

  return (
    <div className="py-10 max-w-5xl mx-auto px-4 sm:px-6 space-y-6" id="interactive-console-demo">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Console RAG Temps Réel • Mode Démo Live
            </span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-50 font-sans">
            Assistant RAG Sourcé (Simulation SSE Interactive)
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Tenant: enterprise_alpha
          </span>
          <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
            pgvector Cosine: ≥0.75
          </span>
        </div>
      </div>

      {/* Observable Pipeline Live Bar when streaming */}
      {isGenerating && activeStep && (
        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs font-mono text-indigo-300 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Pipeline observable : {activeStep}</span>
          </div>
          <span className="text-[10px] text-zinc-400">Pas de simulation de pensée interne</span>
        </div>
      )}

      {/* Chat Container */}
      <div className="min-h-[380px] max-h-[520px] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-[#121214] border border-zinc-800/80 space-y-4 shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 text-xs ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-xl max-w-2xl leading-relaxed space-y-2.5 ${
                msg.role === 'user'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'bg-zinc-950/90 text-zinc-300 border border-zinc-800/80 shadow-sm'
              }`}
            >
              {msg.metrics && (
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Réponse sourcée (SSE)
                  </span>
                  <span>TTFT: {msg.metrics.ttft} • {msg.metrics.speed}</span>
                </div>
              )}

              <p className="text-zinc-200">{msg.content}</p>

              {/* Clickable citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 mr-1">
                    Sources auditables :
                  </span>
                  {msg.citations.map((cite) => (
                    <button
                      key={cite.id}
                      onClick={() => onSelectCitation(cite)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono transition-all group"
                      title="Inspecter le chunk"
                    >
                      <FileText className="w-3 h-3 text-indigo-400" />
                      <span>[{cite.documentName}, {cite.location}]</span>
                      <ArrowUpRight className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}

              <div className="text-[10px] font-mono text-zinc-600 text-right">
                {msg.timestamp}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested prompts */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-zinc-500 font-mono text-[11px] self-center">Tester :</span>
        {predefinedPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            disabled={isGenerating}
            className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-[11px] font-mono transition-colors disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Prompt input with surgical Focus RAG accent */}
      <div className="relative">
        <div className="flex items-center bg-[#121214] border border-zinc-700/80 rounded-xl p-2 shadow-xl focus-within:border-indigo-500 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Poser une question aux documents de l'entreprise..."
            disabled={isGenerating}
            className="w-full bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
          />

          <button
            onClick={() => handleSend()}
            disabled={isGenerating || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Envoyer</span>
          </button>
        </div>
      </div>

    </div>
  );
};
