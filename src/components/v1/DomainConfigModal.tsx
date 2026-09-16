/**
 * Modal de Configuration et Gestion Complète des Domaines RAG - US-FRONT-02 & Personnalisation Utilisateur
 * Permet à l'utilisateur de définir librement le domaine de son RAG (Santé, Tech, Juridique, Science, ou Sur-mesure),
 * de basculer d'un domaine à un autre, de modifier la configuration, et de supprimer un domaine avec avertissement formel.
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { DomainCategory, TenantDTO } from '../../contracts/api-types';
import {
  Sparkles,
  Layers,
  X,
  Plus,
  Check,
  Compass,
  Cpu,
  Scale,
  Stethoscope,
  BookOpen,
  Users,
  TrendingUp,
  ShieldCheck,
  FolderPlus,
  Save,
  Trash2,
  AlertTriangle,
  FileText,
  Shield,
  ArrowRight,
  Database,
  Download,
} from 'lucide-react';
import { defaultApiClient } from '../../services/apiClient';
import { validateTenantForm } from '../../lib/validation/schemas';
import { FormFieldFeedback } from './FormFieldFeedback';

interface DomainConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'manage' | 'edit' | 'create';
}

interface DomainPreset {
  id: DomainCategory;
  name: string;
  icon: React.ElementType;
  description: string;
  defaultInstructions: string;
  suggestedDocs: string[];
}

export const DOMAIN_PRESETS: DomainPreset[] = [
  {
    id: 'general',
    name: 'Documentation & Connaissances Générales',
    icon: BookOpen,
    description: 'Documentation interne, guides pratiques, comptes-rendus de réunion et veille générale.',
    defaultInstructions: 'Vous êtes un assistant documentaire souverain précis et factuel. Répondez strictement à partir des sources citées.',
    suggestedDocs: ['Guide_Pratique.pdf', 'Notes_Projet.md'],
  },
  {
    id: 'tech',
    name: 'Ingénierie Logicielle & Systèmes',
    icon: Cpu,
    description: 'Spécifications techniques RFC, architecture logicielle, bases de données, DevOps et codebases.',
    defaultInstructions: 'Vous êtes un architecte logiciel senior. Privilégiez les explications techniques exactes, les schémas de données et les bonnes pratiques.',
    suggestedDocs: ['Architecture_Systeme.md', 'Schema_DB.sql'],
  },
  {
    id: 'legal',
    name: 'Droit & Conformité Réglementaire',
    icon: Scale,
    description: 'Contrats commerciaux, registres RGPD, droit social, conformité bancaire et directives européennes.',
    defaultInstructions: 'Vous êtes un juriste de conformité. Citez rigoureusement les articles de loi et clauses contractuelles sans extrapoler.',
    suggestedDocs: ['Contrat_Cadre.pdf', 'Registre_RGPD.md'],
  },
  {
    id: 'health',
    name: 'Santé & Biomédical',
    icon: Stethoscope,
    description: 'Protocoles cliniques, recommandations HAS, études épidémiologiques et publications médicales.',
    defaultInstructions: 'Vous êtes un assistant médical scientifique. Appuyez chaque affirmation sur les protocoles validés et sources indexées.',
    suggestedDocs: ['Protocole_Clinique.pdf', 'Guide_Pharmacologique.pdf'],
  },
  {
    id: 'science',
    name: 'Recherche Scientifique & Thèses',
    icon: Compass,
    description: 'Articles arXiv, thèses universitaires, méthodologies de recherche, bibliographies et datasets.',
    defaultInstructions: 'Vous êtes un chercheur scientifique rigoureux. Analysez la méthodologie, les résultats quantitatifs et les limites de validité.',
    suggestedDocs: ['These_Doctorat.pdf', 'Article_Recherche.pdf'],
  },
  {
    id: 'hr',
    name: 'Ressources Humaines & Organisation',
    icon: Users,
    description: 'Politiques de télétravail, plans de formation, processus d\'onboarding et accords d\'entreprise.',
    defaultInstructions: 'Vous êtes un responsable RH bienveillant et clair. Expliquez les processus internes et droits des collaborateurs.',
    suggestedDocs: ['Accord_Entreprise.pdf', 'Guide_Onboarding.md'],
  },
  {
    id: 'finance',
    name: 'Finance & Économie',
    icon: TrendingUp,
    description: 'Rapports financiers annuels, audits comptables, analyse de marge, ratios prudentiels et trésorerie.',
    defaultInstructions: 'Vous êtes un analyste financier certifié. Concentrez-vous sur les métriques comptables et ratios de solvabilité.',
    suggestedDocs: ['Rapport_Annuel.pdf', 'Budget_Previsionnel.xlsx'],
  },
  {
    id: 'custom',
    name: 'Domaine Sur-Mesure / Personnalisé',
    icon: Sparkles,
    description: 'Définissez votre propre domaine métier sans aucune contrainte (Aéronautique, Jeux vidéo, BTP, etc.).',
    defaultInstructions: 'Vous êtes un assistant spécialisé hautement qualifié pour ce domaine sur-mesure.',
    suggestedDocs: ['Documentation_Metier.pdf'],
  },
];

export const DomainConfigModal: React.FC<DomainConfigModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'edit',
}) => {
  const { activeTenant, tenants, switchTenant, updateTenant, createTenant, deleteTenant } = useTenant();
  const [mode, setMode] = useState<'manage' | 'edit' | 'create'>(initialMode);
  const [selectedTenantToEdit, setSelectedTenantToEdit] = useState<TenantDTO | null>(null);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<DomainCategory>('general');
  const [domainName, setDomainName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formWarnings, setFormWarnings] = useState<Record<string, string>>({});

  // Modal d'avertissement de suppression
  const [tenantToDelete, setTenantToDelete] = useState<TenantDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setFormErrors({});
    setFormWarnings({});
  }, [initialMode, isOpen]);

  // Synchronisation du formulaire d'édition
  useEffect(() => {
    const target = selectedTenantToEdit || activeTenant;
    setFormErrors({});
    setFormWarnings({});
    if (mode === 'edit' && target) {
      setSelectedCategory(target.domain_category || 'general');
      setDomainName(target.domain || '');
      setWorkspaceName(target.name || '');
      setDescription(target.description || '');
      setSystemInstructions(target.system_instructions || '');
    } else if (mode === 'create') {
      const preset = DOMAIN_PRESETS.find((p) => p.id === 'general')!;
      setSelectedCategory('general');
      setDomainName(preset.name);
      setWorkspaceName('Mon Nouvel Espace RAG');
      setDescription(preset.description);
      setSystemInstructions(preset.defaultInstructions);
    }
  }, [selectedTenantToEdit, activeTenant, mode, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: DomainPreset) => {
    setSelectedCategory(preset.id);
    setFormErrors({});
    if (preset.id !== 'custom') {
      setDomainName(preset.name);
      if (mode === 'create') {
        setWorkspaceName(`Espace ${preset.name.split('&')[0].trim()}`);
      }
      setDescription(preset.description);
      setSystemInstructions(preset.defaultInstructions);
    } else {
      setDomainName('');
      setDescription('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const target = selectedTenantToEdit || activeTenant;
    const currentSlug = target?.slug || workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const validation = validateTenantForm({
      name: workspaceName,
      slug: currentSlug,
      domain: domainName,
      domain_category: selectedCategory,
      description,
      system_instructions: systemInstructions,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      if (validation.warnings) setFormWarnings(validation.warnings);
      return;
    }

    setFormErrors({});
    if (validation.warnings) setFormWarnings(validation.warnings);

    setIsSubmitting(true);
    try {
      const sanitizedData = validation.sanitized!;
      if (mode === 'edit' && target) {
        await updateTenant(target.id, {
          name: sanitizedData.name,
          domain: sanitizedData.domain,
          domain_category: selectedCategory,
          description: sanitizedData.description,
          system_instructions: sanitizedData.system_instructions,
        });
        setNotification('Domaine du RAG mis à jour avec succès !');
      } else {
        await createTenant({
          name: sanitizedData.name,
          domain: sanitizedData.domain,
          domain_category: selectedCategory,
          description: sanitizedData.description,
          system_instructions: sanitizedData.system_instructions,
        });
        setNotification('Nouvel espace RAG créé avec isolation vectorielle étanche !');
      }

      setTimeout(() => {
        setNotification(null);
        setMode('manage');
      }, 900);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l\'enregistrement du domaine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportTenant = async (t: TenantDTO) => {
    try {
      const exportData = await defaultApiClient.exportTenantSovereign(t.id);
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `ragtime-domaine-${t.slug || t.id}-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setNotification(`Configuration souveraine du domaine « ${t.name} » exportée en JSON avec succès.`);
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l\'export du domaine');
    }
  };

  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;
    setIsDeleting(true);
    try {
      const deletedName = tenantToDelete.name;
      await deleteTenant(tenantToDelete.id);
      setTenantToDelete(null);
      setNotification(`Le domaine « ${deletedName} » et toutes ses données vectorielles ont été définitivement supprimés.`);
      setMode('manage');
      setSelectedTenantToEdit(null);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression du domaine');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#121214] border border-zinc-700/90 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header de la Modal */}
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span>Gestion des Domaines & Espaces RAG</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                    Souveraineté Métier
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Créez, configurez et gérez vos espaces documentaires en toute étanchéité vectorielle.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              id="close-domain-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Onglets : Gérer mes domaines / Configurer le domaine / Créer un nouvel espace */}
          <div className="px-6 pt-3 border-b border-zinc-800 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => setMode('manage')}
              className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                mode === 'manage'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
              id="tab-domain-manage"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tous mes domaines ({tenants.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTenantToEdit(activeTenant);
                setMode('edit');
              }}
              className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                mode === 'edit'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
              id="tab-domain-edit"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Configurer le domaine</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('create')}
              className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                mode === 'create'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
              id="tab-domain-create"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Créer un nouvel espace</span>
            </button>
          </div>

          {/* Notifications */}
          {notification && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center gap-2 text-xs animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 1 : VUE D'ENSEMBLE & GESTION DE TOUS LES DOMAINES                      */}
          {/* ========================================================================= */}
          {mode === 'manage' && (
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">
                    Espaces de Connaissance Actifs
                  </h4>
                  <p className="text-zinc-400 text-[11px]">
                    Chaque domaine dispose d'une partition pgvector étanche (filtrage par tenant_id).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  id="btn-add-domain-manage"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouveau Domaine</span>
                </button>
              </div>

              <div className="space-y-3">
                {tenants.map((t) => {
                  const isActive = t.id === activeTenant?.id;
                  const canDelete = tenants.length > 1;

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-zinc-900/90 border-indigo-600/80 ring-1 ring-indigo-500/20'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-zinc-100">{t.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold">
                              {t.domain || 'Général'}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Actif
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500 font-mono">
                              role: {t.role}
                            </span>
                          </div>

                          <p className="text-zinc-400 text-xs line-clamp-2">
                            {t.description || 'Aucune description spécifiée.'}
                          </p>

                          <div className="flex items-center gap-4 text-[11px] text-zinc-400 pt-1 font-mono">
                            <span className="flex items-center gap-1 text-zinc-300">
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                              {t.documents_count} document{t.documents_count > 1 ? 's' : ''} indexé{t.documents_count > 1 ? 's' : ''}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Database className="w-3.5 h-3.5" />
                              Index pgvector dédié
                            </span>
                          </div>
                        </div>

                        {/* Actions pour ce domaine */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => switchTenant(t.id)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors flex items-center gap-1.5"
                              id={`switch-tenant-${t.id}`}
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Activer</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleExportTenant(t)}
                            title="Exporter la configuration et l'inventaire en JSON souverain"
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-indigo-300 transition-colors border border-zinc-700/60"
                            id={`export-tenant-${t.id}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantToEdit(t);
                              setMode('edit');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
                            id={`edit-tenant-${t.id}`}
                          >
                            <span>Configurer</span>
                          </button>

                          <button
                            type="button"
                            disabled={!canDelete}
                            onClick={() => setTenantToDelete(t)}
                            title={
                              canDelete
                                ? 'Supprimer définitivement ce domaine et ses documents'
                                : 'Impossible de supprimer le dernier domaine restant'
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              canDelete
                                ? 'text-rose-400 hover:text-white hover:bg-rose-950/80 border border-rose-900/50'
                                : 'text-zinc-600 bg-zinc-900 border border-zinc-800 cursor-not-allowed opacity-50'
                            }`}
                            id={`delete-tenant-${t.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Règle de protection du dernier domaine */}
              {tenants.length <= 1 && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 flex items-center gap-2 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Le système nécessite au moins un espace de travail actif. Pour supprimer ce domaine, créez-en d'abord un autre.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2 & 3 : FORMULAIRE D'ÉDITION OU CRÉATION D'UN DOMAINE                */}
          {/* ========================================================================= */}
          {(mode === 'edit' || mode === 'create') && (
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Sélecteur de domaine si édition */}
              {mode === 'edit' && tenants.length > 1 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 font-medium">Domaine en cours d'édition :</span>
                  <select
                    value={(selectedTenantToEdit || activeTenant)?.id}
                    onChange={(e) => {
                      const t = tenants.find((x) => x.id === e.target.value) || activeTenant;
                      setSelectedTenantToEdit(t);
                    }}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-zinc-100 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.domain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grille de sélection des domaines prédéfinis */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-2">
                  1. Choisissez un modèle de domaine ou personnalisez à 100% :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DOMAIN_PRESETS.map((preset) => {
                    const isSelected = selectedCategory === preset.id;
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-950/70 border-indigo-600 text-white shadow-md'
                            : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`} />
                          {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                        </div>
                        <span className="font-semibold text-[11px] leading-tight line-clamp-2">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Champs de configuration détaillée */}
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Nom du domaine métier *
                    </label>
                    <input
                      type="text"
                      required
                      value={domainName}
                      onChange={(e) => {
                        setDomainName(e.target.value);
                        if (formErrors.domain) setFormErrors((prev) => ({ ...prev, domain: '' }));
                      }}
                      placeholder="Ex : Santé & Biomédical, Aéronautique, Droit..."
                      className={`w-full bg-zinc-950 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all ${
                        formErrors.domain
                          ? 'border border-rose-500/80 focus:border-rose-500'
                          : 'border border-zinc-800 focus:border-indigo-500'
                      }`}
                    />
                    <FormFieldFeedback error={formErrors.domain} />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Nom de l'espace de travail *
                    </label>
                    <input
                      type="text"
                      required
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value);
                        if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="Ex : Mon RAG Recherche, Clinique CHU..."
                      className={`w-full bg-zinc-950 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all ${
                        formErrors.name
                          ? 'border border-rose-500/80 focus:border-rose-500'
                          : 'border border-zinc-800 focus:border-indigo-500'
                      }`}
                    />
                    <FormFieldFeedback error={formErrors.name} />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Description & Périmètre documentaire
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: '' }));
                    }}
                    placeholder="Précisez quels types de documents composeront cet espace..."
                    className={`w-full bg-zinc-950 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all ${
                      formErrors.description
                        ? 'border border-rose-500/80 focus:border-rose-500'
                        : 'border border-zinc-800 focus:border-indigo-500'
                    }`}
                  />
                  <FormFieldFeedback error={formErrors.description} />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Consignes système du modèle (Prompt Métier)
                  </label>
                  <textarea
                    rows={2}
                    value={systemInstructions}
                    onChange={(e) => {
                      setSystemInstructions(e.target.value);
                      if (formErrors.system_instructions) setFormErrors((prev) => ({ ...prev, system_instructions: '' }));
                    }}
                    placeholder="Ex : Vous êtes un assistant spécialisé dans le domaine..."
                    className={`w-full bg-zinc-950 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono text-[11px] transition-all ${
                      formErrors.system_instructions
                        ? 'border border-rose-500/80 focus:border-rose-500'
                        : 'border border-zinc-800 focus:border-indigo-500'
                    }`}
                  />
                  <FormFieldFeedback
                    error={formErrors.system_instructions}
                    warning={formWarnings.system_instructions}
                  />
                </div>
              </div>

              {/* Garantie d'isolation souveraine */}
              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-start gap-2.5 text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-zinc-200">Garantie d'étanchéité SQLModel & pgvector :</strong>{' '}
                  {mode === 'edit'
                    ? `L'espace « ${(selectedTenantToEdit || activeTenant)?.name} » conserve son cloisonnement par tenant_id sans fuite vers d'autres espaces.`
                    : 'La création d\'un nouvel espace génère un tenant_id cryptographiquement unique. Les documents futurs seront indexés dans un espace vectoriel strictement étanche.'}
                </div>
              </div>

              {/* Zone Dangereuse / Suppression en mode Edit */}
              {mode === 'edit' && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Zone Critique : Suppression Définitive</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Supprime cet espace de travail, tous ses documents indexés et ses partitions vectorielles.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={tenants.length <= 1}
                      onClick={() => setTenantToDelete(selectedTenantToEdit || activeTenant)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        tenants.length > 1
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                      }`}
                      id="btn-trigger-delete-domain"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer cet espace...</span>
                    </button>
                  </div>
                  {tenants.length <= 1 && (
                    <p className="text-[10px] text-zinc-500 font-mono">
                      * Suppression bloquée : le système nécessite au moins un espace de travail actif.
                    </p>
                  )}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMode('manage')}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Retour à la liste</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !domainName.trim() || !workspaceName.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {mode === 'edit' ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Enregistrer les modifications</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer l'espace RAG</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL POPUP DE CONFIRMATION DE SUPPRESSION DÉFINITIVE                      */}
      {/* ========================================================================= */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#18181b] border-2 border-rose-600/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header d'alerte */}
            <div className="px-6 py-4 bg-rose-950/40 border-b border-rose-900/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-200">
                  Avertissement : Suppression Définitive & Irréversible
                </h3>
                <p className="text-xs text-zinc-400">
                  Cette action détruit irrémédiablement l'espace et ses données.
                </p>
              </div>
            </div>

            {/* Contenu et Détails de la perte */}
            <div className="p-6 space-y-4 text-xs">
              <p className="text-zinc-300">
                Vous êtes sur le point de supprimer définitivement l'espace de travail RAG :
              </p>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <span>{tenantToDelete.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {tenantToDelete.domain}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  ID: {tenantToDelete.id}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2 text-rose-300">
                <div className="font-semibold text-xs text-rose-200">
                  Conséquences irrémédiables de cette suppression :
                </div>
                <ul className="space-y-1.5 text-[11px] list-disc list-inside text-zinc-300">
                  <li>
                    <strong className="text-rose-300">Destruction des documents :</strong> Les {tenantToDelete.documents_count} documents indexés dans cet espace seront immédiatement effacés.
                  </li>
                  <li>
                    <strong className="text-rose-300">Purge des index pgvector :</strong> L'ensemble des segments vectoriels (embeddings 768d) et tables HNSW dédiées seront supprimés.
                  </li>
                  <li>
                    <strong className="text-rose-300">Suppression des presets RAG :</strong> Tous les paramétrages et versions de chunks pour ce domaine seront purgés.
                  </li>
                  <li>
                    <strong className="text-rose-300">Zéro récupération possible :</strong> Aucune restauration ne sera possible après validation.
                  </li>
                </ul>
              </div>
            </div>

            {/* Boutons de confirmation */}
            <div className="px-6 py-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                id="btn-cancel-delete-domain"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50"
                id="btn-confirm-delete-domain"
              >
                {isDeleting ? (
                  <span>Suppression en cours...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmer la suppression définitive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
