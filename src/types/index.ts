// ============================================
// BASISTYPEN
// ============================================

export type Sectie = 'A' | 'B' | 'C' | 'D' | 'E' | 'Kas';

export type ZonSchaduw = 'Zon' | 'Halfschaduw' | 'Schaduw' | '';

export type MaandPeriode = 'B' | 'M' | 'E'; // Begin, Midden, Eind

export type Maand = 'Jan' | 'Feb' | 'Mrt' | 'Apr' | 'Mei' | 'Jun' |
                    'Jul' | 'Aug' | 'Sep' | 'Okt' | 'Nov' | 'Dec';

// Teeltcodes uit de CSV
export type TeeltCode =
  | 'kz'   // kas zaaien
  | 'bz'   // buiten zaaien
  | 'kvz'  // kas voorzaaien (kluitjes)
  | 'ku'   // kas uitplanten
  | 'bu'   // buiten uitplanten
  | 'bvz'  // buiten voorzaaien (kluitjes)
  | 'bi'   // binnen voorzaaien (thuis)
  | 'o'    // oogst
  | 'x'    // buiten zaaien (actief)
  | '';

export type TaakType =
  | 'Zaaien'
  | 'Planten'
  | 'Oogsten'
  | 'Onderhoud'
  | 'Overig';

export type TaakPrioriteit = 'Hoog' | 'Normaal' | 'Laag';

export type TaakStatus = 'Open' | 'In uitvoering' | 'Afgerond' | 'Gearchiveerd';

export type AdHocProbleem =
  | 'Slakken'
  | 'Woelmuizen'
  | 'Onkruid'
  | 'Water geven'
  | 'Oogstrijp'
  | 'Overig';

// ============================================
// DATA MODELS - CSV IMPORT
// ============================================

export interface Bed {
  id: string;           // Bijv. "A1", "B3"
  sectie: Sectie;
  bedNummer: string;    // Bijv. "1", "2", "3"
  vakken?: number;
  lengte?: number;      // in meters
  breedte?: number;     // in meters
  grootte?: number;     // in m2
  zonSchaduw: ZonSchaduw;
  opmerkingen: string;
  planVoorBed: string;
}

export interface MaandKalender {
  jan: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  feb: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  mrt: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  apr: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  mei: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  jun: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  jul: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  aug: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  sep: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  okt: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  nov: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
  dec: { b: TeeltCode; m: TeeltCode; e: TeeltCode };
}

export interface Gewas {
  id: string;
  gewas: string;
  variant: string;
  teeltgroep: string;
  zaaiperiode: string;
  oogstperiode: string;
  bijzonderheden: string;
  kalender: MaandKalender;        // Zaaikalender (Zaai Jan B, etc.)
  oogstKalender?: MaandKalender;  // Oogstkalender (Oogst Jan B, etc.)
}

export interface TeeltplanItem {
  id: string;
  jaar: number;
  sectie: Sectie;
  bed: string;          // Bijv. "1", "2"
  bedId: string;        // Bijv. "A1", "B3"
  deelVanBed: string;   // Bijv. "Noord", "Zuid", "Heel bed"
  gewas: string;        // Groepsnaam, bijv. "Snijbiet"
  gewasSoort?: string;  // Variant, bijv. "Snijbiet - Fireworks"
  teelt: string;
  kalender: MaandKalender;
  opmerkingen: string;
  oppervlakte?: number; // Oppervlakte in m² (Opp_gewas uit CSV)
}

// ============================================
// TAAK MODEL
// ============================================

export interface Taak {
  id: string;
  beschrijving: string;
  beschrijving_en?: string;  // Engelse vertaling
  sectie: Sectie | '';
  bedId: string;        // Optioneel, bijv. "A1"
  bedIds?: string[];    // Voor multi-select bedden (Snelle Taak)
  type: TaakType;
  prioriteit: TaakPrioriteit;
  status: TaakStatus;
  deadline: string;     // ISO date string
  startdatum?: string;  // ISO date: vanaf wanneer taak zichtbaar is in weekoverzicht

  // Metadata
  aangemaakt: string;   // ISO datetime string
  gewijzigd: string;    // ISO datetime string

  // Automatisch gegenereerd of handmatig
  isAutomatisch: boolean;
  bronGewas?: string;   // Als automatisch: welk gewas (groepsnaam)
  bronGewasSoort?: string; // Als automatisch: welke variant (bijv. "Snijbiet - Fireworks")
  bronTeeltCode?: TeeltCode; // Als automatisch: welke actie

