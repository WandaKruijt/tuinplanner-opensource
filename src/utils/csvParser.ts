import Papa from 'papaparse';
import type {
  Bed,
  Gewas,
  TeeltplanItem,
  Taak,
  Instructie,
  GewassenlijstItem,
  Sectie,
  ZonSchaduw,
  MaandKalender,
  TeeltCode,
  TaakType,
  TaakPrioriteit,
  InstructieCategorie
} from '../types';
import { nuISO } from './dateUtils';

// Helper om BOM-karakter en extra whitespace te strippen uit headers
function stripBOM(tekst: string): string {
  return tekst.replace(/^\uFEFF/, '').trim();
}

// Helper om Nederlandse decimalen te parsen
function parseNederlandsGetal(waarde: string): number | undefined {
  if (!waarde || waarde.trim() === '') return undefined;
  // Vervang komma door punt voor parseFloat
  const genormaliseerd = waarde.replace(',', '.');
  const getal = parseFloat(genormaliseerd);
  return isNaN(getal) ? undefined : getal;
}

// Helper om sectie te valideren
function valideerSectie(waarde: string): Sectie {
  const sectieMap: Record<string, Sectie> = {
    'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E',
    'Kas': 'Kas', 'kas': 'Kas', 'KAS': 'Kas'
  };
  return sectieMap[waarde] || 'A';
}

// Helper om teeltcode te parsen
function parseTeeltCode(waarde: string): TeeltCode {
  const code = waarde?.toLowerCase().trim() || '';
  const geldigeCodes: TeeltCode[] = ['kz', 'bz', 'kvz', 'ku', 'bu', 'bvz', 'bi', 'o', 'x', ''];
  return geldigeCodes.includes(code as TeeltCode) ? (code as TeeltCode) : '';
}

// Helper om lege kalender te maken
function maakLegeKalender(): MaandKalender {
  return {
    jan: { b: '', m: '', e: '' },
    feb: { b: '', m: '', e: '' },
    mrt: { b: '', m: '', e: '' },
    apr: { b: '', m: '', e: '' },
    mei: { b: '', m: '', e: '' },
    jun: { b: '', m: '', e: '' },
    jul: { b: '', m: '', e: '' },
    aug: { b: '', m: '', e: '' },
    sep: { b: '', m: '', e: '' },
    okt: { b: '', m: '', e: '' },
    nov: { b: '', m: '', e: '' },
    dec: { b: '', m: '', e: '' },
  };
}

// Maand kolom mapping voor CSV parsing (generiek, zonder prefix)
const MAAND_KOLOMMEN = [
  { maand: 'jan', kolommen: ['Jan B', 'Jan M', 'Jan E', 'jan_b', 'jan_m', 'jan_e'] },
  { maand: 'feb', kolommen: ['Feb B', 'Feb M', 'Feb E', 'feb_b', 'feb_m', 'feb_e'] },
  { maand: 'mrt', kolommen: ['Mrt B', 'Mrt M', 'Mrt E', 'mrt_b', 'mrt_m', 'mrt_e', 'Maart B', 'Maart M', 'Maart E'] },
  { maand: 'apr', kolommen: ['Apr B', 'Apr M', 'Apr E', 'apr_b', 'apr_m', 'apr_e'] },
  { maand: 'mei', kolommen: ['Mei B', 'Mei M', 'Mei E', 'mei_b', 'mei_m', 'mei_e'] },
  { maand: 'jun', kolommen: ['Jun B', 'Jun M', 'Jun E', 'jun_b', 'jun_m', 'jun_e'] },
  { maand: 'jul', kolommen: ['Jul B', 'Jul M', 'Jul E', 'jul_b', 'jul_m', 'jul_e'] },
  { maand: 'aug', kolommen: ['Aug B', 'Aug M', 'Aug E', 'aug_b', 'aug_m', 'aug_e'] },
  { maand: 'sep', kolommen: ['Sep B', 'Sep M', 'Sep E', 'sep_b', 'sep_m', 'sep_e'] },
  { maand: 'okt', kolommen: ['Okt B', 'Okt M', 'Okt E', 'okt_b', 'okt_m', 'okt_e'] },
  { maand: 'nov', kolommen: ['Nov B', 'Nov M', 'Nov E', 'nov_b', 'nov_m', 'nov_e'] },
  { maand: 'dec', kolommen: ['Dec B', 'Dec M', 'Dec E', 'dec_b', 'dec_m', 'dec_e'] },
];

// Maand kolom mapping met prefix (Zaai of Oogst)
const MAAND_NAMEN_KORT = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const MAAND_KEYS: (keyof MaandKalender)[] = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// Vind een kolom waarde uit meerdere mogelijke kolomnamen
function vindKolomWaarde(rij: Record<string, string>, mogelijkeNamen: string[]): string {
  for (const naam of mogelijkeNamen) {
    if (rij[naam] !== undefined) {
      return rij[naam];
    }
    // Ook proberen met lowercase
    const lowerKey = Object.keys(rij).find(k => k.toLowerCase() === naam.toLowerCase());
    if (lowerKey && rij[lowerKey] !== undefined) {
      return rij[lowerKey];
    }
  }
  return '';
}

