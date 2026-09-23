import React from 'react';
import {
  X,
  Sliders,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Info,
  Split,
  FileText,
  Binary,
  Target,
  Scale,
  Zap,
} from 'lucide-react';
import { RagPresetDTO } from '../../contracts/api-types';
import { SUPPORTED_EMBEDDING_MODELS } from './RagEmbeddingConfig';

interface PresetInfoModalProps {
  isOpen: boolean;
  preset: RagPresetDTO | null;
  onClose: () => void;
}

export const PresetInfoModal: React.FC<PresetInfoModalProps> = ({
  isOpen,
  preset,
  onClose,
}) => {
  if (!isOpen || !preset) return null;

  // Recherche des métadonnées du modèle d'embedding
  const matchedModel = SUPPORTED_EMBEDDING_MODELS.find(
    (m) =>
      preset.embedding_model.toLowerCase().includes(m.name.toLowerCase()) ||
      m.name.toLowerCase().includes(preset.embedding_model.toLowerCase()) ||
      preset.embedding_model.toLowerCase().includes(m.id.toLowerCase())
  );

  const getStrategyLabel = (strategy?: string) => {
    switch (strategy) {
      case 'sentence_boundary':
        return {
          title: 'Découpage Phrastique Grammatical',
          desc: 'Segmente le texte en respectant strictement les phrases complètes et la ponctuation forte.',
          icon: Split,
          badge: 'Phrases complètes',
        };
      case 'markdown_sections':
        return {
          title: 'Sections Markdown AST',
          desc: 'Découpe structurée selon les titres H1/H2/H3 avec fil d’Ariane hiérarchique.',
          icon: FileText,
          badge: 'Structure AST',
        };
      case 'sliding_window':
      default:
        return {
          title: 'Fenêtre Glissante (Sliding Window)',
          desc: 'Partitionnement standard à taille fixe de tokens avec chevauchement régulier.',
          icon: Layers,
          badge: 'Tokens constants',
        };
    }
  };

  const stratInfo = getStrategyLabel(preset.chunking_strategy);
  const StratIcon = stratInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">{preset.name}</h3>
                {preset.is_active && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    Preset par Défaut
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {preset.description || 'Configuration RAG souveraine certifiée pour ce domaine.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Fermer la modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-300">
          
          {/* Bloc 1 : Espace Vectoriel & Modèle d'Embedding */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>1. Espace Vectoriel & Modèle d'Embedding</span>
              </div>
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700/60">
                pgvector HNSW
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                <div className="text-[10px] text-zinc-400 font-medium">Modèle d'Embedding</div>
                <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5 truncate">
                  {matchedModel ? matchedModel.name : preset.embedding_model}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  {matchedModel ? matchedModel.provider : 'Local ONNX / HuggingFace'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                <div className="text-[10px] text-zinc-400 font-medium">Dimensionnalité</div>
                <div className="text-xs font-mono font-bold text-indigo-300 mt-0.5">
                  {matchedModel ? matchedModel.dimensionLabel : '768d dense'}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Normalisé L2 cosine
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                <div className="text-[10px] text-zinc-400 font-medium">Empreinte VRAM / RAM</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {matchedModel ? matchedModel.vramEstimate : '~1.2 GB'}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {matchedModel?.sovereign ? '100% Souverain' : 'Cloud managé'}
                </div>
              </div>
            </div>
          </div>

          {/* Bloc 2 : Découpage Physique des Chunks */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <StratIcon className="w-4 h-4 text-indigo-400" />
                <span>2. Découpage Physique des Chunks</span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-950/70 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">
                {stratInfo.badge}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400">
              {stratInfo.desc}
            </p>

            {/* Détails spécifiques selon la stratégie */}
            {preset.chunking_strategy === 'sliding_window' || !preset.chunking_strategy ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Taille du Chunk</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5">
                    {preset.chunk_size} tokens
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Chevauchement</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5">
                    {preset.chunk_overlap} tokens
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Tokenizer BPE</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5 truncate">
                    {preset.tokenizer_family || 'cl100k_base'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Rognage Mots</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {preset.word_boundary_trim !== false ? 'Actif' : 'Inactif'}
                  </div>
                </div>
              </div>
            ) : preset.chunking_strategy === 'sentence_boundary' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Phrases / Chunk</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5">
                    {preset.sentences_per_chunk || 4} phrases
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Overlap Phrastique</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5">
                    {preset.sentence_overlap ?? 1} phrase(s)
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Abréviations</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {preset.protect_abbreviations !== false ? 'Protégées' : 'Standard'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Plafond Sécurité</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5">
                    {preset.chunk_size || 512} tokens
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Titres Découpeurs</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5 truncate">
                    {preset.heading_levels?.join(', ').toUpperCase() || 'H1, H2, H3'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Fil d'Ariane</div>
                  <div className="text-xs font-mono font-bold text-indigo-300 mt-0.5">
                    {preset.prefix_breadcrumbs !== false ? 'Injecté' : 'Désactivé'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Blocs Atomiques</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {preset.protect_atomic_blocks !== false ? 'Tableaux & Code' : 'Désactivé'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 font-medium">Max par Section</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5">
                    {preset.max_section_tokens || 1024} tokens
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bloc 3 : Hyperparamètres de Retrieval & Précision */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>3. Hyperparamètres de Recherche (Retrieval)</span>
              </div>
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700/60">
                Exécution Requête
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                <div className="text-[10px] text-zinc-400 font-medium">Top-K Candidats</div>
                <div className="text-xs font-mono font-bold text-zinc-100 mt-0.5">
                  {preset.retrieval_top_k} chunks
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Injectés dans le prompt
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                <div className="text-[10px] text-zinc-400 font-medium">Seuil Cosinus Minimal</div>
                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                  &ge; {preset.similarity_threshold.toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Filtre anti-hallucination
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                <div className="text-[10px] text-zinc-400 font-medium">Reranker BGE</div>
                <div className={`text-xs font-mono font-bold mt-0.5 ${preset.rerank_enabled ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {preset.rerank_enabled ? 'Cross-Encoder' : 'Désactivé'}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Re-scoring contextuel
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                <div className="text-[10px] text-zinc-400 font-medium">Parent-Child</div>
                <div className={`text-xs font-mono font-bold mt-0.5 ${preset.parent_child_enabled ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {preset.parent_child_enabled ? 'Small-to-Big' : 'Désactivé'}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Expansion de contexte
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Isolation RLS pgvector active • Traçabilité certifiée</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
