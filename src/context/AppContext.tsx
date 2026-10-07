import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import type {
  AppData,
  Taak,
  Bed,
  Gewas,
  VerrijktGewas,
  TeeltplanItem,
  ToastBericht,
  NavigatieTab,
  FilterOpties,
  SorteerOpties,
  GebruikersRol,
  OogstItem,
  OogstRegistratie,
  OogstInstructie,
  Instructie,
  Signalering,
  BedVoortgang,
  GewassenlijstItem,
  TaakgroepOverride
} from '../types';
import { genereerVensterTaken, opruimenOudeTaken, isTaakUrgent, berekenDynamischePrioriteit, corrigeerTeeltplanDeadlines } from '../utils/taskGenerator';
import { nuISO } from '../utils/dateUtils';
import * as firebaseService from '../services/firebaseService';
import { verwijderAlleFotos } from '../services/storageService';
import { COMMISSIE_PIN, DEMO_MODE } from '../config/appConfig';

// ============================================
// STATE TYPE
// ============================================

interface AppState {
  data: AppData;
  ui: {
    huidigeTab: NavigatieTab;
    filters: FilterOpties;
    sortering: SorteerOpties;
    toasts: ToastBericht[];
    isLaden: boolean;
    isSyncing: boolean;
    rol: GebruikersRol;
    gebruikersnaam: string;  // Onthouden wie je bent
  };
}

// ============================================
// ACTIONS
// ============================================