  // Venster-taken velden (voor automatische taken uit teeltplan)
  windowStart?: number;     // Eerste week waarin actie mag (soft deadline)
  windowEnd?: number;       // Laatste week waarin actie mag (harde deadline)
  scheduledWeek?: number;   // Geplande week, verschuifbaar door commissie
  locatie?: 'kas' | 'buiten' | 'onbekend'; // Waar de actie plaatsvindt
  isOverdue?: boolean;      // True als windowEnd is gepasseerd
  jaar?: number;            // Teeltjaar (voor duplicate check)
  deelVanBed?: string;      // "Heel bed", "1e helft", etc.

  // Commissie instructies (alleen bewerkbaar door commissie)
  instructies?: string;   // URL's, video's, extra uitleg van commissie
  instructies_en?: string; // Engelse vertaling

  // Commentaar/notities van commissie
  commentaar: string;
  commentaar_en?: string;  // Engelse vertaling

  // Community notities (apart van commissie commentaar)
  communityNotities?: TaakNotitie[];

  // Ad-hoc specifiek
  isAdHoc: boolean;
  adHocProbleem?: AdHocProbleem;
  fotoUrl?: string;     // Legacy: enkele foto (backward compat)
  fotoUrls?: string[];  // Meerdere foto's (max 10), base64 of URL

  // Community zichtbaarheid (voor doorposten)
  communityZichtbaar?: boolean; // true = zichtbaar voor community, false/undefined = alleen commissie

  // Bezig met taak info (wie werkt eraan) - meerdere mensen kunnen bezig zijn
  assignedTo?: string[];    // Namen van wie bezig zijn met de taak
  assignedAt?: string;      // ISO datetime wanneer eerste persoon startte

  // Afronding info (wie heeft het gedaan)
  afgerondDoor?: string;    // Naam van wie het heeft afgerond
  afgerondOp?: string;      // ISO datetime wanneer afgerond

  // Archivering info
  archivedAt?: string;      // ISO datetime wanneer gearchiveerd
  archivedBy?: string;      // Naam van wie archiveerde

  // Herhaling (wekelijks terugkerende taken)
  isHerhalend?: boolean;              // true = wekelijks herhalende taak
  einddatumHerhaling?: string;        // ISO date: einddatum herhaling
  afgevinktWeeks?: number[];          // Weken waarin afgevinkt (formaat: JJJJWW, bijv. 202608)

  // Auto-escalatie tracking (bij verlopen deadline)
  isAutoEscalated?: boolean;          // true = prioriteit was auto-verhoogd naar Hoog
  origPrioriteit?: TaakPrioriteit;    // Originele prioriteit vóór escalatie
}

// Community notitie bij een taak
export interface TaakNotitie {
  id: string;
  tekst: string;
  auteur: string;       // Naam van community member
  aangemaakt: string;   // ISO datetime
}

// ============================================
// APP STATE
// ============================================

export interface AppData {
  bedden: Bed[];
  gewassen: Gewas[];
  verrijkteGewassen: VerrijktGewas[];   // Gewassen Encyclopedie data
  gewassenlijst: GewassenlijstItem[];   // Zaad/opbrengst/links per variant
  teeltplan: TeeltplanItem[];
  taken: Taak[];
  oogstlijst: OogstItem[];
  oogstRegistraties: OogstRegistratie[];
  oogstInstructies: OogstInstructie[];  // Legacy - wordt vervangen door instructies
  instructies: Instructie[];            // Nieuwe instructies
  signaleringen: Signalering[];
  bedVoortgang: BedVoortgang[];
  taakgroepOverrides: TaakgroepOverride[];
  laatsteSync: string;  // ISO datetime
  versie: string;
}

// ============================================
// EXPORT/IMPORT
// ============================================

export interface ExportData {
  versie: string;
  exportDatum: string;
  taken: Taak[];
  checksum: string;     // Voor conflictdetectie
}

export interface ImportConflict {
  taakId: string;
  lokaleVersie: Taak;
  importVersie: Taak;
  type: 'gewijzigd' | 'verwijderd_lokaal' | 'verwijderd_import';
}

// ============================================
// UI STATE
// ============================================

export type TaakBron = 'teeltplan' | 'commissie';

// Venster-taken: een aaneengesloten periode waarin een actie uitgevoerd mag worden
export interface TeeltVenster {
  code: TeeltCode;
  windowStart: number;  // Eerste week
  windowEnd: number;    // Laatste week
}

// Filter opties voor venster-taken
export type VensterFilter = 'Alle' | 'gepland-deze-week' | 'deadline-deze-week' | 'verlopen' | 'komende-2-weken';

export interface FilterOpties {
  taakType: TaakType | 'Alle';
  prioriteit: TaakPrioriteit | 'Alle' | 'Urgent';  // 'Urgent' = dynamisch berekende hoge prioriteit, excl. afgerond
  status: TaakStatus | 'Alle' | 'Archief';
  sectie: Sectie | 'Alle';
  gewas: string | 'Alle';
  bron: TaakBron | 'Alle';
  venster: VensterFilter;  // Filter op venster-taken
}

