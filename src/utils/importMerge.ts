import type {
  Bed,
  Gewas,
  TeeltplanItem,
  OogstItem,
  Taak,
  Instructie,
  ImportLog,
  ImportLogEntry,
  ImportLogType
} from '../types';
import { nuISO } from './dateUtils';

// ============================================
// MERGE RESULTAAT TYPE
// ============================================

export interface MergeResultaat<T> {
  // De gemergede array (bestaande + nieuwe items)
  data: T[];
  // Import log met details
  log: ImportLog;
}

// ============================================
// UNIEKE ID BEPALERS
// ============================================

/**
 * Bedden: uniek op basis van id (sectie + bedNummer)
 * Bijv. "A1", "B3", "Kas2"
 */
function getBedUniqueKey(bed: Bed): string {
  return bed.id;
}

/**
 * Gewassen: uniek op basis van gewas naam + variant
 * Bijv. "tomaat-roma", "sla-"
 */
function getGewasUniqueKey(gewas: Gewas): string {
  // Normaliseer naar lowercase voor vergelijking
  const naam = (gewas.gewas || '').toLowerCase().trim();
  const variant = (gewas.variant || '').toLowerCase().trim();
  return `${naam}-${variant}`;
}

/**
 * Teeltplan: uniek op basis van jaar + bedId + gewas
 * Bijv. "2026-A1-tomaat"
 */
function getTeeltplanUniqueKey(item: TeeltplanItem): string {
  const jaar = item.jaar;
  const bedId = item.bedId.toLowerCase().trim();
  const gewas = item.gewas.toLowerCase().trim();
  return `${jaar}-${bedId}-${gewas}`;
}

/**
 * Oogstlijst: uniek op basis van jaar + weekNummer + gewas + locatie
 * Bijv. "2026-3-tomaat-A1"
 */
function getOogstUniqueKey(item: OogstItem): string {
  const jaar = item.jaar;
  const week = item.weekNummer;
  const gewas = item.gewas.toLowerCase().trim();
  const locatie = item.locatiePrimair.toLowerCase().trim();
  return `${jaar}-${week}-${gewas}-${locatie}`;
}

/**
 * Taken: uniek op basis van beschrijving + bedId (of sectie als geen bedId)
 * Dit voorkomt exact dezelfde taak voor hetzelfde bed
 */
function getTaakUniqueKey(taak: Taak): string {
  const beschrijving = taak.beschrijving.toLowerCase().trim();
  const locatie = taak.bedId || taak.sectie || 'algemeen';
  return `${beschrijving}-${locatie}`;
}

/**
 * Instructies: uniek op basis van titel + hoofdcategorie + subcategorie
 * Bijv. "hoe-sla-oogsten-gewassen-oogsten"
 */
function getInstructieUniqueKey(item: Instructie): string {
  const titel = item.titel.toLowerCase().trim();
  const hoofdcategorie = item.hoofdcategorie.toLowerCase().trim();
  const subcategorie = item.subcategorie.toLowerCase().trim();
  return `${titel}-${hoofdcategorie}-${subcategorie}`;
}

// ============================================
// GENERIEKE MERGE FUNCTIE
// ============================================

function mergeLijsten<T>(
  bestaandeLijst: T[],
  nieuweLijst: T[],
  getUniqueKey: (item: T) => string,
  getBeschrijving: (item: T) => string,
  getItemId: (item: T) => string,
  type: ImportLogType,
  bestandsnaam: string,
  gebruiker: string
): MergeResultaat<T> {
  const entries: ImportLogEntry[] = [];
  let toegevoegd = 0;
  let overgeslagen = 0;
  let fouten = 0;

  // Maak een Set van bestaande unieke keys voor snelle lookup
  const bestaandeKeys = new Set<string>();
  bestaandeLijst.forEach(item => {
    bestaandeKeys.add(getUniqueKey(item));
  });

  // Start met kopie van bestaande lijst
  const resultaat = [...bestaandeLijst];

  // Verwerk nieuwe items
  nieuweLijst.forEach((nieuwItem, index) => {
    const uniqueKey = getUniqueKey(nieuwItem);
    const itemId = getItemId(nieuwItem);
    const beschrijving = getBeschrijving(nieuwItem);

    try {
      if (bestaandeKeys.has(uniqueKey)) {
        // Item bestaat al - overslaan
        overgeslagen++;
        entries.push({
          id: `entry-${index}`,
          actie: 'overgeslagen',
          itemId,
          itemBeschrijving: beschrijving,
          reden: 'Item bestaat al in database'
        });
      } else {
        // Nieuw item - toevoegen
        resultaat.push(nieuwItem);
        bestaandeKeys.add(uniqueKey); // Voorkom dubbele toevoegingen binnen dezelfde import
        toegevoegd++;
        entries.push({
          id: `entry-${index}`,
          actie: 'toegevoegd',
          itemId,
          itemBeschrijving: beschrijving
        });
      }
    } catch (error) {
      // Fout bij verwerken
      fouten++;
      entries.push({
        id: `entry-${index}`,
        actie: 'fout',
        itemId,
        itemBeschrijving: beschrijving,
        reden: error instanceof Error ? error.message : 'Onbekende fout'
      });
    }
  });

  const log: ImportLog = {
    id: `import-${type}-${Date.now()}`,
    type,
    timestamp: nuISO(),
    bestandsnaam,
    gebruiker,
    totaalInBestand: nieuweLijst.length,
    toegevoegd,
    overgeslagen,
    fouten,
    entries
  };

  return { data: resultaat, log };
}

