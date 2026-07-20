/**
 * Vertaalwoordenboek Nederlands - Engels voor TuinPlanner/TuinHelper
 * Versie 1.0 - Januari 2026
 */

export type Taal = 'nl' | 'en';

// Gewassen vertaling
export const gewassen: Record<string, string> = {
  "Aardappel": "Potato",
  "Aardbei": "Strawberry",
  "Aardpeer": "Jerusalem artichoke",
  "Afrikaantjes": "Marigold",
  "Amarant": "Amaranth",
  "Andijvie": "Endive",
  "Artisjok": "Artichoke",
  "Asperges": "Asparagus",
  "Aubergine": "Eggplant",
  "Augurk": "Gherkin",
  "Basilicum": "Basil",
  "Bieslook": "Chives",
  "Bietjes": "Beetroot",
  "Bimi": "Bimi / Broccolini",
  "Bindsla": "Romaine lettuce",
  "Bladmosterd": "Mustard greens",
  "Bleekselderij": "Celery",
  "Bloemkool": "Cauliflower",
  "Boerenkool": "Kale",
  "Bonentipi": "Bean tepee",
  "Bonen": "Beans",
  "Boomspinazie": "Tree spinach",
  "Borage": "Borage",
  "Brandnetel": "Stinging nettle",
  "Broccoli": "Broccoli",
  "Citroenmelisse": "Lemon balm",
  "Courgette": "Zucchini",
  "Daikon": "Daikon radish",
  "Daglelie": "Daylily",
  "Dille": "Dill",
  "Doperwt": "Garden pea",
  "Erwt": "Pea",
  "Groenlof": "Chicory",
  "Kalebas": "Calabash",
  "Kapucijner": "Marrowfat pea",
  "Kervel": "Chervil",
  "Ketoembar": "Coriander seeds",
  "Knoflook": "Garlic",
  "Knolselderij": "Celeriac",
  "Knolvenkel": "Fennel bulb",
  "Komkommer": "Cucumber",
  "Kool": "Cabbage",
  "Koolrabi": "Kohlrabi",
  "Koriander": "Coriander",
  "Kruiden": "Herbs",
  "Lavas": "Lovage",
  "Look-zonder-look": "Few-flowered leek",
  "Mais": "Corn",
  "Mangold": "Chard",
  "Meiraap": "May turnip",
  "Mini bladmosterd": "Baby mustard greens",
  "Mispel": "Medlar",
  "Munt": "Mint",
  "Nieuw Zeelandse Spinazie": "New Zealand spinach",
  "Olijfkomkommer": "Gherkin cucumber",
  "Oost-Indische kers": "Nasturtium",
  "Oregano": "Oregano",
  "Palmkool": "Palm kale",
  "Paprika": "Bell pepper",
  "Pastinaak": "Parsnip",
  "Peper": "Pepper",
  "Pepers": "Peppers",
  "Peperkers": "Cress",
  "Peterselie": "Parsley",
  "Pompoen": "Pumpkin",
  "Postelein": "Purslane",
  "Prei": "Leek",
  "Prinsessenboon": "French bean",
  "Pronkbonen": "Runner beans",
  "Raapstelen": "Turnip greens",
  "Rabarber": "Rhubarb",
  "Radicchio": "Radicchio",
  "Radijs": "Radish",
  "Rode kool": "Red cabbage",
  "Rode raapsteel": "Red turnip greens",
  "Rode ui": "Red onion",
  "Rozemarijn": "Rosemary",
  "Rucola": "Arugula",
  "Rucolabloem": "Arugula flower",
  "Salie": "Sage",
  "Savooiekool": "Savoy cabbage",
  "Savooikool": "Savoy cabbage",
  "Sjalot": "Shallot",
  "Sla": "Lettuce",
  "Snijbiet": "Swiss chard",
  "Snijbonen": "String beans",
  "Spekbonen": "Bacon beans",
  "Spinazie": "Spinach",
  "Spitskool": "Pointed cabbage",
  "Spruitjes": "Brussels sprouts",
  "Spruiten": "Brussels sprouts",
  "Stengelknoflook": "Green garlic",
  "Stengelui": "Spring onion",
  "Suikererwt": "Sugar snap pea",
  "Tagetes": "Marigold",
  "Teunisbloem": "Evening primrose",
  "Tijm": "Thyme",
  "Tomaat": "Tomato",
  "Tuinbonen": "Broad beans",
  "Tuinkers": "Garden cress",
  "Tuinmelde": "Orache",
  "Uien": "Onions",
  "Veldsla": "Lamb's lettuce",
  "Venkel": "Fennel",
  "Venkelblad": "Fennel fronds",
  "Venkelzaad": "Fennel seeds",
  "Verveine": "Verbena",
  "Viooltjes": "Pansies",
  "Wilde marjolein": "Wild marjoram",
  "Winterpostelein": "Winter purslane",
  "Winterwortel": "Winter carrot",
  "Witte kool": "White cabbage",
  "Wortel": "Carrot",
  "Wortelpeterselie": "Parsley root",
  "Yacon": "Yacon",
  "Zevenblad": "Ground elder",
  "Zoete aardappel": "Sweet potato",
  "Zomerwortel": "Summer carrot"
};

