/**
 * ============================================
 * STORAGE UTILITIES - OPGESCHOOND
 * ============================================
 * 
 * ⚠️  BELANGRIJK: Firebase is de ENIGE bron van waarheid!
 * 
 * Dit bestand bevat ALLEEN nog:
 * - UI-gerelateerde localStorage functies (tab, rol, etc.)
 * - Bestand lees/validatie functies voor imports
 * 
 * De volgende functies zijn VERWIJDERD omdat ze het data-verlies
 * incident van januari 2026 konden veroorzaken:
 * - laadAppData() - laadde van localStorage
 * - slaAppDataOp() - schreef naar localStorage
 * - updateBedden/Gewassen/Teeltplan/Taken() - schreven naar localStorage
 * - wisAlleData() - wiste localStorage (had geen effect op Firebase)
 * - exporteerTaken() - laadde van localStorage
 * - importeerTaken() - schreef naar localStorage
 * 
 * Alle data operaties gaan nu via firebaseService.ts
 * ============================================
 */

import type { ExportData } from '../types';

// ============================================
// CONSTANTEN
// ============================================

// Keys voor UI-voorkeuren (NIET voor app data!)
const UI_KEYS = {
  tab: 'tuinplanner_tab',
  rol: 'tuinplanner_rol',
  gebruiker: 'tuinplanner_gebruiker',
  taal: 'tuinplanner_taal'
} as const;

// ============================================
// UI VOORKEUREN (veilig om in localStorage te bewaren)
// ============================================

/**
 * Haal opgeslagen UI tab op
 */
export function getOpgeslagenTab(): string | null {
  return localStorage.getItem(UI_KEYS.tab);
}

/**
 * Sla huidige tab op
 */
export function setOpgeslagenTab(tab: string): void {
  localStorage.setItem(UI_KEYS.tab, tab);
}

/**
 * Haal opgeslagen rol op
 */
export function getOpgeslagenRol(): string | null {
  return localStorage.getItem(UI_KEYS.rol);
}

/**
 * Sla huidige rol op
 */
export function setOpgeslagenRol(rol: string): void {
  localStorage.setItem(UI_KEYS.rol, rol);
}

/**
 * Haal opgeslagen gebruikersnaam op
 */
export function getOpgeslagenGebruiker(): string | null {
  return localStorage.getItem(UI_KEYS.gebruiker);
}

/**
 * Sla gebruikersnaam op
 */
export function setOpgeslagenGebruiker(naam: string): void {
  localStorage.setItem(UI_KEYS.gebruiker, naam);
}

/**
 * Haal opgeslagen taal op
 */
export function getOpgeslagenTaal(): string | null {
  return localStorage.getItem(UI_KEYS.taal);
}

/**
 * Sla taal op
 */
export function setOpgeslagenTaal(taal: string): void {
  localStorage.setItem(UI_KEYS.taal, taal);
}

/**
 * Wis alle UI voorkeuren (voor logout/reset)
 */
export function wisUIVoorkeuren(): void {
  Object.values(UI_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// ============================================
// BESTAND LEES FUNCTIES (voor imports)
// ============================================

/**
 * Lees en valideer een import bestand
 * Let op: Dit leest alleen het bestand, slaat NIETS op!
 * De daadwerkelijke import moet via firebaseService gebeuren.
 */
export async function leesImportBestand(bestand: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ExportData;

        // Validatie
        if (!data.versie || !data.taken || !Array.isArray(data.taken)) {
          throw new Error('Ongeldig bestandsformaat');
        }

        resolve(data);
      } catch (err) {
        reject(new Error('Kon bestand niet parsen. Is dit een geldig TuinPlanner export bestand?'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Fout bij lezen van bestand'));
    };

    reader.readAsText(bestand);
  });
}

/**
 * Generieke functie om een JSON bestand te lezen
 */
export async function leesJSONBestand<T>(bestand: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as T;
        resolve(data);
      } catch (err) {
        reject(new Error('Kon bestand niet parsen als JSON'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Fout bij lezen van bestand'));
    };

    reader.readAsText(bestand);
  });
}

// ============================================
// DOWNLOAD HELPERS
// ============================================

/**
 * Download data als JSON bestand
 */
export function downloadAlsJSON(data: unknown, bestandsnaam: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download data als CSV bestand
 */
export function downloadAlsCSV(csvContent: string, bestandsnaam: string): void {
  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