// ============================================
// SPECIFIEKE MERGE FUNCTIES
// ============================================

/**
 * Merge bedden - voegt alleen nieuwe bedden toe, bestaande worden genegeerd
 */
export function mergeBedden(
  bestaandeBedden: Bed[],
  nieuweBedden: Bed[],
  bestandsnaam: string,
  gebruiker: string
): MergeResultaat<Bed> {
  return mergeLijsten(
    bestaandeBedden,
    nieuweBedden,
    getBedUniqueKey,
    (bed) => `Bed ${bed.sectie}${bed.bedNummer}`,
    (bed) => bed.id,
    'bedden',
    bestandsnaam,
    gebruiker
  );
}

/**
 * Merge gewassen - voegt alleen nieuwe gewassen toe, bestaande worden genegeerd
 */
export function mergeGewassen(
  bestaandeGewassen: Gewas[],
  nieuweGewassen: Gewas[],
  bestandsnaam: string,
  gebruiker: string
): MergeResultaat<Gewas> {
  return mergeLijsten(
    bestaandeGewassen,
    nieuweGewassen,
    getGewasUniqueKey,
    (gewas) => gewas.variant ? `${gewas.gewas} (${gewas.variant})` : gewas.gewas,
    (gewas) => gewas.id,
    'gewassen',
    bestandsnaam,
    gebruiker
  );
}

/**
 * Merge teeltplan - voegt alleen nieuwe teeltplan items toe, bestaande worden genegeerd
 */
export function mergeTeeltplan(
  bestaandTeeltplan: TeeltplanItem[],
  nieuwTeeltplan: TeeltplanItem[],
  bestandsnaam: string,
  gebruiker: string
): MergeResultaat<TeeltplanItem> {
  return mergeLijsten(
    bestaandTeeltplan,
    nieuwTeeltplan,
    getTeeltplanUniqueKey,
    (item) => `${item.jaar} - ${item.bedId} - ${item.gewas}`,
    (item) => item.id,
    'teeltplan',
    bestandsnaam,
    gebruiker
  );
}

/**
 * Merge oogstlijst - voegt alleen nieuwe oogst items toe, bestaande worden genegeerd
 */
export function mergeOogstlijst(
  bestaandeOogstlijst: OogstItem[],
  nieuweOogstlijst: OogstItem[],
  bestandsnaam: string,
  gebruiker: string
): MergeResultaat<OogstItem> {
  return mergeLijsten(
    bestaandeOogstlijst,
    nieuweOogstlijst,
    getOogstUniqueKey,
    (item) => `Week ${item.weekNummer} - ${item.gewas} (${item.locatiePrimair})`,
    (item) => item.id,
    'oogstlijst',
    bestandsnaam,
    gebruiker
  );
}

/**
 * Merge taken - voegt alleen nieuwe taken toe, bestaande worden genegeerd
 */
export function mergeTaken(
  bestaandeTaken: Taak[],
  nieuweTaken: Taak[],
  bestandsnaam: string,
  gebruiker: string
): MergeResultaat<Taak> {
  return mergeLijsten(
    bestaandeTaken,
    nieuweTaken,
    getTaakUniqueKey,
    (taak) => taak.beschrijving.substring(0, 50) + (taak.beschrijving.length > 50 ? '...' : ''),
    (taak) => taak.id,
    'taken',
    bestandsnaam,
    gebruiker
  );
}

/**
 * Merge instructies - voegt alleen nieuwe instructies toe, bestaande worden genegeerd
 */
export function mergeInstructies(
  bestaandeInstructies: Instructie[],
  nieuweInstructies: Instructie[],
  bestandsnaam: string,
  gebruiker: string
): MergeResultaat<Instructie> {
  return mergeLijsten(
    bestaandeInstructies,
    nieuweInstructies,
    getInstructieUniqueKey,
    (item) => `${item.titel} (${item.hoofdcategorie}/${item.subcategorie})`,
    (item) => item.id,
    'instructies',
    bestandsnaam,
    gebruiker
  );
}

// ============================================
// IMPORT LOG OPSLAG
// ============================================

const IMPORT_LOGS_KEY = 'tuinplanner_import_logs';
const MAX_LOGS = 50; // Bewaar maximaal 50 logs

/**
 * Sla import log op in localStorage
 */
export function saveImportLog(log: ImportLog): void {
  try {
    const bestaandeLogs = getImportLogs();
    const nieuweLogs = [log, ...bestaandeLogs].slice(0, MAX_LOGS);
    localStorage.setItem(IMPORT_LOGS_KEY, JSON.stringify(nieuweLogs));
  } catch (error) {
    console.error('Fout bij opslaan import log:', error);
  }
}

/**
 * Haal alle import logs op uit localStorage
 */
export function getImportLogs(): ImportLog[] {
  try {
    const logsJson = localStorage.getItem(IMPORT_LOGS_KEY);
    if (!logsJson) return [];
    return JSON.parse(logsJson) as ImportLog[];
  } catch (error) {
    console.error('Fout bij ophalen import logs:', error);
    return [];
  }
}

/**
 * Wis alle import logs
 */
export function clearImportLogs(): void {
  localStorage.removeItem(IMPORT_LOGS_KEY);
}

/**
 * Haal een specifieke log op
 */
export function getImportLogById(logId: string): ImportLog | undefined {
  const logs = getImportLogs();
  return logs.find(log => log.id === logId);
}
