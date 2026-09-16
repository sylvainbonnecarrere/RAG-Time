/**
 * Modal d'Authentification Sécurisée - US-FRONT-02
 * Règle de sécurité 07-security-model.md :
 * Pas de divulgation d'existence de compte en cas d'échec
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validateLoginForm } from '../../lib/validation/schemas';
import { FormFieldFeedback } from './FormFieldFeedback';
import { X, Lock, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, isLoading, authError } = useAuth();
  const [email, setEmail] = useState('admin@ragtime.fr');
  const [password, setPassword] = useState('SecNumCloud2026!');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

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

    await login(validation.sanitized!.email, validation.sanitized!.password);
    if (!authError) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-zinc-700/80 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 p-1 rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Authentification Sécurisée</h2>
            <p className="text-xs text-zinc-400">Session restreinte avec isolation des espaces tenants</p>
          </div>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Adresse e-mail professionnelle
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={!!errors.email}
                className={`w-full bg-zinc-900 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none transition-all ${
                  errors.email
                    ? 'border border-rose-500/80 focus:ring-1 focus:ring-rose-500'
                    : 'border border-zinc-700/80 focus:ring-1 focus:ring-indigo-500'
                }`}
                placeholder="nom@entreprise.fr"
              />
            </div>
            <FormFieldFeedback error={errors.email} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Mot de passe maître
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => handleBlur('password')}
                aria-invalid={!!errors.password}
                className={`w-full bg-zinc-900 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none transition-all ${
                  errors.password
                    ? 'border border-rose-500/80 focus:ring-1 focus:ring-rose-500'
                    : 'border border-zinc-700/80 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            <FormFieldFeedback error={errors.password} />
          </div>

          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Invariants de sécurité actifs :</span>
            </div>
            <p>• Jetons JWT éphémères stockés en mémoire sans écriture localStorage vulnérable</p>
            <p>• Contrôle des rôles et appartenances validé côté serveur à chaque appel</p>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Vérification...' : 'Valider la session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