// Parse kalender uit een CSV rij (generiek, zonder prefix)
function parseKalender(rij: Record<string, string>): MaandKalender {
  const kalender = maakLegeKalender();

  MAAND_KOLOMMEN.forEach(({ maand, kolommen }) => {
    const bKolommen = kolommen.filter(k => k.endsWith(' B') || k.endsWith('_b'));
    const mKolommen = kolommen.filter(k => k.endsWith(' M') || k.endsWith('_m'));
    const eKolommen = kolommen.filter(k => k.endsWith(' E') || k.endsWith('_e'));

    const maandKey = maand as keyof MaandKalender;
    kalender[maandKey].b = parseTeeltCode(vindKolomWaarde(rij, bKolommen));
    kalender[maandKey].m = parseTeeltCode(vindKolomWaarde(rij, mKolommen));
    kalender[maandKey].e = parseTeeltCode(vindKolomWaarde(rij, eKolommen));
  });

  return kalender;
}

// Parse kalender met prefix (bijv. "Zaai" of "Oogst")
function parseKalenderMetPrefix(rij: Record<string, string>, prefix: string): MaandKalender {
  const kalender = maakLegeKalender();

  MAAND_KEYS.forEach((maandKey, index) => {
    const maandNaam = MAAND_NAMEN_KORT[index];

    // Zoek kolommen met prefix: "Zaai Jan B", "Oogst Jan B", etc.
    const bKolommen = [`${prefix} ${maandNaam} B`, `${prefix.toLowerCase()}_${maandNaam.toLowerCase()}_b`];
    const mKolommen = [`${prefix} ${maandNaam} M`, `${prefix.toLowerCase()}_${maandNaam.toLowerCase()}_m`];
    const eKolommen = [`${prefix} ${maandNaam} E`, `${prefix.toLowerCase()}_${maandNaam.toLowerCase()}_e`];

    kalender[maandKey].b = parseTeeltCode(vindKolomWaarde(rij, bKolommen));
    kalender[maandKey].m = parseTeeltCode(vindKolomWaarde(rij, mKolommen));
    kalender[maandKey].e = parseTeeltCode(vindKolomWaarde(rij, eKolommen));
  });

  return kalender;
}

// Check of een kalender niet leeg is (minstens één waarde heeft)
function heeftKalenderData(kalender: MaandKalender): boolean {
  return MAAND_KEYS.some(maand =>
    kalender[maand].b !== '' || kalender[maand].m !== '' || kalender[maand].e !== ''
  );
}

// ============================================
// BEDDEN CSV PARSER
// ============================================

export interface ParseResultaat<T> {
  data: T[];
  fouten: string[];
  waarschuwingen: string[];
}

