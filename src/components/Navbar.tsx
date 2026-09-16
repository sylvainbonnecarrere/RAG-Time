import React, { useState, useRef, useEffect } from 'react';
import { Database, ShieldCheck, Terminal, Layers, Sparkles, FileText, ChevronRight, LogIn, LogOut, User, Check, Shield, UserCheck, Eye, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RagtimeLogo } from './RagtimeLogo';

interface NavbarProps {
  currentView: 'landing' | 'v1' | 'plan' | 'demo' | 'auth';
  setCurrentView: (view: 'landing' | 'v1' | 'plan' | 'demo' | 'auth') => void;
  onOpenQuickDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView, onOpenQuickDemo }) => {
  const { isAuthenticated, user, logout, switchDemoRole } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    setCurrentView('landing');
  };

  // Fermer le dropdown en cliquant dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-750 bg-[#12161f]/95 backdrop-blur-md transition-colors shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            id="btn-brand-home"
          >
            <RagtimeLogo size={36} />
            <div className="flex flex-col">
              <span className="text-zinc-50 font-semibold tracking-tight text-base font-mono">
                RAGTIME
              </span>
              <span className="text-[10px] text-amber-400/90 tracking-wider uppercase font-mono font-medium">
                Beat & Pgvector
              </span>
            </div>
          </button>

          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-750 text-[11px] text-zinc-400 ml-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">Cluster Opérationnel</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">100% Souverain • FastAPI • pgvector</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-750 text-xs shadow-inner">
          <button
            id="nav-tab-landing"
            onClick={() => setCurrentView('landing')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              currentView === 'landing'
                ? 'bg-zinc-800 text-zinc-50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Showcase
          </button>

          {/* Mon Espace RAG - Uniquement visible lorsque l'utilisateur est authentifié */}
          {isAuthenticated && (
            <button
              id="nav-tab-v1"
              onClick={() => setCurrentView('v1')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                currentView === 'v1'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mon espace RAG</span>
            </button>
          )}

          <button
            id="nav-tab-plan"
            onClick={() => setCurrentView('plan')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'plan'
                ? 'bg-indigo-600 text-zinc-50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span>Plan et tests</span>
          </button>
        </nav>

        {/* Right CTA / Auth Controls */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <>
              {/* Bouton direct vers le chat */}
              <button
                id="btn-nav-v1-cta"
                onClick={() => setCurrentView('v1')}
                className="text-xs px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-colors flex items-center gap-1"
              >
                <span>Ouvrir le Chat RAG</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Pastille Utilisateur avec Menu Déroulant de Bascule Rapide de Rôle (Phase 5 - Point 4) */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="btn-user-profile-menu"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 hover:border-indigo-500/50 text-xs text-zinc-200 transition-all shadow-sm"
                  title="Changer de rôle démo ou se déconnecter"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-[11px] font-medium leading-tight text-zinc-200 truncate max-w-[120px]">
                      {user?.name || user?.email}
                    </span>
                    <span className="text-[9px] text-indigo-400 font-mono leading-none">
                      {user?.roles?.includes('owner') ? 'Admin Sécurité' : user?.roles?.includes('admin') ? 'Lead DS' : 'Lecteur'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-[#121214] border border-zinc-700/90 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 space-y-2">
                    <div className="px-2 py-1.5 border-b border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        Bascule rapide de rôle démo
                      </div>
                      <div className="text-xs font-semibold text-zinc-200 mt-0.5 truncate">
                        {user?.email}
                      </div>
                    </div>

                    {/* Liste des 3 rôles démo commutables en 1 clic */}
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          switchDemoRole('admin');
                          setProfileDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          user?.roles?.includes('owner')
                            ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-800'
                            : 'text-zinc-300 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <div>
                            <div className="font-medium">Admin Sécurité</div>
                            <div className="text-[10px] text-zinc-400 font-mono">admin@ragtime.fr</div>
                          </div>
                        </div>
                        {user?.roles?.includes('owner') && (
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          switchDemoRole('datascientist');
                          setProfileDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          user?.roles?.includes('admin') && !user?.roles?.includes('owner')
                            ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                            : 'text-zinc-300 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <div>
                            <div className="font-medium">Lead Data Scientist</div>
                            <div className="text-[10px] text-zinc-400 font-mono">datascientist@ragtime.fr</div>
                          </div>
                        </div>
                        {user?.roles?.includes('admin') && !user?.roles?.includes('owner') && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          switchDemoRole('viewer');
                          setProfileDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          user?.roles?.includes('viewer') && !user?.roles?.includes('admin')
                            ? 'bg-amber-950/80 text-amber-200 border border-amber-800'
                            : 'text-zinc-300 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <div>
                            <div className="font-medium">Lecteur Seul (Viewer)</div>
                            <div className="text-[10px] text-zinc-400 font-mono">lecteur@ragtime.fr</div>
                          </div>
                        </div>
                        {user?.roles?.includes('viewer') && !user?.roles?.includes('admin') && (
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </button>
                    </div>

                    {/* Déconnexion */}
                    <div className="pt-2 border-t border-zinc-800">
                      <button
                        onClick={handleLogout}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Se déconnecter de la session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              id="btn-nav-login-cta"
              onClick={() => setCurrentView('auth')}
              className={`text-xs px-3.5 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-1.5 ${
                currentView === 'auth'
                  ? 'bg-zinc-800 text-white border border-zinc-600 ring-2 ring-indigo-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Se connecter</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