type AppAction =
  | { type: 'LAAD_DATA'; payload: AppData }
  | { type: 'SET_BEDDEN'; payload: Bed[] }
  | { type: 'SET_GEWASSEN'; payload: Gewas[] }
  | { type: 'SET_TEELTPLAN'; payload: TeeltplanItem[] }
  | { type: 'SET_TAKEN'; payload: Taak[] }
  | { type: 'VOEG_TAAK_TOE'; payload: Taak }
  | { type: 'UPDATE_TAAK'; payload: Taak }
  | { type: 'VERWIJDER_TAAK'; payload: string }
  | { type: 'GENEREER_TAKEN' }
  | { type: 'OPRUIMEN_TAKEN' }
  | { type: 'SET_TAB'; payload: NavigatieTab }
  | { type: 'SET_FILTERS'; payload: Partial<FilterOpties> }
  | { type: 'RESET_EN_SET_FILTERS'; payload: Partial<FilterOpties> }  // Reset alle filters en pas dan nieuwe toe
  | { type: 'SET_SORTERING'; payload: SorteerOpties }
  | { type: 'TOON_TOAST'; payload: ToastBericht }
  | { type: 'VERBERG_TOAST'; payload: string }
  | { type: 'SET_LADEN'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  // Nieuwe acties voor rollen en extra data
  | { type: 'SET_ROL'; payload: GebruikersRol }
  | { type: 'SET_GEBRUIKERSNAAM'; payload: string }
  | { type: 'SET_OOGSTLIJST'; payload: OogstItem[] }
  | { type: 'VOEG_OOGST_TOE'; payload: OogstItem }
  | { type: 'UPDATE_OOGST'; payload: OogstItem }
  | { type: 'VERWIJDER_OOGST'; payload: string }
  | { type: 'SET_SIGNALERINGEN'; payload: Signalering[] }
  | { type: 'VOEG_SIGNALERING_TOE'; payload: Signalering }
  | { type: 'UPDATE_SIGNALERING'; payload: Signalering }
  | { type: 'VERWIJDER_SIGNALERING'; payload: string }
  | { type: 'SET_OOGST_REGISTRATIES'; payload: OogstRegistratie[] }
  | { type: 'VOEG_OOGST_REGISTRATIE_TOE'; payload: OogstRegistratie }
  // Oogst instructies acties (legacy)
  | { type: 'SET_OOGST_INSTRUCTIES'; payload: OogstInstructie[] }
  | { type: 'VOEG_OOGST_INSTRUCTIE_TOE'; payload: OogstInstructie }
  | { type: 'UPDATE_OOGST_INSTRUCTIE'; payload: OogstInstructie }
  | { type: 'VERWIJDER_OOGST_INSTRUCTIE'; payload: string }
  // Instructies acties (nieuw)
  | { type: 'SET_INSTRUCTIES'; payload: Instructie[] }
  | { type: 'VOEG_INSTRUCTIE_TOE'; payload: Instructie }
  | { type: 'UPDATE_INSTRUCTIE'; payload: Instructie }
  | { type: 'VERWIJDER_INSTRUCTIE'; payload: string }
  // Bed voortgang acties
  | { type: 'SET_BED_VOORTGANG'; payload: BedVoortgang[] }
  | { type: 'VOEG_BED_VOORTGANG_TOE'; payload: BedVoortgang }
  | { type: 'UPDATE_BED_VOORTGANG'; payload: BedVoortgang }
  | { type: 'VERWIJDER_BED_VOORTGANG'; payload: string }
  // Taakgroep overrides acties
  | { type: 'SET_TAAKGROEP_OVERRIDES'; payload: TaakgroepOverride[] }
  | { type: 'UPSERT_TAAKGROEP_OVERRIDE'; payload: TaakgroepOverride }
  | { type: 'VERWIJDER_TAAKGROEP_OVERRIDE'; payload: string };

// ============================================
// CONSTANTEN
// ============================================

// Tabs die alleen voor commissie zijn
// oogstinstructies is toegankelijk voor iedereen (community kan bekijken, commissie kan bewerken)
const COMMISSIE_ONLY_TABS: NavigatieTab[] = ['dashboard', 'taken', 'teeltplantaken', 'importeren', 'instellingen'];

// ============================================
// HELPER: SCHUIF VERLOPEN TAKEN DOOR
// ============================================

/**
 * Schuift niet-afgeronde taken met een verlopen deadline door naar vandaag.
 * Dit voorkomt dat taken "verloren" gaan als ze niet zijn afgerond in hun oorspronkelijke week.
 * Bij verlopen deadline wordt de prioriteit automatisch naar 'Hoog' ge-escaleerd.
 * Herhalende taken worden overgeslagen (die herhalen zelfstandig).
 */
function schuifVerlopenTakenDoor(taken: Taak[]): Taak[] {
  const vandaag = new Date();
  vandaag.setHours(0, 0, 0, 0);

  return taken.map(taak => {
    // Afgeronde en gearchiveerde taken niet doorschuiven
    if (taak.status === 'Afgerond' || taak.status === 'Gearchiveerd') {
      return taak;
    }

    // Herhalende taken niet doorschuiven (ze herhalen zelfstandig)
    if (taak.isHerhalend) {
      return taak;
    }

    const deadline = new Date(taak.deadline);
    deadline.setHours(0, 0, 0, 0);

    // Als de deadline in het verleden ligt, schuif door naar vandaag + escaleer prioriteit
    if (deadline < vandaag) {
      return {
        ...taak,
        deadline: vandaag.toISOString().split('T')[0], // Nieuwe deadline = vandaag
        // Auto-escalatie: sla originele prioriteit op en zet naar Hoog
        origPrioriteit: taak.isAutoEscalated ? taak.origPrioriteit : taak.prioriteit,
        prioriteit: 'Hoog' as const,
        isAutoEscalated: true,
      };
    }

    return taak;
  });
}

// ============================================
// REDUCER
// ============================================

// Migratie: fotoUrl → fotoUrls voor backward compatibility (in-memory normalisatie)
function normaliseerFotoUrls(taken: Taak[]): Taak[] {
  return taken.map(taak => {
    if (taak.fotoUrl && (!taak.fotoUrls || taak.fotoUrls.length === 0)) {
      return { ...taak, fotoUrls: [taak.fotoUrl] };
    }
    return taak;
  });
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LAAD_DATA': {
      const gemigreerdeTaken = normaliseerFotoUrls(action.payload.taken);
      return {
        ...state,
        data: { ...action.payload, taken: gemigreerdeTaken },
        ui: { ...state.ui, isLaden: false }
      };
    }

    case 'SET_BEDDEN':
      return {
        ...state,
        data: { ...state.data, bedden: action.payload, laatsteSync: nuISO() }
      };

    case 'SET_GEWASSEN':
      return {
        ...state,
        data: { ...state.data, gewassen: action.payload, laatsteSync: nuISO() }
      };

    case 'SET_TEELTPLAN':
      return {
        ...state,
        data: { ...state.data, teeltplan: action.payload, laatsteSync: nuISO() }
      };

    case 'SET_TAKEN':
      return {
        ...state,
        data: { ...state.data, taken: normaliseerFotoUrls(action.payload), laatsteSync: nuISO() }
      };

    case 'VOEG_TAAK_TOE':
      return {
        ...state,
        data: {
          ...state.data,
          taken: [...state.data.taken, action.payload],
          laatsteSync: nuISO()
        }
      };

    case 'UPDATE_TAAK': {
      const updatedTaken = state.data.taken.map(t =>
        t.id === action.payload.id
          ? { ...action.payload, gewijzigd: nuISO() }
          : t
      );
      return {
        ...state,
        data: { ...state.data, taken: updatedTaken, laatsteSync: nuISO() }
      };
    }

    case 'VERWIJDER_TAAK':
      return {
        ...state,
        data: {
          ...state.data,
          taken: state.data.taken.filter(t => t.id !== action.payload),
          laatsteSync: nuISO()
        }
      };

    case 'GENEREER_TAKEN': {
      const nieuweTaken = genereerVensterTaken(
        state.data.teeltplan,
        state.data.taken
      );

      // Corrigeer startdatum/deadline van bestaande taken (fix voor import-datum probleem)
      const gecorrigeerd = corrigeerTeeltplanDeadlines(state.data.taken);
      const gecorrigeerdeIds = new Set(gecorrigeerd.map(t => t.id));

      if (nieuweTaken.length === 0 && gecorrigeerd.length === 0) {
        return state;
      }

      // Vervang gecorrigeerde taken + voeg nieuwe toe
      const bijgewerkteTaken = state.data.taken.map(t =>
        gecorrigeerdeIds.has(t.id) ? gecorrigeerd.find(g => g.id === t.id)! : t
      );

      return {
        ...state,
        data: {
          ...state.data,
          taken: [...bijgewerkteTaken, ...nieuweTaken],
          laatsteSync: nuISO()
        }
      };
    }

    case 'OPRUIMEN_TAKEN': {
      const opgerumideTaken = opruimenOudeTaken(state.data.taken);
      return {
        ...state,
        data: { ...state.data, taken: opgerumideTaken, laatsteSync: nuISO() }
      };
    }

    case 'SET_TAB':
      // Sla huidige tab op in localStorage
      localStorage.setItem('tuinplanner_tab', action.payload);
      return {
        ...state,
        ui: { ...state.ui, huidigeTab: action.payload }
      };

    case 'SET_FILTERS':
      return {
        ...state,
        ui: {
          ...state.ui,
          filters: { ...state.ui.filters, ...action.payload }
        }
      };

    case 'RESET_EN_SET_FILTERS':
      // Reset alle filters naar default en pas dan de nieuwe filters toe
      // Gebruikt voor navigatie vanuit Dashboard naar Taken pagina
      return {
        ...state,
        ui: {
          ...state.ui,
          filters: {
            taakType: 'Alle',
            prioriteit: 'Alle',
            status: 'Alle',
            sectie: 'Alle',
            gewas: 'Alle',
            bron: 'Alle',
            venster: 'Alle',
            ...action.payload  // Overschrijf met de gewenste filter
          }
        }
      };

    case 'SET_SORTERING':
      return {
        ...state,
        ui: { ...state.ui, sortering: action.payload }
      };

    case 'TOON_TOAST':
      return {
        ...state,
        ui: {
          ...state.ui,
          toasts: [...state.ui.toasts, action.payload]
        }
      };

    case 'VERBERG_TOAST':
      return {
        ...state,
        ui: {
          ...state.ui,
          toasts: state.ui.toasts.filter(t => t.id !== action.payload)
        }
      };

    case 'SET_LADEN':
      return {
        ...state,
        ui: { ...state.ui, isLaden: action.payload }
      };

    case 'SET_SYNCING':
      return {
        ...state,
        ui: { ...state.ui, isSyncing: action.payload }
      };

    // Nieuwe cases voor rollen
    case 'SET_ROL': {
      // Sla rol op in localStorage
      localStorage.setItem('tuinplanner_rol', action.payload);

      // Als community lid naar een commissie-only tab kijkt, redirect naar weekoverzicht
      const nieuweTab = action.payload === 'community' &&
        COMMISSIE_ONLY_TABS.includes(state.ui.huidigeTab)
          ? 'weekoverzicht'
          : state.ui.huidigeTab;

      return {
        ...state,
        ui: { ...state.ui, rol: action.payload, huidigeTab: nieuweTab }
      };
    }

    case 'SET_GEBRUIKERSNAAM':
      // Sla gebruikersnaam op in localStorage
      localStorage.setItem('tuinplanner_gebruiker', action.payload);
      return {
        ...state,
        ui: { ...state.ui, gebruikersnaam: action.payload }
      };

    // Oogstlijst cases
    case 'SET_OOGSTLIJST':
      return {
        ...state,
        data: { ...state.data, oogstlijst: action.payload }
      };

    case 'VOEG_OOGST_TOE':
      return {
        ...state,
        data: {
          ...state.data,
          oogstlijst: [...state.data.oogstlijst, action.payload]
        }
      };

    case 'UPDATE_OOGST': {
      const updatedOogstlijst = state.data.oogstlijst.map(o =>
        o.id === action.payload.id ? action.payload : o
      );
      return {
        ...state,
        data: { ...state.data, oogstlijst: updatedOogstlijst }
      };
    }

    case 'VERWIJDER_OOGST':
      return {
        ...state,
        data: {
          ...state.data,
          oogstlijst: state.data.oogstlijst.filter(o => o.id !== action.payload)
        }
      };

    // Signaleringen cases
    case 'SET_SIGNALERINGEN':
      return {
        ...state,
        data: { ...state.data, signaleringen: action.payload }
      };

    case 'VOEG_SIGNALERING_TOE':
      return {
        ...state,
        data: {
          ...state.data,
          signaleringen: [...state.data.signaleringen, action.payload]
        }
      };

    case 'UPDATE_SIGNALERING': {
      const updatedSignaleringen = state.data.signaleringen.map(s =>
        s.id === action.payload.id ? action.payload : s
      );
      return {
        ...state,
        data: { ...state.data, signaleringen: updatedSignaleringen }
      };
    }

    case 'VERWIJDER_SIGNALERING':
      return {
        ...state,
        data: {
          ...state.data,
          signaleringen: state.data.signaleringen.filter(s => s.id !== action.payload)
        }
      };

    // Oogst registraties
    case 'SET_OOGST_REGISTRATIES':
      return {
        ...state,
        data: { ...state.data, oogstRegistraties: action.payload }
      };

    case 'VOEG_OOGST_REGISTRATIE_TOE':
      return {
        ...state,
        data: {
          ...state.data,
          oogstRegistraties: [...state.data.oogstRegistraties, action.payload]
        }
      };

    // Oogst instructies cases
    case 'SET_OOGST_INSTRUCTIES':
      return {
        ...state,
        data: { ...state.data, oogstInstructies: action.payload }
      };

    case 'VOEG_OOGST_INSTRUCTIE_TOE':
      return {
        ...state,
        data: {
          ...state.data,
          oogstInstructies: [...state.data.oogstInstructies, action.payload]
        }
      };

    case 'UPDATE_OOGST_INSTRUCTIE':
      return {
        ...state,
        data: {
          ...state.data,
          oogstInstructies: state.data.oogstInstructies.map(i =>
            i.id === action.payload.id ? action.payload : i
          )
        }
      };

    case 'VERWIJDER_OOGST_INSTRUCTIE':
      return {
        ...state,
        data: {
          ...state.data,
          oogstInstructies: state.data.oogstInstructies.filter(i => i.id !== action.payload)
        }
      };

    // Instructies cases (nieuw)
    case 'SET_INSTRUCTIES':
      return {
        ...state,
        data: { ...state.data, instructies: action.payload }
      };

    case 'VOEG_INSTRUCTIE_TOE':
      return {
        ...state,
        data: {
          ...state.data,
          instructies: [...state.data.instructies, action.payload]
        }
      };

    case 'UPDATE_INSTRUCTIE':
      return {
        ...state,
        data: {
          ...state.data,
          instructies: state.data.instructies.map(i =>
            i.id === action.payload.id ? action.payload : i
          )
        }
      };

    case 'VERWIJDER_INSTRUCTIE':
      return {
        ...state,
        data: {
          ...state.data,
          instructies: state.data.instructies.filter(i => i.id !== action.payload)
        }
      };

    // Bed voortgang cases
    case 'SET_BED_VOORTGANG':
      return {
        ...state,
        data: { ...state.data, bedVoortgang: action.payload }
      };

    case 'VOEG_BED_VOORTGANG_TOE':
      return {
        ...state,
        data: {
          ...state.data,
          bedVoortgang: [...state.data.bedVoortgang, action.payload]
        }
      };

    case 'UPDATE_BED_VOORTGANG': {
      const updatedBedVoortgang = state.data.bedVoortgang.map(bv =>
        bv.id === action.payload.id ? action.payload : bv
      );
      return {
        ...state,
        data: { ...state.data, bedVoortgang: updatedBedVoortgang }
      };
    }

    case 'VERWIJDER_BED_VOORTGANG':
      return {
        ...state,
        data: {
          ...state.data,
          bedVoortgang: state.data.bedVoortgang.filter(bv => bv.id !== action.payload)
        }
      };

    // Taakgroep overrides
    case 'SET_TAAKGROEP_OVERRIDES':
      return {
        ...state,
        data: { ...state.data, taakgroepOverrides: action.payload }
      };

    case 'UPSERT_TAAKGROEP_OVERRIDE': {
      const exists = state.data.taakgroepOverrides.some(o => o.id === action.payload.id);
      const updatedOverrides = exists
        ? state.data.taakgroepOverrides.map(o =>
            o.id === action.payload.id ? action.payload : o
          )
        : [...state.data.taakgroepOverrides, action.payload];
      return {
        ...state,
        data: { ...state.data, taakgroepOverrides: updatedOverrides }
      };
    }

    case 'VERWIJDER_TAAKGROEP_OVERRIDE':
      return {
        ...state,
        data: {
          ...state.data,
          taakgroepOverrides: state.data.taakgroepOverrides.filter(o => o.id !== action.payload)
        }
      };

    default:
      return state;
  }
}

