/**
 * Maak gesanitiseerde demo-data voor de demomodus.
 *
 * Gebruik:
 *   node scripts/maak-demo-data.cjs <pad-naar-firebase-export.json> [pad-naar-gewassen.json]
 *
 * Het tweede (optionele) argument vervangt de gewassen-collectie door een
 * apart bestand, bijvoorbeeld een backup van de verrijkte gewassen-
 * encyclopedie als de export een verouderde collectie bevat.
 *
 * Leest een Firebase Realtime Database-export (JSON) en schrijft
 * public/demo-data.json. Daarbij wordt alles verwijderd of geanonimiseerd
 * wat niet in een openbare demo hoort:
 *   - persoonsnamen worden vervangen door "Demo"
 *   - foto-verwijzingen (naar Firebase Storage) worden verwijderd
 *   - community-notities en signaleringen worden verwijderd
 *   - backups en audit-logs worden overgeslagen
 */

const fs = require('fs');
const path = require('path');

const invoer = process.argv[2];
if (!invoer) {
  console.error('Gebruik: node scripts/maak-demo-data.cjs <pad-naar-export.json>');
  process.exit(1);
}

const BEHOUDEN_COLLECTIES = [
  'bedden',
  'gewassen',
  'gewassenlijst',
  'teeltplan',
  'taken',
  'oogstlijst',
  'oogstRegistraties',
  'oogstInstructies',
  'instructies',
  'bedVoortgang',
  'taakgroepOverrides',
];

// Velden met persoonsnamen: alles behalve "commissie" wordt "Demo"
const NAAM_VELDEN = new Set([
  'afgerondDoor',
  'aangemaaktDoor',
  'gewijzigdDoor',
  'reactieDoor',
  'gebruiker',
]);

// Velden die volledig worden verwijderd
const VERWIJDER_VELDEN = new Set([
  'fotoUrl',
  'fotoUrls',
  'communityNotities',
]);

// Voornamen die in vrije tekst (notities, commentaar) kunnen voorkomen.
// Vul deze lijst aan vóór het genereren van nieuwe demo-data.
const NAMEN_IN_TEKST = ['Wanda', 'Pascale', 'Christel'];
const NAMEN_REGEX = new RegExp(`\\b(${NAMEN_IN_TEKST.join('|')})\\b`, 'gi');

function anonimiseerTekst(tekst) {
  return tekst.replace(NAMEN_REGEX, 'een tuinlid');
}

function anonimiseerNaam(naam) {
  if (typeof naam !== 'string') return 'Demo';
  return naam.trim().toLowerCase() === 'commissie' ? 'commissie' : 'Demo';
}

function sanitiseer(waarde) {
  if (Array.isArray(waarde)) {
    return waarde.map(sanitiseer);
  }
  if (waarde !== null && typeof waarde === 'object') {
    const resultaat = {};
    for (const [key, val] of Object.entries(waarde)) {
      if (VERWIJDER_VELDEN.has(key)) continue;
      if (NAAM_VELDEN.has(key)) {
        resultaat[key] = anonimiseerNaam(val);
      } else if (key === 'assignedTo' && Array.isArray(val)) {
        resultaat[key] = [...new Set(val.map(anonimiseerNaam))];
      } else if (typeof val === 'string' && val.includes('firebasestorage.googleapis.com')) {
        // Verwijs nooit naar de storage van de bron-tuin
        continue;
      } else if (typeof val === 'string') {
        resultaat[key] = anonimiseerTekst(val);
      } else {
        resultaat[key] = sanitiseer(val);
      }
    }
    return resultaat;
  }
  return waarde;
}

const bron = JSON.parse(fs.readFileSync(invoer, 'utf8'));

const gewassenBestand = process.argv[3];
if (gewassenBestand) {
  bron.gewassen = JSON.parse(fs.readFileSync(gewassenBestand, 'utf8'));
  console.log(`Gewassen vervangen door: ${gewassenBestand}`);
}

const demo = {};

for (const collectie of BEHOUDEN_COLLECTIES) {
  if (bron[collectie]) {
    demo[collectie] = sanitiseer(bron[collectie]);
    const aantal = Object.keys(demo[collectie]).length;
    console.log(`  ${collectie}: ${aantal} items`);
  }
}

const uitvoerPad = path.join(__dirname, '..', 'public', 'demo-data.json');
fs.writeFileSync(uitvoerPad, JSON.stringify(demo));
const kb = Math.round(fs.statSync(uitvoerPad).size / 1024);
console.log(`\nGeschreven: ${uitvoerPad} (${kb} kB)`);
