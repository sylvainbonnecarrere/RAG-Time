/**
 * Vue d'Authentification Démo & POC - US-FRONT-14
 * Route : /auth/login
 * Respecte le principe de non-divulgation, sécurisation Argon2id et isolation multi-tenant.
 * Répond toujours true pour permettre à l'utilisateur de tester la connexion/déconnexion en toute autonomie.
 */

import React, { useState, useId } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RagtimeLogo } from '../RagtimeLogo';
import { validateLoginForm } from '../../lib/validation/schemas';
import { FormFieldFeedback } from './FormFieldFeedback';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  Server,
  Database,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

interface AuthLoginViewProps {
  onLoginSuccess: () => void;
  onCancel?: () => void;
}

export const AuthLoginView: React.FC<AuthLoginViewProps> = ({
  onLoginSuccess,
  onCancel,
}) => {
  const { login, isLoading, authError } = useAuth();
  const [email, setEmail] = useState('admin@ragtime.fr');
  const [password, setPassword] = useState('SecNumCloud2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const result = validateLoginForm(email, password);
    setErrors(result.errors);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (touched.email) {
      const result = validateLoginForm(val, password);
      setErrors((prev) => ({ ...prev, email: result.errors.email || '' }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (touched.password) {
      const result = validateLoginForm(email, val);
      setErrors((prev) => ({ ...prev, password: result.errors.password || '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSuccessMessage(null);
    try {
      await login(validation.sanitized!.email, validation.sanitized!.password);
      setSuccessMessage('Authentification réussie ! Ouverture de votre Espace RAG...');
      setTimeout(() => {
        onLoginSuccess();
      }, 700);
    } catch {
      // Géré dans AuthContext
    }
  };

  const handleApplyPreset = (presetEmail: string, presetName: string) => {
    setEmail(presetEmail);
    setPassword('SecNumCloud2026!');
    setErrors({});
  };

  return (
    <div
      className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      id="view-auth-login"
    >
      <div className="max-w-md w-full space-y-6">
        {/* En-tête de la page */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <RagtimeLogo size={52} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-indigo-300 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Authentification</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            Connexion à Mon Espace RAG
          </h2>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
            Accédez à vos documents cloisonnés et sécurisés, gérez vos presets de recherche.
          </p>
        </div>

        {/* Carte Principale du Formulaire */}
        <div className="p-7 rounded-2xl bg-[#121214] border border-zinc-700/90 shadow-2xl space-y-5">
          {successMessage ? (
            <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-700/90 text-emerald-200 text-xs space-y-2 text-center animate-in fade-in">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="font-semibold text-sm">{successMessage}</div>
              <p className="text-emerald-300/80 text-[11px]">
                Chargement de la session et des index vectoriels...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {authError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Champ Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="input-email"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Adresse email professionnelle
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="input-email"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="vous@entreprise.fr"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'error-email' : undefined}
                    className={`block w-full pl-9 pr-3 py-2.5 bg-zinc-950/90 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all ${
                      errors.email
                        ? 'border border-rose-500/80 focus:ring-2 focus:ring-rose-500/50'
                        : 'border border-zinc-700/90 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                    }`}
                  />
                </div>
                <FormFieldFeedback id="error-email" error={errors.email} />
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-password"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    Mot de passe
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Hachage Argon2id
                  </span>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-password"
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    placeholder="••••••••••••"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'error-password' : undefined}
                    className={`block w-full pl-9 pr-10 py-2.5 bg-zinc-950/90 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all ${
                      errors.password
                        ? 'border border-rose-500/80 focus:ring-2 focus:ring-rose-500/50'
                        : 'border border-zinc-700/90 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <FormFieldFeedback id="error-password" error={errors.password} />
              </div>

              {/* Mémorisation */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>Mémoriser ma session démo</span>
                </label>
                <span className="text-[11px] text-indigo-400">
                  POC : Validation toujours active
                </span>
              </div>

              {/* Bouton de Soumission */}
              <button
                type="submit"
                disabled={isLoading}
                id="btn-submit-login"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Vérification sécurisée...</span>
                ) : (
                  <>
                    <span>Se connecter à Mon Espace RAG</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Profils Démo en 1 Clic */}
          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Remplissage automatique pour démo :
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">1 clic</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'admin@ragtime.fr',
                    'Admin RAGTIME (Sécurité)'
                  )
                }
                className="w-full text-left px-3 py-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/50 text-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-zinc-200 font-medium">Admin RAGTIME</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    (admin@ragtime.fr)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-1.5 py-0.5 rounded">
                  Owner
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'auditeur@ragtime-enterprise.internal',
                    'Auditeur Conformité'
                  )
                }
                className="w-full text-left px-3 py-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 text-xs transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-200 font-medium">Auditeur Sécurité</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    (auditeur@ragtime-enterprise.internal)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
                  SecNumCloud
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Garanties Architecturales */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-850 text-xs text-zinc-400 space-y-2">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Garantie de Cloisonnement & Conformité</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Dès l'authentification, chaque requête HTTP vers l'API Gateway FastAPI reçoit automatiquement l'en-tête d'isolation <code className="text-zinc-200 font-mono bg-zinc-950 px-1 py-0.5 rounded">X-Tenant-ID</code> et le token de session JWT éphémère.
          </p>
        </div>

        {onCancel && (
          <div className="text-center">
            <button
              onClick={onCancel}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors"
            >
              ← Revenir au Showcase
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
