import type { OogstItem, OogstStatus, OogstCategorie, TeeltplanItem, Gewas, MaandKalender } from '../types';
import { nuISO, getPeriodeGrenzen } from './dateUtils';

// ============================================
// TYPES VOOR OOGST SUGGESTIES
// ============================================

export interface OogstSuggestie {
  gewas: string;
  locaties: string[];        // Alle bed locaties waar dit gewas staat
  oogstmethode: string;      // Uit gewassen.csv bijzonderheden
  bijzonderheden: string;    // Extra info uit gewassen
  categorie: OogstCategorie;
  teeltplanItems: TeeltplanItem[]; // Relevante teeltplan items
}

type MaandKey = 'jan' | 'feb' | 'mrt' | 'apr' | 'mei' | 'jun' | 'jul' | 'aug' | 'sep' | 'okt' | 'nov' | 'dec';
type PeriodeKey = 'b' | 'm' | 'e';

// Maand namen mapping
const MAAND_KEYS: MaandKey[] = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MAAND_NAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// ============================================
// OOGST SUGGESTIES GENERATOR
// ============================================

/**
 * Bepaal de huidige maand en periode (Begin/Midden/Eind)
 */
export function getHuidigeMaandPeriode(): { maand: MaandKey; periode: PeriodeKey; maandNaam: string } {
  const now = new Date();
  const dag = now.getDate();
  const maandIndex = now.getMonth();
  const jaar = now.getFullYear();

  // Dynamische periodebepaling op basis van werkelijk aantal dagen in de maand
  const grenzen = getPeriodeGrenzen(jaar, maandIndex + 1);
  let periode: PeriodeKey;
  if (dag <= grenzen.beginEind) {
    periode = 'b'; // Begin
  } else if (dag <= grenzen.middenEind) {
    periode = 'm'; // Midden
  } else {
    periode = 'e'; // Eind
  }

  return {
    maand: MAAND_KEYS[maandIndex],
    periode,
    maandNaam: MAAND_NAMEN[maandIndex]
  };
}

/**
 * Check of een kalender oogstbaar is voor een bepaalde maand/periode
 * Kijkt naar 'o' code in de kalender
 */
function isOogstbaarInPeriode(kalender: MaandKalender | undefined, maand: MaandKey, periode: PeriodeKey): boolean {
  if (!kalender) return false;

  const maandData = kalender[maand];
  if (!maandData) return false;

  const code = maandData[periode];
  return code === 'o'; // 'o' = oogst code
}

/**
 * Check of een kalender oogstbaar is in de hele maand (elke periode)
 */
function isOogstbaarInMaand(kalender: MaandKalender | undefined, maand: MaandKey): boolean {
  if (!kalender) return false;

  const maandData = kalender[maand];
  if (!maandData) return false;

  // Check alle periodes
  return maandData.b === 'o' || maandData.m === 'o' || maandData.e === 'o';
}

/**
 * Check of een gewas oogstbaar is:
 * - Als gewas een oogstKalender heeft, gebruik die
 * - Anders fallback naar de normale kalender van het gewas
 * - Teeltplan bepaalt welke locaties beschikbaar zijn
 */
function getOogstKalenderVoorGewas(gewas: Gewas | undefined): MaandKalender | undefined {
  if (!gewas) return undefined;
  // Gebruik oogstKalender als die bestaat, anders fallback naar normale kalender
  return gewas.oogstKalender || gewas.kalender;
}

/**
 * Genereer oogst suggesties op basis van teeltplan en gewassen data
 *
 * @param teeltplan - Alle teeltplan items
 * @param gewassen - Alle gewassen
 * @param maand - Optioneel: specifieke maand (default: huidige maand)
 * @param periode - Optioneel: specifieke periode (default: huidige periode)
 */
