import type { TeeltplanItem, GewassenlijstItem, ImportLog, ImportLogEntry } from '../types';
import { generateSlug } from './csvParser';
import { nuISO } from './dateUtils';

// ============================================
// TEELTPLAN MERGE RESULTAAT
// ============================================

export interface TeeltplanMergeResultaat {
  /** De bijgewerkte teeltplan data (Firebase key → TeeltplanItem) */
  updates: Record<string, TeeltplanItem>;
  /** Nieuwe records die moeten worden toegevoegd */
  nieuweRecords: Record<string, TeeltplanItem>;
  /** Import log met details */
  log: ImportLog;
  /** Samenvatting */
  samenvatting: {
    totaalCSV: number;
    exacteMatches: number;
    groepMatches: number;
    nieuweRecords: number;
    gesplitst: number; // CSV-rijen die een nieuw record vereisen door multi-match
    geenMatch: number;
  };
}

export interface TeeltplanMergeOpties {
  modus: 'merge' | 'replace';
  bestandsnaam: string;
  gebruiker: string;
}

// ============================================
// MERGE LOGICA
// ============================================

/**
 * Voer een dry-run of echte merge uit van nieuw CSV teeltplan tegen bestaande Firebase data.
 *
 * Match-volgorde per CSV-rij:
 * 1. Zoek Firebase record waar bedId matcht EN gewas === CSV "Gewas + Soort"
 * 2. Als niet gevonden: zoek waar bedId matcht EN gewas === CSV "Gewas"
 * 3. Als gevonden maar al geclaimd: maak nieuw record
 * 4. Als helemaal niet gevonden: maak nieuw record
 */
export function mergeTeeltplan(
  bestaandeData: Record<string, TeeltplanItem>,
  csvItems: TeeltplanItem[],
  opties: TeeltplanMergeOpties
): TeeltplanMergeResultaat {
  const entries: ImportLogEntry[] = [];
  let exacteMatches = 0;
  let groepMatches = 0;
  let nieuweRecordsTelling = 0;
  let gesplitst = 0;
  let geenMatch = 0;

  // Bij replace: alles vervangen
  if (opties.modus === 'replace') {
    const nieuweRecords: Record<string, TeeltplanItem> = {};
    csvItems.forEach((csvItem, index) => {
      nieuweRecords[csvItem.id] = csvItem;
      entries.push({
        id: `entry-${index}`,
        actie: 'toegevoegd',
        itemId: csvItem.id,
        itemBeschrijving: `${csvItem.bedId} - ${csvItem.gewasSoort || csvItem.gewas}`
      });
    });

    const log: ImportLog = {
      id: `import-teeltplan-${Date.now()}`,
      type: 'teeltplan',
      timestamp: nuISO(),
      bestandsnaam: opties.bestandsnaam,
      gebruiker: opties.gebruiker,
      totaalInBestand: csvItems.length,
      toegevoegd: csvItems.length,
      overgeslagen: 0,
      fouten: 0,
      entries
    };

    return {
      updates: {},
      nieuweRecords,
      log,
      samenvatting: {
        totaalCSV: csvItems.length,
        exacteMatches: 0,
        groepMatches: 0,
        nieuweRecords: csvItems.length,
        gesplitst: 0,
        geenMatch: 0
      }
    };
  }

  // Merge modus
  const updates: Record<string, TeeltplanItem> = {};
  const nieuweRecords: Record<string, TeeltplanItem> = {};

  // Track welke Firebase records al geclaimd zijn door een CSV-rij
  const geclaimdeKeys = new Set<string>();

  // Bouw index van bestaande records per bedId
  const recordsPerBedId: Map<string, Array<{ key: string; item: TeeltplanItem }>> = new Map();
  Object.entries(bestaandeData).forEach(([key, item]) => {
    const bedId = item.bedId?.toLowerCase() || '';
    if (!recordsPerBedId.has(bedId)) {
      recordsPerBedId.set(bedId, []);
    }
    recordsPerBedId.get(bedId)!.push({ key, item });
  });

  csvItems.forEach((csvItem, index) => {
    const csvBedId = csvItem.bedId?.toLowerCase() || '';
    const csvGewasSoort = (csvItem.gewasSoort || '').toLowerCase().trim();
    const csvGewas = csvItem.gewas.toLowerCase().trim();
    const bedRecords = recordsPerBedId.get(csvBedId) || [];

    let gematchteKey: string | null = null;
    let matchType: 'exact' | 'groep' | 'nieuw' = 'nieuw';

    // Stap 1: Exacte match op gewasSoort
    if (csvGewasSoort) {
      const exactMatch = bedRecords.find(r =>
        !geclaimdeKeys.has(r.key) &&
        r.item.gewas.toLowerCase().trim() === csvGewasSoort
      );
      if (exactMatch) {
        gematchteKey = exactMatch.key;
        matchType = 'exact';
      }
    }

    // Stap 2: Match op groepsnaam (gewas)
    if (!gematchteKey) {
      const groepMatch = bedRecords.find(r =>
        !geclaimdeKeys.has(r.key) &&
        r.item.gewas.toLowerCase().trim() === csvGewas
      );
      if (groepMatch) {
        gematchteKey = groepMatch.key;
        matchType = 'groep';
      }
    }

    if (gematchteKey) {
      // Match gevonden - update het bestaande record
      geclaimdeKeys.add(gematchteKey);
      const bestaandRecord = bestaandeData[gematchteKey];

      const bijgewerktRecord: TeeltplanItem = {
        ...bestaandRecord,
        gewas: csvItem.gewas,           // Nieuwe groepsnaam
        gewasSoort: csvItem.gewasSoort, // Nieuwe variant
        kalender: csvItem.kalender,     // Bijgewerkte zaaidata
        deelVanBed: csvItem.deelVanBed || bestaandRecord.deelVanBed,
        teelt: csvItem.teelt || bestaandRecord.teelt,
        opmerkingen: bestaandRecord.opmerkingen || csvItem.opmerkingen, // Behoud handmatige notities
        oppervlakte: csvItem.oppervlakte,
      };

      updates[gematchteKey] = bijgewerktRecord;

      if (matchType === 'exact') {
        exacteMatches++;
      } else {
        groepMatches++;
      }

      entries.push({
        id: `entry-${index}`,
        actie: 'toegevoegd', // 'bijgewerkt' is hier correct maar we gebruiken 'toegevoegd' als actie
        itemId: gematchteKey,
        itemBeschrijving: `${matchType === 'exact' ? 'Exact' : 'Groep'} match: ${csvItem.bedId} - ${csvItem.gewasSoort || csvItem.gewas}`
      });
    } else {
      // Geen match - maak nieuw record
      // Check of het een split-geval is (er bestond al een record voor dit bed+gewas maar dat is al geclaimd)
      const wasAlGeclaimd = bedRecords.some(r =>
        geclaimdeKeys.has(r.key) &&
        (r.item.gewas.toLowerCase().trim() === csvGewas ||
         r.item.gewas.toLowerCase().trim() === csvGewasSoort)
      );

      if (wasAlGeclaimd) {
        gesplitst++;
      } else {
        geenMatch++;
      }

      nieuweRecordsTelling++;
      nieuweRecords[csvItem.id] = csvItem;

      entries.push({
        id: `entry-${index}`,
        actie: 'toegevoegd',
        itemId: csvItem.id,
        itemBeschrijving: `Nieuw${wasAlGeclaimd ? ' (gesplitst)' : ''}: ${csvItem.bedId} - ${csvItem.gewasSoort || csvItem.gewas}`
      });
    }
  });

  const log: ImportLog = {
    id: `import-teeltplan-${Date.now()}`,
    type: 'teeltplan',
    timestamp: nuISO(),
    bestandsnaam: opties.bestandsnaam,
    gebruiker: opties.gebruiker,
    totaalInBestand: csvItems.length,
    toegevoegd: nieuweRecordsTelling,
    overgeslagen: exacteMatches + groepMatches, // 'bijgewerkt' past niet in het logmodel, we gebruiken overgeslagen
    fouten: 0,
    entries
  };

  return {
    updates,
    nieuweRecords,
    log,
    samenvatting: {
      totaalCSV: csvItems.length,
      exacteMatches,
      groepMatches,
      nieuweRecords: nieuweRecordsTelling,
      gesplitst,
      geenMatch
    }
  };
}