export function parseBeddenCSV(csvContent: string): ParseResultaat<Bed> {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const bedden: Bed[] = [];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header) => stripBOM(header),
  });

  if (result.errors.length > 0) {
    result.errors.forEach(err => {
      fouten.push(`Regel ${err.row}: ${err.message}`);
    });
  }

  result.data.forEach((rij, index) => {
    try {
      const sectieWaarde = vindKolomWaarde(rij, ['Sectie', 'sectie']);
      const bedWaarde = vindKolomWaarde(rij, ['Bed', 'bed']);

      if (!sectieWaarde || !bedWaarde) {
        waarschuwingen.push(`Regel ${index + 2}: Sectie of Bed ontbreekt, overgeslagen`);
        return;
      }

      const sectie = valideerSectie(sectieWaarde);
      const bedId = `${sectie}${bedWaarde}`;

      const bed: Bed = {
        id: bedId,
        sectie,
        bedNummer: bedWaarde,
        vakken: parseNederlandsGetal(vindKolomWaarde(rij, ['Vakken', 'vakken'])),
        lengte: parseNederlandsGetal(vindKolomWaarde(rij, ['Lengte (m)', 'Lengte', 'lengte'])),
        breedte: parseNederlandsGetal(vindKolomWaarde(rij, ['Breedte (m)', 'Breedte', 'breedte'])),
        grootte: parseNederlandsGetal(vindKolomWaarde(rij, ['Grootte (m2)', 'Grootte', 'grootte'])),
        zonSchaduw: vindKolomWaarde(rij, ['Zon/Schaduw', 'Zon', 'zon_schaduw']) as ZonSchaduw || '',
        opmerkingen: vindKolomWaarde(rij, ['Opmerkingen', 'opmerkingen']) || '',
        planVoorBed: vindKolomWaarde(rij, ['Plan voor bed', 'Plan', 'plan_voor_bed']) || '',
      };

      bedden.push(bed);
    } catch (err) {
      fouten.push(`Regel ${index + 2}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  return { data: bedden, fouten, waarschuwingen };
}

// ============================================
// GEWASSEN CSV PARSER
// ============================================

/**
 * Normaliseer headers voor Gewassen CSV met dubbele maandkolommen.
 * Dezelfde strategie als de Gewassenlijst: eerste groep → "Zaai", tweede → "Oogst".
 */
function normaliseerGewassenHeaders(rawHeaders: string[]): string[] {
  const maandPatroon = /^(Jan|Feb|Mrt|Maart|Apr|Mei|Jun|Jul|Aug|Sep|Okt|Nov|Dec)\s+[BME]$/i;
  const gezien = new Set<string>();

  return rawHeaders.map(h => {
    const schoon = stripBOM(h);
    if (maandPatroon.test(schoon)) {
      if (gezien.has(schoon.toLowerCase())) {
        return `Oogst ${schoon}`;
      }
      gezien.add(schoon.toLowerCase());
      return `Zaai ${schoon}`;
    }
    return schoon;
  });
}

export function parseGewassenCSV(csvContent: string): ParseResultaat<Gewas> {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const gewassen: Gewas[] = [];

  // Strip BOM uit hele content
  const schoneContent = csvContent.replace(/^\uFEFF/, '');

  // Parse zonder headers om dubbele kolomnamen zelf af te handelen
  const rawResult = Papa.parse<string[]>(schoneContent, {
    header: false,
    delimiter: ';',
    skipEmptyLines: true,
  });

  if (rawResult.data.length < 2) {
    fouten.push('CSV bevat geen data (minimaal 1 header-rij en 1 data-rij vereist)');
    return { data: gewassen, fouten, waarschuwingen };
  }

  // Eerste rij = headers
  const rawHeaders = rawResult.data[0];
  const headers = normaliseerGewassenHeaders(rawHeaders);
  const dataRijen = rawResult.data.slice(1);

  dataRijen.forEach((rijWaarden, index) => {
    try {
      // Bouw een record van header → waarde
      const rij: Record<string, string> = {};
      headers.forEach((header, i) => {
        if (header && i < rijWaarden.length) {
          rij[header] = (rijWaarden[i] || '').trim();
        }
      });

      const gewasNaam = vindKolomWaarde(rij, ['Gewas', 'gewas']);

      if (!gewasNaam) {
        waarschuwingen.push(`Regel ${index + 2}: Gewas naam ontbreekt, overgeslagen`);
        return;
      }

      const variant = vindKolomWaarde(rij, ['Variant', 'variant']) || '';
      const id = generateSlug(`${gewasNaam}-${variant}`);

      // Probeer eerst Zaai/Oogst prefix kolommen, daarna fallback naar generieke kalender
      const zaaiKalender = parseKalenderMetPrefix(rij, 'Zaai');
      const oogstKalender = parseKalenderMetPrefix(rij, 'Oogst');

      // Als er geen Zaai kolommen zijn, probeer generieke kalender
      const heeftZaaiData = heeftKalenderData(zaaiKalender);
      const heeftOogstData = heeftKalenderData(oogstKalender);

      const gewas: Gewas = {
        id,
        gewas: gewasNaam,
        variant,
        teeltgroep: vindKolomWaarde(rij, ['Teeltgroep', 'teeltgroep']) || '',
        zaaiperiode: vindKolomWaarde(rij, ['Zaaiperiode', 'zaaiperiode']) || '',
        oogstperiode: vindKolomWaarde(rij, ['Oogst periode', 'Oogstperiode', 'oogst_periode']) || '',
        bijzonderheden: vindKolomWaarde(rij, ['Bijzonderheden', 'bijzonderheden']) || '',
        // Gebruik Zaai kalender als die bestaat, anders fallback naar generieke kalender
        kalender: heeftZaaiData ? zaaiKalender : parseKalender(rij),
        // Voeg oogstKalender toe als die bestaat
        oogstKalender: heeftOogstData ? oogstKalender : undefined,
      };

      gewassen.push(gewas);
    } catch (err) {
      fouten.push(`Regel ${index + 2}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  return { data: gewassen, fouten, waarschuwingen };
}

// ============================================
// TEELTPLAN CSV PARSER
// ============================================

export function parseTeeltplanCSV(csvContent: string): ParseResultaat<TeeltplanItem> {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const teeltplanItems: TeeltplanItem[] = [];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header) => stripBOM(header),
  });

  if (result.errors.length > 0) {
    result.errors.forEach(err => {
      fouten.push(`Regel ${err.row}: ${err.message}`);
    });
  }

  result.data.forEach((rij, index) => {
    try {
      const sectieWaarde = vindKolomWaarde(rij, ['Sectie', 'sectie']);
      const bedWaarde = vindKolomWaarde(rij, ['Bed', 'bed']);
      const gewasWaarde = vindKolomWaarde(rij, ['Gewas', 'gewas']);

      if (!sectieWaarde || !bedWaarde || !gewasWaarde) {
        waarschuwingen.push(`Regel ${index + 2}: Sectie, Bed of Gewas ontbreekt, overgeslagen`);
        return;
      }

      const sectie = valideerSectie(sectieWaarde);
      const bedId = `${sectie}${bedWaarde}`;
      const jaarWaarde = vindKolomWaarde(rij, ['Jaar', 'jaar']);
      const jaar = jaarWaarde ? parseInt(jaarWaarde, 10) : new Date().getFullYear();

      const id = generateSlug(`${jaar}-${bedId}-${gewasWaarde}`);

      const item: TeeltplanItem = {
        id,
        jaar,
        sectie,
        bed: bedWaarde,
        bedId,
        deelVanBed: vindKolomWaarde(rij, ['Deel van bed', 'Deel', 'deel_van_bed']) || 'Heel bed',
        gewas: gewasWaarde,
        teelt: vindKolomWaarde(rij, ['Teelt', 'teelt']) || '',
        kalender: parseKalender(rij),
        opmerkingen: vindKolomWaarde(rij, ['Opmerkingen', 'opmerkingen']) || '',
      };

      teeltplanItems.push(item);
    } catch (err) {
      fouten.push(`Regel ${index + 2}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  return { data: teeltplanItems, fouten, waarschuwingen };
}

// ============================================
// BESTAND LEZEN HELPER
// ============================================

export function leesBestandAlsTekst(bestand: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Kon bestand niet lezen'));
      }
    };
    reader.onerror = () => reject(new Error('Fout bij lezen bestand'));
    reader.readAsText(bestand, 'UTF-8');
  });
}

// ============================================
// TAKEN CSV PARSER
// ============================================

// Helper om taaktype te valideren
function valideerTaakType(waarde: string): TaakType {
  const typeMap: Record<string, TaakType> = {
    'zaaien': 'Zaaien',
    'planten': 'Planten',
    'oogsten': 'Oogsten',
    'onderhoud': 'Onderhoud',
    'overig': 'Overig',
    // Ook met hoofdletter
    'Zaaien': 'Zaaien',
    'Planten': 'Planten',
    'Oogsten': 'Oogsten',
    'Onderhoud': 'Onderhoud',
    'Overig': 'Overig',
  };
  return typeMap[waarde?.trim()] || 'Overig';
}

// Helper om prioriteit te valideren
function valideerPrioriteit(waarde: string): TaakPrioriteit {
  const prioriteitMap: Record<string, TaakPrioriteit> = {
    'hoog': 'Hoog',
    'normaal': 'Normaal',
    'laag': 'Laag',
    'Hoog': 'Hoog',
    'Normaal': 'Normaal',
    'Laag': 'Laag',
    'high': 'Hoog',
    'normal': 'Normaal',
    'low': 'Laag',
  };
  return prioriteitMap[waarde?.trim()] || 'Normaal';
}

// Helper om datum te parsen (ondersteunt DD-MM-YYYY en YYYY-MM-DD)
function parseDatum(waarde: string): string {
  if (!waarde || waarde.trim() === '') {
    // Default: vandaag + 7 dagen
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    return deadline.toISOString().split('T')[0];
  }

  const trimmed = waarde.trim();

  // Probeer DD-MM-YYYY formaat
  const nlMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (nlMatch) {
    const [, dag, maand, jaar] = nlMatch;
    return `${jaar}-${maand.padStart(2, '0')}-${dag.padStart(2, '0')}`;
  }

  // Probeer YYYY-MM-DD formaat (al correct)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, jaar, maand, dag] = isoMatch;
    return `${jaar}-${maand.padStart(2, '0')}-${dag.padStart(2, '0')}`;
  }

  // Als niets werkt, return default
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  return deadline.toISOString().split('T')[0];
}

export function parseTakenCSV(csvContent: string): ParseResultaat<Taak> {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const taken: Taak[] = [];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header) => stripBOM(header),
  });

  if (result.errors.length > 0) {
    result.errors.forEach(err => {
      fouten.push(`Regel ${err.row}: ${err.message}`);
    });
  }

  result.data.forEach((rij, index) => {
    try {
      const beschrijving = vindKolomWaarde(rij, ['Beschrijving', 'beschrijving', 'Taak', 'taak', 'Description']);

      if (!beschrijving) {
        waarschuwingen.push(`Regel ${index + 2}: Beschrijving ontbreekt, overgeslagen`);
        return;
      }

      // Genereer uniek ID
      const id = `taak-import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;

      // Parse sectie (optioneel)
      const sectieWaarde = vindKolomWaarde(rij, ['Sectie', 'sectie', 'Section']);
      const sectie = sectieWaarde ? valideerSectie(sectieWaarde) : '' as Sectie | '';

      // Parse bedId (optioneel)
      const bedWaarde = vindKolomWaarde(rij, ['Bed', 'bed', 'BedId', 'bedId']);
      const bedId = bedWaarde || '';

      const taak: Taak = {
        id,
        beschrijving,
        sectie,
        bedId,
        type: valideerTaakType(vindKolomWaarde(rij, ['Type', 'type', 'TaakType'])),
        prioriteit: valideerPrioriteit(vindKolomWaarde(rij, ['Prioriteit', 'prioriteit', 'Priority'])),
        status: 'Open',
        deadline: parseDatum(vindKolomWaarde(rij, ['Deadline', 'deadline', 'Datum', 'datum', 'Date'])),
        aangemaakt: nuISO(),
        gewijzigd: nuISO(),
        isAutomatisch: false,
        isAdHoc: false,
        commentaar: vindKolomWaarde(rij, ['Commentaar', 'commentaar', 'Notities', 'notities', 'Notes']) || '',
        instructies: vindKolomWaarde(rij, ['Instructies', 'instructies', 'Instructions']) || undefined,
      };

      taken.push(taak);
    } catch (err) {
      fouten.push(`Regel ${index + 2}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  return { data: taken, fouten, waarschuwingen };
}

// ============================================
// INSTRUCTIES CSV PARSER
// ============================================

// Helper om instructie categorie te valideren
function valideerInstructieCategorie(waarde: string): InstructieCategorie {
  const categorieMap: Record<string, InstructieCategorie> = {
    'oogsten': 'Oogsten',
    'zaaien': 'Zaaien',
    'planten': 'Planten',
    'technieken': 'Technieken',
    'onderhoud': 'Onderhoud',
    'overig': 'Overig',
    // Ook met hoofdletter
    'Oogsten': 'Oogsten',
    'Zaaien': 'Zaaien',
    'Planten': 'Planten',
    'Technieken': 'Technieken',
    'Onderhoud': 'Onderhoud',
    'Overig': 'Overig',
    // Engels
    'harvesting': 'Oogsten',
    'sowing': 'Zaaien',
    'planting': 'Planten',
    'techniques': 'Technieken',
    'maintenance': 'Onderhoud',
    'other': 'Overig',
  };
  return categorieMap[waarde?.trim().toLowerCase()] || 'Overig';
}

// Helper functie om hoofdcategorie te bepalen uit CSV waarde
function bepaalHoofdcategorie(waarde: string | undefined): 'gewassen' | 'tuinonderhoud' | 'praktisch' {
  if (!waarde) return 'gewassen';
  const lowerWaarde = waarde.toLowerCase().trim();

  // Mapping van oude categorieën naar nieuwe hoofdcategorieën
  if (['oogsten', 'zaaien', 'planten', 'gewas', 'crops'].includes(lowerWaarde)) {
    return 'gewassen';
  }
  if (['onderhoud', 'technieken', 'maintenance', 'tuinonderhoud'].includes(lowerWaarde)) {
    return 'tuinonderhoud';
  }
  if (['praktisch', 'practical', 'overig', 'other'].includes(lowerWaarde)) {
    return 'praktisch';
  }
  return 'gewassen'; // Default
}

// Helper functie om subcategorie te bepalen uit CSV waarde
function bepaalSubcategorie(waarde: string | undefined, hoofdcategorie: 'gewassen' | 'tuinonderhoud' | 'praktisch'): string {
  if (!waarde) {
    // Default subcategorie per hoofdcategorie
    const defaults: Record<string, string> = {
      gewassen: 'oogsten',
      tuinonderhoud: 'seizoen',
      praktisch: 'regels'
    };
    return defaults[hoofdcategorie] || 'oogsten';
  }

  const lowerWaarde = waarde.toLowerCase().trim();

  // Mapping van oude categorieën naar nieuwe subcategorieën
  const subcategorieMap: Record<string, string> = {
    'oogsten': 'oogsten',
    'zaaien': 'zaaien',
    'planten': 'zaaien',
    'verzorgen': 'verzorgen',
    'verwerken': 'verwerken',
    'bewaren': 'bewaren',
    'bodem': 'bodem',
    'water': 'water',
    'onkruid': 'onkruid',
    'seizoen': 'seizoen',
    'gereedschap': 'gereedschap',
    'locaties': 'locaties',
    'regels': 'regels',
    'apparatuur': 'apparatuur',
    'onderhoud': 'seizoen',
    'technieken': 'bodem',
    'overig': 'regels'
  };

  return subcategorieMap[lowerWaarde] || bepaalSubcategorie(undefined, hoofdcategorie);
}

export function parseInstructiesCSV(csvContent: string): ParseResultaat<Instructie> {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const instructies: Instructie[] = [];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header) => stripBOM(header),
  });

  if (result.errors.length > 0) {
    result.errors.forEach(err => {
      fouten.push(`Regel ${err.row}: ${err.message}`);
    });
  }

  result.data.forEach((rij, index) => {
    try {
      const titel = vindKolomWaarde(rij, ['Titel', 'titel', 'Title']);
      const instructieTekst = vindKolomWaarde(rij, ['Instructie', 'instructie', 'Tekst', 'tekst', 'Instructions', 'Content']);

      if (!titel) {
        waarschuwingen.push(`Regel ${index + 2}: Titel ontbreekt, overgeslagen`);
        return;
      }

      if (!instructieTekst) {
        waarschuwingen.push(`Regel ${index + 2}: Instructie tekst ontbreekt, overgeslagen`);
        return;
      }

      // Genereer uniek ID
      const id = `instr-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;

      // Bepaal hoofdcategorie en subcategorie
      const categorieWaarde = vindKolomWaarde(rij, ['Categorie', 'categorie', 'Category', 'Hoofdcategorie']);
      const subcategorieWaarde = vindKolomWaarde(rij, ['Subcategorie', 'subcategorie', 'Subcategory']);
      const hoofdcategorie = bepaalHoofdcategorie(categorieWaarde);
      const subcategorie = bepaalSubcategorie(subcategorieWaarde || categorieWaarde, hoofdcategorie);

      // Gewas naam
      const gewasNaam = vindKolomWaarde(rij, ['Gewas', 'gewas', 'Crop']);

      // Link (video of andere URL)
      const link = vindKolomWaarde(rij, ['Video', 'video', 'VideoUrl', 'videoUrl', 'Link', 'link', 'Url', 'url']);

      // Foto URL (kan via CSV geïmporteerd worden)
      const fotoUrl = vindKolomWaarde(rij, ['Afbeelding', 'afbeelding', 'Image', 'AfbeeldingUrl', 'Foto', 'foto']);

      const instructie: Instructie = {
        id,
        hoofdcategorie,
        subcategorie,
        gewasNaam: gewasNaam || undefined,
        titel,
        instructie: instructieTekst,
        tips: vindKolomWaarde(rij, ['Tips', 'tips']) || undefined,
        link: link || undefined,
        fotos: fotoUrl ? [fotoUrl] : undefined,
        aangemaakt: nuISO(),
        aangemaaktDoor: 'CSV Import',
        gewijzigd: nuISO(),
      };

      instructies.push(instructie);
    } catch (err) {
      fouten.push(`Regel ${index + 2}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  return { data: instructies, fouten, waarschuwingen };
}

// ============================================
// SLUG GENERATIE
// ============================================

/**
 * Genereer een Firebase-veilige slug uit een tekst.
 * Lowercase, spaties → hyphens, speciale tekens verwijderd.
 * Firebase keys mogen geen ., $, #, [, ], / bevatten.
 */
export function generateSlug(tekst: string): string {
  if (!tekst) return '';
  return tekst
    .toLowerCase()
    .trim()
    .replace(/[.#$\[\]\/]/g, '')    // Firebase-ongeldige tekens verwijderen
    .replace(/\s+/g, '-')           // Spaties → hyphens
    .replace(/[^a-z0-9\-]/g, '')    // Alle overige speciale tekens verwijderen
    .replace(/-+/g, '-')            // Dubbele hyphens → enkele
    .replace(/^-|-$/g, '');         // Leidende/afsluitende hyphens verwijderen
}

// ============================================
// GEWASSENLIJST CSV PARSER
// ============================================

/**
 * Handmatig headers normaliseren voor CSVs met dubbele kolomnamen.
 * De Gewassenlijst CSV heeft bijv. "Jan B" twee keer: eenmaal voor Zaai, eenmaal voor Oogst.
 * We parsen met header: false en prefixen de dubbele kolommen zelf.
 *
 * Strategie: de eerste groep maand-kolommen (Jan B..Dec E) wordt "Zaai Jan B", etc.
 * De tweede groep wordt "Oogst Jan B", etc.
 */
function normaliseerGewassenlijstHeaders(rawHeaders: string[]): string[] {
  const maandPatroon = /^(Jan|Feb|Mrt|Maart|Apr|Mei|Jun|Jul|Aug|Sep|Okt|Nov|Dec)\s+[BME]$/i;
  const gezien = new Set<string>();
  let inOogstBlok = false;

  return rawHeaders.map(h => {
    const schoon = stripBOM(h);
    if (maandPatroon.test(schoon)) {
      if (gezien.has(schoon.toLowerCase())) {
        // Tweede keer → Oogst
        inOogstBlok = true;
        return `Oogst ${schoon}`;
      }
      gezien.add(schoon.toLowerCase());
      return `Zaai ${schoon}`;
    }
    return schoon;
  });
}

/**
 * Parse een Gewassenlijst CSV naar GewassenlijstItem[].
 * Slaat rijen over waar kolom "Gewas + Soort" leeg is.
 * Handelt dubbele headers (zaai/oogst maandkolommen) correct af.
 */
export function parseGewassenlijstCSV(csvContent: string): ParseResultaat<GewassenlijstItem> {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const items: GewassenlijstItem[] = [];

  // Strip BOM uit hele content
  const schoneContent = csvContent.replace(/^\uFEFF/, '');

  // Parse zonder headers zodat we dubbele kolomnamen zelf kunnen afhandelen
  const rawResult = Papa.parse<string[]>(schoneContent, {
    header: false,
    delimiter: ';',
    skipEmptyLines: true,
  });

  if (rawResult.data.length < 2) {
    fouten.push('CSV bevat geen data (minimaal 1 header-rij en 1 data-rij vereist)');
    return { data: items, fouten, waarschuwingen };
  }

  // Eerste rij = headers
  const rawHeaders = rawResult.data[0];
  const headers = normaliseerGewassenlijstHeaders(rawHeaders);
  const dataRijen = rawResult.data.slice(1);

  dataRijen.forEach((rijWaarden, index) => {
    try {
      // Bouw een record van header → waarde
      const rij: Record<string, string> = {};
      headers.forEach((header, i) => {
        if (header && i < rijWaarden.length) {
          rij[header] = (rijWaarden[i] || '').trim();
        }
      });

      const gewasSoort = vindKolomWaarde(rij, ['Gewas + Soort', 'Gewas+Soort', 'GewasSoort']);

      // Skip rijen zonder gewasSoort (lege rijen)
      if (!gewasSoort || gewasSoort.trim() === '') {
        return; // Stille skip - lege rij
      }

      const gewas = vindKolomWaarde(rij, ['Gewas', 'gewas']);
      if (!gewas) {
        waarschuwingen.push(`Regel ${index + 2}: Gewas ontbreekt voor "${gewasSoort}", overgeslagen`);
        return;
      }

      const slug = generateSlug(gewasSoort);
      if (!slug) {
        fouten.push(`Regel ${index + 2}: Kan geen geldige sleutel genereren voor "${gewasSoort}"`);
        return;
      }

      // Parse numerieke waarden met Nederlandse komma
      const zaadPer10m2Str = vindKolomWaarde(rij, ['G zaad / kilo pootgoed per 10m2', 'zaadPer10m2', 'Zaad per 10m2']);
      const plantenPer10m2Str = vindKolomWaarde(rij, ['Planten per 10 m2', 'plantenPer10m2', 'Planten per 10m2']);
      const opbrengstGemStr = vindKolomWaarde(rij, ['Opbrengst (gemiddeld) per 10 m2', 'opbrengstGemiddeldPer10m2', 'Opbrengst gemiddeld per 10m2']);
      const kgOpbrengstStr = vindKolomWaarde(rij, ['KG opbrengst per 10 m2', 'kgOpbrengstPer10m2', 'KG opbrengst per 10m2']);

      // Parse zaai- en oogstkalender vanuit de genormaliseerde headers
      const zaaiKalender: Record<string, string> = {};
      const oogstKalender: Record<string, string> = {};

      MAAND_KEYS.forEach((maandKey, maandIndex) => {
        const maandNaam = MAAND_NAMEN_KORT[maandIndex];
        const periodes = ['B', 'M', 'E'];

        periodes.forEach(periode => {
          const kalenderKey = `${maandKey}_${periode.toLowerCase()}`;

          // Zaai kolommen - nu met "Zaai" prefix door normalisatie
          const zaaiWaarde = vindKolomWaarde(rij, [
            `Zaai ${maandNaam} ${periode}`,
            `zaai_${maandKey}_${periode.toLowerCase()}`
          ]);
          if (zaaiWaarde) {
            zaaiKalender[kalenderKey] = zaaiWaarde.toLowerCase().trim();
          }

          // Oogst kolommen - nu met "Oogst" prefix door normalisatie
          const oogstWaarde = vindKolomWaarde(rij, [
            `Oogst ${maandNaam} ${periode}`,
            `oogst_${maandKey}_${periode.toLowerCase()}`
          ]);
          if (oogstWaarde) {
            oogstKalender[kalenderKey] = oogstWaarde.toLowerCase().trim();
          }
        });
      });

      const item: GewassenlijstItem = {
        id: slug,
        gewasSoort: gewasSoort.trim(),
        gewas: gewas.trim(),
        cropEnglish: vindKolomWaarde(rij, ['Cropp', 'Crop', 'cropEnglish', 'Crop English']) || undefined,
        variant: vindKolomWaarde(rij, ['Variant', 'variant']) || undefined,
        teeltgroep: vindKolomWaarde(rij, ['Teeltgroep', 'teeltgroep']) || undefined,
        link: vindKolomWaarde(rij, ['Link', 'link', 'URL', 'url']) || undefined,
        zaadPer10m2: parseNederlandsGetal(zaadPer10m2Str) ?? null,
        plantenPer10m2: parseNederlandsGetal(plantenPer10m2Str) ?? null,
        kgOpbrengstPer10m2: kgOpbrengstStr || undefined,
        opbrengstGemiddeldPer10m2: parseNederlandsGetal(opbrengstGemStr) ?? null,
        eenheidOpbrengst: vindKolomWaarde(rij, ['Eenheid opbrengst', 'eenheidOpbrengst', 'Eenheid']) || undefined,
        zaaiKalender: Object.keys(zaaiKalender).length > 0 ? zaaiKalender : undefined,
        oogstKalender: Object.keys(oogstKalender).length > 0 ? oogstKalender : undefined,
        bijzonderheden: vindKolomWaarde(rij, ['Bijzonderheden', 'bijzonderheden', 'Details']) || undefined,
      };

      items.push(item);
    } catch (err) {
      fouten.push(`Regel ${index + 2}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  return { data: items, fouten, waarschuwingen };
}

// ============================================
// TEELTPLAN CSV PARSER (NIEUWE VERSIE - met gewas + gewasSoort)
// ============================================

/**
 * Parse een Teeltplan CSV met de nieuwe kolom-structuur:
 * - Kolom "Gewas" → groepsnaam (bijv. "Snijbiet")
 * - Kolom "Gewas + Soort" → variant (bijv. "Snijbiet - Fireworks")
 */
export function parseTeeltplanCSVNieuw(csvContent: string): ParseResultaat<TeeltplanItem> {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const items: TeeltplanItem[] = [];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header) => stripBOM(header),
  });

  if (result.errors.length > 0) {
    result.errors.forEach(err => {
      fouten.push(`Regel ${err.row}: ${err.message}`);
    });
  }

  result.data.forEach((rij, index) => {
    try {
      // Vereiste velden
      const sectieWaarde = vindKolomWaarde(rij, ['Sectie', 'sectie', 'Section']);
      const bedWaarde = vindKolomWaarde(rij, ['Bed', 'bed']);
      const gewas = vindKolomWaarde(rij, ['Gewas', 'gewas']);

      if (!sectieWaarde || !bedWaarde || !gewas) {
        if (sectieWaarde || bedWaarde || gewas) {
          waarschuwingen.push(`Regel ${index + 2}: Sectie, Bed of Gewas ontbreekt, overgeslagen`);
        }
        return;
      }

      const sectie = valideerSectie(sectieWaarde);
      const bedNummer = bedWaarde.trim();
      const bedId = `${sectie}${bedNummer}`;
      const jaarStr = vindKolomWaarde(rij, ['Jaar', 'jaar', 'Year']);
      const jaar = jaarStr ? parseInt(jaarStr, 10) : new Date().getFullYear();

      // Nieuwe kolom: Gewas + Soort (variant)
      const gewasSoort = vindKolomWaarde(rij, ['Gewas + Soort', 'Gewas+Soort', 'GewasSoort']) || undefined;

      const deelVanBed = vindKolomWaarde(rij, ['DeelVanBed', 'Deel van bed', 'deelVanBed', 'Deel', 'deel_van_bed']) || 'Heel bed';
      const teelt = vindKolomWaarde(rij, ['Teelt', 'teelt']) || '';
      const opmerkingen = vindKolomWaarde(rij, ['Opmerkingen', 'opmerkingen', 'Remarks']) || '';
      const oppervlakteStr = vindKolomWaarde(rij, ['Opp_gewas', 'Opp gewas', 'Oppervlakte', 'oppervlakte']);
      const oppervlakte = parseNederlandsGetal(oppervlakteStr || '') ?? undefined;

      // Genereer ID: gebruik gewasSoort als die er is, anders gewas
      const gewasSlug = generateSlug(gewasSoort || gewas);
      const id = `${jaar}-${bedId.toLowerCase()}-${gewasSlug}`;

      // Parse kalender (zaaikolommen)
      const kalender = parseKalenderMetPrefix(rij, 'Zaai');
      const kalenderGeneric = parseKalender(rij);
      const definitieveKalender = heeftKalenderData(kalender) ? kalender : kalenderGeneric;

      const item: TeeltplanItem = {
        id,
        jaar,
        sectie,
        bed: bedNummer,
        bedId,
        deelVanBed,
        gewas: gewas.trim(),
        gewasSoort: gewasSoort?.trim(),
        teelt,
        kalender: definitieveKalender,
        opmerkingen,
        oppervlakte,
      };

      items.push(item);
    } catch (err) {
      fouten.push(`Regel ${index + 2}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  });

  return { data: items, fouten, waarschuwingen };
}
