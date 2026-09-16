/**
 * Barre d'Espace & Cloisonnement Multi-Tenant - US-FRONT-02
 * Règle de sécurité : L'utilisateur commute visuellement de tenant
 * et toutes les requêtes subséquentes injectent X-Tenant-ID
 * L'utilisateur a le contrôle total pour choisir et personnaliser le domaine de son RAG.
 */

import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { DomainConfigModal } from './DomainConfigModal';
import {
  Building2,
  ShieldCheck,
  ChevronDown,
  Check,
  User,
  LogOut,
  RefreshCw,
  Compass,
  Plus,
  Sliders,
  Layers,
} from 'lucide-react';

interface TenantWorkspaceBarProps {
  onOpenAuthModal?: () => void;
}

export const TenantWorkspaceBar: React.FC<TenantWorkspaceBarProps> = ({ onOpenAuthModal }) => {
  const { activeTenant, tenants, switchTenant } = useTenant();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showIsolationNotice, setShowIsolationNotice] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [domainModalMode, setDomainModalMode] = useState<'manage' | 'edit' | 'create'>('manage');

  const handleSelectTenant = (id: string) => {
    switchTenant(id);
    setDropdownOpen(false);
    setShowIsolationNotice(true);
    setTimeout(() => setShowIsolationNotice(false), 3000);
  };

  const handleOpenDomainModal = (mode: 'manage' | 'edit' | 'create') => {
    setDomainModalMode(mode);
    setIsDomainModalOpen(true);
    setDropdownOpen(false);
  };

  return (
    <>
      <header className="bg-[#4545c9] border-b border-indigo-400/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 relative z-30 shadow-md transition-colors">
        {/* Sélecteur d'espace de travail Tenant & Domaine */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-indigo-200" />
            <span>Espace RAG :</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 bg-black/30 hover:bg-black/45 border border-white/25 rounded-md px-3 py-1.5 text-xs text-white transition-all font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">{activeTenant?.name || 'Sélectionner un espace'}</span>
              <span className="text-[10px] text-indigo-100 bg-white/20 px-1.5 py-0.5 rounded border border-white/20">
                {activeTenant?.role.toUpperCase()}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-200" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 bg-[#121214] border border-zinc-700/80 rounded-lg shadow-2xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800/80 flex items-center justify-between">
                  <span>Vos espaces RAG</span>
                  <span className="text-zinc-500">Isolation pgvector</span>
                </div>
                <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                  {tenants.map((tenant) => {
                    const isSelected = tenant.id === activeTenant?.id;
                    return (
                      <button
                        key={tenant.id}
                        onClick={() => handleSelectTenant(tenant.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-800/50'
                            : 'text-zinc-300 hover:bg-zinc-800/70'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-medium truncate">{tenant.name}</div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span className="text-indigo-400 font-medium truncate max-w-[140px]">
                              {tenant.domain || 'Général'}
                            </span>
                            <span>•</span>
                            <span>{tenant.documents_count} docs</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-zinc-800/80 flex flex-col gap-1">
                  <button
                    onClick={() => handleOpenDomainModal('manage')}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 font-medium flex items-center gap-2 transition-colors"
                    id="btn-manage-domains-menu"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gérer tous les domaines ({tenants.length})...</span>
                  </button>
                  <button
                    onClick={() => handleOpenDomainModal('create')}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 font-medium flex items-center gap-2 transition-colors"
                    id="btn-create-domain-menu"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer un espace pour un autre domaine...</span>
                  </button>
                  <button
                    onClick={() => handleOpenDomainModal('edit')}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 flex items-center gap-2 transition-colors"
                    id="btn-edit-current-domain-menu"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configurer le domaine de l'espace actuel...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bouton / Badge interactif de Domaine personnalisé */}
          <button
            onClick={() => handleOpenDomainModal('edit')}
            title="Cliquez pour changer le domaine de votre RAG"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/25 hover:bg-black/40 border border-white/20 text-xs text-white transition-all font-medium group shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-200 group-hover:rotate-45 transition-transform" />
            <span className="text-indigo-100 text-[11px]">Domaine :</span>
            <span className="font-semibold text-white">{activeTenant?.domain || 'Documentation Générale'}</span>
            <span className="text-[10px] text-indigo-200 underline ml-1">Changer</span>
          </button>

          {/* Badge d'isolation tenant certifiée */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/30 border border-white/20 text-[11px] text-emerald-300 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>tenant_id: {activeTenant?.id}</span>
          </div>
        </div>

        {/* Notification éphémère de purge de cache TNR-02 */}
        {showIsolationNotice && (
          <div className="text-[11px] text-amber-200 bg-black/50 border border-amber-400/50 px-2.5 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
            <span>Cache local purgé — Cloisonnement strict appliqué</span>
          </div>
        )}

        {/* Identité utilisateur et statut de session */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 text-xs text-white">
              <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[11px] font-bold text-white">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-right leading-tight">
                <div className="font-medium text-white">{user.name}</div>
                <div className="text-[10px] text-indigo-100">{user.email}</div>
              </div>
              <button
                onClick={logout}
                title="Déconnexion"
                className="p-1.5 hover:bg-black/30 text-indigo-200 hover:text-white rounded transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 bg-black/30 hover:bg-black/50 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Se connecter</span>
            </button>
          )}
        </div>
      </header>

      {/* Modal de personnalisation et création de domaine RAG */}
      <DomainConfigModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        initialMode={domainModalMode}
      />
    </>
  );
};