export function genereerOogstSuggesties(
  teeltplan: TeeltplanItem[],
  gewassen: Gewas[],
  maand?: MaandKey,
  periode?: PeriodeKey
): OogstSuggestie[] {
  // Gebruik huidige maand/periode als niet opgegeven
  const huidig = getHuidigeMaandPeriode();
  const targetMaand = maand || huidig.maand;
  const targetPeriode = periode || huidig.periode;

  // Maak een map van gewasnamen naar gewas data
  const gewassenMap = new Map<string, Gewas>();
  gewassen.forEach(g => {
    if (g.gewas) gewassenMap.set(g.gewas.toLowerCase(), g);
  });

  // Groepeer teeltplan items per gewas die oogstbaar zijn
  const suggestiesMap = new Map<string, OogstSuggestie>();

  teeltplan.forEach(item => {
    const gewasNaam = item.gewas;
    if (!gewasNaam) return; // Skip items zonder gewas
    const gewasNaamLower = gewasNaam.toLowerCase();

    // Haal gewas info op uit gewassenlijst
    const gewasInfo = gewassenMap.get(gewasNaamLower);

    // Bepaal welke kalender te gebruiken voor oogst check:
    // 1. Als gewas een oogstKalender heeft in gewassenlijst, gebruik die
    // 2. Anders check het teeltplan zelf (oude gedrag)
    const oogstKalender = getOogstKalenderVoorGewas(gewasInfo);
    const kalenderVoorCheck = oogstKalender || item.kalender;

    // Check of dit gewas oogstbaar is in de target periode
    if (!isOogstbaarInPeriode(kalenderVoorCheck, targetMaand, targetPeriode)) {
      return;
    }

    // Bepaal categorie (kruiden of groenten)
    let categorie: OogstCategorie = 'Groenten';
    if (gewasInfo) {
      const teeltgroepLower = (gewasInfo.teeltgroep || '').toLowerCase();
      if (teeltgroepLower.includes('kruid') || teeltgroepLower.includes('herb')) {
        categorie = 'Kruiden';
      }
    }
    // Extra check op gewasnaam voor kruiden
    const kruidenNamen = ['basilicum', 'bieslook', 'peterselie', 'koriander', 'munt', 'tijm', 'rozemarijn', 'salie', 'oregano', 'dragon', 'kervel', 'dille', 'venkel', 'citroenmelisse'];
    if (kruidenNamen.some(k => gewasNaamLower.includes(k))) {
      categorie = 'Kruiden';
    }

    if (suggestiesMap.has(gewasNaam)) {
      // Voeg locatie toe aan bestaande suggestie
      const bestaand = suggestiesMap.get(gewasNaam)!;
      if (!bestaand.locaties.includes(item.bedId)) {
        bestaand.locaties.push(item.bedId);
      }
      bestaand.teeltplanItems.push(item);
    } else {
      // Nieuwe suggestie aanmaken
      suggestiesMap.set(gewasNaam, {
        gewas: gewasNaam,
        locaties: [item.bedId],
        oogstmethode: gewasInfo?.bijzonderheden || '',
        bijzonderheden: gewasInfo?.oogstperiode || '',
        categorie,
        teeltplanItems: [item]
      });
    }
  });

  // Converteer map naar array en sorteer op naam
  return Array.from(suggestiesMap.values()).sort((a, b) => a.gewas.localeCompare(b.gewas));
}

/**
 * Genereer oogst suggesties voor de hele maand (alle periodes)
 */