export interface SorteerOpties {
  veld: 'deadline' | 'prioriteit' | 'aangemaakt' | 'vensterDeadline';
  richting: 'asc' | 'desc';
}

export type NavigatieTab =
  | 'dashboard'
  | 'taken'
  | 'teeltplantaken'     // Aparte tab voor automatische teeltplan taken (commissie)
  | 'weekoverzicht'
  | 'oogstlijst'
  | 'gewassen'           // Gewassen Encyclopedie
  | 'instructies'        // Nieuw: vervangt 'oogstinstructies'
  | 'oogstinstructies'   // Legacy: voor backwards compatibility
  | 'signaleringen'
  | 'handleiding'
  | 'beheer'             // Gecombineerde Beheer & Instellingen pagina
  | 'importeren'         // Legacy: voor backwards compatibility
  | 'plattegronden'      // Plattegronden van tuin en bedden
  | 'instellingen';      // Legacy: voor backwards compatibility

export interface ToastBericht {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  bericht: string;
  duur?: number; // ms
}

// ============================================
// HULPFUNCTIES TYPES
// ============================================

export interface WeekInfo {
  weekNummer: number;
  jaar: number;
  maand: Maand;
  periode: MaandPeriode;
  startDatum: Date;
  eindDatum: Date;
}

export interface BedStatus {
  bedId: string;
  gewassen: string[];
  heeftTaken: boolean;
  aantalOpenTaken: number;
  heeftUrgenteTaken: boolean;
}

// Teeltcode naar actie mapping (NL)
export const TEELTCODE_ACTIES: Record<TeeltCode, string> = {
  'bi': 'Binnen voorzaaien (thuis)',
  'bvz': 'Buiten voorzaaien (kluitjes)',
  'kvz': 'Kas voorzaaien (kluitjes)',
  'bu': 'Buiten uitplanten',
  'ku': 'Kas uitplanten',
  'bz': 'Buiten zaaien',
  'kz': 'Kas zaaien',
  'x': 'Buiten zaaien',
  'o': 'Oogsten',
  '': ''
};

// Teeltcode naar actie mapping (EN)
export const TEELTCODE_ACTIES_EN: Record<TeeltCode, string> = {
  'bi': 'Indoor pre-sowing (at home)',
  'bvz': 'Outdoor pre-sowing (plugs)',
  'kvz': 'Greenhouse pre-sowing (plugs)',
  'bu': 'Outdoor transplanting',
  'ku': 'Greenhouse transplanting',
  'bz': 'Outdoor sowing',
  'kz': 'Greenhouse sowing',
  'x': 'Outdoor sowing',
  'o': 'Harvesting',
  '': ''
};

export const TEELTCODE_TAAKTYPE: Record<TeeltCode, TaakType> = {
  'bi': 'Zaaien',
  'bvz': 'Zaaien',
  'kvz': 'Zaaien',
  'ku': 'Planten',
  'bu': 'Planten',
  'bz': 'Zaaien',
  'kz': 'Zaaien',
  'x': 'Zaaien',
  'o': 'Oogsten',
  '': 'Overig'
};

export const SECTIES: Sectie[] = ['A', 'B', 'C', 'D', 'E', 'Kas'];

export const ADHOC_PROBLEMEN: AdHocProbleem[] = [
  'Slakken',
  'Woelmuizen',
  'Onkruid',
  'Water geven',
  'Oogstrijp',
  'Overig'
];

// ============================================
// GEBRUIKERSROLLEN
// ============================================

export type GebruikersRol = 'community' | 'commissie';

// ============================================
// OOGSTLIJST
// ============================================

export type OogstStatus = 'Beschikbaar' | 'Controleren' | 'Op' | 'Gereserveerd';
export type OogstCategorie = 'Groenten' | 'Kruiden' | 'Eetbare bloemen';

export interface OogstItem {
  id: string;
  gewas: string;
  categorie: OogstCategorie;
  hoeveelheidPp: string;      // Bijv. "6 bladeren", "1 plantje", "2 per persoon"
  hoeveelheidPp_en?: string;  // Engelse vertaling
  locatiePrimair: string;     // Eerste locatie om te oogsten
  locatieSecundair?: string;  // Tweede locatie
  locatieTertiair?: string;   // Derde locatie
  oogstmethode: string;       // Bijv. "Onderste blad oogsten"
  oogstmethode_en?: string;   // Engelse vertaling
  bijzonderheden?: string;    // Extra info
  bijzonderheden_en?: string; // Engelse vertaling
  status: OogstStatus;
  leegOogsten: boolean;       // Mag/moet helemaal leeg geoogst worden
  keuzeGroep?: string;        // Voor keuze-opties (bijv. "keuze-kruiden-1")