// ============================================
// INITIAL STATE
// ============================================

// Haal opgeslagen rol en gebruikersnaam op
const opgeslagenRol = (typeof window !== 'undefined'
  ? localStorage.getItem('tuinplanner_rol') as GebruikersRol
  : null) || 'community';
const opgeslagenGebruiker = (typeof window !== 'undefined'
  ? localStorage.getItem('tuinplanner_gebruiker')
  : null) || '';
const opgeslagenTab = (typeof window !== 'undefined'
  ? localStorage.getItem('tuinplanner_tab') as NavigatieTab
  : null);

// Bepaal de start tab op basis van rol en opgeslagen tab
const getStartTab = (rol: GebruikersRol, savedTab: NavigatieTab | null): NavigatieTab => {
  // Als er een opgeslagen tab is
  if (savedTab) {
    // Check of de tab geldig is voor de huidige rol
    const isCommissieOnlyTab = COMMISSIE_ONLY_TABS.includes(savedTab);

    // Als community en de tab is commissie-only, gebruik default
    if (rol === 'community' && isCommissieOnlyTab) {
      return 'weekoverzicht';
    }

    // Anders gebruik de opgeslagen tab
    return savedTab;
  }

  // Geen opgeslagen tab: gebruik default per rol
  return rol === 'commissie' ? 'dashboard' : 'weekoverzicht';
};

