import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth, RequireAuth } from './context/AuthContext';
import { I18nProvider, useT } from './i18n';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { TaakLijst } from './components/TaakLijst';
import { TeeltplanTaken } from './components/TeeltplanTaken';
import { WeekOverzicht } from './components/WeekOverzicht';
import { Oogstlijst } from './components/OogstLijst';
import { Instructies } from './components/Instructies';
import { Signaleringen } from './components/Signaleringen';
import { BeheerInstellingen } from './components/BeheerInstellingen';
import { Handleiding } from './components/Handleiding';
import { GewassenOverzicht } from './components/GewassenOverzicht';
import { Plattegronden } from './components/Plattegronden';
import { ToastContainer } from './components/Toast';
import { AdHocTaakButton } from './components/AdHocTaak';
import LoginScreen from './components/LoginScreenNew';
import ErrorBoundary from './components/ErrorBoundary';
import { Sprout } from 'lucide-react';
import { DEMO_MODE } from './config/appConfig';

// ============================================
// DEMO BANNER
// ============================================

function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-amber-100 border border-amber-300 text-amber-800 text-xs px-4 py-2 rounded-full shadow-md pointer-events-none">
      Demo met fictieve voorbeelddata: wijzigingen verdwijnen bij herladen
    </div>
  );
}

// ============================================
// MAIN CONTENT ROUTER
// ============================================

function MainContent() {
  const { state } = useApp();

  const renderContent = () => {
    switch (state.ui.huidigeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'weekoverzicht':
        return <WeekOverzicht />;
      case 'taken':
        return <TaakLijst />;
      case 'teeltplantaken':
        return <TeeltplanTaken />;
      case 'oogstlijst':
        return <Oogstlijst />;
      case 'gewassen':
        return <GewassenOverzicht />;
      case 'instructies':
        return <Instructies />;
      case 'plattegronden':
        return <Plattegronden />;
      case 'signaleringen':
        return <Signaleringen />;
      case 'handleiding':
        return <Handleiding />;
      case 'beheer':
        return <BeheerInstellingen />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-4 md:p-6 ml-16 md:ml-64 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {renderContent()}
      </div>
    </main>
  );
}

// ============================================
// LOADING SCREEN
// ============================================

function LoadingScreen() {
  const t = useT();

  return (
    <div className="min-h-screen bg-gradient-to-br from-tuin-600 to-tuin-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Sprout className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold mb-2">TuinPlanner</h1>
        <p className="text-tuin-200">{t.common.loading}</p>
      </div>
    </div>
  );
}

// ============================================
// AUTH LOADING SCREEN
// ============================================

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Sprout className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold mb-2">TuinPlanner</h1>
        <p className="text-green-200">Verbinden...</p>
      </div>
    </div>
  );
}

// ============================================
// APP LAYOUT (na inloggen)
// ============================================

function AppLayout() {
  const { state } = useApp();

  if (state.ui.isLaden) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-[100dvh] flex bg-gray-100" style={{ overflow: 'clip' }}>
      <Navigation />
      <MainContent />
      <ToastContainer />
      <AdHocTaakButton />
      <DemoBanner />
    </div>
  );
}

// ============================================
// APP WITH AUTH CHECK
// ============================================

function AppWithAuth() {
  const { loading, isAuthenticated } = useAuth();

  // Toon loading screen terwijl we checken of user is ingelogd
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Niet ingelogd? Toon login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Ingelogd! Toon de app met data provider
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

// ============================================
// APP ROOT
// ============================================

function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <AppWithAuth />
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