  // Week info
  weekNummer: number;
  jaar: number;

  // Metadata
  aangemaakt: string;         // ISO datetime
  aangemaaktDoor: string;     // Wie heeft toegevoegd

  // Foto
  fotoUrl?: string;           // URL naar foto in Firebase Storage
}

export interface OogstRegistratie {
  id: string;
  oogstItemId: string;
  gebruiker: string;
  timestamp: string;          // ISO datetime
  hoeveelheid?: string;       // Optioneel: hoeveel daadwerkelijk geoogst
  deleted?: boolean;          // Soft delete flag (true = ongedaan gemaakt)
  deletedAt?: string;         // ISO datetime wanneer ongedaan gemaakt
}

export interface OogstWeek {
  week: number;
  jaar: number;
  startDatum: string;         // ISO date
  eindDatum: string;          // ISO date
  volgendeOogst?: string;     // Tekst zoals "Week 4 (20-24 januari)"
}

// ============================================
// OOGST INSTRUCTIES (legacy, wordt vervangen door Instructie)
// ============================================

export interface OogstInstructie {
  id: string;
  gewas: string;              // Bijv. "Sla", "Tomaat"
  categorie: OogstCategorie;  // Groenten, Kruiden of Eetbare bloemen
  titel: string;              // Korte titel
  titel_en?: string;          // Engelse vertaling
  instructie: string;         // Uitgebreide instructie tekst
  instructie_en?: string;     // Engelse vertaling
  tips?: string;              // Extra tips
  tips_en?: string;           // Engelse vertaling
  videoUrl?: string;          // Link naar video
  afbeeldingUrl?: string;     // Link naar afbeelding

  // Metadata
  aangemaakt: string;         // ISO datetime
  aangemaaktDoor: string;     // Commissielid
  gewijzigd: string;          // ISO datetime
}

// ============================================
// INSTRUCTIES / WERKWIJZEN (nieuw uitgebreid type)
// ============================================

// Hoofdcategorieën voor instructies
export type InstructieHoofdcategorie = 'gewassen' | 'tuinonderhoud' | 'praktisch' | 'onkruid';

// Seizoenen
export type Seizoen = 'lente' | 'zomer' | 'herfst' | 'winter';

// Subcategorieën per hoofdcategorie
export interface InstructieSubcategorie {
  id: string;
  label: string;
  label_en: string;
  icon: string;
}

export const INSTRUCTIE_SUBCATEGORIEEN: Record<InstructieHoofdcategorie, InstructieSubcategorie[]> = {
  gewassen: [
    { id: 'oogsten', label: 'Oogsten', label_en: 'Harvesting', icon: '✂️' },
    { id: 'zaaien', label: 'Zaaien & Planten', label_en: 'Sowing & Planting', icon: '🌱' },
    { id: 'verzorgen', label: 'Verzorgen', label_en: 'Care', icon: '💧' },
    { id: 'verwerken', label: 'Verwerken & Recepten', label_en: 'Processing & Recipes', icon: '🍳' },
    { id: 'bewaren', label: 'Bewaren', label_en: 'Storage', icon: '🫙' }
  ],
  tuinonderhoud: [
    { id: 'bodem', label: 'Bodem & Mulchen', label_en: 'Soil & Mulching', icon: '🪴' },
    { id: 'water', label: 'Water & Irrigatie', label_en: 'Water & Irrigation', icon: '💧' },
    { id: 'onkruid', label: 'Onkruid & Plagen', label_en: 'Weeds & Pests', icon: '🐛' },
    { id: 'seizoen', label: 'Seizoenswerk', label_en: 'Seasonal Work', icon: '🍂' },
    { id: 'gereedschap', label: 'Gereedschap', label_en: 'Tools', icon: '🔧' }
  ],
  praktisch: [
    { id: 'locaties', label: 'Locaties & Sleutels', label_en: 'Locations & Keys', icon: '🔑' },
    { id: 'regels', label: 'Regels & Afspraken', label_en: 'Rules & Agreements', icon: '📋' },
    { id: 'apparatuur', label: 'Apparatuur', label_en: 'Equipment', icon: '⚙️' }
  ],
  onkruid: [
    { id: 'herkennen', label: 'Herkennen', label_en: 'Identification', icon: '🌼' },
    { id: 'bestrijden', label: 'Bestrijden', label_en: 'Removal', icon: '✂️' },
    { id: 'voorkomen', label: 'Voorkomen', label_en: 'Prevention', icon: '🛡️' },
    { id: 'nuttig', label: 'Nuttig onkruid', label_en: 'Useful weeds', icon: '🐝' }
  ]
};