// Actie codes uit teeltplan
export const actieCodes: Record<string, string> = {
  "kz": "Sow in greenhouse",
  "kvz": "Pre-sow in greenhouse",
  "bz": "Sow outdoors",
  "bvz": "Pre-sow outdoors",
  "ku": "Transplant from greenhouse",
  "bu": "Transplant outdoors",
  "o": "Harvest",
  "x": "Active"
};

// Actie types voluit
export const actieTypes: Record<string, string> = {
  "Kas zaaien": "Sow in greenhouse",
  "Kas voorzaaien": "Pre-sow in greenhouse",
  "Buiten zaaien": "Sow outdoors",
  "Buiten voorzaaien": "Pre-sow outdoors",
  "Kas uitplanten": "Transplant from greenhouse",
  "Buiten uitplanten": "Transplant outdoors",
  "Uitplanten": "Transplant",
  "Oogsten": "Harvest",
  "Voorzaaien": "Pre-sow",
  "Zaaien": "Sow",
  "Planten": "Plant"
};

// Categorieen
export const categorieen: Record<string, string> = {
  "Kruiden": "Herbs",
  "Groenten": "Vegetables",
  "Fruit": "Fruit",
  "Bloemen": "Flowers",
  "Eetbare bloemen": "Edible flowers",
  "Decoratie": "Decoration",
  "Wildpluk": "Foraging",
  "Overblijvers": "Leftovers"
};

// Locaties
export const locaties: Record<string, string> = {
  "Kas": "Greenhouse",
  "kas": "greenhouse",
  "Oogststation": "Harvest station",
  "oogststation": "harvest station",
  "Naast de kas": "Next to greenhouse",
  "Voor de kas": "In front of greenhouse",
  "Sectie": "Section",
  "Bed": "Bed",
  "Vak": "Plot"
};

// Status waardes
export const statusVertalingen: Record<string, string> = {
  "Beschikbaar": "Available",
  "Controleren": "Check first",
  "Op": "Empty",
  "Gereserveerd": "Reserved",
  "Open": "Open",
  "Bezig": "In progress",
  "In uitvoering": "In progress",
  "Klaar": "Done",
  "Afgerond": "Completed"
};

// Prioriteit
export const prioriteit: Record<string, string> = {
  "Hoog": "High",
  "Normaal": "Normal",
  "Laag": "Low"
};

// Oogstmethodes
export const oogstmethodes: Record<string, string> = {
  "Afknippen": "Cut off",
  "Afknippen boven de grond": "Cut above ground level",
  "Afsnijden": "Cut",
  "Afsnijden aan de grond": "Cut at ground level",
  "Onder de krop afsnijden": "Cut below the head",
  "Uittrekken": "Pull out",
  "Uittrekken en gat dichtmaken": "Pull out and close hole",
  "Plantjes uittrekken": "Pull out plants",
  "Onderste blad oogsten": "Harvest bottom leaves",
  "Met wortel eruit halen": "Remove with root",
  "In stukken snijden mag": "May cut into pieces",
  "Wegen en verdelen": "Weigh and divide",
  "Onderste spruitjes oogsten": "Harvest bottom sprouts",
  "3 cm boven de grond afknippen": "Cut 3 cm above ground",
  "Leeg oogsten": "Harvest completely"
};

// UI Labels
export const uiLabels: Record<string, string> = {
  "Weekoverzicht": "Week Overview",
  "Taken": "Tasks",
  "Oogst": "Harvest",
  "Melden": "Report",
  "Info": "Info",
  "Synchroniseren": "Sync",
  "Totaal": "Total",
  "Open": "Open",
  "Bezig": "In progress",
  "Klaar": "Done",
  "Uit teeltplan": "From cultivation plan",
  "meer acties": "more actions",
  "Geen taken deze week": "No tasks this week",
  "Genereer taken uit het teeltplan": "Generate tasks from cultivation plan",
  "voeg handmatig taken toe": "add tasks manually",
  "Taken van de werkgroep": "Workgroup tasks",
  "Ik heb dit gedaan": "I have done this",
  "Ik heb geoogst": "I have harvested",
  "Opmerking plaatsen": "Leave a comment",
  "Taak afronden": "Complete task",
  "Welke bedden heb je gedaan": "Which beds have you done",
  "Alles gedaan": "All done",
  "Je naam": "Your name",
  "Jouw naam": "Your name",
  "Annuleren": "Cancel",
  "Bevestigen": "Confirm",
  "Versturen": "Send",
  "Nieuwe taak": "New task",
  "Taak aanmaken": "Create task",
  "Wijzigen": "Edit",
  "Bewerken": "Edit",
  "Verwijderen": "Delete",
  "Opslaan": "Save",
  "Vorige week": "Previous week",
  "Volgende week": "Next week",
  "Naar vandaag": "Go to today",
  "Laad taken": "Load tasks",
  "Exporteer wijzigingen": "Export changes",
  "Kies een van deze": "Choose one of these",
  "Wat staat waar": "What is where",
  "Snelle taak": "Quick task",
  "Snelle Taak": "Quick Task",
  "Algemene taak": "General task",
  "niet bed-specifiek": "not bed-specific",
  "Waar is het probleem": "Where is the problem",
  "Wat is het probleem": "What is the problem",
  "Specifieke bedden": "Specific beds",
  "optioneel": "optional",
  "meerdere mogelijk": "multiple allowed",
  "geselecteerd": "selected",
  "Verder": "Continue",
  "Terug naar locatie": "Back to location",
  "Terug naar probleem": "Back to problem",
  "Beschrijving": "Description",
  "Toelichting": "Explanation",
  "Notities": "Notes",
  "Snelle Taak Toevoegen": "Add Quick Task"
};