export function genereerOogstSuggestiesVoorMaand(
  teeltplan: TeeltplanItem[],
  gewassen: Gewas[],
  maand?: MaandKey
): OogstSuggestie[] {
  const huidig = getHuidigeMaandPeriode();
  const targetMaand = maand || huidig.maand;

  // Maak een map van gewasnamen naar gewas data
  const gewassenMap = new Map<string, Gewas>();
  gewassen.forEach(g => {
    if (g.gewas) gewassenMap.set(g.gewas.toLowerCase(), g);
  });

  // Groepeer teeltplan items per gewas die oogstbaar zijn in de maand
  const suggestiesMap = new Map<string, OogstSuggestie>();

  teeltplan.forEach(item => {
    const gewasNaam = item.gewas;
    if (!gewasNaam) return; // Skip items zonder gewas
    const gewasNaamLower = gewasNaam.toLowerCase();

    // Haal gewas info op uit gewassenlijst
    const gewasInfo = gewassenMap.get(gewasNaamLower);

    // Bepaal welke kalender te gebruiken voor oogst check:
    // 1. Als gewas een oogstKalender heeft in gewassenlijst, gebruik die
    // 2. Anders check het teeltplan zelf (oude gedrag)
    const oogstKalender = getOogstKalenderVoorGewas(gewasInfo);
    const kalenderVoorCheck = oogstKalender || item.kalender;

    // Check of dit gewas oogstbaar is in de target maand
    if (!isOogstbaarInMaand(kalenderVoorCheck, targetMaand)) {
      return;
    }

    // Bepaal categorie
    let categorie: OogstCategorie = 'Groenten';
    if (gewasInfo) {
      const teeltgroepLower = (gewasInfo.teeltgroep || '').toLowerCase();
      if (teeltgroepLower.includes('kruid') || teeltgroepLower.includes('herb')) {
        categorie = 'Kruiden';
      }
    }
    const kruidenNamen = ['basilicum', 'bieslook', 'peterselie', 'koriander', 'munt', 'tijm', 'rozemarijn', 'salie', 'oregano', 'dragon', 'kervel', 'dille', 'venkel', 'citroenmelisse'];
    if (kruidenNamen.some(k => gewasNaamLower.includes(k))) {
      categorie = 'Kruiden';
    }

    if (suggestiesMap.has(gewasNaam)) {
      const bestaand = suggestiesMap.get(gewasNaam)!;
      if (!bestaand.locaties.includes(item.bedId)) {
        bestaand.locaties.push(item.bedId);
      }
      bestaand.teeltplanItems.push(item);
    } else {
      suggestiesMap.set(gewasNaam, {
        gewas: gewasNaam,
        locaties: [item.bedId],
        oogstmethode: gewasInfo?.bijzonderheden || '',
        bijzonderheden: gewasInfo?.oogstperiode || '',
        categorie,
        teeltplanItems: [item]
      });
    }
  });

  return Array.from(suggestiesMap.values()).sort((a, b) => a.gewas.localeCompare(b.gewas));
}

/**
 * Formatteer locaties voor weergave
 */
export function formateerLocaties(locaties: string[]): string {
  if (locaties.length === 0) return '';
  if (locaties.length === 1) return locaties[0];
  if (locaties.length === 2) return locaties.join(', ');
  return `${locaties[0]}, ${locaties[1]}, +${locaties.length - 2}`;
}

/**
 * Maak een OogstItem van een suggestie
 */