// Labels voor hoofdcategorieën
export const HOOFDCATEGORIE_LABELS: Record<InstructieHoofdcategorie, { label: string; label_en: string; icon: string }> = {
  gewassen: { label: 'Gewassen', label_en: 'Crops', icon: '🌱' },
  tuinonderhoud: { label: 'Tuinonderhoud', label_en: 'Garden Maintenance', icon: '🔧' },
  praktisch: { label: 'Praktisch', label_en: 'Practical', icon: '📍' },
  onkruid: { label: 'Onkruid', label_en: 'Weeds', icon: '🌿' }
};

export interface Instructie {
  id: string;

  // Categorisering
  hoofdcategorie: InstructieHoofdcategorie;
  subcategorie: string;       // ID van subcategorie

  // Koppeling (voor gewassen)
  gewasId?: string;           // ID van gewas in teeltplan
  gewasNaam?: string;         // Naam van gewas (voor weergave)

  // Inhoud
  titel: string;
  titel_en?: string;
  instructie: string;
  instructie_en?: string;
  tips?: string;
  tips_en?: string;

  // Media
  link?: string;              // URL naar video of website
  fotos?: string[];           // URLs naar foto's in Firebase Storage (max 3)

  // Meta
  seizoen?: Seizoen[];        // Wanneer relevant
  tags?: string[];            // Extra zoektermen

  // Timestamps
  aangemaakt: string;         // ISO datetime
  aangemaaktDoor: string;     // Commissielid
  gewijzigd: string;          // ISO datetime
}

// Helper functie om subcategorie label te krijgen
export function getSubcategorieLabel(hoofdcategorie: InstructieHoofdcategorie, subcategorieId: string, taal: 'nl' | 'en'): string {
  const subcats = INSTRUCTIE_SUBCATEGORIEEN[hoofdcategorie];
  const subcat = subcats.find(s => s.id === subcategorieId);
  if (!subcat) return subcategorieId;
  return taal === 'nl' ? subcat.label : subcat.label_en;
}

// Helper functie om subcategorie icon te krijgen
export function getSubcategorieIcon(hoofdcategorie: InstructieHoofdcategorie, subcategorieId: string): string {
  const subcats = INSTRUCTIE_SUBCATEGORIEEN[hoofdcategorie];
  const subcat = subcats.find(s => s.id === subcategorieId);
  return subcat?.icon || '📄';
}

// Helper functie om instructie te zoeken op gewas
export function zoekInstructieVoorGewas(
  instructies: Instructie[],
  gewasNaam: string,
  subcategorie?: string
): Instructie | undefined {
  const normalizedGewas = gewasNaam.toLowerCase().trim();
  return instructies.find(i =>
    i.hoofdcategorie === 'gewassen' &&
    i.gewasNaam?.toLowerCase().trim() === normalizedGewas &&
    (subcategorie ? i.subcategorie === subcategorie : true)
  );
}

// Helper functie om te controleren of een gewas instructies heeft
export function heeftInstructie(
  instructies: Instructie[],
  gewasNaam: string,
  subcategorie?: string
): boolean {
  return zoekInstructieVoorGewas(instructies, gewasNaam, subcategorie) !== undefined;
}

// Helper functie om alle instructies voor een gewas te krijgen
export function getInstructiesVoorGewas(
  instructies: Instructie[],
  gewasNaam: string
): Instructie[] {
  const normalizedGewas = gewasNaam.toLowerCase().trim();
  return instructies.filter(i =>
    i.hoofdcategorie === 'gewassen' &&
    i.gewasNaam?.toLowerCase().trim() === normalizedGewas
  );
}

// Helper functie om instructies te filteren op tags
export function zoekInstructiesOpTag(
  instructies: Instructie[],
  tag: string
): Instructie[] {
  const normalizedTag = tag.toLowerCase().trim();
  return instructies.filter(i =>
    i.tags?.some(t => t.toLowerCase().includes(normalizedTag))
  );
}

// Helper functie om instructies te filteren op seizoen
export function getInstructiesVoorSeizoen(
  instructies: Instructie[],
  seizoen: Seizoen
): Instructie[] {
  return instructies.filter(i =>
    !i.seizoen || i.seizoen.length === 0 || i.seizoen.includes(seizoen)
  );
}

// Legacy type voor backwards compatibility
export type InstructieCategorie =
  | 'Oogsten'
  | 'Zaaien'
  | 'Planten'
  | 'Technieken'
  | 'Onderhoud'
  | 'Overig';

