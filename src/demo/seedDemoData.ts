/**
 * Fictieve demo-tuin voor de demomodus.
 *
 * Alle data hier is verzonnen: 10 bedden in sectie A met elk één gewas.
 * De taken worden bij het opstarten gegenereerd met de échte taakgenerator
 * van de app (genereerVensterTaken), op basis van de zaai/plant-kalenders
 * in gewasKalenders.json. Daardoor is de demo altijd actueel en klopt het
 * seizoensbeeld: taken van vóór vandaag zijn grotendeels "afgerond", en de
 * oogstlijst wordt gevuld voor de huidige week.
 */

import type {
  Bed,
  TeeltplanItem,
  Taak,
  OogstItem,
  OogstRegistratie,
  Signalering,
  MaandKalender,
  ZonSchaduw,
} from '../types';
import { genereerVensterTaken, berekenMaandagVanWeek } from '../utils/taskGenerator';
import { getWeekNummer, nuISO } from '../utils/dateUtils';
import kalendersJson from './gewasKalenders.json';

const KALENDERS = kalendersJson as unknown as Record<string, MaandKalender>;

// ============================================
// DE FICTIEVE TUIN: 10 bedden, 1 gewas per bed
// ============================================

interface DemoBedDef {
  bedNummer: string;
  gewas: string;
  zonSchaduw: ZonSchaduw;
}

const DEMO_BEDDEN: DemoBedDef[] = [
  { bedNummer: '1', gewas: 'Tomaten', zonSchaduw: 'Zon' },
  { bedNummer: '2', gewas: 'Courgette', zonSchaduw: 'Zon' },
  { bedNummer: '3', gewas: 'Pompoen', zonSchaduw: 'Zon' },
  { bedNummer: '4', gewas: 'Snijbiet', zonSchaduw: 'Halfschaduw' },
  { bedNummer: '5', gewas: 'Rucola', zonSchaduw: 'Zon' },
  { bedNummer: '6', gewas: 'Veldsla', zonSchaduw: 'Halfschaduw' },
  { bedNummer: '7', gewas: 'Bietjes', zonSchaduw: 'Zon' },
  { bedNummer: '8', gewas: 'Boerenkool', zonSchaduw: 'Zon' },
  { bedNummer: '9', gewas: 'Tuinbonen', zonSchaduw: 'Zon' },
  { bedNummer: '10', gewas: 'Wortel - Zomerwortel', zonSchaduw: 'Zon' },
];

// Oogstinformatie per gewas: in welke maanden (1-12) is er te oogsten,
// en wat is de instructie voor de oogstlijst
interface OogstInfo {
  maanden: number[];
  hoeveelheidPp: string;
  hoeveelheidPp_en: string;
  methode: string;
  methode_en: string;
}

const OOGST_INFO: Record<string, OogstInfo> = {
  'Tomaten': {
    maanden: [7, 8, 9, 10],
    hoeveelheidPp: '4-6 tomaten p.p.',
    hoeveelheidPp_en: '4-6 tomatoes p.p.',
    methode: 'Alleen rijpe (rode) vruchten plukken',
    methode_en: 'Pick only ripe (red) fruits',
  },
  'Courgette': {
    maanden: [6, 7, 8, 9],
    hoeveelheidPp: '1 courgette p.p.',
    hoeveelheidPp_en: '1 courgette p.p.',
    methode: 'Met een mes bij de steel afsnijden',
    methode_en: 'Cut at the stem with a knife',
  },
  'Pompoen': {
    maanden: [9, 10],
    hoeveelheidPp: '1 pompoen per huishouden',
    hoeveelheidPp_en: '1 pumpkin per household',
    methode: 'Met steel afsnijden zodra de schil hard is',
    methode_en: 'Cut with stem once the skin is hard',
  },
  'Snijbiet': {
    maanden: [5, 6, 7, 8, 9, 10],
    hoeveelheidPp: '6 bladeren p.p.',
    hoeveelheidPp_en: '6 leaves p.p.',
    methode: 'Buitenste bladeren afsnijden, het hart laten staan',
    methode_en: 'Cut outer leaves, leave the heart',
  },
  'Rucola': {
    maanden: [4, 5, 6, 7, 8, 9, 10],
    hoeveelheidPp: 'Een handjevol p.p.',
    hoeveelheidPp_en: 'A handful p.p.',
    methode: 'Bladeren knippen, groeipunt laten zitten',
    methode_en: 'Snip leaves, keep the growing point',
  },
  'Veldsla': {
    maanden: [1, 2, 3, 10, 11, 12],
    hoeveelheidPp: '2 plantjes p.p.',
    hoeveelheidPp_en: '2 rosettes p.p.',
    methode: 'Plantjes net boven de grond afsnijden',
    methode_en: 'Cut rosettes just above the soil',
  },
  'Bietjes': {
    maanden: [6, 7, 8, 9, 10],
    hoeveelheidPp: '2 bietjes p.p.',
    hoeveelheidPp_en: '2 beets p.p.',
    methode: 'De grootste bieten eruit trekken',
    methode_en: 'Pull the largest beets',
  },
  'Boerenkool': {
    maanden: [1, 2, 11, 12],
    hoeveelheidPp: '6 bladeren p.p.',
    hoeveelheidPp_en: '6 leaves p.p.',
    methode: 'Onderste bladeren plukken; na de eerste vorst het lekkerst',
    methode_en: 'Pick the lower leaves; tastiest after the first frost',
  },
  'Tuinbonen': {
    maanden: [6, 7],
    hoeveelheidPp: '10 peulen p.p.',
    hoeveelheidPp_en: '10 pods p.p.',
    methode: 'Alleen dikke, gevulde peulen plukken',
    methode_en: 'Pick only plump, filled pods',
  },
  'Wortel - Zomerwortel': {
    maanden: [7, 8, 9, 10],
    hoeveelheidPp: '3 wortels p.p.',
    hoeveelheidPp_en: '3 carrots p.p.',
    methode: 'Uittrekken, de dikste eerst',
    methode_en: 'Pull them out, thickest first',
  },
};

