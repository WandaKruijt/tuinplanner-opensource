/**
 * Genereer de twee databestanden voor de fictieve demo-tuin:
 *
 *   1. src/demo/gewasKalenders.json  — zaai/plant-kalender per demo-gewas,
 *      overgenomen uit een echt teeltplan (generieke teeltkennis).
 *   2. public/demo-gewassen.json     — de volledige gewassen-encyclopedie
 *      (tweetalig), geanonimiseerd.
 *
 * Gebruik:
 *   node scripts/maak-demo-tuin-data.cjs <teeltplan-export.json> <gewassen.json>
 *
 * De rest van de demo-data (bedden, teeltplan, taken, oogstlijst) wordt
 * NIET uit een export gehaald: die is fictief en wordt bij het opstarten
 * van de demo gegenereerd door src/demo/seedDemoData.ts.
 */

const fs = require('fs');
const path = require('path');

const [exportPad, gewassenPad] = process.argv.slice(2);
if (!exportPad || !gewassenPad) {
  console.error('Gebruik: node scripts/maak-demo-tuin-data.cjs <export.json> <gewassen.json>');
  process.exit(1);
}

// De gewassen van de fictieve demo-tuin (moeten in het teeltplan én de
// encyclopedie voorkomen)
const DEMO_GEWASSEN = [
  'Tomaten',
  'Courgette',
  'Pompoen',
  'Snijbiet',
  'Rucola',
  'Veldsla',
  'Bietjes',
  'Boerenkool',
  'Tuinbonen',
  'Wortel - Zomerwortel',
];

// Voornamen die in vrije tekst kunnen voorkomen
const NAMEN_REGEX = /\b(Wanda|Pascale|Christel)\b/gi;

function sanitiseer(waarde) {
  if (Array.isArray(waarde)) return waarde.map(sanitiseer);
  if (waarde !== null && typeof waarde === 'object') {
    const resultaat = {};
    for (const [key, val] of Object.entries(waarde)) {
      if (key === 'fotoUrl' || key === 'fotoUrls') continue;
      if (typeof val === 'string') {
        if (val.includes('firebasestorage.googleapis.com')) continue;
        resultaat[key] = val.replace(NAMEN_REGEX, 'een tuinlid');
      } else {
        resultaat[key] = sanitiseer(val);
      }
    }
    return resultaat;
  }
  return waarde;
}

// --- 1. Kalenders per demo-gewas ---

const exportData = JSON.parse(fs.readFileSync(exportPad, 'utf8'));
const teeltplan = Object.values(exportData.teeltplan || {});

function aantalCellen(kalender) {
  let n = 0;
  for (const maand of Object.values(kalender || {})) {
    for (const code of Object.values(maand)) if (code) n++;
  }
  return n;
}

const kalenders = {};
for (const naam of DEMO_GEWASSEN) {
  const items = teeltplan.filter((t) => t.gewas === naam && t.kalender);
  if (items.length === 0) {
    console.error(`FOUT: gewas "${naam}" niet gevonden in het teeltplan`);
    process.exit(1);
  }
  // Neem de kalender met de meeste ingevulde cellen (rijkste teeltschema)
  items.sort((a, b) => aantalCellen(b.kalender) - aantalCellen(a.kalender));
  kalenders[naam] = items[0].kalender;
  console.log(`  ${naam}: ${aantalCellen(items[0].kalender)} kalendercellen`);
}

const kalenderPad = path.join(__dirname, '..', 'src', 'demo', 'gewasKalenders.json');
fs.writeFileSync(kalenderPad, JSON.stringify(kalenders, null, 2));
console.log(`Geschreven: ${kalenderPad}`);

// --- 2. Volledige encyclopedie ---

const gewassen = JSON.parse(fs.readFileSync(gewassenPad, 'utf8'));
const schoon = sanitiseer(gewassen);
const encPad = path.join(__dirname, '..', 'public', 'demo-gewassen.json');
fs.writeFileSync(encPad, JSON.stringify(schoon));
const kb = Math.round(fs.statSync(encPad).size / 1024);
console.log(`Geschreven: ${encPad} (${Object.keys(schoon).length} gewassen, ${kb} kB)`);