export const INSTRUCTIE_CATEGORIEEN: InstructieCategorie[] = [
  'Oogsten',
  'Zaaien',
  'Planten',
  'Technieken',
  'Onderhoud',
  'Overig'
];

// ============================================
// SIGNALERINGEN / BERICHTEN
// ============================================

export type SignaleringType =
  | 'probleem'      // Iets mis in de tuin
  | 'vraag'         // Vraag aan commissie
  | 'suggestie'     // Idee of suggestie
  | 'compliment';   // Positieve feedback

export type SignaleringStatus = 'nieuw' | 'gezien' | 'afgehandeld';

export interface Signalering {
  id: string;
  type: SignaleringType;
  bericht: string;
  bericht_en?: string;     // Engelse vertaling
  sectie?: Sectie | '';
  bedId?: string;
  afzender: string;        // Naam van de melder
  aangemaakt: string;      // ISO datetime
  status: SignaleringStatus;
  reactie?: string;        // Reactie van commissie
  reactie_en?: string;     // Engelse vertaling
  reactieDoor?: string;    // Wie heeft gereageerd
  reactieDatum?: string;   // Wanneer gereageerd
}

// ============================================
// UITGEBREIDE TAAK (met afvinker)
// ============================================

export interface TaakAfronding {
  afgerondDoor: string;    // Naam van wie het heeft gedaan
  afgerondOp: string;      // ISO datetime
}

// ============================================
// BED VOORTGANG (voor teeltplan taken per bed)
// ============================================

export type BedVoortgangStatus = 'beschikbaar' | 'uitgesteld' | 'vervroegd' | 'afgerond' | 'automatisch_doorgeschoven';

export interface BedVoortgang {
  id: string;                    // Unieke ID
  bedId: string;                 // Bijv. "A1"
  gewas: string;                 // Naam van gewas
  actie: string;                 // Bijv. "Kas zaaien"
  code: TeeltCode;               // Teeltcode

  // Week planning
  oorspronkelijkeWeek: number;   // Week uit teeltplan (periode)
  oorspronkelijkJaar: number;    // Jaar uit teeltplan
  geplandWeek: number;           // Wanneer daadwerkelijk gepland
  geplandJaar: number;           // Jaar van planning

  // Status
  status: BedVoortgangStatus;    // gepland, uitgesteld, afgerond

  // Afronding
  afgerondDoor?: string;         // Naam van wie het heeft gedaan
  afgerondOp?: string;           // ISO datetime

  // Metadata
  aangemaakt: string;            // ISO datetime
  gewijzigd: string;             // ISO datetime
}

// ============================================
// TAAKGROEP OVERRIDES (commissie aanpassingen op groepsniveau)
// ============================================

export interface TaakgroepOverride {
  id: string;                  // Format: "${groepKey}-${jaar}" bijv. "kz-Raapstelen-2026"
  groepKey: string;            // Matcht ${teeltCode}-${gewas} uit WeekOverzicht groepering
  customTitel?: string;        // NL titel override
  customTitel_en?: string;     // EN titel override
  notitie?: string;            // NL notitie
  notitie_en?: string;         // EN notitie
  aantalItems?: number;        // Override voor "X items te doen" (kluitjes/trays) als afwijkend van aantal bedden
  jaar: number;                // Jaarscoping
  gewijzigdDoor: string;       // Wie de override heeft gemaakt
  gewijzigdOp: string;         // ISO timestamp
}

// ============================================
// UITGEBREIDE APP DATA
// ============================================

export interface AppDataUitgebreid extends AppData {
  oogstlijst: OogstItem[];
  signaleringen: Signalering[];
  bedVoortgang: BedVoortgang[];
}

// ============================================
// IMPORT LOG
// ============================================

export type ImportLogActie = 'toegevoegd' | 'overgeslagen' | 'fout';
export type ImportLogType = 'bedden' | 'gewassen' | 'teeltplan' | 'oogstlijst' | 'taken' | 'instructies' | 'gewassenlijst';

export interface ImportLogEntry {
  id: string;
  actie: ImportLogActie;
  itemId: string;              // ID van het item
  itemBeschrijving: string;    // Bijv. "Bed A1" of "Gewas Tomaat"
  reden?: string;              // Waarom overgeslagen of fout
}

export interface ImportLog {
  id: string;
  type: ImportLogType;
  timestamp: string;           // ISO datetime
  bestandsnaam: string;
  gebruiker: string;
  totaalInBestand: number;     // Aantal items in import bestand
  toegevoegd: number;          // Aantal nieuw toegevoegd
  overgeslagen: number;        // Aantal al bestaand (duplicaten)
  fouten: number;              // Aantal met fouten
  entries: ImportLogEntry[];   // Gedetailleerde log per item
}

