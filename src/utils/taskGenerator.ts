import type {
  TeeltplanItem,
  Taak,
  TeeltCode,
  TaakPrioriteit,
  MaandKalender,
  TeeltVenster
} from '../types';
import {
  getWeekInfo,
  getTeeltCodeVoorPeriode,
  getWeekNummer,
  nuISO,
  periodToWeekRange,
  getPeriodeGrenzen,
} from './dateUtils';
import { TEELTCODE_ACTIES, TEELTCODE_ACTIES_EN, TEELTCODE_TAAKTYPE } from '../types';

/**
 * Genereer een unieke ID voor een taak
 */
function genereerTaakId(): string {
  return `taak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Bepaal de prioriteit op basis van teeltcode
 */
function bepaalPrioriteit(code: TeeltCode): TaakPrioriteit {
  // Oogsten en uitplanten zijn vaak tijdgevoelig
  if (code === 'o' || code === 'bu' || code === 'ku') {
    return 'Hoog';
  }
  // Zaaien is normaal
  if (code === 'bz' || code === 'kz' || code === 'kvz' || code === 'bvz' || code === 'bi' || code === 'x') {
    return 'Normaal';
  }
  return 'Normaal';
}

/**
 * Genereer een beschrijving voor een automatische taak (NL + EN)
 */
function genereerBeschrijving(
  teeltItem: TeeltplanItem,
  code: TeeltCode
): { nl: string; en: string } {
  const actieNl = TEELTCODE_ACTIES[code];
  const actieEn = TEELTCODE_ACTIES_EN[code];

  if (!actieNl) return { nl: '', en: '' };

  let nl = `${actieNl}: ${teeltItem.gewas}`;
  let en = `${actieEn}: ${teeltItem.gewas}`;

  if (teeltItem.deelVanBed && teeltItem.deelVanBed !== 'Heel bed') {
    nl += ` (${teeltItem.deelVanBed})`;
    en += ` (${teeltItem.deelVanBed})`;
  }

  nl += ` in bed ${teeltItem.bedId}`;
  en += ` in bed ${teeltItem.bedId}`;

  return { nl, en };
}

/**
 * Check of een taak al bestaat voor deze teeltplan item, code en periode
 */
function taakBestaatAl(
  bestaandeTaken: Taak[],
  teeltItem: TeeltplanItem,
  code: TeeltCode,
  maand: number,
  periode: string
): boolean {
  const periodeKey = `${maand}-${periode}`;
  return bestaandeTaken.some(taak =>
    taak.bronGewas === teeltItem.gewas &&
    taak.bronTeeltCode === code &&
    taak.bedId === teeltItem.bedId &&
    taak.commentaar?.includes(periodeKey) &&
    taak.isAutomatisch
  );
}

/**
 * Maand namen voor weergave
 */
const MAAND_NAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const PERIODE_NAMEN: Record<string, string> = { 'B': 'begin', 'M': 'midden', 'E': 'eind' };

/**
 * Bereken deadline op basis van maand en periode
 * Gebruikt dynamische periodegrenzen op basis van werkelijk aantal dagen in de maand
 */
function berekenDeadline(jaar: number, maand: number, periode: string): string {
  const grenzen = getPeriodeGrenzen(jaar, maand + 1);
  let dag: number;
  if (periode === 'B') dag = grenzen.beginEind;
  else if (periode === 'M') dag = grenzen.middenEind;
  else dag = grenzen.laatsteDag;

  return new Date(jaar, maand, dag).toISOString().split('T')[0];
}

/**
 * Bepaal locatie op basis van teeltcode
 */
function bepaalLocatie(code: TeeltCode): 'kas' | 'buiten' | 'onbekend' {
  if (code === 'kz' || code === 'kvz' || code === 'ku') return 'kas';
  if (code === 'bz' || code === 'bvz' || code === 'bu' || code === 'x') return 'buiten';
  if (code === 'bi') return 'buiten'; // thuis/binnen, maar categorie buiten
  return 'onbekend';
}

/**
 * Genereer een unieke sleutel voor een taak (voor duplicate detectie)
 * windowStart is nodig om voorjaar/najaar periodes te onderscheiden
 */
export function generateTaakKey(
  gewas: string,
  bedId: string,
  teeltCode: string,
  jaar: number,
  windowStart?: number
): string {
  const gewasNorm = gewas.toLowerCase().replace(/\s+/g, '-');
  const codeNorm = teeltCode.toLowerCase();
  const startSuffix = windowStart !== undefined ? `-w${windowStart}` : '';
  return `${jaar}-${bedId.toLowerCase()}-${gewasNorm}-${codeNorm}${startSuffix}`;
}

/**
 * Bereken de maandag (eerste dag) van een ISO-weeknummer in een gegeven jaar
 */
export function berekenMaandagVanWeek(jaar: number, weekNummer: number): string {
  // ISO 8601: week 1 bevat 4 januari
  const jan4 = new Date(jaar, 0, 4);
  const dagVanWeek = jan4.getDay() || 7; // 1=ma, 7=zo
  const maandag = new Date(jan4);
  maandag.setDate(jan4.getDate() - dagVanWeek + 1 + (weekNummer - 1) * 7);
  return maandag.toISOString().split('T')[0];
}

/**
 * Bereken de zondag (laatste dag) van een ISO-weeknummer in een gegeven jaar
 */
export function berekenDeadlineVanWeek(jaar: number, weekNummer: number): string {
  const maandag = new Date(berekenMaandagVanWeek(jaar, weekNummer));
  const zondag = new Date(maandag);
  zondag.setDate(maandag.getDate() + 6);
  return zondag.toISOString().split('T')[0];
}

/**
 * Extract alle actieperiodes (vensters) uit een kalender voor een specifiek teeltplan item.
 * Groepeert aaneengesloten periodes met dezelfde teeltcode tot één venster.
 * Periodes met een andere of lege code ertussen worden als apart venster behandeld.
 *
 * Gebruikt periodToWeekRange() voor correcte ISO-weekbereiken per periode.
 *
 * @param kalender - De maandkalender van het teeltplan item
 * @param jaar - Het jaar voor de weekberekening
 *
 * Voorbeeld: Bladmosterd kas zaaien in feb-m/e én okt-b/m/e wordt 2 aparte vensters.
 */
export function extractVensters(kalender: MaandKalender, jaar: number): TeeltVenster[] {
  const maandKeys: Array<keyof MaandKalender> = [
    'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
  ];
  const periodes: Array<'b' | 'm' | 'e'> = ['b', 'm', 'e'];

  const vensters: TeeltVenster[] = [];

  let huidigCode: TeeltCode | null = null;
  let huidigStart: number | null = null;
  let huidigEnd: number | null = null;

  // Loop chronologisch door alle 36 slots (12 maanden × 3 periodes)
  for (const maandKey of maandKeys) {
    const maandData = kalender[maandKey];
    if (!maandData) continue;

    for (const periode of periodes) {
      const rawCode = maandData[periode];
      const code = rawCode as TeeltCode;
      const isLeeg = !rawCode || code === 'x';

      if (isLeeg) {
        // Sluit huidig venster af als er een was
        if (huidigCode !== null) {
          vensters.push({
            code: huidigCode,
            windowStart: huidigStart!,
            windowEnd: huidigEnd!,
          });
          huidigCode = null;
          huidigStart = null;
          huidigEnd = null;
        }
        continue;
      }

      const { startWeek, endWeek } = periodToWeekRange(jaar, maandKey, periode);

      if (code === huidigCode) {
        // Zelfde code als vorige → verleng het venster
        huidigEnd = endWeek;
      } else {
        // Andere code → sluit vorig venster af, start nieuw
        if (huidigCode !== null) {
          vensters.push({
            code: huidigCode,
            windowStart: huidigStart!,
            windowEnd: huidigEnd!,
          });
        }
        huidigCode = code;
        huidigStart = startWeek;
        huidigEnd = endWeek;
      }
    }
  }

  // Sluit laatste venster af
  if (huidigCode !== null) {
    vensters.push({
      code: huidigCode,
      windowStart: huidigStart!,
      windowEnd: huidigEnd!,
    });
  }

  return vensters;
}

/**
 * NIEUWE VERSIE: Genereer automatische taken als venster-taken
 * Eén taak per gewas/bed/teeltcode/periode (met windowStart/windowEnd)
 */
export function genereerVensterTaken(
  teeltplan: TeeltplanItem[],
  bestaandeTaken: Taak[],
  datum: Date = new Date()
): Taak[] {
  const huidigJaar = datum.getFullYear();
  const huidigeWeek = getWeekNummer(datum);
  const nieuweTaken: Taak[] = [];

  // Bouw een set van bestaande taak-keys voor snelle lookup
  const bestaandeKeys = new Set<string>();
  bestaandeTaken.forEach(t => {
    if (t.isAutomatisch && t.bronGewas && t.bronTeeltCode) {
      const key = generateTaakKey(
        t.bronGewas,
        t.bedId,
        t.bronTeeltCode,
        t.jaar || huidigJaar,
        t.windowStart
      );
      bestaandeKeys.add(key);
    }
  });

  teeltplan.forEach(teeltItem => {
    const jaar = teeltItem.jaar || huidigJaar;

    // Extract alle vensters uit de kalender (met jaar voor correcte weekberekening)
    const vensters = extractVensters(teeltItem.kalender, jaar);

    vensters.forEach(venster => {
      // Genereer unieke sleutel
      const taakKey = generateTaakKey(
        teeltItem.gewas,
        teeltItem.bedId,
        venster.code,
        jaar,
        venster.windowStart
      );

      // Skip als taak al bestaat
      if (bestaandeKeys.has(taakKey)) return;

      // Check ook in nieuweTaken
      const alToegevoegd = nieuweTaken.some(t =>
        t.bronGewas === teeltItem.gewas &&
        t.bedId === teeltItem.bedId &&
        t.bronTeeltCode === venster.code &&
        t.windowStart === venster.windowStart
      );
      if (alToegevoegd) return;

      // Bepaal of taak verlopen is
      const isOverdue = venster.windowEnd < huidigeWeek;

      // Bepaal scheduledWeek: als we al voorbij windowStart zijn, plan voor huidige week (of windowEnd als verlopen)
      let scheduledWeek = venster.windowStart;
      if (huidigeWeek > venster.windowStart && huidigeWeek <= venster.windowEnd) {
        scheduledWeek = huidigeWeek;
      } else if (isOverdue) {
        scheduledWeek = venster.windowEnd;
      }

      // Bereken startdatum (maandag van windowStart) en deadline (zondag van windowEnd)
      const startdatum = berekenMaandagVanWeek(jaar, venster.windowStart);
      const deadline = berekenDeadlineVanWeek(jaar, venster.windowEnd);

      const beschrijvingen = genereerBeschrijving(teeltItem, venster.code);

      const taak: Taak = {
        id: genereerTaakId(),
        beschrijving: beschrijvingen.nl,
        beschrijving_en: beschrijvingen.en,
        sectie: teeltItem.sectie,
        bedId: teeltItem.bedId,
        type: TEELTCODE_TAAKTYPE[venster.code],
        prioriteit: isOverdue ? 'Hoog' : bepaalPrioriteit(venster.code),
        status: 'Open',
        startdatum,
        deadline,
        aangemaakt: nuISO(),
        gewijzigd: nuISO(),
        isAutomatisch: true,
        communityZichtbaar: false,
        bronGewas: teeltItem.gewas,
        bronGewasSoort: teeltItem.gewasSoort || undefined,
        bronTeeltCode: venster.code,
        commentaar: `Venster: week ${venster.windowStart} - ${venster.windowEnd}`,
        isAdHoc: false,

        // Venster-specifieke velden
        windowStart: venster.windowStart,
        windowEnd: venster.windowEnd,
        scheduledWeek,
        locatie: bepaalLocatie(venster.code),
        isOverdue,
        jaar,
        deelVanBed: teeltItem.deelVanBed || 'Heel bed',
      };

      nieuweTaken.push(taak);
    });
  });

  // Sorteer op scheduledWeek, dan op deadline
  nieuweTaken.sort((a, b) => {
    const weekA = a.scheduledWeek ?? 99;
    const weekB = b.scheduledWeek ?? 99;
    if (weekA !== weekB) return weekA - weekB;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return nieuweTaken;
}

/**
 * Corrigeer startdatum en deadline van bestaande teeltplan taken.
 * Taken die geïmporteerd zijn met een verkeerde datum (bijv. importdatum)
 * krijgen de juiste datums op basis van hun venster:
 * - startdatum = maandag van windowStart week
 * - deadline = zondag van windowEnd week
 *
 * Retourneert alleen de taken die daadwerkelijk gewijzigd zijn.
 */
export function corrigeerTeeltplanDeadlines(taken: Taak[]): Taak[] {
  const gecorrigeerd: Taak[] = [];

  taken.forEach(taak => {
    if (!taak.isAutomatisch || taak.windowStart === undefined || taak.windowEnd === undefined) return;

    const jaar = taak.jaar || new Date().getFullYear();
    const juisteStartdatum = berekenMaandagVanWeek(jaar, taak.windowStart);
    const juisteDeadline = berekenDeadlineVanWeek(jaar, taak.windowEnd);

    if (taak.startdatum !== juisteStartdatum || taak.deadline !== juisteDeadline) {
      gecorrigeerd.push({
        ...taak,
        startdatum: juisteStartdatum,
        deadline: juisteDeadline,
        gewijzigd: nuISO(),
      });
    }
  });

  return gecorrigeerd;
}

/**
 * OUDE VERSIE: Genereer automatische taken op basis van het VOLLEDIGE teeltplan
 * Genereert taken voor alle periodes met een actie
 * @deprecated Gebruik genereerVensterTaken() voor venster-gebaseerde taken
 */
export function genereerAutomatischeTaken(
  teeltplan: TeeltplanItem[],
  bestaandeTaken: Taak[],
  datum: Date = new Date()
): Taak[] {
  const huidigJaar = datum.getFullYear();
  const nieuweTaken: Taak[] = [];
  const periodes: Array<'b' | 'm' | 'e'> = ['b', 'm', 'e'];
  const periodeLabels: Record<string, string> = { 'b': 'B', 'm': 'M', 'e': 'E' };

  const maandKeys: Array<keyof MaandKalender> = [
    'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
  ];

  teeltplan.forEach(teeltItem => {
    // Gebruik het jaar uit teeltplan, of huidig jaar als fallback
    const jaar = teeltItem.jaar || huidigJaar;

    // Loop door alle maanden
    maandKeys.forEach((maandKey, maandIndex) => {
      const maandData = teeltItem.kalender[maandKey];
      if (!maandData) return;

      // Loop door alle periodes (begin, midden, eind)
      periodes.forEach(periode => {
        const code = maandData[periode] as TeeltCode;

        // Skip als geen actie of alleen 'x' (actief/onderhoud)
        if (!code || code === 'x') return;

        // Check of taak al bestaat
        const periodeLabel = periodeLabels[periode];
        if (taakBestaatAl(bestaandeTaken, teeltItem, code, maandIndex, periodeLabel)) return;

        // Check ook in nieuweTaken om duplicaten te voorkomen
        const alToegevoegd = nieuweTaken.some(t =>
          t.bronGewas === teeltItem.gewas &&
          t.bronTeeltCode === code &&
          t.bedId === teeltItem.bedId &&
          t.commentaar?.includes(`${maandIndex}-${periodeLabel}`)
        );
        if (alToegevoegd) return;

        const deadline = berekenDeadline(jaar, maandIndex, periodeLabel);
        const periodeNaam = `${PERIODE_NAMEN[periodeLabel]} ${MAAND_NAMEN[maandIndex]}`;

        // Genereer de taak
        const taak: Taak = {
          id: genereerTaakId(),
          beschrijving: genereerBeschrijving(teeltItem, code).nl,
          beschrijving_en: genereerBeschrijving(teeltItem, code).en,
          sectie: teeltItem.sectie,
          bedId: teeltItem.bedId,
          type: TEELTCODE_TAAKTYPE[code],
          prioriteit: bepaalPrioriteit(code),
          status: 'Open',
          deadline,
          aangemaakt: nuISO(),
          gewijzigd: nuISO(),
          isAutomatisch: true,
          communityZichtbaar: false,
          bronGewas: teeltItem.gewas,
          bronTeeltCode: code,
          commentaar: `Gepland voor ${periodeNaam} (${maandIndex}-${periodeLabel})`,
          isAdHoc: false,
        };

        nieuweTaken.push(taak);
      });
    });
  });

  // Sorteer op deadline
  nieuweTaken.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return nieuweTaken;
}

/**
 * Verwijder afgeronde automatische taken die ouder zijn dan 2 weken
 */
export function opruimenOudeTaken(taken: Taak[]): Taak[] {
  const tweeWekenGeleden = new Date();
  tweeWekenGeleden.setDate(tweeWekenGeleden.getDate() - 14);

  return taken.filter(taak => {
    // Behoud alle niet-afgeronde taken
    if (taak.status !== 'Afgerond') return true;

    // Behoud handmatige taken
    if (!taak.isAutomatisch) return true;

    // Verwijder afgeronde automatische taken ouder dan 2 weken
    const gewijzigdDatum = new Date(taak.gewijzigd);
    return gewijzigdDatum >= tweeWekenGeleden;
  });
}

/**
 * Controleer of een teelt waarde aangeeft dat het teelt 2 (nateelt) is
 * Accepteert: "2", "2e", " 2 ", 2 (als nummer), etc.
 */
function isTeelt2(teelt: string | number | undefined | null): boolean {
  if (teelt === null || teelt === undefined || teelt === '') return false;
  const teeltStr = String(teelt).trim().toLowerCase();
  // Check voor "2", "2e", "tweede", "nateelt", etc.
  return teeltStr === '2' || teeltStr === '2e' || teeltStr.startsWith('2') || teeltStr === 'tweede' || teeltStr === 'nateelt';
}

/**
 * Controleer of een teelt-2 item getoond moet worden in de huidige maand
 * Teelt 2 (nateelt) begint typisch pas na de eerste teelt is geoogst
 * Voor zaaien: teelt 2 pas tonen vanaf juni
 * Voor planten: teelt 2 pas tonen vanaf juli
 * Voor oogsten: teelt 2 pas tonen vanaf augustus
 */
function isTeelt2Relevant(teelt: string, code: TeeltCode, maandIndex: number): boolean {
  // Als het geen teelt 2 is, altijd tonen
  if (!isTeelt2(teelt)) return true;

  // Zaaien codes: pas vanaf juni (maand 5)
  if (code === 'kz' || code === 'bz' || code === 'kvz' || code === 'bvz') {
    return maandIndex >= 5; // Juni of later
  }

  // Planten codes: pas vanaf juli (maand 6)
  if (code === 'ku' || code === 'bu') {
    return maandIndex >= 6; // Juli of later
  }

  // Oogsten: pas vanaf augustus (maand 7)
  if (code === 'o') {
    return maandIndex >= 7; // Augustus of later
  }

  return true;
}

/**
 * Krijg een samenvatting van wat er te doen is in een periode
 */
export function getTeeltSamenvatting(
  teeltplan: TeeltplanItem[],
  datum: Date = new Date()
): {
  gewas: string;
  bedId: string;
  actie: string;
  code: TeeltCode;
  deelVanBed: string;
  teelt: string;
}[] {
  const weekInfo = getWeekInfo(datum);
  const maandIndex = datum.getMonth();
  const periode = weekInfo.periode;

  const acties: {
    gewas: string;
    bedId: string;
    actie: string;
    code: TeeltCode;
    deelVanBed: string;
    teelt: string;
  }[] = [];

  teeltplan.forEach(teeltItem => {
    const code = getTeeltCodeVoorPeriode(teeltItem.kalender, maandIndex, periode);
    const teelt = teeltItem.teelt || '';

    // Filter teelt 2 items die nog niet relevant zijn
    if (code && code !== 'x' && isTeelt2Relevant(teelt, code, maandIndex)) {
      acties.push({
        gewas: teeltItem.gewas,
        bedId: teeltItem.bedId,
        actie: TEELTCODE_ACTIES[code],
        code,
        deelVanBed: teeltItem.deelVanBed || 'Heel bed',
        teelt,
      });
    }
  });

  return acties;
}

/**
 * Bepaal de dynamische prioriteit voor een taak op basis van deadline en bron.
 *
 * Regels:
 * - Commissie-taken (niet automatisch): behouden hun ingestelde prioriteit
 * - Automatische teeltplan-taken:
 *   - 'Laag' als deadline > 1 week in de toekomst (grijs)
 *   - 'Normaal' als deadline deze week is (oranje)
 *   - 'Hoog' als deadline in het verleden ligt / overdue (rood)
 *
 * Let op: Voor automatische taken met een deadline in een vorig jaar,
 * interpreteren we de deadline als hetzelfde maand/dag in het huidige of volgende jaar.
 */
export function berekenDynamischePrioriteit(taak: Taak): TaakPrioriteit {
  // Commissie-taken: behoud de ingestelde prioriteit
  if (!taak.isAutomatisch) {
    return taak.prioriteit;
  }

  const huidigeWeek = getWeekNummer(new Date());

  // Venster-taken: prioriteit op basis van windowEnd
  if (taak.windowEnd !== undefined) {
    const wekenTotWindowEnd = taak.windowEnd - huidigeWeek;

    // Venster verlopen: Hoog (rood/urgent)
    if (wekenTotWindowEnd < 0) {
      return 'Hoog';
    }

    // Venster eindigt deze week of volgende: Normaal (oranje)
    if (wekenTotWindowEnd <= 1) {
      return 'Normaal';
    }

    // Venster > 1 week in toekomst: Laag (grijs)
    return 'Laag';
  }

  // Reguliere automatische taken: prioriteit op basis van deadline
  const nu = new Date();
  nu.setHours(0, 0, 0, 0);
  const huidigJaar = nu.getFullYear();

  let deadline = new Date(taak.deadline);
  deadline.setHours(0, 0, 0, 0);

  // Voor automatische taken: corrigeer jaar als deadline in een vorig jaar ligt
  // Dit kan gebeuren als taken zijn gegenereerd voor een teeltplan van een vorig jaar
  if (deadline.getFullYear() < huidigJaar) {
    // Zet deadline naar hetzelfde maand/dag in het huidige jaar
    deadline = new Date(huidigJaar, deadline.getMonth(), deadline.getDate());
    deadline.setHours(0, 0, 0, 0);

    // Als die datum ook al verstreken is, is het echt te laat (rood)
    // Anders behandel als toekomstige deadline
  }

  // Bereken dagen tot deadline
  const dagenTotDeadline = Math.floor((deadline.getTime() - nu.getTime()) / (1000 * 60 * 60 * 24));

  // Deadline in verleden: Hoog (rood)
  if (dagenTotDeadline < 0) {
    return 'Hoog';
  }

  // Deadline binnen 7 dagen (deze week): Normaal (oranje)
  if (dagenTotDeadline <= 7) {
    return 'Normaal';
  }

  // Deadline > 1 week in toekomst: Laag (grijs)
  return 'Laag';
}

/**
 * Check of een taak echt urgent is (op basis van dynamische prioriteit)
 */
export function isTaakUrgent(taak: Taak): boolean {
  if (taak.status === 'Afgerond') return false;
  const prioriteit = berekenDynamischePrioriteit(taak);
  return prioriteit === 'Hoog';
}

/**
 * Krijg statistieken over de huidige taken
 */
export function getTaakStatistieken(taken: Taak[]): {
  totaal: number;
  open: number;
  inUitvoering: number;
  afgerond: number;
  automatisch: number;
  handmatig: number;
  urgent: number;
  gearchiveerd: number;
} {
  // Excludeer gearchiveerde taken uit de hoofdstatistieken
  const actieveTaken = taken.filter(t => t.status !== 'Gearchiveerd');

  // Urgent = taken met dynamisch berekende prioriteit "Hoog" die nog niet afgerond zijn
  const urgent = actieveTaken.filter(t =>
    t.status !== 'Afgerond' && isTaakUrgent(t)
  ).length;

  return {
    totaal: actieveTaken.length,
    open: actieveTaken.filter(t => t.status === 'Open').length,
    inUitvoering: actieveTaken.filter(t => t.status === 'In uitvoering').length,
    afgerond: actieveTaken.filter(t => t.status === 'Afgerond').length,
    automatisch: actieveTaken.filter(t => t.isAutomatisch).length,
    handmatig: actieveTaken.filter(t => !t.isAutomatisch).length,
    urgent,
    gearchiveerd: taken.filter(t => t.status === 'Gearchiveerd').length,
  };
}
