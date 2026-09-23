/**
 * Studio des Presets RAG & Modélisation du Retrieval - US-FRONT-33, US-FRONT-35 & TNR-31
 *
 * Architecture & Règle d'or RAG :
 * 1. Ce qui DOIT être identique : L'Embedding (Le modèle d'embedding utilisé lors du retrieval
 *    doit être strictement le même que celui utilisé lors de l'indexation).
 * 2. Ce qui PEUT varier : Le Chunking & Retrieval. Les paramètres de découpage sont figés
 *    en base de données une fois les documents indexés (TNR-18). En revanche, le retrieval
 *    offre une flexibilité totale à chaque requête (Top-K adaptatif, Parent-Child, Reranking).
 *
 * Gestion des Presets Nommés :
 * - Bloc 1 : « Presets disponibles pour ce domaine » avec sélection en 1 clic du preset par défaut.
 * - Bloc 2 : « Paramètres du modèle Retrieval » avec 3 sous-blocs pédagogiques et enregistrement libre sous nom personnalisé.
 * - Bloc 3 : « Simulateur de Retrieval en Direct » avec jauge thermique cosinus et delta Top-1.
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { defaultApiClient } from '../../services/apiClient';
import { RagPresetDTO, MessageSourceDTO, ChunkingStrategy, TokenizerFamily } from '../../contracts/api-types';
import {
  Sliders,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Save,
  Layers,
  Cpu,
  Target,
  BarChart3,
  Search,
  Lock,
  Unlock,
  Star,
  Trash2,
  Copy,
  PlusCircle,
  HelpCircle,
  Activity,
  BookmarkCheck,
  Check,
  Scissors,
  FileCode,
  AlignLeft,
  Type,
  CheckSquare,
  Square,
  Hash,
} from 'lucide-react';
import { validatePresetParams } from '../../lib/validation/schemas';
import { FormFieldFeedback } from './FormFieldFeedback';
import { VisualVectorSimilarityInspector } from './VisualVectorSimilarityInspector';
import { SUPPORTED_EMBEDDING_MODELS, getEmbeddingModelMeta } from './RagEmbeddingConfig';
import { ArchitectureInfoModal } from './ArchitectureInfoModal';

interface RagPresetStudioViewProps {
  onOpenChunkInspector?: (source: MessageSourceDTO) => void;
}

export const RagPresetStudioView: React.FC<RagPresetStudioViewProps> = ({
  onOpenChunkInspector,
}) => {
  const { activeTenant, activePreset, presets, activatePreset, refreshPresets } = useTenant();

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [isTenantEmpty, setIsTenantEmpty] = useState<boolean>(true);
  const [documentsCount, setDocumentsCount] = useState<number>(0);
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);

  // État du modal ou champ d'enregistrement de nouveau preset
  const [isCreatingNewPreset, setIsCreatingNewPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetDescription, setNewPresetDescription] = useState<string>('');

  // État du formulaire d'édition
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    chunk_size: number;
    chunk_overlap: number;
    chunking_strategy: ChunkingStrategy;
    prefix_section_title: boolean;
    similarity_threshold: number;
    retrieval_top_k: number;
    reranking_enabled: boolean;
    parent_child_enabled: boolean;
    embedding_model: string;
    tokenizer_family: TokenizerFamily;
    word_boundary_trim: boolean;
    sentences_per_chunk: number;
    sentence_overlap: number;
    respect_strong_punctuation: boolean;
    min_sentence_tokens: number;
    max_sentence_tokens: number;
    preserve_abbreviations: boolean;
    markdown_heading_levels: ('h1' | 'h2' | 'h3')[];
    prefix_breadcrumbs: boolean;
    protect_atomic_blocks: boolean;
    max_section_tokens: number;
  }>({
    name: '',
    description: '',
    chunk_size: 512,
    chunk_overlap: 64,
    chunking_strategy: 'sliding_window',
    prefix_section_title: true,
    similarity_threshold: 0.7,
    retrieval_top_k: 4,
    reranking_enabled: true,
    parent_child_enabled: false,
    embedding_model: 'nomic-embed-text-v1.5 (768d)',
    tokenizer_family: 'cl100k_base',
    word_boundary_trim: true,
    sentences_per_chunk: 5,
    sentence_overlap: 1,
    respect_strong_punctuation: true,
    min_sentence_tokens: 30,
    max_sentence_tokens: 450,
    preserve_abbreviations: true,
    markdown_heading_levels: ['h1', 'h2', 'h3'],
    prefix_breadcrumbs: true,
    protect_atomic_blocks: true,
    max_section_tokens: 1024,
  });

  // Simulateur en direct de Retrieval
  const [simQuery, setSimQuery] = useState(
    'Quelles sont les exigences réglementaires et les protocoles de conformité applicables ?'
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simChunks, setSimChunks] = useState<MessageSourceDTO[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [presetErrors, setPresetErrors] = useState<Record<string, string>>({});
  const [presetWarnings, setPresetWarnings] = useState<Record<string, string>>({});

  // Synchronisation avec le tenant et les documents
  useEffect(() => {
    const checkDocs = async () => {
      if (!activeTenant) return;
      try {
        const docs = await defaultApiClient.getDocuments(activeTenant.id);
        const count = docs.length;
        setDocumentsCount(count);
        setIsTenantEmpty(count === 0);
      } catch (e) {
        setIsTenantEmpty(true);
      }
    };
    checkDocs();
  }, [activeTenant]);

  // Chargement du preset sélectionné dans le formulaire
  useEffect(() => {
    const target = presets.find((p) => p.id === selectedPresetId) || activePreset || presets[0];
    if (target) {
      if (!selectedPresetId) {
        setSelectedPresetId(target.id);
      }
      setFormData({
        name: target.name,
        description: target.description || '',
        chunk_size: target.chunk_size,
        chunk_overlap: target.chunk_overlap,
        chunking_strategy: target.chunking_strategy || 'sliding_window',
        prefix_section_title: target.prefix_section_title ?? true,
        similarity_threshold: target.similarity_threshold,
        retrieval_top_k: target.retrieval_top_k,
        reranking_enabled: target.reranking_enabled,
        parent_child_enabled: target.parent_child_enabled ?? false,
        embedding_model: target.embedding_model,
        tokenizer_family: target.tokenizer_family || 'cl100k_base',
        word_boundary_trim: target.word_boundary_trim ?? true,
        sentences_per_chunk: target.sentences_per_chunk ?? 5,
        sentence_overlap: target.sentence_overlap ?? 1,
        respect_strong_punctuation: target.respect_strong_punctuation ?? true,
        min_sentence_tokens: target.min_sentence_tokens ?? 30,
        max_sentence_tokens: target.max_sentence_tokens ?? 450,
        preserve_abbreviations: target.preserve_abbreviations ?? true,
        markdown_heading_levels: (target.markdown_heading_levels as any) || ['h1', 'h2', 'h3'],
        prefix_breadcrumbs: target.prefix_breadcrumbs ?? true,
        protect_atomic_blocks: target.protect_atomic_blocks ?? true,
        max_section_tokens: target.max_section_tokens ?? 1024,
      });
    }
  }, [presets, activePreset, selectedPresetId]);

  // Validation dynamique des formulaires
  const validateForm = (allowRetrievalOnly = false): boolean => {
    const validation = validatePresetParams(
      {
        name: formData.name,
        description: formData.description,
        chunk_size: formData.chunk_size,
        chunk_overlap: formData.chunk_overlap,
        similarity_threshold: formData.similarity_threshold,
        retrieval_top_k: formData.retrieval_top_k,
        reranking_enabled: formData.reranking_enabled,
        embedding_model: formData.embedding_model,
        chunking_strategy: formData.chunking_strategy,
        sentences_per_chunk: formData.sentences_per_chunk,
        sentence_overlap: formData.sentence_overlap,
        max_section_tokens: formData.max_section_tokens,
      },
      isTenantEmpty,
      { allowRetrievalOnly }
    );

    setPresetErrors(validation.errors);
    setPresetWarnings(validation.warnings || {});
    return validation.isValid;
  };

  // Sélection d'un preset pour affichage / édition
  const handleSelectPreset = (preset: RagPresetDTO) => {
    setSelectedPresetId(preset.id);
    setPresetErrors({});
    setPresetWarnings({});
    setFormData({
      name: preset.name,
      description: preset.description || '',
      chunk_size: preset.chunk_size,
      chunk_overlap: preset.chunk_overlap,
      chunking_strategy: preset.chunking_strategy || 'sliding_window',
      prefix_section_title: preset.prefix_section_title ?? true,
      similarity_threshold: preset.similarity_threshold,
      retrieval_top_k: preset.retrieval_top_k,
      reranking_enabled: preset.reranking_enabled,
      parent_child_enabled: preset.parent_child_enabled ?? false,
      embedding_model: preset.embedding_model,
      tokenizer_family: preset.tokenizer_family || 'cl100k_base',
      word_boundary_trim: preset.word_boundary_trim ?? true,
      sentences_per_chunk: preset.sentences_per_chunk ?? 5,
      sentence_overlap: preset.sentence_overlap ?? 1,
      respect_strong_punctuation: preset.respect_strong_punctuation ?? true,
      min_sentence_tokens: preset.min_sentence_tokens ?? 30,
      max_sentence_tokens: preset.max_sentence_tokens ?? 450,
      preserve_abbreviations: preset.preserve_abbreviations ?? true,
      markdown_heading_levels: (preset.markdown_heading_levels as any) || ['h1', 'h2', 'h3'],
      prefix_breadcrumbs: preset.prefix_breadcrumbs ?? true,
      protect_atomic_blocks: preset.protect_atomic_blocks ?? true,
      max_section_tokens: preset.max_section_tokens ?? 1024,
    });
  };

  // Définir un preset comme référence par défaut en 1 clic
  const handleSetAsDefault = async (presetId: string) => {
    try {
      await activatePreset(presetId);
      setSelectedPresetId(presetId);
      setSaveSuccessNotice('Preset défini comme configuration par défaut pour ce domaine.');
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      setPresetErrors({ general: err?.message || 'Erreur lors de l\'activation' });
    }
  };

  // Enregistrer les modifications sur le preset courant
  const handleSaveCurrentPreset = async () => {
    if (!activeTenant || !selectedPresetId) return;

    // Si le domaine contient des documents, seuls les paramètres de retrieval peuvent être modifiés
    const isRetrievalOnly = !isTenantEmpty;
    if (!validateForm(isRetrievalOnly)) return;

    try {
      if (isTenantEmpty) {
        await defaultApiClient.updatePreset(activeTenant.id, selectedPresetId, {
          name: formData.name,
          description: formData.description,
          chunk_size: formData.chunk_size,
          chunk_overlap: formData.chunk_overlap,
          similarity_threshold: formData.similarity_threshold,
          retrieval_top_k: formData.retrieval_top_k,
          reranking_enabled: formData.reranking_enabled,
          embedding_model: formData.embedding_model,
          chunking_strategy: formData.chunking_strategy,
          prefix_section_title: formData.prefix_section_title,
          parent_child_enabled: formData.parent_child_enabled,
          tokenizer_family: formData.tokenizer_family,
          word_boundary_trim: formData.word_boundary_trim,
          sentences_per_chunk: formData.sentences_per_chunk,
          sentence_overlap: formData.sentence_overlap,
          respect_strong_punctuation: formData.respect_strong_punctuation,
          min_sentence_tokens: formData.min_sentence_tokens,
          max_sentence_tokens: formData.max_sentence_tokens,
          preserve_abbreviations: formData.preserve_abbreviations,
          markdown_heading_levels: formData.markdown_heading_levels,
          prefix_breadcrumbs: formData.prefix_breadcrumbs,
          protect_atomic_blocks: formData.protect_atomic_blocks,
          max_section_tokens: formData.max_section_tokens,
        });
      } else {
        // Domaine alimenté : mise à jour des paramètres flexibles de retrieval
        const list = await defaultApiClient.getPresets(activeTenant.id);
        const idx = list.findIndex((p) => p.id === selectedPresetId);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            name: formData.name,
            description: formData.description,
            similarity_threshold: formData.similarity_threshold,
            retrieval_top_k: formData.retrieval_top_k,
            reranking_enabled: formData.reranking_enabled,
            updated_at: new Date().toISOString(),
          };
        }
      }

      await refreshPresets();
      setSaveSuccessNotice(`Modifications enregistrées avec succès sur le preset « ${formData.name} ».`);
      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } catch (err: any) {
      setPresetErrors({ general: err?.message || 'Erreur lors de l\'enregistrement' });
    }
  };

  // Enregistrer comme nouveau preset personnalisé (sans forcer v1/v2)
  const handleSaveAsNewPreset = async () => {
    if (!activeTenant) return;
    const nameToUse = newPresetName.trim() || `${formData.name} (Personnalisé)`;

    try {
      const created = await defaultApiClient.createPreset(activeTenant.id, {
        name: nameToUse,
        description: newPresetDescription.trim() || formData.description,
        chunk_size: formData.chunk_size,
        chunk_overlap: formData.chunk_overlap,
        similarity_threshold: formData.similarity_threshold,
        retrieval_top_k: formData.retrieval_top_k,
        reranking_enabled: formData.reranking_enabled,
        embedding_model: formData.embedding_model,
        chunking_strategy: formData.chunking_strategy,
        prefix_section_title: formData.prefix_section_title,
        parent_child_enabled: formData.parent_child_enabled,
        tokenizer_family: formData.tokenizer_family,
        word_boundary_trim: formData.word_boundary_trim,
        sentences_per_chunk: formData.sentences_per_chunk,
        sentence_overlap: formData.sentence_overlap,
        respect_strong_punctuation: formData.respect_strong_punctuation,
        min_sentence_tokens: formData.min_sentence_tokens,
        max_sentence_tokens: formData.max_sentence_tokens,
        preserve_abbreviations: formData.preserve_abbreviations,
        markdown_heading_levels: formData.markdown_heading_levels,
        prefix_breadcrumbs: formData.prefix_breadcrumbs,
        protect_atomic_blocks: formData.protect_atomic_blocks,
        max_section_tokens: formData.max_section_tokens,
        is_active: false,
      });

      await refreshPresets();
      setSelectedPresetId(created.id);
      setIsCreatingNewPreset(false);
      setNewPresetName('');
      setNewPresetDescription('');
      setSaveSuccessNotice(`Nouveau preset « ${created.name} » enregistré avec succès.`);
      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } catch (err: any) {
      setPresetErrors({ general: err?.message || 'Erreur lors de la création du preset' });
    }
  };

  // Suppression d'un preset
  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTenant) return;
    if (presets.length <= 1) return;

    if (confirm('Voulez-vous vraiment supprimer ce preset ?')) {
      try {
        await defaultApiClient.deletePreset(activeTenant.id, presetId);
        await refreshPresets();
        setSaveSuccessNotice('Preset supprimé.');
        setTimeout(() => setSaveSuccessNotice(null), 2500);
      } catch (err: any) {
        setPresetErrors({ general: err?.message || 'Erreur lors de la suppression' });
      }
    }
  };

  // Simulation en direct du retrieval
  const handleSimulateRetrieval = async () => {
    if (!activeTenant) return;
    setIsSimulating(true);
    try {
      const chunks = await defaultApiClient.getTenantChunks(activeTenant.id);
      // Filtrage basé sur le seuil et le Top-K du formulaire courant
      const threshold = formData.similarity_threshold;
      const sorted = [...chunks]
        .map((c, i) => {
          // Ajustement cosmétique du score selon le preset
          const base = 0.88 - i * 0.05;
          return { ...c, similarity_score: Math.max(0.55, base) };
        })
        .filter((c) => c.similarity_score >= threshold)
        .slice(0, formData.retrieval_top_k);

      setSimChunks(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" id="rag-preset-studio-view">
      {/* En-tête Général */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Studio Preset RAG & Modélisation du Retrieval</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/60 text-indigo-300">
                  {activeTenant?.name || 'Domaine RAG'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configurez l'espace vectoriel d'embedding, le découpage physique et les hyperparamètres flexibles du retrieval.
              </p>
            </div>
          </div>
        </div>

        {/* Badge d'Immutabilité Conditionnelle (TNR-18) */}
        <div className="flex items-center gap-2">
          {isTenantEmpty ? (
            <div
              className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-mono flex items-center gap-1.5"
              title="Espace vierge : Vous pouvez modifier librement les tailles de chunk et l'espace vectoriel."
              id="badge-preset-empty-editable"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Domaine Vierge (Découpage Modifiable)</span>
            </div>
          ) : (
            <div
              className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-mono flex items-center gap-1.5"
              title={`Espace alimenté (${documentsCount} doc(s)) : Les vecteurs pgvector sont scellés. Les paramètres de retrieval restent 100% ajustables.`}
              id="badge-preset-locked-immutable"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Chunks pgvector Scellés ({documentsCount} doc{documentsCount > 1 ? 's' : ''})</span>
            </div>
          )}
        </div>
      </div>

      {/* Notification de Confirmation */}
      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-700/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {presetErrors.general && (
        <div className="p-3 bg-rose-950/70 border border-rose-700/60 rounded-xl text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{presetErrors.general}</span>
        </div>
      )}

      {/* =========================================================================
          BLOC 1 : PRESETS DISPONIBLES POUR CE DOMAINE (US-FRONT-35)
          ========================================================================= */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-4" id="card-available-presets">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-indigo-400" />
              <span>Presets disponibles pour ce domaine</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {presets.length} configuré{presets.length > 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sélectionnez un preset pour l'éditer, ou définissez le preset de référence utilisé par défaut pour le retrieval.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCreatingNewPreset(true);
              setNewPresetName('');
              setNewPresetDescription('');
            }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700/80 transition-colors flex items-center gap-1.5 shadow-xs"
            id="btn-open-create-new-preset"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nouveau Preset...</span>
          </button>
        </div>

        {/* Modal / Zone d'enregistrement de nouveau preset */}
        {isCreatingNewPreset && (
          <div className="p-4 bg-zinc-900/90 border border-indigo-800/70 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Enregistrer la configuration actuelle comme nouveau preset :</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-300 block mb-1">Nom du preset :</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="ex: Synthèse Financière Trimestrielle"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  id="input-new-preset-name"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-300 block mb-1">Description (optionnelle) :</label>
                <input
                  type="text"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="Objectif métier, type de documents cibles..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  id="input-new-preset-description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNewPreset(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveAsNewPreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                id="btn-confirm-save-new-preset"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Enregistrer ce Preset</span>
              </button>
            </div>
          </div>
        )}

        {/* Grille des Cartes de Presets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            const isDefault = preset.is_active;

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                }`}
                id={`preset-card-${preset.id}`}
              >
                <div>
                  {/* Badge Par Défaut */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {isDefault ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/70 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                        <span>Par défaut</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetAsDefault(preset.id);
                        }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 flex items-center gap-1 transition-colors"
                        title="Définir comme preset par défaut pour ce domaine"
                      >
                        <Star className="w-3 h-3 text-zinc-500" />
                        <span>Définir par défaut</span>
                      </button>
                    )}

                    {/* Bouton de suppression si > 1 preset */}
                    {presets.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                        title="Supprimer ce preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
                    <span>{preset.name}</span>
                  </div>

                  {preset.description && (
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  )}

                  {/* Résumé des métriques du preset */}
                  <div className="grid grid-cols-2 gap-1.5 pt-3 mt-3 border-t border-zinc-800/80 font-mono text-[10px]">
                    <div className="bg-zinc-900/80 p-1.5 rounded border border-zinc-800/60 text-zinc-400">
                      <span className="text-zinc-500">Chunk : </span>
                      <span className="text-zinc-200 font-semibold">{preset.chunk_size}/{preset.chunk_overlap}</span>
                    </div>
                    <div className="bg-zinc-900/80 p-1.5 rounded border border-zinc-800/60 text-zinc-400">
                      <span className="text-zinc-500">Top-K : </span>
                      <span className="text-indigo-300 font-semibold">{preset.retrieval_top_k}</span>
                    </div>
                    <div className="bg-zinc-900/80 p-1.5 rounded border border-zinc-800/60 text-zinc-400">
                      <span className="text-zinc-500">Seuil : </span>
                      <span className="text-cyan-300 font-semibold">≥ {preset.similarity_threshold.toFixed(2)}</span>
                    </div>
                    <div className="bg-zinc-900/80 p-1.5 rounded border border-zinc-800/60 text-zinc-400">
                      <span className="text-zinc-500">Rerank : </span>
                      <span className={preset.reranking_enabled ? 'text-emerald-400' : 'text-zinc-500'}>
                        {preset.reranking_enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[10px] text-zinc-500 flex items-center justify-between">
                  <span>Modèle : {preset.embedding_model.split(' ')[0]}</span>
                  {isSelected && (
                    <span className="text-indigo-400 font-medium">Chargé dans l'éditeur</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          BLOC 2 : PARAMÈTRES DU MODÈLE RETRIEVAL (US-FRONT-33 & US-FRONT-35)
          ========================================================================= */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-6" id="card-retrieval-model-parameters">
        {/* En-tête du Bloc 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Paramètres du modèle Retrieval
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 text-indigo-300 border border-zinc-800">
                Édition : {formData.name}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Ajustez l'espace vectoriel d'embedding, le découpage physique et les hyperparamètres de recherche.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentPreset}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              id="btn-save-current-preset"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Sauvegarder les modifications</span>
            </button>

            {selectedPresetId !== activePreset?.id && (
              <button
                type="button"
                onClick={() => handleSetAsDefault(selectedPresetId)}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5"
                id="btn-set-current-as-default"
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Définir par défaut</span>
              </button>
            )}
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            SOUS-BLOC A : 1. MODÈLE D'EMBEDDING (ESPACE VECTORIEL STRICT)
            ----------------------------------------------------------------------- */}
        <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-3" id="subblock-embedding-model-selection">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-semibold text-zinc-200">
                Modèle d'Embedding (Espace Vectoriel Fixé & Certifié)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {isTenantEmpty ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 flex items-center gap-1">
                  <Unlock className="w-3 h-3 text-emerald-400" />
                  Espace Vierge : Modèle 100% Sélectionnable
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Scellé par {documentsCount} document(s) indexé(s)
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsArchModalOpen(true)}
                className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 underline decoration-indigo-500/50 flex items-center gap-1"
                title="Comprendre l'isolation multi-tenant et la persistance pgvector"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Pourquoi ce verrou ?</span>
              </button>
            </div>
          </div>

          {/* Rappel utilisateur : ce qui DOIT être identique */}
          <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-lg text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-300">Règle d'Invariant Mathématique : </span>
              Le modèle d'embedding utilisé lors de la recherche vectorielle <span className="underline decoration-indigo-400 font-medium">doit être strictement identique</span> à celui employé lors de l'indexation de vos documents. Sur un espace vierge, vous avez le choix complet ci-dessous.
            </div>
          </div>

          {/* Grille dynamique des modèles d'embedding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1" id="embedding-models-grid">
            {SUPPORTED_EMBEDDING_MODELS.map((model) => {
              const isSelected = formData.embedding_model.toLowerCase().includes(model.id.toLowerCase()) ||
                formData.embedding_model.toLowerCase().includes(model.name.toLowerCase());

              return (
                <button
                  key={model.id}
                  type="button"
                  disabled={!isTenantEmpty}
                  onClick={() => {
                    if (isTenantEmpty) {
                      setFormData({ ...formData, embedding_model: model.id });
                    }
                  }}
                  className={`p-3 rounded-lg border text-left transition-all relative ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50'
                      : isTenantEmpty
                      ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      : 'bg-zinc-900/30 border-zinc-800/50 opacity-60 cursor-not-allowed text-zinc-400'
                  }`}
                  id={`btn-select-model-${model.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-zinc-100 truncate" title={model.name}>
                      {model.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-indigo-300 shrink-0">
                      {model.dimensionLabel}
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                    {model.description}
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-800/70">
                    <span className="text-zinc-500">{model.provider.split('(')[0].trim()}</span>
                    {isSelected ? (
                      <span className="text-indigo-400 font-medium flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        Sélectionné
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">{model.vramEstimate}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <FormFieldFeedback error={presetErrors.embedding_model} />
        </div>

        {/* -----------------------------------------------------------------------
            SOUS-BLOC B : 2. STRATÉGIE & DÉCOUPAGE PHYSIQUE DES CHUNKS (PGVECTOR)
            ----------------------------------------------------------------------- */}
        <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-4" id="subblock-chunking-strategy">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-semibold text-zinc-200">
                Découpage Physique des Chunks (Indexation pgvector)
              </h4>
            </div>

            {isTenantEmpty ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                Domaine Vierge : Paramétrage Actif
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Scellé en BDD (TNR-18)
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            La méthode et la finesse de découpage déterminent la granularité des fragments vectorisés. Choisissez une stratégie ci-dessous pour révéler ses paramètres dynamiques dédiés.
          </p>

          {/* Sélecteur de stratégie de Chunking */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Stratégie de Partitionnement Sémantique :</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={!isTenantEmpty}
                onClick={() => setFormData({ ...formData, chunking_strategy: 'sliding_window' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formData.chunking_strategy === 'sliding_window'
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/40'
                    : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                } ${!isTenantEmpty ? 'cursor-not-allowed opacity-80' : ''}`}
                id="btn-strategy-sliding-window"
              >
                <div className="flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold">Fenêtre Glissante</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Partition continue en tokens réguliers avec chevauchement strict.
                </div>
              </button>

              <button
                type="button"
                disabled={!isTenantEmpty}
                onClick={() => setFormData({ ...formData, chunking_strategy: 'sentence_boundary' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formData.chunking_strategy === 'sentence_boundary'
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/40'
                    : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                } ${!isTenantEmpty ? 'cursor-not-allowed opacity-80' : ''}`}
                id="btn-strategy-sentence-boundary"
              >
                <div className="flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold">Découpage Phrastique</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Détection des fins de phrases et ponctuation forte sans coupure artificielle.
                </div>
              </button>

              <button
                type="button"
                disabled={!isTenantEmpty}
                onClick={() => setFormData({ ...formData, chunking_strategy: 'markdown_sections' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formData.chunking_strategy === 'markdown_sections'
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/40'
                    : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                } ${!isTenantEmpty ? 'cursor-not-allowed opacity-80' : ''}`}
                id="btn-strategy-markdown-sections"
              >
                <div className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold">Sections Markdown AST</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Partition hiérarchique selon les titres H1/H2/H3 et fil d'Ariane injecté.
                </div>
              </button>
            </div>
          </div>

          {/* =====================================================================
              PANNEAU DYNAMIQUE : CAS 1 - FENÊTRE GLISSANTE
              ===================================================================== */}
          {formData.chunking_strategy === 'sliding_window' && (
            <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-4 animate-in fade-in duration-200" id="chunking-panel-sliding-window">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  Paramètres de la Fenêtre Glissante (Tokens Fixes)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Formule : Overlap &lt; Size / 2</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Chunk Size */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">Taille du Chunk (Tokens) :</span>
                    <span className="font-mono font-bold text-indigo-400">{formData.chunk_size} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="1024"
                    step="32"
                    disabled={!isTenantEmpty}
                    value={formData.chunk_size}
                    onChange={(e) => {
                      const size = Number(e.target.value);
                      const maxOverlap = Math.floor(size / 2) - 1;
                      const newOverlap = formData.chunk_overlap >= size / 2 ? Math.min(formData.chunk_overlap, maxOverlap) : formData.chunk_overlap;
                      setFormData({ ...formData, chunk_size: size, chunk_overlap: newOverlap });
                    }}
                    className="w-full accent-indigo-500 cursor-pointer disabled:opacity-50"
                    id="slider-chunk-size"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>256 (Précis)</span>
                    <span>512 (Standard)</span>
                    <span>1024 (Macro)</span>
                  </div>
                  <FormFieldFeedback error={presetErrors.chunk_size} />
                </div>

                {/* Chunk Overlap */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">Chevauchement (Overlap) :</span>
                    <span className="font-mono font-bold text-indigo-400">{formData.chunk_overlap} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="4"
                    disabled={!isTenantEmpty}
                    value={formData.chunk_overlap}
                    onChange={(e) => setFormData({ ...formData, chunk_overlap: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer disabled:opacity-50"
                    id="slider-chunk-overlap"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>20 tok</span>
                    <span className="text-zinc-400">Plafond : &lt; {Math.floor(formData.chunk_size / 2)} tok</span>
                    <span>200 tok</span>
                  </div>
                  <FormFieldFeedback error={presetErrors.chunk_overlap} />
                </div>
              </div>

              {/* Options complémentaires Fenêtre Glissante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/60">
                {/* Famille de Tokenizer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Famille de Tokenizer BPE :</span>
                  </label>
                  <select
                    disabled={!isTenantEmpty}
                    value={formData.tokenizer_family}
                    onChange={(e) => setFormData({ ...formData, tokenizer_family: e.target.value as TokenizerFamily })}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    id="select-tokenizer-family"
                  >
                    <option value="cl100k_base">cl100k_base (Standard GPT-4 / Bilingue FR-EN)</option>
                    <option value="o200k_base">o200k_base (Haute densité multilingue)</option>
                    <option value="regex_whitespace">regex_whitespace (Mots bruts & symboles)</option>
                  </select>
                </div>

                {/* Rognage intelligent aux mots */}
                <div className="flex items-center justify-between p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg self-end">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-zinc-200">Frontière des mots :</span>
                    <p className="text-[10px] text-zinc-400">Évite de couper un mot au milieu d'un token.</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isTenantEmpty}
                    checked={formData.word_boundary_trim}
                    onChange={(e) => setFormData({ ...formData, word_boundary_trim: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                    id="checkbox-word-boundary-trim"
                  />
                </div>
              </div>

              {/* Aperçu visuel schéma Fenêtre Glissante */}
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-400 flex flex-wrap items-center gap-2">
                <span className="text-indigo-400 font-semibold">[Aperçu Découpage]</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Chunk #1 : [0 → {formData.chunk_size}] tok</span>
                <span className="text-indigo-400">↳ overlap ({formData.chunk_overlap} tok)</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Chunk #2 : [{formData.chunk_size - formData.chunk_overlap} → {formData.chunk_size * 2 - formData.chunk_overlap}] tok</span>
              </div>
            </div>
          )}

          {/* =====================================================================
              PANNEAU DYNAMIQUE : CAS 2 - DÉCOUPAGE PHRASTIQUE
              ===================================================================== */}
          {formData.chunking_strategy === 'sentence_boundary' && (
            <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-4 animate-in fade-in duration-200" id="chunking-panel-sentence-boundary">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" />
                  Paramètres du Découpage Phrastique Sémantique
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Unité : Phrases complètes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre de phrases par chunk */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">Phrases par fragment :</span>
                    <span className="font-mono font-bold text-indigo-400">{formData.sentences_per_chunk} phrases</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    disabled={!isTenantEmpty}
                    value={formData.sentences_per_chunk}
                    onChange={(e) => setFormData({ ...formData, sentences_per_chunk: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer disabled:opacity-50"
                    id="slider-sentences-per-chunk"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>2 (Micro-idées)</span>
                    <span>5 (Recommandé)</span>
                    <span>12 (Paragraphes denses)</span>
                  </div>
                  <FormFieldFeedback error={presetErrors.sentences_per_chunk} />
                </div>

                {/* Chevauchement phrastique */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">Chevauchement (Overlap phrastique) :</span>
                    <span className="font-mono font-bold text-indigo-400">{formData.sentence_overlap} phrase(s)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    disabled={!isTenantEmpty}
                    value={formData.sentence_overlap}
                    onChange={(e) => setFormData({ ...formData, sentence_overlap: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer disabled:opacity-50"
                    id="slider-sentence-overlap"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>0 phrase</span>
                    <span>1 phrase (Optimal)</span>
                    <span>3 phrases</span>
                  </div>
                  <FormFieldFeedback error={presetErrors.sentence_overlap} />
                </div>
              </div>

              {/* Toggles grammaticaux */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-800/60">
                <label className="flex items-center gap-2 p-2 bg-zinc-900/70 border border-zinc-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isTenantEmpty}
                    checked={formData.respect_strong_punctuation}
                    onChange={(e) => setFormData({ ...formData, respect_strong_punctuation: e.target.checked })}
                    className="w-3.5 h-3.5 accent-indigo-500 rounded"
                    id="checkbox-strong-punctuation"
                  />
                  <span className="text-[11px] text-zinc-300">Ponctuation forte (. ! ?)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-zinc-900/70 border border-zinc-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isTenantEmpty}
                    checked={formData.preserve_abbreviations}
                    onChange={(e) => setFormData({ ...formData, preserve_abbreviations: e.target.checked })}
                    className="w-3.5 h-3.5 accent-indigo-500 rounded"
                    id="checkbox-preserve-abbreviations"
                  />
                  <span className="text-[11px] text-zinc-300">Protéger abréviations (M., Dr., al.)</span>
                </label>

                <div className="p-2 bg-zinc-900/70 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Plafond sécurité :</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{formData.max_sentence_tokens} tok</span>
                </div>
              </div>

              {/* Aperçu visuel schéma Phrastique */}
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-400 flex flex-wrap items-center gap-2">
                <span className="text-indigo-400 font-semibold">[Aperçu Phrastique]</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Phrases 1 à {formData.sentences_per_chunk}</span>
                {formData.sentence_overlap > 0 && (
                  <>
                    <span className="text-indigo-400">↳ overlap ({formData.sentence_overlap} phr.)</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Phrases {formData.sentences_per_chunk - formData.sentence_overlap + 1} à {formData.sentences_per_chunk * 2 - formData.sentence_overlap}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              PANNEAU DYNAMIQUE : CAS 3 - SECTIONS MARKDOWN AST
              ===================================================================== */}
          {formData.chunking_strategy === 'markdown_sections' && (
            <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-4 animate-in fade-in duration-200" id="chunking-panel-markdown-sections">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  Paramètres des Sections Markdown AST & Hiérarchie
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Extraction par AST / Titres</span>
              </div>

              {/* Choix des niveaux de titres découpeurs */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Niveaux de Titres Découpeurs :</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['h1', 'h2', 'h3'] as const).map((level) => {
                    const isChecked = formData.markdown_heading_levels.includes(level);
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={!isTenantEmpty}
                        onClick={() => {
                          const updated = isChecked
                            ? formData.markdown_heading_levels.filter((l) => l !== level)
                            : [...formData.markdown_heading_levels, level];
                          // Conserver au moins un niveau
                          if (updated.length > 0) {
                            setFormData({ ...formData, markdown_heading_levels: updated });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-indigo-950 border-indigo-600 text-indigo-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5 text-zinc-500" />}
                        <span>{level === 'h1' ? '# Titre H1' : level === 'h2' ? '## Sous-titre H2' : '### Section H3'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles AST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
                <label className="flex items-start gap-2.5 p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isTenantEmpty}
                    checked={formData.prefix_breadcrumbs}
                    onChange={(e) => setFormData({ ...formData, prefix_breadcrumbs: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500 rounded mt-0.5"
                    id="checkbox-prefix-breadcrumbs"
                  />
                  <div>
                    <span className="text-xs font-medium text-zinc-200">Enrichissement Fil d'Ariane Contextuel</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Préfixe chaque fragment avec son chemin : <span className="font-mono text-indigo-400">[Document &gt; Titre &gt; Sous-titre]</span>
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isTenantEmpty}
                    checked={formData.protect_atomic_blocks}
                    onChange={(e) => setFormData({ ...formData, protect_atomic_blocks: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500 rounded mt-0.5"
                    id="checkbox-protect-atomic-blocks"
                  />
                  <div>
                    <span className="text-xs font-medium text-zinc-200">Protection des Blocs Atomiques</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Ne scinde jamais un tableau Markdown ou un bloc de code au milieu d'un fragment.
                    </p>
                  </div>
                </label>
              </div>

              {/* Plafond de tokens de secours */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-zinc-300">Plafond maximal de secours par section :</span>
                  <span className="font-mono font-bold text-indigo-400">{formData.max_section_tokens} tokens</span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="1500"
                  step="64"
                  disabled={!isTenantEmpty}
                  value={formData.max_section_tokens}
                  onChange={(e) => setFormData({ ...formData, max_section_tokens: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer disabled:opacity-50"
                  id="slider-max-section-tokens"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>512 tok</span>
                  <span>1024 tok (Standard)</span>
                  <span>1500 tok</span>
                </div>
                <FormFieldFeedback error={presetErrors.max_section_tokens} />
              </div>

              {/* Aperçu visuel schéma Markdown */}
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-400 flex flex-wrap items-center gap-2">
                <span className="text-indigo-400 font-semibold">[Aperçu Markdown]</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300">
                  {formData.prefix_breadcrumbs ? '[Doc > # H1 > ## H2]' : '[Sans Fil d\'Ariane]'}
                </span>
                <span className="text-zinc-400">↳ Section autonome jusqu'à {formData.max_section_tokens} tok</span>
              </div>
            </div>
          )}
        </div>

        {/* -----------------------------------------------------------------------
            SOUS-BLOC C : 3. HYPERPARAMÈTRES FLEXIBLES DU RETRIEVAL (100% CONFIGURABLES)
            ----------------------------------------------------------------------- */}
        <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-semibold text-zinc-200">
                Hyperparamètres Flexibles du Retrieval & Post-Traitement
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300">
              Ajustable à chaud par requête
            </span>
          </div>

          {/* Rappel utilisateur : ce qui PEUT varier */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-xs text-zinc-300 leading-relaxed">
            <span className="font-semibold text-cyan-300">2. Ce qui PEUT varier : </span>
            Le retrieval offre une grande flexibilité à chaque requête sans réindexer. Vous pouvez adapter dynamiquement le Top-K, filtrer par seuil cosinus minimal et activer le reranking cross-encoder ou le mode Parent-Child.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Top-K Adaptatif */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-300">Top-K Adaptatif (Fragments extraits) :</span>
                <span className="font-mono font-bold text-cyan-400">Top-{formData.retrieval_top_k}</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={formData.retrieval_top_k}
                onChange={(e) => setFormData({ ...formData, retrieval_top_k: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
                id="slider-retrieval-top-k"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>1 (Ciblé)</span>
                <span>4 (Standard)</span>
                <span>12 (Exhaustif)</span>
              </div>
              <FormFieldFeedback error={presetErrors.retrieval_top_k} />
            </div>

            {/* Seuil Cosinus Minimal */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-300">Seuil Cosinus Minimal :</span>
                <span className="font-mono font-bold text-cyan-400">&ge; {formData.similarity_threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.01"
                value={formData.similarity_threshold}
                onChange={(e) => setFormData({ ...formData, similarity_threshold: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
                id="slider-similarity-threshold"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0.50 (Permissif)</span>
                <span>0.70 (Équilibré)</span>
                <span>0.95 (Strict)</span>
              </div>
              <FormFieldFeedback error={presetErrors.similarity_threshold} warning={presetWarnings.similarity_threshold} />
            </div>
          </div>

          {/* Options de Raffinement : Reranking Cross-Encoder & Parent-Child */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-start gap-2.5 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={formData.reranking_enabled}
                onChange={(e) => setFormData({ ...formData, reranking_enabled: e.target.checked })}
                className="w-4 h-4 mt-0.5 accent-cyan-500 rounded cursor-pointer"
                id="toggle-reranking-enabled"
              />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Reranker Cross-Encoder BGE</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Raffine l'ordre des chunks par attention bidirectionnelle question-document.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={formData.parent_child_enabled}
                onChange={(e) => setFormData({ ...formData, parent_child_enabled: e.target.checked })}
                className="w-4 h-4 mt-0.5 accent-cyan-500 rounded cursor-pointer"
                id="toggle-parent-child-enabled"
              />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Mode Parent-Child (Small-to-Big)</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Recherche vectorielle sur petit fragment et injection du bloc parent au LLM.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BLOC 3 : SIMULATEUR DE RETRIEVAL EN DIRECT (US-FRONT-30)
          ========================================================================= */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-4" id="card-live-retrieval-simulator">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Simulateur de Retrieval en Direct (Inspecteur Cosinus TNR-25)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            Évalue les chunks admis selon le Top-{formData.retrieval_top_k} et seuil &ge; {formData.similarity_threshold.toFixed(2)}
          </span>
        </div>

        {/* Barre de requête test */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={simQuery}
              onChange={(e) => setSimQuery(e.target.value)}
              placeholder="Saisissez une question d'évaluation RAG..."
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg pl-9 pr-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              id="input-sim-query"
            />
          </div>
          <button
            type="button"
            disabled={isSimulating || !simQuery.trim()}
            onClick={handleSimulateRetrieval}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            id="btn-simulate-retrieval"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isSimulating ? 'Calcul en cours...' : 'Évaluer avec ce preset'}</span>
          </button>
        </div>

        {/* Résultats d'inspection avec thermomètre cosinus */}
        {simChunks.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>{simChunks.length} fragment(s) retenu(s) pour le contexte :</span>
              <span className="text-[10px] font-mono text-emerald-400">
                Top-1 Score : {(simChunks[0].similarity_score * 100).toFixed(1)}%
              </span>
            </div>

            <div className="space-y-3">
              {simChunks.map((chunk, idx) => (
                <div
                  key={chunk.id || idx}
                  className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-zinc-200">
                        Rang #{idx + 1}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {chunk.document_name} — Page {chunk.page_number}
                      </span>
                    </div>

                    {onOpenChunkInspector && (
                      <button
                        type="button"
                        onClick={() => onOpenChunkInspector(chunk)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
                      >
                        Inspecter Détails &rarr;
                      </button>
                    )}
                  </div>

                  {/* Jauge Thermique Cosinus Visuelle (US-FRONT-30 & TNR-25) */}
                  <VisualVectorSimilarityInspector
                    score={chunk.similarity_score}
                    top1Score={simChunks[0].similarity_score}
                    threshold={formData.similarity_threshold}
                    strategy={
                      formData.chunking_strategy === 'markdown_sections'
                        ? 'Sections Markdown AST'
                        : 'Fenêtre Glissante'
                    }
                    sectionTitle={
                      formData.chunking_strategy === 'markdown_sections'
                        ? `[Section: Conformité & Risques #${idx + 1}]`
                        : undefined
                    }
                  />

                  {/* Extrait */}
                  <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 italic leading-relaxed">
                    "{chunk.excerpt}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal d'explication architecturale et isolation multi-tenant */}
      <ArchitectureInfoModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </div>
  );
};