// ============================================
// VERRIJKT GEWAS (uit Firebase /gewassen)
// ============================================

export interface VerrijktGewas {
  id: string;
  naam: string;
  naam_en?: string;
  teeltgroep: string;
  beschrijving?: string;
  beschrijving_en?: string;
  moeilijkheidsgraad?: string;
  moeilijkheidsgraad_en?: string;
  zoekNamen?: string[];

  // Platte Firebase velden (direct op root niveau)
  teelt_moeilijkheid?: string;        // Alternatief voor moeilijkheidsgraad
  teelt_moeilijkheid_en?: string;     // Engelse vertaling
  smaak_profiel?: string;             // Platte versie van smaak
  smaak_profiel_en?: string;          // Engelse vertaling
  bereidingstips?: string;            // Platte versie van bereidingswijzen
  bereidingstips_en?: string;         // Engelse vertaling
  veelgemaakte_fouten?: string[];     // Platte versie (array)
  veelgemaakte_fouten_en?: string[];  // Engelse vertaling (array)
  praktische_tips?: string[];         // Platte versie (array)
  praktische_tips_en?: string[];      // Engelse vertaling (array)

  smaak_en_bereiding?: {
    smaak?: string;
    smaak_en?: string;
    eetbare_delen?: string[];
    bereidingswijzen?: string[];
    voedingswaarde?: string;
    voedingswaarde_en?: string;
  };

  groeiomstandigheden?: {
    standplaats?: string;
    standplaats_en?: string;
    bodem?: string;
    bodem_en?: string;
    grondsoort?: string;
    grondsoort_en?: string;
    pH?: string;
    voeding?: string;
    voeding_en?: string;
    water?: string;
    water_en?: string;
    water_behoefte?: string;
    water_behoefte_en?: string;
    temperatuur?: string;
    temperatuur_en?: string;
  };

  zaaien_en_kiemen?: {
    zaaiperiode?: string;
    zaaiperiode_en?: string;
    zaaimethode?: string;
    zaaimethode_en?: string;
    zaaiafstand?: string;
    zaai_diepte?: string;
    kiemtemperatuur?: string;
    kiemtemperatuur_min?: number;
    kiemtemperatuur_optimaal?: number;
    kiemduur?: string;
    kiemduur_en?: string;
    koudekiemer?: boolean;
    lichtkiem?: boolean;
    voorzaaien_nodig?: boolean;
    voorzaaien_tips?: string;
    voorzaaien_tips_en?: string;
    zaaiadvies?: string;
    zaaiadvies_en?: string;
  };

  vorst_en_seizoen?: {
    vorstgevoeligheid?: string;
    vorstgevoeligheid_en?: string;
    vorstgevoelig?: boolean;
    vorst_tolerantie?: string;
    vorst_tolerantie_en?: string;
    minimumtemperatuur?: string;
    optimale_temperatuur?: string;
    teeltduur?: string;
    teeltduur_en?: string;
    oogsten_voor_vorst?: boolean;
    vorst_verbetert_smaak?: boolean;
    overwinterbaar?: boolean;
    seizoen_tips?: string;
    seizoen_tips_en?: string;
  };

  permacultuur?: {
    goede_buren?: string[];
    goede_buren_en?: string[];
    slechte_buren?: string[];
    slechte_buren_en?: string[];
    goede_voorteelt?: string[];
    goede_voorteelt_en?: string[];
    goede_nateelt?: string[];
    goede_nateelt_en?: string[];
    gewasrotatie?: string;
    gewasrotatie_en?: string;
    gewasrotatie_groep?: string;
    gewasrotatie_groep_en?: string;
    gewasrotatie_jaren?: string;
    gewasrotatie_jaren_en?: string;
    functies?: string[];
    functies_en?: string[];
    functies_in_tuin?: string[];
    functies_in_tuin_en?: string[];
    gevoeligheden?: string[];
    gevoeligheden_en?: string[];
  };

  ziektes_en_plagen?: {
    veelvoorkomend?: (string | { naam?: string; name?: string; symptomen?: string; preventie?: string })[];
    symptomen?: string;
    symptomen_en?: string;
    preventie?: string;
    preventie_en?: string;
    bestrijding?: string;
    bestrijding_en?: string;
    bestrijding_biologisch?: string;
    bestrijding_biologisch_en?: string;
    resistentie_tips?: string;
    resistentie_tips_en?: string;
  };

