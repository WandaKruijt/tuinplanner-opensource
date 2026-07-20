# Ontwikkelen aan TuinPlanner

Deze gids is voor iedereen die lokaal aan de code wil werken — jij nu, of iemand die je over een jaar inschakelt.

Voor een helicopter-view van het systeem, lees eerst [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Vereisten

| Tool | Versie | Waarom |
|---|---|---|
| Node.js | 18 of hoger | Vite vereist een moderne Node |
| npm | 9+ | Komt standaard met Node |
| Git | Recent | Duh |
| Firebase CLI (optioneel) | Recent | Alleen nodig om Storage-rules te deployen |
| Vercel CLI (optioneel) | Recent | Voor handmatige deploy of lokale previews |

---

## Setup na een fresh clone

```bash
# 1. Clone
git clone https://github.com/WandaKruijt/tuinplanner-opensource.git
cd tuinplanner-opensource

# 2. Installeer dependencies
npm install

# 3. Maak .env aan op basis van het voorbeeld
cp .env.example .env
```

Vul [`.env`](.env.example) in met de credentials van je eigen Firebase-project (zie [SETUP.md](SETUP.md)). Zonder geldige credentials start de app wel, maar laadt hij geen data en toont hij console-errors. Tip: met `npm run dev:demo` draait de app zonder Firebase, op voorbeelddata.

```bash
# 4. Link met het juiste Vercel-project (optioneel, alleen voor CLI-deploys)
npx vercel link --project tuinplanner -y   # voor main/productie
# of:
npx vercel link --project tuinplanner-demo -y   # voor demo-branch

# 5. Start de dev-server
npm run dev
```

App opent op [http://localhost:5173](http://localhost:5173) met hot-reload.

**Let op:** je lokale dev-server verbindt met de **productie-Firebase**. Lezen is veilig, maar wees voorzichtig met destructieve knoppen in BeheerInstellingen — die schrijven direct naar productie.

---

## Scripts

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Start Vite dev-server op :5173 met hot-reload |
| `npm run build` | Type-check (`tsc`) + productie-build naar `dist/` |
| `npm run preview` | Serveert `dist/` lokaal (test productie-build) |
| `npm run lint` | ESLint over `src/` |

### Handige one-liners

```bash
# Snelle type-check zonder te builden
npx tsc --noEmit

# Build + lokaal previewen
npm run build && npm run preview

# Firebase Storage rules deployen
firebase deploy --only storage

# Handmatige productie-deploy (normaal doet Vercel dit automatisch)
npx vercel --prod
```

---

## Scripts in `scripts/`

De `scripts/` map bevat onderhouds-scripts die je ad-hoc draait (niet via npm):

| Script | Wat | Gebruik |
|---|---|---|
| `backup/automaticBackup.js` | Dagelijkse snapshot naar `/backups/daily/` | Wordt nu niet automatisch gedraaid |
| `export-demo-data.cjs` | Exporteert Firebase naar JSON voor de demo-branch | `node scripts/export-demo-data.cjs` |
| `restore-gewassen.cjs` | Herstelt gewassen uit een backup-JSON | Alleen in noodgevallen |
| `exportAndTranslate.ts` | Bulk-vertaling van gewas-data via DeepL | Eenmalig/indien nodig |
| `security/` | Security-audit tools (historisch) | Zie `docs/archief/` |

Elk script heeft in de header uitleg over wat het doet. Lees die eerst voordat je draait.

---

## Codeorganisatie & conventies

### Bestanden plaatsen

| Wat ben je aan het bouwen? | Waar hoort het? |
|---|---|
| Nieuwe UI-pagina of modal | `src/components/` |
| Pure helper-functie (berekening, parsing) | `src/utils/` |
| Herbruikbare React-hook | `src/hooks/` |
| Firebase/Storage/API-wrapper | `src/services/` |
| Nieuw type of interface | `src/types/index.ts` |
| UI-vertaling | `src/i18n/translations.ts` |

**Vuistregel:** als je logica kunt testen zonder React te laden (geen hooks, geen JSX), hoort het in `utils/`. Anders in `components/` of `hooks/`.

### Naming

- **Componenten** — PascalCase, één per bestand: `WeekOverzicht.tsx`, `TaakFormulier.tsx`
- **Utils/hooks** — camelCase: `dateUtils.ts`, `useTeeltplanTaakActies.ts`
- **Types** — PascalCase voor interfaces/types (`Taak`, `Bed`, `TeeltCode`)
- **Constanten** — SCREAMING_SNAKE_CASE (`MAX_FOTOS_PER_TAAK`)
- **Nederlands of Engels?** — Domein-termen zijn **Nederlands** (`Taak`, `bedId`, `gewas`, `fotoUrls`). Technische termen mogen **Engels** zijn (`onClick`, `useState`). Volg bestaande stijl per bestand.

### TypeScript

- **Geen `any`** — gebruik `unknown` en narrow met type-guards
- **Union-types voor vaste waarden**: zie bv. `TeeltCode` in [`src/types/index.ts`](src/types/index.ts)
- **Optionele velden met `?:`** niet met `| undefined`
- **Spread-operator** om Taak-objecten bij te werken: `{ ...taak, status: 'Afgerond' }` — niet muteren

### Imports

- Absolute imports vanaf `src/` zijn **niet** ingesteld — gebruik relatieve paden (`../utils/fotoUtils`)
- Types importeren met `import type { Taak } from '../types'` (scheelt bundle-size)
- Lucide-icons per stuk: `import { Leaf, Camera } from 'lucide-react'`

### Component-patronen

- Eén bestand = één component. Kleine sub-componenten mogen in hetzelfde bestand als ze alleen daar gebruikt worden.
- Gebruik `useApp()` voor data/state, `useAuth()` voor rol-check, `useI18n()` voor `taal` en `t()`.
- Pure display-componenten krijgen alles via props. Container-componenten regelen data-fetching/dispatch.
- Async operaties wrap je met try/catch + `toonToast('error', ...)`.

---

## Taal in de UI

Alle zichtbare tekst hoort door de `t()`-functie of via `<TranslatedText nl=... en=... />`:

```tsx
const { taal, t } = useI18n();

<h2>{t('weekoverzicht.titel')}</h2>                    // vaste UI-strings
<p>{taal === 'nl' ? 'Afgerond' : 'Completed'}</p>      // inline keuze (snel)
<TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />  // user content
```

Voor user-content (taken, commentaar, notities) wordt de EN-versie automatisch door DeepL gegenereerd bij het opslaan. Zie [`src/services/translationService.ts`](src/services/translationService.ts).

---

## Testing

Er is **geen test-suite** op dit moment. Code-wijzigingen verifieer je handmatig:

1. `npx tsc --noEmit` — type-check
2. `npm run build` — productie-build moet slagen
3. `npm run dev` — lokaal testen in de browser
4. Voor grote wijzigingen: manueel doorlopen van golden paths (taak aanmaken, taak afvinken, foto toevoegen, teeltplan bekijken)

Als je tests toevoegt, overweeg Vitest (integreert goed met Vite) en start bij de utils (`dateUtils`, `taskGenerator`, `fotoUtils`) — die zijn puur en lenen zich goed voor unit-tests.

---

## Troubleshooting

### `Firebase configuratie ontbreekt` in console
Je `.env` is leeg of mist waarden. Vraag de beheerder om credentials en zet ze in `.env` (niet in `.env.example`).

### Foto's laden niet in productie, wel lokaal
Check:
1. Firebase Console → Storage → tab Rules — zijn de rules geldig en gedeployed?
2. Browser DevTools → Network → klik op gefaalde image — HTTP-status zegt waarom (403 = rules, 412 = service account probleem)
3. Zie [SECURITY.md](SECURITY.md) en [SETUP.md](SETUP.md)

### Type-errors na een pull
```bash
rm -rf node_modules package-lock.json
npm install
npx tsc --noEmit
```

### Vercel deploy slaagt maar toont een oude versie
Hard-refresh je browser (Ctrl+F5) — Vercel cached agressief. Service worker is niet actief op deze app, dus een refresh is voldoende.

### `Cannot find module '../types'`
Zorg dat je van `src/` werkt en met relatieve paden importeert. TypeScript-paden zijn niet geconfigureerd.

---

## Waar vind ik wat?

| Ik zoek… | Kijk bij… |
|---|---|
| De week-berekening | [`src/utils/dateUtils.ts`](src/utils/dateUtils.ts) |
| De taak-generator uit teeltplan | [`src/utils/taskGenerator.ts`](src/utils/taskGenerator.ts) |
| Alle typen (Taak, Bed, Gewas, …) | [`src/types/index.ts`](src/types/index.ts) |
| Firebase lezen/schrijven | [`src/services/firebaseService.ts`](src/services/firebaseService.ts) |
| Foto-upload en -delete | [`src/services/storageService.ts`](src/services/storageService.ts) |
| Wie is ingelogd en welke rol? | [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx) |
| Taal-instelling en vertalingen | [`src/i18n/`](src/i18n/) |
| De grootste component (weekoverzicht) | [`src/components/WeekOverzicht.tsx`](src/components/WeekOverzicht.tsx) |
| In-app handleiding-tekst | [`src/components/Handleiding.tsx`](src/components/Handleiding.tsx) |

---

## Verdere lezing

- [ARCHITECTURE.md](ARCHITECTURE.md) — de grote-plaatje-kijk
- [CONTRIBUTING.md](CONTRIBUTING.md) — werkwijze, commit-stijl, documentatie-onderhoud
- [SETUP.md](SETUP.md) — eigen Firebase-project en hosting opzetten
- [SECURITY.md](SECURITY.md) — rollen en beveiligingsregels
