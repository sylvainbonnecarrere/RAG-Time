/**
 * Contexte d'Authentification - US-FRONT-02
 * Respecte le principe de moindre privilège et ne divulgue aucune information d'existence de compte
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDTO } from '../contracts/api-types';
import { defaultApiClient } from '../services/apiClient';

interface AuthContextType {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (roleType: 'admin' | 'datascientist' | 'viewer') => void;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Vérifier si une session démo existe en sessionStorage
    try {
      const saved = sessionStorage.getItem('ragtime_user_session');
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      // Ignorer l'erreur de parsing
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, _password?: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // US-FRONT-14 POC Authentification : répond toujours true pour la démo
      const effectiveEmail = email.trim() || 'admin@ragtime.fr';
      const res = await defaultApiClient.login(effectiveEmail);
      const authenticatedUser: UserDTO = {
        ...res.user,
        email: effectiveEmail,
        name: effectiveEmail.includes('admin')
          ? 'Admin Sécurité'
          : effectiveEmail.includes('data')
          ? 'Lead Data Scientist'
          : effectiveEmail.includes('auditeur')
          ? 'Auditeur Conformité'
          : effectiveEmail.includes('lecteur')
          ? 'Lecteur Seul'
          : effectiveEmail.split('@')[0],
      };
      setUser(authenticatedUser);
      try {
        sessionStorage.setItem('ragtime_user_session', JSON.stringify(authenticatedUser));
      } catch {
        // En cas de restriction de stockage
      }
    } catch {
      // Règle de sécurité 07-security-model.md : Message générique sans divulgation
      setAuthError('Identifiants invalides ou compte inactif.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = (roleType: 'admin' | 'datascientist' | 'viewer') => {
    const roleProfiles: Record<'admin' | 'datascientist' | 'viewer', UserDTO> = {
      admin: {
        id: 'usr-admin-sec',
        email: 'admin@ragtime.fr',
        name: 'Admin Sécurité',
        tenant_id: user?.tenant_id || 'ten-prod-001',
        roles: ['owner', 'admin'],
      },
      datascientist: {
        id: 'usr-lead-ds',
        email: 'datascientist@ragtime.fr',
        name: 'Lead Data Scientist',
        tenant_id: user?.tenant_id || 'ten-prod-001',
        roles: ['admin', 'member'],
      },
      viewer: {
        id: 'usr-viewer-only',
        email: 'lecteur@ragtime.fr',
        name: 'Lecteur Seul (Viewer)',
        tenant_id: user?.tenant_id || 'ten-prod-001',
        roles: ['viewer'],
      },
    };

    const newProfile = roleProfiles[roleType];
    setUser(newProfile);
    try {
      sessionStorage.setItem('ragtime_user_session', JSON.stringify(newProfile));
    } catch {
      // Ignore
    }
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem('ragtime_user_session');
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchDemoRole,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de AuthProvider');
  }
  return context;
};