const initialState: AppState = {
  data: {
    bedden: [],
    gewassen: [],
    verrijkteGewassen: [],
    gewassenlijst: [],
    teeltplan: [],
    taken: [],
    oogstlijst: [],
    oogstRegistraties: [],
    oogstInstructies: [],
    instructies: [],
    signaleringen: [],
    bedVoortgang: [],
    taakgroepOverrides: [],
    laatsteSync: nuISO(),
    versie: '1.0.0'
  },
  ui: {
    huidigeTab: getStartTab(opgeslagenRol, opgeslagenTab),
    filters: {
      taakType: 'Alle',
      prioriteit: 'Alle',
      status: 'Alle',
      sectie: 'Alle',
      gewas: 'Alle',
      bron: 'Alle',
      venster: 'Alle'
    },
    sortering: {
      veld: 'deadline',
      richting: 'asc'
    },
    toasts: [],
    isLaden: true,
    isSyncing: false,
    rol: opgeslagenRol,
    gebruikersnaam: opgeslagenGebruiker
  }
};

// ============================================
// CONTEXT
// ============================================

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  toonToast: (type: ToastBericht['type'], bericht: string) => void;
  // Firebase operaties
  saveBedden: (bedden: Bed[]) => Promise<void>;
  saveGewassen: (gewassen: Gewas[]) => Promise<void>;
  saveTeeltplan: (teeltplan: TeeltplanItem[]) => Promise<void>;
  saveGewassenlijst: (items: GewassenlijstItem[]) => Promise<void>;
  saveTaak: (taak: Taak) => Promise<void>;
  deleteTaak: (taakId: string) => Promise<void>;
  saveTaken: (taken: Taak[]) => Promise<void>;
  // Nieuwe functies
  saveOogstlijst: (oogstlijst: OogstItem[]) => Promise<void>;
  saveOogstItem: (item: OogstItem) => Promise<void>;
  deleteOogstItem: (itemId: string) => Promise<void>;
  saveOogstRegistratie: (registratie: OogstRegistratie) => Promise<void>;
  // Oogst instructies functies (legacy)
  saveOogstInstructie: (instructie: OogstInstructie) => Promise<void>;
  deleteOogstInstructie: (instructieId: string) => Promise<void>;
  // Instructies functies (nieuw)
  saveInstructie: (instructie: Instructie) => Promise<void>;
  saveInstructies: (instructies: Instructie[]) => Promise<void>;
  deleteInstructie: (instructieId: string) => Promise<void>;
  saveSignaleringen: (signaleringen: Signalering[]) => Promise<void>;
  saveSignalering: (signalering: Signalering) => Promise<void>;
  deleteSignalering: (sigId: string) => Promise<void>;
  // Bed voortgang functies
  saveBedVoortgang: (item: BedVoortgang) => Promise<void>;
  deleteBedVoortgang: (itemId: string) => Promise<void>;
  // Taakgroep overrides functies
  saveTaakgroepOverride: (override: TaakgroepOverride) => Promise<void>;
  deleteTaakgroepOverride: (overrideId: string) => Promise<void>;
  // Rol functies
  wisselNaarCommissie: (pin: string) => boolean;
  wisselNaarCommunity: () => void;
  setGebruikersnaam: (naam: string) => void;
  isCommissie: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isInitialized = useRef(false);

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    console.log('Starting Firebase subscription...');

    // Timeout om te voorkomen dat de app eindeloos blijft laden
    const timeout = setTimeout(() => {
      if (!isInitialized.current) {
        console.warn('Firebase timeout - laden zonder data');
        dispatch({ type: 'SET_LADEN', payload: false });
      }
    }, 10000); // 10 seconden timeout

    const unsubscribe = firebaseService.subscribeToData(
      async (data) => {
        console.log('Firebase data received:', {
          bedden: data.bedden.length,
          gewassen: data.gewassen.length,
          teeltplan: data.teeltplan.length,
          taken: data.taken.length
        });
        clearTimeout(timeout);

        // Check of er taken doorgeschoven moeten worden
        let bijgewerkteTaken = schuifVerlopenTakenDoor(data.taken);
        let heeftWijzigingen = bijgewerkteTaken.some((taak, i) =>
          taak.deadline !== data.taken[i]?.deadline
        );

        // Corrigeer startdatum/deadline van teeltplan taken (eenmalig bij laden)
        if (!isInitialized.current) {
          const gecorrigeerd = corrigeerTeeltplanDeadlines(bijgewerkteTaken);
          if (gecorrigeerd.length > 0) {
            console.log(`Corrigeer deadline van ${gecorrigeerd.length} teeltplan taken`);
            const gecorrigeerdeIds = new Set(gecorrigeerd.map(t => t.id));
            bijgewerkteTaken = bijgewerkteTaken.map(t =>
              gecorrigeerdeIds.has(t.id) ? gecorrigeerd.find(g => g.id === t.id)! : t
            );
            heeftWijzigingen = true;
          }
        }

        // Sla gewijzigde taken op naar Firebase (alleen bij wijzigingen en eerste keer)
        if (heeftWijzigingen && !isInitialized.current) {
          console.log('Opslaan gecorrigeerde taken naar Firebase...');
          try {
            await firebaseService.setTaken(bijgewerkteTaken);
          } catch (error) {
            console.error('Fout bij opslaan gecorrigeerde taken:', error);
          }
        }

        dispatch({ type: 'LAAD_DATA', payload: { ...data, taken: bijgewerkteTaken } });
        isInitialized.current = true;
      },
      (error) => {
        console.error('Firebase sync error:', error);
        clearTimeout(timeout);
        dispatch({ type: 'SET_LADEN', payload: false });
        toonToast('error', 'Synchronisatie fout - probeer te vernieuwen');
      }
    );

    return () => {
      console.log('Unsubscribing from Firebase...');
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Toast helper functie
  const toonToast = (type: ToastBericht['type'], bericht: string) => {
    const id = `toast-${Date.now()}`;
    dispatch({
      type: 'TOON_TOAST',
      payload: { id, type, bericht, duur: 4000 }
    });

    // Auto-verberg na duur
    setTimeout(() => {
      dispatch({ type: 'VERBERG_TOAST', payload: id });
    }, 4000);
  };

  // Firebase save functies
  const saveBedden = async (bedden: Bed[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setBedden(bedden);
    } catch (error) {
      console.error('Error saving bedden:', error);
      toonToast('error', 'Kon bedden niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveGewassen = async (gewassen: Gewas[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setGewassen(gewassen);
    } catch (error) {
      console.error('Error saving gewassen:', error);
      toonToast('error', 'Kon gewassen niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveTeeltplan = async (teeltplan: TeeltplanItem[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setTeeltplan(teeltplan);
    } catch (error) {
      console.error('Error saving teeltplan:', error);
      toonToast('error', 'Kon teeltplan niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveGewassenlijst = async (items: GewassenlijstItem[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setGewassenlijst(items);
    } catch (error) {
      console.error('Error saving gewassenlijst:', error);
      toonToast('error', 'Kon gewassenlijst niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveTaak = async (taak: Taak) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.updateTaak(taak);
    } catch (error) {
      console.error('Error saving taak:', error);
      toonToast('error', 'Kon taak niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteTaak = async (taakId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      // Verwijder eventuele foto's uit Storage
      await verwijderAlleFotos('taken', taakId);
      // Verwijder taak uit database
      await firebaseService.verwijderTaak(taakId);
    } catch (error) {
      console.error('Error deleting taak:', error);
      toonToast('error', 'Kon taak niet verwijderen');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveTaken = async (taken: Taak[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setTaken(taken);
    } catch (error) {
      console.error('Error saving taken:', error);
      toonToast('error', 'Kon taken niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Oogstlijst functies
  const saveOogstlijst = async (oogstlijst: OogstItem[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setOogstlijst(oogstlijst);
    } catch (error) {
      console.error('Error saving oogstlijst:', error);
      toonToast('error', 'Kon oogstlijst niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveOogstItem = async (item: OogstItem) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      console.log('Saving oogst item:', JSON.stringify(item, null, 2));
      await firebaseService.updateOogstItem(item);
      console.log('Oogst item saved successfully');
    } catch (error) {
      console.error('Error saving oogst item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      toonToast('error', `Kon oogst item niet opslaan: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteOogstItem = async (itemId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.verwijderOogstItem(itemId);
    } catch (error) {
      console.error('Error deleting oogst item:', error);
      toonToast('error', 'Kon oogst item niet verwijderen');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveOogstRegistratie = async (registratie: OogstRegistratie) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.updateOogstRegistratie(registratie);
    } catch (error) {
      console.error('Error saving oogst registratie:', error);
      toonToast('error', 'Kon oogst registratie niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Oogst instructies functies
  const saveOogstInstructie = async (instructie: OogstInstructie) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const exists = state.data.oogstInstructies.some(i => i.id === instructie.id);
      if (exists) {
        dispatch({ type: 'UPDATE_OOGST_INSTRUCTIE', payload: instructie });
      } else {
        dispatch({ type: 'VOEG_OOGST_INSTRUCTIE_TOE', payload: instructie });
      }
      await firebaseService.updateOogstInstructie(instructie);
    } catch (error) {
      console.error('Error saving oogst instructie:', error);
      toonToast('error', 'Kon oogst instructie niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteOogstInstructie = async (instructieId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      // Verwijder eventuele foto's uit Storage
      await verwijderAlleFotos('oogstInstructies', instructieId);
      dispatch({ type: 'VERWIJDER_OOGST_INSTRUCTIE', payload: instructieId });
      await firebaseService.verwijderOogstInstructie(instructieId);
    } catch (error) {
      console.error('Error deleting oogst instructie:', error);
      toonToast('error', 'Kon oogst instructie niet verwijderen');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Instructies functies (nieuw)
  const saveInstructie = async (instructie: Instructie) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const exists = state.data.instructies.some(i => i.id === instructie.id);
      if (exists) {
        dispatch({ type: 'UPDATE_INSTRUCTIE', payload: instructie });
      } else {
        dispatch({ type: 'VOEG_INSTRUCTIE_TOE', payload: instructie });
      }
      await firebaseService.updateInstructie(instructie);
    } catch (error) {
      console.error('Error saving instructie:', error);
      toonToast('error', 'Kon instructie niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteInstructie = async (instructieId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      // Verwijder eventuele foto's uit Storage
      await verwijderAlleFotos('instructies', instructieId);
      dispatch({ type: 'VERWIJDER_INSTRUCTIE', payload: instructieId });
      await firebaseService.verwijderInstructie(instructieId);
    } catch (error) {
      console.error('Error deleting instructie:', error);
      toonToast('error', 'Kon instructie niet verwijderen');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveInstructies = async (instructies: Instructie[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setInstructies(instructies);
    } catch (error) {
      console.error('Error saving instructies:', error);
      toonToast('error', 'Kon instructies niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Signaleringen functies
  const saveSignaleringen = async (signaleringen: Signalering[]) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.setSignaleringen(signaleringen);
    } catch (error) {
      console.error('Error saving signaleringen:', error);
      toonToast('error', 'Kon signaleringen niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveSignalering = async (signalering: Signalering) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.updateSignalering(signalering);
    } catch (error) {
      console.error('Error saving signalering:', error);
      toonToast('error', 'Kon signalering niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteSignalering = async (sigId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.verwijderSignalering(sigId);
    } catch (error) {
      console.error('Error deleting signalering:', error);
      toonToast('error', 'Kon bericht niet verwijderen');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Bed voortgang functies
  const saveBedVoortgang = async (item: BedVoortgang) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.updateBedVoortgang(item);
    } catch (error) {
      console.error('Error saving bed voortgang:', error);
      toonToast('error', 'Kon bed voortgang niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteBedVoortgang = async (itemId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      await firebaseService.verwijderBedVoortgang(itemId);
    } catch (error) {
      console.error('Error deleting bed voortgang:', error);
      toonToast('error', 'Kon bed voortgang niet verwijderen');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Taakgroep overrides functies
  const saveTaakgroepOverride = async (override: TaakgroepOverride) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      dispatch({ type: 'UPSERT_TAAKGROEP_OVERRIDE', payload: override });
      await firebaseService.updateTaakgroepOverride(override);
    } catch (error) {
      console.error('Error saving taakgroep override:', error);
      toonToast('error', 'Kon groep aanpassing niet opslaan');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteTaakgroepOverride = async (overrideId: string) => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      dispatch({ type: 'VERWIJDER_TAAKGROEP_OVERRIDE', payload: overrideId });
      await firebaseService.verwijderTaakgroepOverride(overrideId);
    } catch (error) {
      console.error('Error deleting taakgroep override:', error);
      toonToast('error', 'Kon groep aanpassing niet verwijderen');
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Rol functies
  const wisselNaarCommissie = (pin: string): boolean => {
    // In demomodus is er geen pincode: iedereen mag alles zien
    if (DEMO_MODE || pin === COMMISSIE_PIN) {
      dispatch({ type: 'SET_ROL', payload: 'commissie' });
      toonToast('success', 'Commissie modus geactiveerd');
      return true;
    }
    toonToast('error', 'Onjuiste PIN');
    return false;
  };

  const wisselNaarCommunity = () => {
    dispatch({ type: 'SET_ROL', payload: 'community' });
    toonToast('info', 'Terug naar community modus');
  };

  const setGebruikersnaam = (naam: string) => {
    dispatch({ type: 'SET_GEBRUIKERSNAAM', payload: naam });
  };

  const isCommissie = state.ui.rol === 'commissie';

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      toonToast,
      saveBedden,
      saveGewassen,
      saveTeeltplan,
      saveGewassenlijst,
      saveTaak,
      deleteTaak,
      saveTaken,
      saveOogstlijst,
      saveOogstItem,
      deleteOogstItem,
      saveOogstRegistratie,
      saveOogstInstructie,
      deleteOogstInstructie,
      saveInstructie,
      saveInstructies,
      deleteInstructie,
      saveSignaleringen,
      saveSignalering,
      deleteSignalering,
      saveBedVoortgang,
      deleteBedVoortgang,
      saveTaakgroepOverride,
      deleteTaakgroepOverride,
      wisselNaarCommissie,
      wisselNaarCommunity,
      setGebruikersnaam,
      isCommissie
    }}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp moet binnen een AppProvider gebruikt worden');
  }
  return context;
}

// ============================================
// SELECTOREN
// ============================================

export function useBedden() {
  const { state } = useApp();
  return state.data.bedden;
}

export function useGewassen() {
  const { state } = useApp();
  return state.data.gewassen;
}

export function useGewassenlijst() {
  const { state } = useApp();
  return state.data.gewassenlijst;
}

export function useTeeltplan() {
  const { state } = useApp();
  return state.data.teeltplan;
}

export function useTaken() {
  const { state } = useApp();
  return state.data.taken;
}

export function useGefilterdeTaken() {
  const { state } = useApp();
  const { taken } = state.data;
  const { filters, sortering } = state.ui;

  let gefilterd = [...taken];

  // Pas filters toe
  if (filters.taakType !== 'Alle') {
    gefilterd = gefilterd.filter(t => t.type === filters.taakType);
  }
  if (filters.prioriteit !== 'Alle') {
    if (filters.prioriteit === 'Urgent') {
      // Speciale filter: toon alleen urgent taken (dynamische hoge prioriteit, excl. afgerond)
      gefilterd = gefilterd.filter(t => isTaakUrgent(t));
    } else {
      // Normale filter: gebruik dynamische prioriteit voor consistentie
      gefilterd = gefilterd.filter(t => berekenDynamischePrioriteit(t) === filters.prioriteit);
    }
  }
  if (filters.status === 'Archief') {
    gefilterd = gefilterd.filter(t => t.status === 'Gearchiveerd');
  } else if (filters.status !== 'Alle') {
    gefilterd = gefilterd.filter(t => t.status === filters.status);
  } else {
    // "Alle" toont alles BEHALVE gearchiveerde taken
    gefilterd = gefilterd.filter(t => t.status !== 'Gearchiveerd');
  }
  if (filters.sectie !== 'Alle') {
    gefilterd = gefilterd.filter(t => t.sectie === filters.sectie);
  }
  if (filters.gewas !== 'Alle') {
    gefilterd = gefilterd.filter(t => t.bronGewas === filters.gewas);
  }
  if (filters.bron !== 'Alle') {
    if (filters.bron === 'teeltplan') {
      // Automatisch gegenereerde taken uit teeltplan
      gefilterd = gefilterd.filter(t => t.isAutomatisch === true);
    } else if (filters.bron === 'commissie') {
      // Handmatig toegevoegde taken door commissie
      gefilterd = gefilterd.filter(t => t.isAutomatisch !== true);
    }
  }

  // Sorteer
  gefilterd.sort((a, b) => {
    let vergelijk = 0;

    if (sortering.veld === 'deadline') {
      vergelijk = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    } else if (sortering.veld === 'prioriteit') {
      const prioriteitWaarde = { 'Hoog': 0, 'Normaal': 1, 'Laag': 2 };
      vergelijk = prioriteitWaarde[a.prioriteit] - prioriteitWaarde[b.prioriteit];
    } else if (sortering.veld === 'aangemaakt') {
      vergelijk = new Date(a.aangemaakt).getTime() - new Date(b.aangemaakt).getTime();
    }

    return sortering.richting === 'asc' ? vergelijk : -vergelijk;
  });

  return gefilterd;
}

export function useBedVoortgang() {
  const { state } = useApp();
  return state.data.bedVoortgang;
}
