import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, type Taal, type Vertalingen } from './translations';

// ============================================
// CONTEXT TYPE
// ============================================

interface I18nContextType {
  taal: Taal;
  setTaal: (taal: Taal) => void;
  t: Vertalingen;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface I18nProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'tuinplanner_taal';

export function I18nProvider({ children }: I18nProviderProps) {
  // Haal opgeslagen taal op of gebruik browser taal als fallback
  const getInitialTaal = (): Taal => {
    if (typeof window === 'undefined') return 'nl';

    const opgeslagen = localStorage.getItem(STORAGE_KEY);
    if (opgeslagen === 'nl' || opgeslagen === 'en') {
      return opgeslagen;
    }

    // Check browser taal
    const browserTaal = navigator.language.substring(0, 2).toLowerCase();
    if (browserTaal === 'en') {
      return 'en';
    }

    return 'nl'; // Default naar Nederlands
  };

  const [taal, setTaalState] = useState<Taal>(getInitialTaal);

  // Sla taal op wanneer het verandert
  const setTaal = (nieuweTaal: Taal) => {
    setTaalState(nieuweTaal);
    localStorage.setItem(STORAGE_KEY, nieuweTaal);
  };

  // Sync met localStorage bij laden
  useEffect(() => {
    const opgeslagen = localStorage.getItem(STORAGE_KEY);
    if (opgeslagen === 'nl' || opgeslagen === 'en') {
      setTaalState(opgeslagen);
    }
  }, []);

  const t = translations[taal];

  return (
    <I18nContext.Provider value={{ taal, setTaal, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n moet binnen een I18nProvider gebruikt worden');
  }
  return context;
}

// Shorthand hook voor alleen vertalingen
export function useT() {
  const { t } = useI18n();
  return t;
}
