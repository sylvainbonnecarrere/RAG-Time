import React, { useState } from 'react';
import { FileText, Database, Layers, ArrowRight, CheckCircle2, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import { INGESTION_SOURCES } from '../data/mockRagData';

export const IngestionHubDemo: React.FC = () => {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [processedChunks, setProcessedChunks] = useState(42);

  const activeSource = INGESTION_SOURCES[activeSourceIndex];

  const handleSimulate = (index: number) => {
    setActiveSourceIndex(index);
    setIsSimulating(true);
    setProcessedChunks(0);

    const interval = setInterval(() => {
      setProcessedChunks((prev) => {
        if (prev >= INGESTION_SOURCES[index].chunksCount) {
          clearInterval(interval);
          setIsSimulating(false);
          return INGESTION_SOURCES[index].chunksCount;
        }
        return prev + Math.ceil(INGESTION_SOURCES[index].chunksCount / 8);
      });
    }, 120);
  };

  return (
    <div className="flex flex-col h-full justify-between" id="insight-ingestion-hub">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">
              Insight 1 • Ingestion Connectée
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
            Worker ARQ + Redis
          </span>
        </div>

        <h3 className="text-xl font-bold text-zinc-50 tracking-tight mb-2">
          Convergence Multi-Sources vers un Hub Déterministe
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          PDF volumineux, exports SQL relationnels, wikis Notion ou documentation Markdown : chaque document traverse nos ports applicatifs (<code className="text-zinc-300 font-mono">DocumentParserPort</code> & <code className="text-zinc-300 font-mono">ChunkerPort</code>) avec hachage SHA256 et isolation du tenant.
        </p>
      </div>

      {/* Interactive Visual Hub */}
      <div className="my-2 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 relative overflow-hidden">
        
        {/* Subtle Ambient light behind hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Sources List (Monochrome subtle icons) */}
          <div className="md:col-span-4 space-y-2">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
              Sources hétérogènes
            </span>
            {INGESTION_SOURCES.map((src, idx) => {
              const isSelected = activeSourceIndex === idx;
              return (
                <button
                  key={src.id}
                  onClick={() => handleSimulate(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm'
                      : 'bg-zinc-950/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                  }`}
                  id={`btn-source-${src.id}`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-1.5 rounded bg-zinc-800/80 text-zinc-300">
                      {src.type === 'pdf' && <FileText className="w-3.5 h-3.5" />}
                      {src.type === 'sql' && <Database className="w-3.5 h-3.5" />}
                      {src.type === 'notion' && <Layers className="w-3.5 h-3.5" />}
                      {src.type === 'markdown' && <FileText className="w-3.5 h-3.5" />}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-mono font-medium truncate">{src.name}</div>
                      <div className="text-[10px] text-zinc-500">{src.size} • {src.chunksCount} chunks</div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 ring-2 ring-indigo-400/20" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Convergence Conduit */}
          <div className="hidden md:flex md:col-span-3 flex-col items-center justify-center text-zinc-600 gap-2">
            <div className="h-0.5 w-full bg-gradient-to-r from-zinc-800 via-indigo-500/40 to-zinc-800 relative">
              <div 
                className={`absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-500 transition-all duration-700 ${
                  isSimulating ? 'left-3/4 animate-ping' : 'left-1/2'
                }`} 
              />
            </div>
            <span className="text-[9px] font-mono text-zinc-500 text-center uppercase tracking-wider">
              Flux Streaming ARQ
            </span>
          </div>

          {/* Central Hub Node */}
          <div className="md:col-span-5 p-3.5 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-700/80 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-zinc-200 font-mono">
                  RAG Ingestion Engine
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Actif
              </span>
            </div>

            {/* Simulated Live Processing state */}
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Fichier source:</span>
                <span className="text-zinc-200 font-medium truncate max-w-[140px]">
                  {activeSource.name}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Algorithme Chunking:</span>
                <span className="text-indigo-300">RecursiveSplitter (512 tokens)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Modèle d'embedding:</span>
                <span className="text-zinc-300">bge-m3 (1024 dim)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Progression Chunks:</span>
                <span className="text-emerald-400">
                  {processedChunks} / {activeSource.chunksCount} ({Math.min(100, Math.round((processedChunks / activeSource.chunksCount) * 100))}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-1">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, (processedChunks / activeSource.chunksCount) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Tenant: tenant_alpha_uuid</span>
              <span className="text-indigo-400">pgvector ready</span>
            </div>
          </div>

        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
          Stockage local immuable : <code className="text-zinc-400 font-mono">/data/documents/...</code>
        </span>
        <button 
          onClick={() => handleSimulate(activeSourceIndex)}
          className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 font-mono transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>Tester l'ingestion</span>
        </button>
      </div>

    </div>
  );
};