// ============================================
// OPBOUW
// ============================================

function naarMap<T extends { id: string }>(items: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  items.forEach((item) => {
    map[item.id] = item;
  });
  return map;
}

function maakBedden(): Bed[] {
  return DEMO_BEDDEN.map((def) => ({
    id: `A${def.bedNummer}`,
    sectie: 'A' as const,
    bedNummer: def.bedNummer,
    vakken: 1,
    lengte: 6,
    breedte: 1.2,
    grootte: 7.2,
    zonSchaduw: def.zonSchaduw,
    opmerkingen: '',
    planVoorBed: def.gewas,
  }));
}

function maakTeeltplan(jaar: number): TeeltplanItem[] {
  return DEMO_BEDDEN.map((def) => ({
    id: `demo-tp-a${def.bedNummer}`,
    jaar,
    sectie: 'A' as const,
    bed: def.bedNummer,
    bedId: `A${def.bedNummer}`,
    deelVanBed: 'Heel bed',
    gewas: def.gewas,
    teelt: '',
    kalender: KALENDERS[def.gewas],
    opmerkingen: '',
  }));
}

/**
 * Markeer taken van vóór de huidige week grotendeels als afgerond,
 * zodat de demo eruitziet als een tuin die het hele jaar bijgehouden is.
 */
function maakRealistisch(taken: Taak[], huidigeWeek: number, jaar: number): Taak[] {
  let teller = 0;

  return taken.map((taak) => {
    const windowEnd = taak.windowEnd ?? 0;

    if (windowEnd < huidigeWeek) {
      teller++;
      // Laat ongeveer 1 op de 8 verlopen taken open staan (realistisch slordigheidje)
      if (teller % 8 === 0) return taak;

      const afgerondOp = `${berekenMaandagVanWeek(jaar, windowEnd)}T10:00:00.000Z`;
      return {
        ...taak,
        status: 'Afgerond' as const,
        afgerondDoor: teller % 3 === 0 ? 'commissie' : 'Demo',
        afgerondOp,
        gewijzigd: afgerondOp,
        isOverdue: false,
      };
    }

    // Eén actuele taak "in uitvoering" zetten
    if (
      taak.windowStart !== undefined &&
      taak.windowStart <= huidigeWeek &&
      windowEnd >= huidigeWeek &&
      teller === 0
    ) {
      teller++;
      return {
        ...taak,
        status: 'In uitvoering' as const,
        assignedTo: ['Demo'],
        assignedAt: nuISO(),
      };
    }

    return taak;
  });
}

