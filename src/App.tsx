import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { BentoGrid } from './components/BentoGrid';
import { FrontendProposalView } from './components/FrontendProposalView';
import { InteractiveConsoleDemo } from './components/InteractiveConsoleDemo';
import { V1WorkspaceView, V1SubTab } from './components/v1/V1WorkspaceView';
import { AuthLoginView } from './components/v1/AuthLoginView';
import { CitationModal } from './components/CitationModal';
import { Footer } from './components/Footer';
import { CitationSource } from './types';
import { MOCK_CITATIONS } from './data/mockRagData';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'v1' | 'plan' | 'demo' | 'auth'>('v1');
  const [v1Tab, setV1Tab] = useState<V1SubTab>('chat');
  const [selectedCitation, setSelectedCitation] = useState<CitationSource | null>(null);

  const handleOpenCitation = (source: CitationSource) => {
    setSelectedCitation(source);
  };

  const handleOpenChatRag = () => {
    setCurrentView('v1');
    setV1Tab('chat');
  };

  const handleSearchQuery = (_query: string) => {
    if (isAuthenticated) {
      setCurrentView('v1');
      setV1Tab('chat');
    } else {
      setCurrentView('auth');
    }
  };

  // Guard d'authentification : l'espace de travail RAG est strictement réservé aux utilisateurs connectés
  const effectiveView = (!isAuthenticated && currentView === 'v1') ? 'auth' : currentView;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-600/30 selection:text-indigo-200 relative flex flex-col justify-between">
      
      {/* Background Subtle Ambient Light */}
      <div className="fixed inset-0 bg-radial-subtle pointer-events-none -z-10 opacity-70" />
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none -z-20 opacity-25" />

      {/* Top Navigation */}
      <Navbar
        currentView={effectiveView}
        setCurrentView={setCurrentView}
        v1Tab={v1Tab}
        onOpenChatRag={handleOpenChatRag}
        onOpenQuickDemo={() => setSelectedCitation(MOCK_CITATIONS[0])}
      />

      {/* Main View Area */}
      <main className="flex-grow">
        {effectiveView === 'auth' && (
          <div className="animate-in fade-in duration-300">
            <AuthLoginView
              onLoginSuccess={() => {
                setCurrentView('v1');
                setV1Tab('chat');
              }}
              onCancel={() => setCurrentView('landing')}
            />
          </div>
        )}

        {effectiveView === 'v1' && isAuthenticated && (
          <div className="animate-in fade-in duration-300">
            <V1WorkspaceView
              activeTab={v1Tab}
              onTabChange={setV1Tab}
            />
          </div>
        )}

        {effectiveView === 'landing' && (
          <div className="animate-in fade-in duration-300">
            {/* Hero Section */}
            <HeroSection
              onSearchQuery={handleSearchQuery}
              onOpenCitation={handleOpenCitation}
            />

            {/* Flagship Bento Grid (with Insight 1, 2, 3) */}
            <BentoGrid
              onSelectCitation={handleOpenCitation}
              onNavigateToPlan={() => setCurrentView('plan')}
            />
          </div>
        )}

        {effectiveView === 'plan' && (
          <div className="animate-in fade-in duration-300">
            <FrontendProposalView onNavigate={(view) => setCurrentView(view)} />
          </div>
        )}

        {effectiveView === 'demo' && (
          <div className="animate-in fade-in duration-300">
            <InteractiveConsoleDemo onSelectCitation={handleOpenCitation} />
          </div>
        )}
      </main>

      {/* Global Citation Inspector Modal */}
      <CitationModal
        source={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />

      {/* Enterprise Footer */}
      <Footer onNavigateToPlan={() => setCurrentView('plan')} />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppContent />
      </TenantProvider>
    </AuthProvider>
  );
}