export function maakOogstItemVanSuggestie(
  suggestie: OogstSuggestie,
  weekNummer: number,
  jaar: number,
  aangemaaktDoor: string,
  hoeveelheidPp: string = ''
): OogstItem {
  return {
    id: `oogst-${jaar}-w${weekNummer}-${(suggestie.gewas || 'onbekend').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    gewas: suggestie.gewas,
    categorie: suggestie.categorie,
    hoeveelheidPp,
    locatiePrimair: suggestie.locaties[0] || '',
    locatieSecundair: suggestie.locaties[1],
    locatieTertiair: suggestie.locaties[2],
    oogstmethode: suggestie.oogstmethode,
    bijzonderheden: suggestie.bijzonderheden || undefined,
    status: 'Beschikbaar',
    leegOogsten: false,
    weekNummer,
    jaar,
    aangemaakt: nuISO(),
    aangemaaktDoor
  };
}

/**
 * Bereken ISO weeknummer uit een datum
 */
function getWeekNummerVanDatum(datum: Date): { weekNummer: number; jaar: number } {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNummer = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { weekNummer, jaar: d.getUTCFullYear() };
}

/**
 * Parse een datum string in verschillende formaten (d-m-yyyy, dd-mm-yyyy, yyyy-mm-dd)
 */
function parseDatum(datumStr: string): Date | null {
  if (!datumStr) return null;

  // Probeer d-m-yyyy of dd-mm-yyyy formaat
  const nlMatch = datumStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (nlMatch) {
    const dag = parseInt(nlMatch[1], 10);
    const maand = parseInt(nlMatch[2], 10) - 1;
    const jaar = parseInt(nlMatch[3], 10);
    return new Date(jaar, maand, dag);
  }

  // Probeer yyyy-mm-dd formaat
  const isoMatch = datumStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const jaar = parseInt(isoMatch[1], 10);
    const maand = parseInt(isoMatch[2], 10) - 1;
    const dag = parseInt(isoMatch[3], 10);
    return new Date(jaar, maand, dag);
  }

  return null;
}

/**
 * Parse CSV data naar OogstItem array
 * Verwacht format: Week;Startdatum;Gewas;Categorie;Hoeveelheid_pp;Locatie_primair;Locatie_secundair;Locatie_tertiair;Oogstmethode;Bijzonderheden;Status;Leeg_oogsten;KeuzeGroep
 *
 * Let op: Weeknummer wordt berekend uit de Startdatum (de Week kolom wordt genegeerd)
 * KeuzeGroep format: "Keuze 1" of "1" voor keuzegroep 1, leeg voor geen keuzegroep
 */
export function parseOogstCSV(csvText: string, aangemaaktDoor: string = 'import'): OogstItem[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV moet minimaal een header regel en data bevatten');
  }

  // Verwijder header
  const header = lines[0].toLowerCase();
  const dataLines = lines.slice(1);

  // Detecteer delimiter (punt-komma of komma)
  const delimiter = header.includes(';') ? ';' : ',';

  const items: OogstItem[] = [];

  dataLines.forEach((line, index) => {
    if (!line.trim()) return; // Skip lege regels

    const values = parseCSVLine(line, delimiter);

    if (values.length < 6) {
      console.warn(`Regel ${index + 2} heeft te weinig kolommen, overgeslagen`);
      return;
    }

    // Parse datum en bereken weeknummer daaruit
    const startDatumStr = values[1]?.trim() || '';
    const datum = parseDatum(startDatumStr);

    let weekNummer = 1;
    let jaar = new Date().getFullYear();

    if (datum) {
      const weekInfo = getWeekNummerVanDatum(datum);
      weekNummer = weekInfo.weekNummer;
      jaar = weekInfo.jaar;
    } else {
      // Fallback: probeer week uit eerste kolom te halen
      const weekStr = values[0]?.trim() || '';
      const weekMatch = weekStr.match(/\d+/);
      if (weekMatch) {
        weekNummer = parseInt(weekMatch[0], 10);
      }
    }

    // Parse categorie
    const categorieStr = (values[3]?.trim() || 'Groenten').toLowerCase();
    const categorie: OogstCategorie = categorieStr.includes('kruid') ? 'Kruiden' : 'Groenten';

    // Parse status
    const statusStr = (values[10]?.trim() || 'Beschikbaar').toLowerCase();
    let status: OogstStatus = 'Beschikbaar';
    if (statusStr.includes('controleren') || statusStr.includes('check')) {
      status = 'Controleren';
    } else if (statusStr.includes('op') || statusStr === 'op') {
      status = 'Op';
    } else if (statusStr.includes('gereserveerd')) {
      status = 'Gereserveerd';
    }

    // Parse leeg oogsten
    const leegStr = (values[11]?.trim() || '').toLowerCase();
    const leegOogsten = leegStr === 'ja' || leegStr === 'yes' || leegStr === 'true' || leegStr === '1';

    // Parse keuzeGroep (kolom 12)
    const keuzeGroepStr = values[12]?.trim() || '';
    let keuzeGroep: string | undefined = undefined;
    if (keuzeGroepStr) {
      // Ondersteun "Keuze 1", "keuze 2", of gewoon "1", "2"
      const keuzeMatch = keuzeGroepStr.match(/(\d+)/);
      if (keuzeMatch) {
        keuzeGroep = `keuze-${keuzeMatch[1]}`;
      }
    }

    // Genereer unieke ID
    const id = `oogst-${jaar}-w${weekNummer}-${index}-${Date.now()}`;

    const item: OogstItem = {
      id,
      gewas: values[2]?.trim() || 'Onbekend',
      categorie,
      hoeveelheidPp: values[4]?.trim() || '',
      locatiePrimair: values[5]?.trim() || '',
      locatieSecundair: values[6]?.trim() || undefined,
      locatieTertiair: values[7]?.trim() || undefined,
      oogstmethode: values[8]?.trim() || '',
      bijzonderheden: values[9]?.trim() || undefined,
      status,
      leegOogsten,
      keuzeGroep,
      weekNummer,
      jaar,
      aangemaakt: nuISO(),
      aangemaaktDoor
    };

    // Alleen toevoegen als gewas niet leeg is
    if (item.gewas && item.gewas !== 'Onbekend') {
      items.push(item);
    }
  });

  return items;
}

/**
 * Parse een CSV regel, rekening houdend met quotes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Genereer week info tekst
 */
export function getWeekInfoTekst(weekNummer: number, jaar: number): string {
  // Bereken startdatum van de week
  const startDatum = getStartDatumVanWeek(weekNummer, jaar);
  const eindDatum = new Date(startDatum);
  eindDatum.setDate(eindDatum.getDate() + 6);

  const maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  const startDag = startDatum.getDate();
  const eindDag = eindDatum.getDate();
  const startMaand = maanden[startDatum.getMonth()];
  const eindMaand = maanden[eindDatum.getMonth()];

  if (startMaand === eindMaand) {
    return `Week ${weekNummer} (${startDag}-${eindDag} ${startMaand})`;
  } else {
    return `Week ${weekNummer} (${startDag} ${startMaand} - ${eindDag} ${eindMaand})`;
  }
}

/**
 * Bereken startdatum van een weeknummer
 */
export function getStartDatumVanWeek(weekNummer: number, jaar: number): Date {
  // ISO week: week 1 bevat de eerste donderdag van het jaar
  const jan4 = new Date(jaar, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Zondag = 7
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - dayOfWeek + 1);

  const result = new Date(week1Start);
  result.setDate(result.getDate() + (weekNummer - 1) * 7);
  return result;
}

/**
 * Haal huidige weeknummer op
 */
export function getHuidigeWeek(): { weekNummer: number; jaar: number } {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - dayOfWeek + 1);

  const diff = now.getTime() - week1Start.getTime();
  const weekNummer = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));

  return {
    weekNummer: Math.max(1, Math.min(53, weekNummer)),
    jaar: now.getFullYear()
  };
}

/**
 * Filter oogstlijst items voor een specifieke week
 */
export function filterOogstlijstVoorWeek(
  items: OogstItem[],
  weekNummer: number,
  jaar: number
): OogstItem[] {
  return items.filter(item => item.weekNummer === weekNummer && item.jaar === jaar);
}

/**
 * Groepeer items per keuzegroep
 */
export function groepeerOpKeuzeGroep(items: OogstItem[]): Map<string | null, OogstItem[]> {
  const groepen = new Map<string | null, OogstItem[]>();

  items.forEach(item => {
    const groep = item.keuzeGroep || null;
    if (!groepen.has(groep)) {
      groepen.set(groep, []);
    }
    groepen.get(groep)!.push(item);
  });

  return groepen;
}

/**
 * Dupliceer oogstlijst items naar een nieuwe week
 */
export function dupliceerNaarWeek(
  items: OogstItem[],
  bronWeek: number,
  bronJaar: number,
  doelWeek: number,
  doelJaar: number,
  aangemaaktDoor: string
): OogstItem[] {
  const bronItems = filterOogstlijstVoorWeek(items, bronWeek, bronJaar);

  return bronItems.map((item, index) => ({
    ...item,
    id: `oogst-${doelJaar}-w${doelWeek}-${index}-${Date.now()}`,
    weekNummer: doelWeek,
    jaar: doelJaar,
    status: 'Beschikbaar' as OogstStatus, // Reset status
    aangemaakt: nuISO(),
    aangemaaktDoor
  }));
}

/**
 * Exporteer oogstlijst naar CSV
 */
export function exportOogstlijstCSV(items: OogstItem[]): string {
  const header = 'Week;Startdatum;Gewas;Categorie;Hoeveelheid_pp;Locatie_primair;Locatie_secundair;Locatie_tertiair;Oogstmethode;Bijzonderheden;Status;Leeg_oogsten;KeuzeGroep';

  const rows = items.map(item => {
    const startDatum = getStartDatumVanWeek(item.weekNummer, item.jaar);
    const datumStr = startDatum.toISOString().split('T')[0];

    // Converteer keuzeGroep "keuze-1" naar "Keuze 1" voor leesbaarheid
    let keuzeGroepStr = '';
    if (item.keuzeGroep) {
      const keuzeMatch = item.keuzeGroep.match(/(\d+)/);
      if (keuzeMatch) {
        keuzeGroepStr = `Keuze ${keuzeMatch[1]}`;
      }
    }

    return [
      `Week ${item.weekNummer}`,
      datumStr,
      item.gewas,
      item.categorie,
      item.hoeveelheidPp,
      item.locatiePrimair,
      item.locatieSecundair || '',
      item.locatieTertiair || '',
      item.oogstmethode,
      item.bijzonderheden || '',
      item.status,
      item.leegOogsten ? 'Ja' : 'Nee',
      keuzeGroepStr
    ].map(val => `"${val}"`).join(';');
  });

  return [header, ...rows].join('\n');
}