function maakAdHocTaken(nu: Date): Taak[] {
  const vandaag = nu.toISOString().split('T')[0];
  const overTweeDagen = new Date(nu.getTime() + 2 * 86400000).toISOString().split('T')[0];
  const drieDagenTerug = new Date(nu.getTime() - 3 * 86400000).toISOString();

  const basis = {
    isAutomatisch: false,
    isAdHoc: true,
    commentaar: '',
    aangemaakt: drieDagenTerug,
    gewijzigd: drieDagenTerug,
    communityZichtbaar: true,
  };

  return [
    {
      ...basis,
      id: 'demo-adhoc-1',
      beschrijving: 'Slakken weghalen bij de veldsla',
      beschrijving_en: 'Remove slugs from the lamb\'s lettuce',
      sectie: 'A',
      bedId: 'A6',
      type: 'Onderhoud',
      prioriteit: 'Hoog',
      status: 'Open',
      deadline: vandaag,
      adHocProbleem: 'Slakken',
    },
    {
      ...basis,
      id: 'demo-adhoc-2',
      beschrijving: 'Water geven bij droog weer',
      beschrijving_en: 'Water the beds in dry weather',
      sectie: 'A',
      bedId: '',
      type: 'Onderhoud',
      prioriteit: 'Normaal',
      status: 'Open',
      deadline: overTweeDagen,
      adHocProbleem: 'Water geven',
    },
    {
      ...basis,
      id: 'demo-adhoc-3',
      beschrijving: 'Onkruid wieden langs het pad',
      beschrijving_en: 'Weed along the path',
      sectie: 'A',
      bedId: '',
      type: 'Onderhoud',
      prioriteit: 'Laag',
      status: 'Afgerond',
      deadline: vandaag,
      adHocProbleem: 'Onkruid',
      afgerondDoor: 'Demo',
      afgerondOp: drieDagenTerug,
    },
  ];
}

function maakOogstlijst(nu: Date, huidigeWeek: number, jaar: number): OogstItem[] {
  const maand = nu.getMonth() + 1;
  const items: OogstItem[] = [];

  for (const def of DEMO_BEDDEN) {
    const info = OOGST_INFO[def.gewas];
    if (!info || !info.maanden.includes(maand)) continue;

    items.push({
      id: `demo-oogst-a${def.bedNummer}`,
      gewas: def.gewas,
      categorie: 'Groenten',
      hoeveelheidPp: info.hoeveelheidPp,
      hoeveelheidPp_en: info.hoeveelheidPp_en,
      locatiePrimair: `Bed A${def.bedNummer}`,
      oogstmethode: info.methode,
      oogstmethode_en: info.methode_en,
      status: 'Beschikbaar',
      leegOogsten: false,
      weekNummer: huidigeWeek,
      jaar,
      aangemaakt: nuISO(),
      aangemaaktDoor: 'commissie',
    });
  }

  return items;
}

function maakOogstRegistraties(oogstlijst: OogstItem[], nu: Date): OogstRegistratie[] {
  const gisteren = new Date(nu.getTime() - 86400000).toISOString();
  return oogstlijst.slice(0, 2).map((item, i) => ({
    id: `demo-reg-${i + 1}`,
    oogstItemId: item.id,
    gebruiker: 'Demo',
    timestamp: gisteren,
  }));
}

function maakSignaleringen(nu: Date): Signalering[] {
  const eergisteren = new Date(nu.getTime() - 2 * 86400000).toISOString();
  return [
    {
      id: 'demo-sig-1',
      type: 'compliment',
      bericht: 'De tuin ligt er prachtig bij, complimenten aan iedereen die meehelpt!',
      bericht_en: 'The garden looks wonderful, compliments to everyone helping out!',
      sectie: 'A',
      afzender: 'Demo',
      aangemaakt: eergisteren,
      status: 'gezien',
      reactie: 'Dank je wel! Leuk om te horen.',
      reactie_en: 'Thank you! Great to hear.',
      reactieDoor: 'commissie',
      reactieDatum: nuISO(),
    },
  ];
}

// ============================================
// PUBLIEKE API
// ============================================

/**
 * Bouw de volledige fictieve dataset (zonder de gewassen-encyclopedie,
 * die apart uit /demo-gewassen.json wordt geladen).
 */
export function bouwDemoData(nu: Date = new Date()): Record<string, unknown> {
  const jaar = nu.getFullYear();
  const huidigeWeek = getWeekNummer(nu);

  const bedden = maakBedden();
  const teeltplan = maakTeeltplan(jaar);

  const gegenereerd = genereerVensterTaken(teeltplan, [], nu);
  const taken = [...maakRealistisch(gegenereerd, huidigeWeek, jaar), ...maakAdHocTaken(nu)];

  const oogstlijst = maakOogstlijst(nu, huidigeWeek, jaar);

  return {
    bedden: naarMap(bedden),
    teeltplan: naarMap(teeltplan),
    taken: naarMap(taken),
    oogstlijst: naarMap(oogstlijst),
    oogstRegistraties: naarMap(maakOogstRegistraties(oogstlijst, nu)),
    signaleringen: naarMap(maakSignaleringen(nu)),
    metadata: { versie: 'demo-fictief', aangemaakt: nuISO() },
  };
}