  oogst_en_bewaren?: {
    oogstperiode?: string;
    oogstperiode_en?: string;
    oogstmethode?: string;
    oogstmethode_en?: string;
    oogst_indicatie?: string;
    oogst_indicatie_en?: string;
    dooroogsten_mogelijk?: boolean;
    bewaartijd?: string;
    bewaartijd_en?: string;
    houdbaarheid_vers?: string;
    houdbaarheid_vers_en?: string;
    bewaarwijze?: string;
    bewaarwijze_en?: string;
    bewaar_methode?: string;
    bewaar_methode_en?: string;
    conserveren?: string;
    conserveren_en?: string;
  };

  zaad_en_vermeerdering?: {
    zaadwinning?: string;
    zaadwinning_en?: string;
    kiemkracht?: string;
    kiemkracht_en?: string;
    zaad_winnen_mogelijk?: boolean;
    zaad_winnen_moeilijkheid?: string;
    zaad_winnen_moeilijkheid_en?: string;
    zaad_winnen_tips?: string;
    zaad_winnen_tips_en?: string;
    zelfbestuivend?: boolean;
    kruisbestuiving_risico?: string;
    kruisbestuiving_risico_en?: string;
    andere_vermeerdering?: string;
    andere_vermeerdering_en?: string;
  };

  tips_voor_beginners?: {
    veelgemaakte_fouten?: string[];
    veelgemaakte_fouten_en?: string[];
    praktische_tips?: string[];
    praktische_tips_en?: string[];
  };

  varianten?: Array<{
    naam: string;
    beschrijving?: string;
    beschrijving_en?: string;
    // Teeltkalender data
    voorzaaien_start?: string;
    voorzaaien_eind?: string;
    zaaien_start?: string;
    zaaien_eind?: string;
    planten_start?: string;
    planten_eind?: string;
    oogst_start?: string;
    oogst_eind?: string;
  }>;

  bronnen?: Array<{
    naam: string;
    url: string;
    samenvatting?: string;
    samenvatting_en?: string;
  }>;

  verrijkt_op?: string;

  // Oogst video URL (YouTube)
  oogst_video_url?: string;
  oogst_video_url_en?: string;
}

// ============================================
// GEWASSENLIJST (zaad, opbrengst, links per variant)
// ============================================

export interface GewassenlijstItem {
  id: string;              // Slug van gewasSoort
  gewasSoort: string;      // Bijv. "Snijbiet - Fireworks"
  gewas: string;           // Groepsnaam, bijv. "Snijbiet"
  cropEnglish?: string;    // Engelse naam, bijv. "Swiss chard"
  variant?: string;        // Variant naam, bijv. "Fireworks"
  teeltgroep?: string;     // Bijv. "Bladgewassen"
  link?: string;           // URL naar zaadleverancier
  zaadPer10m2?: number | null;    // Gram zaad per 10m²
  plantenPer10m2?: number | null; // Planten per 10m²
  kgOpbrengstPer10m2?: string;    // Range als string, bijv. "40-50"
  opbrengstGemiddeldPer10m2?: number | null; // Gemiddelde opbrengst per 10m²
  eenheidOpbrengst?: string;      // "kg" of "stuks"
  zaaiKalender?: Record<string, string>; // bijv. { jan_b: "0", mrt_b: "bz", ... }
  oogstKalender?: Record<string, string>; // bijv. { jun_b: "o", ... }
  bijzonderheden?: string;
}

// Emoji mapping per teeltgroep
export const TEELTGROEP_EMOJI: Record<string, string> = {
  'Vruchtgewassen': '🍅',
  'Bladgewassen': '🥬',
  'Wortel- en knolgewassen': '🥕',
  'Wortelgewassen': '🥕',
  'Knolgewassen': '🥔',
  'Koolgewassen': '🥦',
  'Peulgewassen': '🫛',
  'Kruiden': '🌿',
  'Kruiden/Bloemen': '🌸',
  'Eetbare bloemen': '🌸',
  'Uienfamilie': '🧅',
  'Stengelgewassen': '🌿',
  'Ganzenvoetfamilie': '🌱',
  'Overig': '🌱'
};

// Engelse vertalingen van teeltgroepen
export const TEELTGROEP_EN: Record<string, string> = {
  'Vruchtgewassen': 'Fruit Vegetables',
  'Bladgewassen': 'Leafy Greens',
  'Wortel- en knolgewassen': 'Root & Tuber Vegetables',
  'Wortelgewassen': 'Root Vegetables',
  'Knolgewassen': 'Tuber Vegetables',
  'Koolgewassen': 'Brassicas',
  'Peulgewassen': 'Legumes',
  'Kruiden': 'Herbs',
  'Kruiden/Bloemen': 'Herbs/Flowers',
  'Eetbare bloemen': 'Edible Flowers',
  'Uienfamilie': 'Alliums',
  'Stengelgewassen': 'Stem Vegetables',
  'Ganzenvoetfamilie': 'Goosefoot Family',
  'Overig': 'Other'
};