// Ad-hoc problemen
export const adhocProblemen: Record<string, string> = {
  "Slakken": "Slugs",
  "Woelmuizen": "Voles",
  "Onkruid": "Weeds",
  "Water geven": "Watering",
  "Oogstrijp": "Ready to harvest",
  "Overig": "Other"
};

// Eenheden
export const eenheden: Record<string, string> = {
  "stuk": "piece",
  "stuks": "pieces",
  "krop": "head",
  "kropje": "small head",
  "kropjes": "small heads",
  "plant": "plant",
  "plantje": "small plant",
  "plantjes": "small plants",
  "portie": "portion",
  "handje": "handful",
  "bosje": "bunch",
  "blad": "leaf",
  "bladeren": "leaves",
  "stengel": "stem",
  "takje": "sprig",
  "gram": "grams",
  "kg": "kg",
  "bed": "bed",
  "bedden": "beds"
};

// Maanden
export const maanden: Record<string, string> = {
  "januari": "January",
  "februari": "February",
  "maart": "March",
  "april": "April",
  "mei": "May",
  "juni": "June",
  "juli": "July",
  "augustus": "August",
  "september": "September",
  "oktober": "October",
  "november": "November",
  "december": "December"
};

// Gecombineerd woordenboek voor snelle lookup
const alleVertalingen: Record<string, string> = {
  ...gewassen,
  ...actieCodes,
  ...actieTypes,
  ...categorieen,
  ...locaties,
  ...statusVertalingen,
  ...prioriteit,
  ...oogstmethodes,
  ...uiLabels,
  ...adhocProblemen,
  ...eenheden,
  ...maanden
};

/**
 * Vertaal een Nederlandse tekst naar Engels
 * @param tekst - De te vertalen tekst
 * @param taal - Doeltaal ('nl' of 'en')
 * @returns Vertaalde tekst of origineel als niet gevonden
 */
export function vertaal(tekst: string, taal: Taal = 'en'): string {
  if (taal === 'nl') return tekst;

  // Exacte match
  if (alleVertalingen[tekst]) {
    return alleVertalingen[tekst];
  }

  // Case-insensitive match
  const lowerTekst = tekst.toLowerCase();
  for (const [nl, en] of Object.entries(alleVertalingen)) {
    if (nl.toLowerCase() === lowerTekst) {
      return en;
    }
  }

  // Fallback: return origineel
  return tekst;
}

/**
 * Vertaal een gewas naam
 */
export function vertaalGewas(gewasNaam: string, taal: Taal = 'en'): string {
  if (taal === 'nl') return gewasNaam;
  return gewassen[gewasNaam] || gewasNaam;
}

/**
 * Vertaal een actie code (kz, bz, etc.)
 */
export function vertaalActieCode(code: string, taal: Taal = 'en'): string {
  if (taal === 'nl') {
    const nlVertalingen: Record<string, string> = {
      "kz": "Kas zaaien",
      "kvz": "Kas voorzaaien",
      "bz": "Buiten zaaien",
      "bvz": "Buiten voorzaaien",
      "ku": "Kas uitplanten",
      "bu": "Buiten uitplanten",
      "o": "Oogsten",
      "x": "Actief"
    };
    return nlVertalingen[code] || code;
  }
  return actieCodes[code] || code;
}

/**
 * Probeer een samengestelde tekst te vertalen
 * Bijv: "Kas zaaien: Bladmosterd in bed A1"
 */
export function vertaalSamengesteld(tekst: string, taal: Taal = 'en'): string {
  if (taal === 'nl') return tekst;

  let result = tekst;

  // Vervang bekende termen (langste eerst om overlap te voorkomen)
  const gesorteerd = Object.entries(alleVertalingen)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [nl, en] of gesorteerd) {
    const regex = new RegExp(`\\b${nl}\\b`, 'gi');
    result = result.replace(regex, en);
  }

  return result;
}

// Export default object met alle vertalingen
export default {
  gewassen,
  actieCodes,
  actieTypes,
  categorieen,
  locaties,
  statusVertalingen,
  prioriteit,
  oogstmethodes,
  uiLabels,
  adhocProblemen,
  eenheden,
  maanden,
  vertaal,
  vertaalGewas,
  vertaalActieCode,
  vertaalSamengesteld
};