// ============================================
// GEWASSENLIJST MERGE
// ============================================

export interface GewassenlijstMergeResultaat {
  data: Record<string, GewassenlijstItem>;
  log: ImportLog;
  samenvatting: {
    totaal: number;
    nieuw: number;
    bijgewerkt: number;
  };
}

/**
 * Merge gewassenlijst CSV items met bestaande Firebase data (upsert).
 */
export function mergeGewassenlijst(
  bestaandeData: Record<string, GewassenlijstItem> | null,
  csvItems: GewassenlijstItem[],
  modus: 'merge' | 'replace',
  bestandsnaam: string,
  gebruiker: string
): GewassenlijstMergeResultaat {
  const entries: ImportLogEntry[] = [];
  let nieuw = 0;
  let bijgewerkt = 0;

  if (modus === 'replace') {
    const data: Record<string, GewassenlijstItem> = {};
    csvItems.forEach((item, index) => {
      data[item.id] = item;
      entries.push({
        id: `entry-${index}`,
        actie: 'toegevoegd',
        itemId: item.id,
        itemBeschrijving: item.gewasSoort
      });
    });

    return {
      data,
      log: {
        id: `import-gewassenlijst-${Date.now()}`,
        type: 'gewassenlijst',
        timestamp: nuISO(),
        bestandsnaam,
        gebruiker,
        totaalInBestand: csvItems.length,
        toegevoegd: csvItems.length,
        overgeslagen: 0,
        fouten: 0,
        entries
      },
      samenvatting: { totaal: csvItems.length, nieuw: csvItems.length, bijgewerkt: 0 }
    };
  }

  // Merge modus: upsert
  const data: Record<string, GewassenlijstItem> = { ...(bestaandeData || {}) };

  csvItems.forEach((item, index) => {
    const bestaand = data[item.id];
    if (bestaand) {
      // Update bestaand record met CSV velden, behoud eventuele extra velden
      data[item.id] = { ...bestaand, ...item };
      bijgewerkt++;
      entries.push({
        id: `entry-${index}`,
        actie: 'overgeslagen', // 'bijgewerkt' - we gebruiken overgeslagen in het logmodel
        itemId: item.id,
        itemBeschrijving: `Bijgewerkt: ${item.gewasSoort}`,
        reden: 'Bestaand record bijgewerkt met nieuwe data'
      });
    } else {
      data[item.id] = item;
      nieuw++;
      entries.push({
        id: `entry-${index}`,
        actie: 'toegevoegd',
        itemId: item.id,
        itemBeschrijving: item.gewasSoort
      });
    }
  });

  return {
    data,
    log: {
      id: `import-gewassenlijst-${Date.now()}`,
      type: 'gewassenlijst',
      timestamp: nuISO(),
      bestandsnaam,
      gebruiker,
      totaalInBestand: csvItems.length,
      toegevoegd: nieuw,
      overgeslagen: bijgewerkt,
      fouten: 0,
      entries
    },
    samenvatting: { totaal: csvItems.length, nieuw, bijgewerkt }
  };
}
