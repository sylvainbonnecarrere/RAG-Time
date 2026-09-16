/**
 * Studio des Presets RAG & Infobulles Pédagogiques - US-FRONT-07 & TNR-05
 * Permet d'éditer et tester les paramètres de chunking et de retrieval avec explications pédagogiques claires.
 * Règle d'or (TNR-05) : Un preset actif est immuable ; sa modification crée une nouvelle version v+1.
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { defaultApiClient } from '../../services/apiClient';
import { RagPresetDTO, MessageSourceDTO } from '../../contracts/api-types';
import {
  Sliders,
  Sparkles,
  Info,
  ShieldCheck,
  History,
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
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import { validatePresetParams } from '../../lib/validation/schemas';
import { FormFieldFeedback } from './FormFieldFeedback';

interface RagPresetStudioViewProps {
  onOpenChunkInspector?: (source: MessageSourceDTO) => void;
}

export const RagPresetStudioView: React.FC<RagPresetStudioViewProps> = ({
  onOpenChunkInspector,
}) => {
  const { activeTenant } = useTenant();
  const [presets, setPresets] = useState<RagPresetDTO[]>([]);
  const [activePreset, setActivePreset] = useState<RagPresetDTO | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // État d'édition local (buffer)
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    chunk_size: number;
    chunk_overlap: number;
    similarity_threshold: number;
    retrieval_top_k: number;
    reranking_enabled: boolean;
    embedding_model: string;
  }>({
    name: '',
    description: '',
    chunk_size: 512,
    chunk_overlap: 64,
    similarity_threshold: 0.7,
    retrieval_top_k: 4,
    reranking_enabled: true,
    embedding_model: 'nomic-embed-text-v1.5 (768d)',
  });

  // Simulateur en direct de Retrieval
  const [simQuery, setSimQuery] = useState('Quelles sont les exigences réglementaires et les protocoles de conformité ?');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simChunks, setSimChunks] = useState<MessageSourceDTO[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [presetErrors, setPresetErrors] = useState<Record<string, string>>({});
  const [presetWarnings, setPresetWarnings] = useState<Record<string, string>>({});

  // Chargement des presets du domaine actif
  const loadPresets = async () => {
    if (!activeTenant) return;
    setIsLoading(true);
    try {
      const list = await defaultApiClient.getPresets(activeTenant.id);
      setPresets(list);
      const current = list.find((p) => p.is_active) || list[0];
      if (current) {
        setActivePreset(current);
        setSelectedPresetId(current.id);
        setFormData({
          name: current.name,
          description: current.description || '',
          chunk_size: current.chunk_size,
          chunk_overlap: current.chunk_overlap,
          similarity_threshold: current.similarity_threshold,
          retrieval_top_k: current.retrieval_top_k,
          reranking_enabled: current.reranking_enabled,
          embedding_model: current.embedding_model,
        });
      }
    } catch (err) {
      console.error('Erreur chargement presets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
  }, [activeTenant?.id]);

  // Sélection d'un autre preset
  const handleSelectPreset = (presetId: string) => {
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setSelectedPresetId(presetId);
      setFormData({
        name: found.name,
        description: found.description || '',
        chunk_size: found.chunk_size,
        chunk_overlap: found.chunk_overlap,
        similarity_threshold: found.similarity_threshold,
        retrieval_top_k: found.retrieval_top_k,
        reranking_enabled: found.reranking_enabled,
        embedding_model: found.embedding_model,
      });
    }
  };

  // Activer le preset sélectionné
  const handleActivate = async () => {
    if (!activeTenant || !selectedPresetId) return;
    try {
      const activated = await defaultApiClient.activatePreset(activeTenant.id, selectedPresetId);
      setActivePreset(activated);
      setPresets((prev) =>
        prev.map((p) => ({ ...p, is_active: p.id === activated.id }))
      );
      setSaveSuccessNotice(`Preset « ${activated.name} » activé pour le domaine.`);
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      console.error('Erreur activation preset:', err);
    }
  };

  const isTenantEmpty = (activeTenant?.documents_count || 0) === 0;

  // Sauvegarder les modifications -> Autorisé UNIQUEMENT si l'espace est vierge (aucun document ingéré)
  const handleSavePreset = async () => {
    if (!activeTenant || !selectedPresetId) return;

    const validation = validatePresetParams(formData, isTenantEmpty);
    if (!validation.isValid) {
      setPresetErrors(validation.errors);
      if (validation.warnings) setPresetWarnings(validation.warnings);
      return;
    }

    setPresetErrors({});
    if (validation.warnings) setPresetWarnings(validation.warnings);

    try {
      const sanitizedData = validation.sanitized!;
      const updated = await defaultApiClient.updatePreset(activeTenant.id, selectedPresetId, {
        name: sanitizedData.name,
        description: sanitizedData.description,
        chunk_size: sanitizedData.chunk_size,
        chunk_overlap: sanitizedData.chunk_overlap,
        similarity_threshold: sanitizedData.similarity_threshold,
        retrieval_top_k: sanitizedData.retrieval_top_k,
        reranking_enabled: sanitizedData.reranking_enabled,
        embedding_model: sanitizedData.embedding_model,
        is_active: true,
      });

      // Recharger la liste
      const refreshed = await defaultApiClient.getPresets(activeTenant.id);
      setPresets(refreshed);
      setActivePreset(updated);
      setSelectedPresetId(updated.id);
      setSaveSuccessNotice(
        `Preset « ${updated.name} » mis à jour avec succès. Cet espace vierge est prêt pour l'ingestion de vos premiers documents.`
      );
      setTimeout(() => setSaveSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Erreur sauvegarde preset:', err);
    }
  };

  // Exécution de la simulation en direct
  const handleRunSimulation = async () => {
    if (!activeTenant) return;
    setIsSimulating(true);
    try {
      const chunks = await defaultApiClient.getTenantChunks(activeTenant.id);
      setSimChunks(chunks);
    } catch (err) {
      console.error('Erreur simulation:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtrage des chunks simulés selon le seuil et le Top-K en cours
  const evaluatedChunks = simChunks.map((chk) => {
    const isAboveThreshold = chk.similarity_score >= formData.similarity_threshold;
    return {
      ...chk,
      isAboveThreshold,
    };
  });

  const admittedChunks = evaluatedChunks
    .filter((c) => c.isAboveThreshold)
    .slice(0, formData.retrieval_top_k);

  const rejectedChunks = evaluatedChunks.filter(
    (c) => !c.isAboveThreshold || !admittedChunks.includes(c)
  );

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* En-tête de section avec badge de conformité V1.1 */}
      <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-400 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">
                Studio des Presets RAG & Infobulles Pédagogiques
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300">
                Presets Actifs
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                Révisions Immuables
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Configurez finement la granularité du chunking et les seuils de filtrage vectoriel pgvector.
              Chaque modification génère une nouvelle révision immuable afin de garantir la reproductibilité des benchmarks.
            </p>
          </div>
        </div>

        {/* Domaine Actif */}
        <div className="flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-lg text-xs self-start md:self-auto">
          <span className="text-zinc-500">Domaine configuré :</span>
          <span className="font-semibold text-zinc-200 truncate max-w-[200px]">
            {activeTenant?.name || 'Domaine par défaut'}
          </span>
        </div>
      </div>

      {/* Notification de succès / Immutabilité */}
      {saveSuccessNotice && (
        <div className="bg-emerald-950/40 border border-emerald-800/70 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-emerald-200">Action Validée avec Succès</div>
            <div>{saveSuccessNotice}</div>
          </div>
        </div>
      )}

      {/* Guide Didactique RAG & Onboarding Interactif (Phase 5 - US-FRONT-15) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">
                Guide Didactique : Comprendre le Paramétrage RAG & pgvector
              </h3>
              <p className="text-[11px] text-zinc-400">
                Cliquez pour afficher les définitions mathématiques et les compromis de chaque paramètre.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTooltip(activeTooltip === 'all_glossary' ? null : 'all_glossary')}
            className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-indigo-300 font-medium transition-colors"
          >
            {activeTooltip === 'all_glossary' ? 'Masquer le glossaire' : 'Ouvrir le glossaire'}
          </button>
        </div>

        {activeTooltip === 'all_glossary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-3 border-t border-zinc-800 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Chunk Size (Taille de bloc)
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Nombre de tokens découpés par fragment. 512 tokens représente environ 350-400 mots français. Évite la perte de mémoire sémantique.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Chunk Overlap (Recouvrement)
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tokens partagés entre deux segments consécutifs (ex: 64 tokens = 12.5%). Garantit qu'une clause juridique à cheval n'est pas scindée.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Seuil Cosinus (Similarité)
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Score minimal (produit scalaire normalisé) pour qu'un chunk soit retenu. Au-dessus de 0.70, seules les sources pertinentes sont injectées.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Reciprocal Rank Fusion (k=60)
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Algorithme combinant le classement pgvector et BM25 par score RRF = &Sigma; 1/(k + rank). Lisse les écarts et évite le surclassement.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> pgvector HNSW Index
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Index graphe à sauts hierarchiques stocké dans PostgreSQL garantissant une recherche vectorielle sub-milliseconde sous isolation tenant_id.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
              <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Température LLM (0.1)
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Température quasi-nulle configurée sur Ollama local : force la génération à rester strictement fidèle aux chunks sourcés (zéro hallucination).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Indicateur Didactique des 2 États RAG : Vierge vs Alimenté Immuable (US-FRONT-19) */}
      {isTenantEmpty ? (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 flex items-start gap-3 text-xs text-zinc-300 shadow-md animate-in fade-in">
          <Unlock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-300">
                ÉTAT 1 : Espace RAG Vierge (0 document) • Presets 100% Configurables
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/70 border border-emerald-600 text-emerald-100">
                Modification Libre Activée
              </span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Aucun document n'a encore été ingéré ni découpé en chunks dans pgvector pour ce domaine.
              <strong> Vous pouvez ajuster et sauvegarder librement les curseurs</strong> (Chunk Size, Overlap, Seuil de Similarité) selon votre cas d'usage.
              Dès que vous téléverserez vos premiers fichiers, ce Preset sera <strong>définitivement scellé et immuable</strong> pour garantir la cohérence absolue de l'espace vectoriel.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/40 border border-amber-600/70 rounded-xl p-4 flex items-start gap-3 text-xs text-zinc-300 shadow-md animate-in fade-in">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-200">
                ÉTAT 2 : Espace RAG Alimenté • Preset Strictement Immuable
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/90 border border-amber-600 text-amber-100 font-semibold">
                🔒 {activeTenant?.documents_count} document(s) & Chunks Actifs dans pgvector
              </span>
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              Cet espace contient déjà des documents découpés en fragments vectoriels 768d dans PostgreSQL.
              Pour préserver la cohérence mathématique de l'index et l'auditabilité absolue des citations,
              <strong> ce Preset ne peut être ni modifié ni dupliqué en version v2</strong>.
              Toute modification est verrouillée. Pour expérimenter de nouveaux hyperparamètres,
              sélectionnez l'<strong>Espace Vierge (Sandbox Découverte)</strong> ou créez un domaine vierge.
            </p>
          </div>
        </div>
      )}

      {/* Grille principale : Éditeur à gauche / Simulateur de retrieval à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne Gauche : Sélecteur et Curseurs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Sélecteur de preset */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-4" id="card-preset-selector">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-400" />
                Presets Disponibles pour ce Domaine
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {presets.length} versions répertoriées
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                const isAct = preset.is_active;

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 text-zinc-100 shadow-sm'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                    id={`btn-select-preset-${preset.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-zinc-200 truncate">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                        v{preset.version}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                      {preset.description || 'Aucune description fournie.'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Chunk: {preset.chunk_size} tok</span>
                      <span>Seuil: {preset.similarity_threshold}</span>
                    </div>

                    {isAct && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bouton d'activation si le sélectionné n'est pas actif et si vierge */}
            {selectedPresetId !== activePreset?.id && isTenantEmpty && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleActivate}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  id="btn-activate-selected-preset"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Définir comme Preset Actif</span>
                </button>
              </div>
            )}
          </div>

          {/* Formulaire des Curseurs & Infobulles Pédagogiques */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-6" id="card-preset-sliders">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <span>Paramètres du Modèle de Retrieval</span>
                  {isTenantEmpty ? (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      (Mode Édition Libre)
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      (Verrouillé • Chunks Actifs)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isTenantEmpty
                    ? 'Ajustez les hyperparamètres avant d\'ingérer vos premiers fichiers.'
                    : 'Ce preset est figé pour préserver l\'intégrité des vecteurs existants.'}
                </p>
              </div>

              {isTenantEmpty ? (
                <button
                  onClick={handleSavePreset}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  id="btn-save-preset-revision"
                  title="Enregistrer les paramètres du preset pour cet espace vierge"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Sauvegarder le Preset</span>
                </button>
              ) : (
                <div
                  className="px-3.5 py-1.5 bg-zinc-900 border border-amber-700/70 text-amber-300 text-xs font-mono rounded-lg flex items-center gap-2 cursor-not-allowed opacity-90 shadow-sm"
                  id="badge-preset-locked-immutable"
                  title="Ce preset est scellé car des documents et chunks ont été vectorisés dans pgvector"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preset Immuable (Scellé)</span>
                </div>
              )}
            </div>

            {presetErrors.immutability && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{presetErrors.immutability}</span>
              </div>
            )}

            {/* Nom & Description */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!isTenantEmpty ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Nom du Preset
                </label>
                <input
                  type="text"
                  disabled={!isTenantEmpty}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (presetErrors.name) setPresetErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none transition-all disabled:bg-zinc-950 disabled:border-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed ${
                    presetErrors.name
                      ? 'border border-rose-500/80 focus:border-rose-500'
                      : 'border border-zinc-700/80 focus:border-indigo-500'
                  }`}
                  id="input-preset-name"
                />
                <FormFieldFeedback error={presetErrors.name} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Modèle d'Embedding pgvector
                </label>
                <select
                  disabled={!isTenantEmpty}
                  value={formData.embedding_model}
                  onChange={(e) => setFormData({ ...formData, embedding_model: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:bg-zinc-950 disabled:border-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  id="select-embedding-model"
                >
                  <option value="nomic-embed-text-v1.5 (768d)">nomic-embed-text-v1.5 (768d, Souverain local)</option>
                  <option value="bge-m3 (1024d)">bge-m3 (1024d, Multilingue dense+sparse)</option>
                  <option value="text-embedding-3-small (1536d)">text-embedding-3-small (1536d)</option>
                </select>
              </div>
            </div>

            {/* CURSEUR 1: Chunk Size */}
            <div className={`space-y-2 pt-2 ${!isTenantEmpty ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-200">
                    1. Taille de Chunk (Chunk Size)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === 'chunk_size' ? null : 'chunk_size')}
                    className="text-zinc-400 hover:text-indigo-400 transition-colors"
                    title="Explication pédagogique"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  {formData.chunk_size} tokens
                </span>
              </div>

              <input
                type="range"
                disabled={!isTenantEmpty}
                min="256"
                max="1024"
                step="64"
                value={formData.chunk_size}
                onChange={(e) => setFormData({ ...formData, chunk_size: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                id="slider-chunk-size"
              />

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>256 (Précis & atomique)</span>
                <span>512 (Standard recommandé)</span>
                <span>1024 (Macro-contexte large)</span>
              </div>

              {/* Infobulle Pédagogique Déroulante */}
              {(activeTooltip === 'chunk_size' || true) && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-400 space-y-1">
                  <span className="font-semibold text-zinc-300 block">Compromis Pédagogique :</span>
                  <p>
                    • <strong>Petit chunk (&le; 384 tokens) :</strong> Excellente précision vectorielle ; le vecteur représente fidèlement une idée unique. Risque de couper une phrase ou une formule mathématique.
                  </p>
                  <p>
                    • <strong>Grand chunk (&ge; 768 tokens) :</strong> Fournit un contexte narratif très riche au LLM mais dilue l'information dans le calcul de similarité cosinus (effet « aiguille dans une meule de foin »).
                  </p>
                </div>
              )}
            </div>

            {/* CURSEUR 2: Chunk Overlap */}
            <div className={`space-y-2 pt-2 ${!isTenantEmpty ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-200">
                    2. Recouvrement Inter-Chunks (Chunk Overlap)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === 'chunk_overlap' ? null : 'chunk_overlap')}
                    className="text-zinc-400 hover:text-indigo-400 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  {formData.chunk_overlap} tokens ({Math.round((formData.chunk_overlap / formData.chunk_size) * 100)}%)
                </span>
              </div>

              <input
                type="range"
                disabled={!isTenantEmpty}
                min="20"
                max="200"
                step="10"
                value={formData.chunk_overlap}
                onChange={(e) => setFormData({ ...formData, chunk_overlap: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                id="slider-chunk-overlap"
              />

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>20 tokens (Min)</span>
                <span>64 tokens (10-15% idéal)</span>
                <span>200 tokens (Max)</span>
              </div>

              <FormFieldFeedback
                error={presetErrors.chunk_overlap}
                warning={presetWarnings.chunk_overlap}
              />

              {activeTooltip === 'chunk_overlap' && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-400 space-y-1">
                  <span className="font-semibold text-zinc-300 block">Compromis Pédagogique :</span>
                  <p>
                    Le recouvrement assure la <strong>continuité sémantique</strong>. Il garantit qu'un concept ou une condition juridique positionnée précisément à la frontière de deux morceaux n'est pas tronquée. Un taux de 10% à 15% de la taille du chunk est recommandé.
                  </p>
                </div>
              )}
            </div>

            {/* CURSEUR 3: Similarity Threshold */}
            <div className={`space-y-2 pt-2 ${!isTenantEmpty ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-200">
                    3. Seuil Cosinus Minimal (Similarity Threshold)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === 'threshold' ? null : 'threshold')}
                    className="text-zinc-400 hover:text-indigo-400 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {formData.similarity_threshold.toFixed(2)}
                </span>
              </div>

              <input
                type="range"
                disabled={!isTenantEmpty}
                min="0.50"
                max="0.95"
                step="0.01"
                value={formData.similarity_threshold}
                onChange={(e) => {
                  setFormData({ ...formData, similarity_threshold: Number(e.target.value) });
                  if (presetErrors.similarity_threshold) {
                    setPresetErrors((prev) => ({ ...prev, similarity_threshold: '' }));
                  }
                }}
                className="w-full accent-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                id="slider-similarity-threshold"
              />

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0.50 (Très permissif)</span>
                <span>0.70 (Équilibré entreprise)</span>
                <span>0.90 (Stricte rigueur)</span>
              </div>

              <FormFieldFeedback
                error={presetErrors.similarity_threshold}
                warning={presetWarnings.similarity_threshold}
              />

              {activeTooltip === 'threshold' && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-400 space-y-1">
                  <span className="font-semibold text-zinc-300 block">Compromis Pédagogique :</span>
                  <p>
                    Filtre mathématique impitoyable : tout chunk dont le produit scalaire normalisé est inférieur à ce seuil est rejeté avant l'appel à Llama 3.2.
                  </p>
                  <p>
                    • <strong>Seuil élevé (&gt; 0.80) :</strong> Factualité absolue garantie. Si aucun document ne traite du sujet, le système répond honnêtement qu'il n'a pas trouvé.
                  </p>
                  <p>
                    • <strong>Seuil bas (&lt; 0.65) :</strong> Permet de tolérer les métaphores et les reformulations, mais risque d'injecter du bruit non pertinent.
                  </p>
                </div>
              )}
            </div>

            {/* CURSEUR 4: Retrieval Top-K & Reranker Toggle */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 ${!isTenantEmpty ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">
                    4. Nombre de Chunks (Top-K)
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-400">
                    K = {formData.retrieval_top_k}
                  </span>
                </div>

                <input
                  type="range"
                  disabled={!isTenantEmpty}
                  min="1"
                  max="12"
                  step="1"
                  value={formData.retrieval_top_k}
                  onChange={(e) => setFormData({ ...formData, retrieval_top_k: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  id="slider-retrieval-top-k"
                />

                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>1 extrait</span>
                  <span>4 recommandés</span>
                  <span>12 max</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-200 block">
                  5. Réordonnancement (Cross-Encoder)
                </span>
                <label className="flex items-center gap-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    disabled={!isTenantEmpty}
                    checked={formData.reranking_enabled}
                    onChange={(e) => setFormData({ ...formData, reranking_enabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer disabled:cursor-not-allowed"
                    id="checkbox-reranker-toggle"
                  />
                  <div>
                    <div className="text-xs font-medium text-zinc-200">
                      Activer le Reranker BGE
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Raffine le score de pertinence (+15ms TTFT)
                    </div>
                  </div>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Colonne Droite : Simulateur de Retrieval en Direct (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-4" id="card-retrieval-simulator">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Simulateur de Retrieval en Direct
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300">
                Temps Réel
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Testez instantanément le comportement de vos curseurs sur les documents indexés dans «{' '}
              <strong className="text-zinc-300">{activeTenant?.domain}</strong> ».
            </p>

            {/* Champ de question test */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400">Question de Test :</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simQuery}
                  onChange={(e) => setSimQuery(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Posez une question test..."
                  id="input-sim-query"
                />
                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-xs font-medium rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
                  id="btn-run-simulation"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Calcul...' : 'Tester'}</span>
                </button>
              </div>
            </div>

            {/* Statistiques d'évaluation simulées */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col">
                <span className="text-zinc-500 text-[10px]">Chunks Admis (Top-{formData.retrieval_top_k})</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {admittedChunks.length} retenus
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col">
                <span className="text-zinc-500 text-[10px]">Chunks Filtrés / Rejetés</span>
                <span className="text-amber-400 font-bold text-sm">
                  {rejectedChunks.length} exclus (&lt; {formData.similarity_threshold})
                </span>
              </div>
            </div>

            {/* Liste des extraits retenus */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                Résultats du Retrieval Sémantique :
              </span>

              {admittedChunks.length === 0 && !isSimulating && (
                <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 text-center text-xs text-zinc-400">
                  Cliquez sur « Tester » pour visualiser les chunks retenus par pgvector avec ce preset.
                </div>
              )}

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {admittedChunks.map((chk, idx) => (
                  <div
                    key={chk.id || idx}
                    className="p-3 rounded-lg bg-zinc-900/80 border border-emerald-800/40 text-xs space-y-1.5 hover:border-emerald-700/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200 truncate max-w-[200px]">
                        #{idx + 1} {chk.document_name}
                      </span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                        Score: {(chk.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-3 font-mono leading-relaxed">
                      {chk.excerpt}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400 border-t border-zinc-800/60">
                      <span>Page {chk.page_number} • {chk.metadata.tokens_count} tokens</span>
                      {onOpenChunkInspector && (
                        <button
                          onClick={() => onOpenChunkInspector(chk)}
                          className="text-indigo-400 hover:text-indigo-300 underline font-sans"
                        >
                          Inspecter JSONB &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Affichage pédagogique des chunks rejetés */}
                {rejectedChunks.slice(0, 2).map((chk, idx) => (
                  <div
                    key={`rej-${chk.id || idx}`}
                    className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/50 text-xs space-y-1 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 line-through truncate max-w-[200px]">
                        {chk.document_name}
                      </span>
                      <span className="font-mono text-[10px] text-amber-500">
                        Rejeté ({(chk.similarity_score * 100).toFixed(1)}% &lt; {(formData.similarity_threshold * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
