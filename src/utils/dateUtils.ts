import type { MaandPeriode, Maand, WeekInfo, MaandKalender, TeeltCode } from '../types';

// Maand namen mapping
const MAAND_NAMEN: Maand[] = [
  'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
];

const MAAND_KEYS: (keyof MaandKalender)[] = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
];

/**
 * Maandafkorting naar maandnummer (1-12)
 */
export const MONTH_NUMBERS: Record<string, number> = {
  'jan': 1, 'feb': 2, 'mrt': 3, 'apr': 4, 'mei': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'okt': 10, 'nov': 11, 'dec': 12
};

/**
 * Bereken het aantal dagen in een maand (houdt rekening met schrikkeljaren)
 */
export function dagenInMaand(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Bereken het ISO-weeknummer voor een specifieke datum.
 * ISO 8601: week 1 bevat de eerste donderdag van het jaar.
 */
export function getISOWeek(year: number, month: number, day: number): number {
  const date = new Date(year, month - 1, day);
  // Kopieer datum, zet naar dichtstbijzijnde donderdag
  const thursday = new Date(date);
  thursday.setDate(thursday.getDate() - ((thursday.getDay() + 6) % 7) + 3);
  // Eerste donderdag van het jaar
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  // Verschil in weken
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Bereken de periodegrenzen (begin/midden/eind) voor een maand.
 * Deelt de maand in drieën op basis van het werkelijke aantal dagen.
 */
export function getPeriodeGrenzen(year: number, month: number): {
  beginEind: number;
  middenEind: number;
  laatsteDag: number;
} {
  const days = dagenInMaand(year, month);
  const third = days / 3;
  return {
    beginEind: Math.round(third),
    middenEind: Math.round(2 * third),
    laatsteDag: days,
  };
}

/**
 * Bepaal de periode (Begin/Midden/Eind) van de maand op basis van de dag.
 * Gebruikt dynamische driedeling op basis van het werkelijke aantal dagen in de maand.
 *
 * @param dag - Dag van de maand (1-31)
 * @param year - Jaar (voor schrikkeljaar-berekening)
 * @param month - Maand (1-12)
 */
export function bepaalPeriode(dag: number, year?: number, month?: number): MaandPeriode {
  if (year !== undefined && month !== undefined) {
    const grenzen = getPeriodeGrenzen(year, month);
    if (dag <= grenzen.beginEind) return 'B';
    if (dag <= grenzen.middenEind) return 'M';
    return 'E';
  }
  // Fallback voor bestaande calls zonder year/month: gebruik vaste grenzen
  if (dag <= 10) return 'B';
  if (dag <= 20) return 'M';
  return 'E';
}

/**
 * KERNFUNCTIE: Bereken het ISO-weekbereik voor een periode (b/m/e) van een maand.
 *
 * @param year - Het jaar (bijv. 2026, 2027, etc.)
 * @param monthKey - Maandafkorting ('jan', 'feb', ..., 'dec')
 * @param period - Periode ('b' = begin, 'm' = midden, 'e' = eind)
 * @returns { startWeek, endWeek } - ISO-weeknummers
 */
export function periodToWeekRange(
  year: number,
  monthKey: string,
  period: 'b' | 'm' | 'e'
): { startWeek: number; endWeek: number } {
  const month = MONTH_NUMBERS[monthKey];
  const days = dagenInMaand(year, month);
  const third = days / 3;

  let startDay: number;
  let endDay: number;

  switch (period) {
    case 'b':
      startDay = 1;
      endDay = Math.round(third);
      break;
    case 'm':
      startDay = Math.round(third) + 1;
      endDay = Math.round(2 * third);
      break;
    case 'e':
      startDay = Math.round(2 * third) + 1;
      endDay = days;
      break;
  }

  const startWeek = getISOWeek(year, month, startDay);
  let endWeek = getISOWeek(year, month, endDay);

  // Jaargrens: als endWeek < startWeek (december → week 1), corrigeer
  if (endWeek < startWeek) {
    endWeek = getISOWeek(year, 12, 28); // Laatste "normale" week van het jaar
  }

  return { startWeek, endWeek };
}

/**
 * Bereken het ISO weeknummer voor een datum
 */
export function getWeekNummer(datum: Date): number {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Krijg de start- en einddatum van de huidige week
 */
export function getWeekGrenzen(datum: Date): { start: Date; eind: Date } {
  const d = new Date(datum);
  const dag = d.getDay();
  const verschil = d.getDate() - dag + (dag === 0 ? -6 : 1); // Maandag als start

  const start = new Date(d);
  start.setDate(verschil);
  start.setHours(0, 0, 0, 0);

  const eind = new Date(start);
  eind.setDate(start.getDate() + 6);
  eind.setHours(23, 59, 59, 999);

  return { start, eind };
}

/**
 * Krijg volledige week informatie voor de huidige datum
 */
export function getWeekInfo(datum: Date = new Date()): WeekInfo {
  const { start, eind } = getWeekGrenzen(datum);
  const maandIndex = datum.getMonth();
  const dag = datum.getDate();

  return {
    weekNummer: getWeekNummer(datum),
    jaar: datum.getFullYear(),
    maand: MAAND_NAMEN[maandIndex],
    periode: bepaalPeriode(dag, datum.getFullYear(), maandIndex + 1),
    startDatum: start,
    eindDatum: eind,
  };
}

/**
 * Haal de teeltcode op voor een specifieke maand en periode uit de kalender
 */
export function getTeeltCodeVoorPeriode(
  kalender: MaandKalender,
  maandIndex: number,
  periode: MaandPeriode
): TeeltCode {
  const maandKey = MAAND_KEYS[maandIndex];
  if (!maandKey || !kalender[maandKey]) return '';

  const periodeKey = periode.toLowerCase() as 'b' | 'm' | 'e';
  return kalender[maandKey][periodeKey] || '';
}

/**
 * Krijg alle actieve teeltcodes voor de huidige week
 * Kijkt ook naar naburige periodes voor overlap
 */
export function getActieveTeeltCodes(
  kalender: MaandKalender,
  datum: Date = new Date()
): TeeltCode[] {
  const maandIndex = datum.getMonth();
  const periode = bepaalPeriode(datum.getDate(), datum.getFullYear(), maandIndex + 1);
  const codes: TeeltCode[] = [];

  const code = getTeeltCodeVoorPeriode(kalender, maandIndex, periode);
  if (code) {
    codes.push(code);
  }

  return [...new Set(codes)]; // Unieke codes
}

/**
 * Formatteer datum naar Nederlandse notatie
 */
export function formatDatum(datum: Date | string): string {
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  return d.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formatteer datum en tijd naar Nederlandse notatie
 */
export function formatDatumTijd(datum: Date | string): string {
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  return d.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Krijg ISO datum string voor vandaag
 */
export function vandaagISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Krijg ISO datetime string voor nu
 */
export function nuISO(): string {
  return new Date().toISOString();
}

/**
 * Bereken of een datum binnen de huidige week valt
 */
export function isBinnenDezeWeek(datum: Date | string): boolean {
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  const { start, eind } = getWeekGrenzen(new Date());
  return d >= start && d <= eind;
}

/**
 * Bereken of een deadline urgent is (binnen 2 dagen of verlopen)
 */
export function isUrgent(deadline: string): boolean {
  const d = new Date(deadline);
  const nu = new Date();
  const tweedagen = new Date();
  tweedagen.setDate(nu.getDate() + 2);

  return d <= tweedagen;
}

/**
 * Krijg de deadline voor het einde van de huidige periode
 */
export function getDeadlineVoorPeriode(datum: Date = new Date()): string {
  const jaar = datum.getFullYear();
  const maand = datum.getMonth();
  const grenzen = getPeriodeGrenzen(jaar, maand + 1);
  const periode = bepaalPeriode(datum.getDate(), jaar, maand + 1);

  let eindDag: number;
  if (periode === 'B') eindDag = grenzen.beginEind;
  else if (periode === 'M') eindDag = grenzen.middenEind;
  else eindDag = grenzen.laatsteDag;

  return new Date(jaar, maand, eindDag).toISOString().split('T')[0];
}

/**
 * Periode naar Nederlandse tekst
 */
export function periodeNaarTekst(periode: MaandPeriode): string {
  const map: Record<MaandPeriode, string> = {
    'B': 'begin',
    'M': 'midden',
    'E': 'eind'
  };
  return map[periode];
}

/**
 * Maand index naar Nederlandse maandnaam
 */
export function maandNaarTekst(maandIndex: number): string {
  const maanden = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];
  return maanden[maandIndex] || '';
}
