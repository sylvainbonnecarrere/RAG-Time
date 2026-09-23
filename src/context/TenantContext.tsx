/**
 * Contexte de Cloisonnement Multi-Tenant - US-FRONT-02 & TNR-02
 * Règle d'or : Toute commutation de tenant purge immédiatement le cache local
 * et injecte le header X-Tenant-ID sur l'API client.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TenantDTO, RagPresetDTO, UUID } from '../contracts/api-types';
import { defaultApiClient } from '../services/apiClient';

interface TenantContextType {
  activeTenant: TenantDTO | null;
  tenants: TenantDTO[];
  isLoadingTenants: boolean;
  switchTenant: (tenantId: UUID) => void;
  createTenant: (data: {
    name: string;
    domain: string;
    domain_category: TenantDTO['domain_category'];
    description?: string;
    system_instructions?: string;
    default_embedding_model?: string;
  }) => Promise<TenantDTO>;
  updateTenant: (tenantId: UUID, updates: Partial<TenantDTO>) => Promise<TenantDTO>;
  deleteTenant: (tenantId: UUID) => Promise<void>;
  refreshTenants: () => Promise<void>;
  tenantSwitchCount: number; // Utilisé par les composants abonnés pour réinitialiser leur cache (TNR-02)

  // Gestion synchronisée des presets RAG (US-FRONT-35 & TNR-31)
  activePreset: RagPresetDTO | null;
  presets: RagPresetDTO[];
  activatePreset: (presetId: UUID) => Promise<RagPresetDTO>;
  refreshPresets: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<TenantDTO[]>([]);
  const [activeTenant, setActiveTenant] = useState<TenantDTO | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState<boolean>(true);
  const [tenantSwitchCount, setTenantSwitchCount] = useState<number>(0);
  const [presets, setPresets] = useState<RagPresetDTO[]>([]);
  const [activePreset, setActivePreset] = useState<RagPresetDTO | null>(null);

  const refreshPresets = useCallback(async () => {
    if (!activeTenant) {
      setPresets([]);
      setActivePreset(null);
      return;
    }
    const list = await defaultApiClient.getPresets(activeTenant.id);
    setPresets(list);
    const active = list.find((p) => p.is_active) || list[0] || null;
    setActivePreset(active);
  }, [activeTenant]);

  const refreshTenants = useCallback(async () => {
    const list = await defaultApiClient.getTenants();
    setTenants(list);
    const activeId = defaultApiClient.getActiveTenantId();
    const current = list.find((t) => t.id === activeId) || list[0] || null;
    setActiveTenant(current);
    setIsLoadingTenants(false);
  }, []);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  const switchTenant = useCallback((tenantId: UUID) => {
    try {
      defaultApiClient.switchTenant(tenantId);
      const target = tenants.find((t) => t.id === tenantId) || null;
      setActiveTenant(target);
      // Incrémenter le compteur de changement pour purger le cache des vues abonnées (TNR-02)
      setTenantSwitchCount((prev) => prev + 1);
    } catch (err) {
      console.error('Échec du changement de tenant:', err);
    }
  }, [tenants]);

  const activatePreset = useCallback(
    async (presetId: UUID): Promise<RagPresetDTO> => {
      if (!activeTenant) throw new Error('Aucun tenant actif');
      const updated = await defaultApiClient.activatePreset(activeTenant.id, presetId);
      await refreshPresets();
      return updated;
    },
    [activeTenant, refreshPresets]
  );

  const createTenant = useCallback(
    async (data: {
      name: string;
      domain: string;
      domain_category: TenantDTO['domain_category'];
      description?: string;
      system_instructions?: string;
    }) => {
      const created = await defaultApiClient.createTenant(data);
      const updatedList = await defaultApiClient.getTenants();
      setTenants(updatedList);
      setActiveTenant(created);
      setTenantSwitchCount((prev) => prev + 1);
      return created;
    },
    []
  );

  const updateTenant = useCallback(
    async (tenantId: UUID, updates: Partial<TenantDTO>) => {
      const updated = await defaultApiClient.updateTenant(tenantId, updates);
      const updatedList = await defaultApiClient.getTenants();
      setTenants(updatedList);
      if (activeTenant?.id === tenantId) {
        setActiveTenant(updated);
      }
      return updated;
    },
    [activeTenant]
  );

  const deleteTenant = useCallback(
    async (tenantId: UUID) => {
      await defaultApiClient.deleteTenant(tenantId);
      const updatedList = await defaultApiClient.getTenants();
      setTenants(updatedList);
      const activeId = defaultApiClient.getActiveTenantId();
      const current = updatedList.find((t) => t.id === activeId) || updatedList[0] || null;
      setActiveTenant(current);
      setTenantSwitchCount((prev) => prev + 1);
    },
    []
  );

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        tenants,
        isLoadingTenants,
        switchTenant,
        createTenant,
        updateTenant,
        deleteTenant,
        refreshTenants,
        tenantSwitchCount,
        activePreset,
        presets,
        activatePreset,
        refreshPresets,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant doit être utilisé à l\'intérieur de TenantProvider');
  }
  return context;
};
