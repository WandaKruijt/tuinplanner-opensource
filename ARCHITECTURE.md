# Architectuur

Dit document beschrijft de technische opzet van TuinPlanner: welke lagen er zijn, hoe de data door het systeem stroomt, hoe Firebase is ingericht en welke centrale concepten je moet begrijpen om de code veilig te wijzigen.

Voor dev-setup en praktische scripts, zie [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Lagenoverzicht

```
┌─────────────────────────────────────────────────────┐
│  Browser (React SPA)                                │
│  ├─ Components (UI)                                 │
│  ├─ Context (AppContext, AuthContext)               │
│  ├─ Hooks (useTeeltplanTaakActies, useI18n)         │
│  ├─ Utils (berekeningen, parsers, helpers)          │
│  └─ Services (Firebase, Storage, Translation)       │
└─────────────────────┬───────────────────────────────┘
                      │ Firebase SDK (realtime)
                      ▼
┌─────────────────────────────────────────────────────┐
│  Firebase                                           │
│  ├─ Realtime Database  (alle app-data als JSON)     │
│  ├─ Cloud Storage      (foto's, exports)            │
│  └─ Authentication     (e-mail/wachtwoord)          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Externe services                                   │
│  ├─ DeepL  (via eigen /api/translate endpoint)      │
│  └─ Vercel (hosting + CI)                           │
└─────────────────────────────────────────────────────┘
```

De app is een client-only SPA. Er is **geen eigen backend** behalve een kleine Vercel-serverless function voor de optionele DeepL-vertaalproxy (`api/translate.ts`). Alle logica draait in de browser en alle persistentie gaat via de Firebase SDK.

---

## Maporganisatie van `src/`

```
src/
├── components/       UI-componenten (één component = één bestand)
├── context/          AppContext (data) + AuthContext (login/rol)
├── hooks/            Herbruikbare React-hooks
├── services/         Firebase/Storage/Translation wrappers
├── utils/            Pure helper-functies (datums, parsing, berekeningen)
├── types/            TypeScript type-definities (één bestand: index.ts)
├── i18n/             Vertalingen (NL/EN) voor UI-strings
├── config/           firebase.ts (SDK-initialisatie)
├── data/             Statische data (bv. default teeltcodes)
├── App.tsx           Root component + routing
└── main.tsx          Entry point (ReactDOM.render)
```

**Naming-conventie:** Componenten zijn PascalCase (`WeekOverzicht.tsx`), utils en hooks camelCase (`dateUtils.ts`, `useTeeltplanTaakActies.ts`).

---

## State-beheer

Er is één centrale `AppContext` met een **reducer** die de volledige applicatie-state beheert:

- `state.data` — alle data die uit Firebase komt (bedden, gewassen, teeltplan, taken, oogstlijst, …)
- `state.ui` — UI-state (actieve tab, filters, sorteervolgorde, toasts, laad-indicatoren)

**Patroon:** componenten lezen via `useApp()` en dispatchen acties zoals `VOEG_TAAK_TOE`, `UPDATE_TAAK`, `SET_FILTER`. De reducer bepaalt de nieuwe state. Schrijf-acties naar Firebase gebeuren naast de dispatch via de `save*`-functies (`saveTaak`, `saveOogstItem`, enz.).

De echte bron van waarheid is **Firebase**. De context is een snelle lokale cache die via `subscribeToData()` in sync blijft via Firebase-listeners.

**Belangrijke kwelgeest:** `localStorage` wordt alleen nog voor UI-voorkeuren gebruikt (taal, actieve tab). Dataopslag mag **niet** in localStorage — dat heeft in een eerdere versie tot dataverlies geleid.

---

## Firebase Realtime Database — schema

De database wordt plat georganiseerd (geen diepe nesting), met per entiteit een top-level key:

```
/bedden              Bed[]              — fysieke bedden in de tuin
/gewassen            VerrijktGewas[]    — encyclopedie-data (gewassen + permacultuur info)
/gewassenlijst       GewassenlijstItem[] — commerciële varianten (rassen/leveranciers)
/teeltplan           TeeltplanItem[]    — per bed × gewas × jaar: wat wanneer
/taken               Taak[]             — alle taken (automatisch + handmatig)
/oogstlijst          OogstItem[]        — te-oogsten items met hoeveelheden
/oogstRegistraties   OogstRegistratie[] — "dit is geoogst op datum X"
/oogstInstructies    OogstInstructie[]  — legacy, vervangen door /instructies
/instructies         Instructie[]       — per gewas: hoe te oogsten/behandelen
/signaleringen       Signalering[]      — community-meldingen (plagen, rijp)
/bedVoortgang        BedVoortgang[]     — status per bed
/taakgroepOverrides  TaakgroepOverride[] — commissie-overschrijvingen op auto-gegroepeerde taken
/backups/daily/...   backups            — automatische dagelijkse snapshots
/metadata            object             — versie-info
```

Elke entiteit wordt opgeslagen als **map keyed by id** (`{ [id]: Entity }`), niet als array. Bij lezen wordt dit via `toArray<T>()` in [`firebaseService.ts`](src/services/firebaseService.ts) weer naar een array geconverteerd met null-filtering.

**Regels** staan in een apart rules-bestand (zie [firebase-rules.template.json](firebase-rules.template.json)). Schrijven vereist login; statische data (bedden/gewassen/teeltplan) mag alleen door de ingestelde admin worden aangepast.

---

## Firebase Cloud Storage — padconventie

Alle bestandsopslag staat onder `fotos/` per entiteit-type:

```
fotos/
├── taken/{taakId}/{timestamp}.jpg            — foto's aan een taak (max 10)
├── oogstInstructies/{id}/{timestamp}.jpg     — foto's bij oogst-instructies (legacy)
└── instructies/{id}/{timestamp}.jpg          — foto's bij instructies (nieuw)

exports/{bestandsnaam}                         — CSV-exports, PDF-rapportages
```

De [`storage.rules`](storage.rules) in de repo matchen deze paden. Zie [SETUP.md](SETUP.md) voor hoe je ze publiceert.

---

## Centrale concepten

### Teeltcodes

De kern van het teeltplan zijn **teeltcodes** (gedefinieerd in [`src/types/index.ts`](src/types/index.ts)):

| Code | Betekenis |
|---|---|
| `kz` | kas zaaien |
| `bz` | buiten zaaien |
| `kvz` | kas voorzaaien (kluitjes) |
| `bvz` | buiten voorzaaien (kluitjes) |
| `bi` | binnen voorzaaien (thuis) |
| `ku` | kas uitplanten |
| `bu` | buiten uitplanten |
| `o` | oogst |
| `x` | buiten zaaien (actief/onderhoud) |

### Maandperiodes

Elke maand is verdeeld in drie **periodes**: Begin (B), Midden (M), Eind (E). De exacte weeknummers binnen een periode worden dynamisch berekend op basis van het aantal dagen in die maand — zie `bepaalPeriode()` en `periodToWeekRange()` in [`src/utils/dateUtils.ts`](src/utils/dateUtils.ts).

### Vensters (windows)

Een **venster** is een periode van aaneensluitende periodes met dezelfde teeltcode. Vensters komen voort uit `extractVensters(kalender, jaar)` in [`src/utils/taskGenerator.ts`](src/utils/taskGenerator.ts) en hebben een `startWeek` (soft deadline) en `endWeek` (harde deadline). Taken worden per venster gegenereerd via `genereerVensterTaken()`, met ondersteuning voor gepland-verschuiven binnen het venster en auto-escalatie als de harde deadline gepasseerd wordt.

### ISO-weeknummering

Alle week-berekeningen volgen **ISO 8601**. Gebruik `getISOWeek()` / `getWeekNummer()` uit [`src/utils/dateUtils.ts`](src/utils/dateUtils.ts). Schrijf geen eigen weekberekening — dat heeft al eens tot een bug geleid (dat heeft in het verleden al eens tot een bug geleid).

### Two-tier authenticatie

Er zijn twee accounts-niveaus:
- **Community** (gedeelde login) — kan taken afvinken, notities en foto's toevoegen
- **Commissie / admin** (persoonlijk e-mailadres) — kan teeltplan, gewassen, bedden wijzigen; auto-taken publiceren/depubliceren

De rol wordt bepaald door het e-mailadres bij login. Zie [SECURITY.md](SECURITY.md) voor de rol-matrix.

### Foto-afhandeling

Foto-velden hebben een **dual-field** voor backward compatibility:
- `taak.fotoUrl?: string` — legacy (één foto)
- `taak.fotoUrls?: string[]` — huidig (max 10)

**Altijd lezen via** `getTaakFotos(taak)` uit [`src/utils/fotoUtils.ts`](src/utils/fotoUtils.ts). Die valt automatisch terug op de legacy `fotoUrl` als `fotoUrls` leeg is. Schrijven gebeurt alleen naar `fotoUrls` (nieuwe code schrijft niet meer naar `fotoUrl`). De reducer `LAAD_DATA` en `SET_TAKEN` in [`AppContext.tsx`](src/context/AppContext.tsx) normaliseren bij het laden automatisch.

### Vertaling

Alle gebruikerstekst wordt alleen in het Nederlands ingevoerd. De Engelse vertaling wordt automatisch gegenereerd via DeepL in [`src/services/translationService.ts`](src/services/translationService.ts) en opgeslagen in een `_en`-veld naast het Nederlandse origineel (bv. `beschrijving` + `beschrijving_en`). UI-componenten gebruiken `<TranslatedText nl={...} en={...} />` om automatisch de juiste taal te tonen.

---

## Dataflow bij een typische actie

Voorbeeld: **community-lid vinkt een taak af**.

1. UI-component `WeekOverzicht` laat gebruiker op checkbox klikken
2. Component roept `useTeeltplanTaakActies().afvinkenTaak(taak, naam)` aan
3. De hook bouwt een nieuwe `Taak` met `status: 'Afgerond'`, `afgerondDoor: naam`, `afgerondOp: nuISO()`
4. Hook dispatcht `UPDATE_TAAK` naar de reducer → lokale state update (optimistisch)
5. Hook roept `firebaseService.updateTaak(taak)` → schrijft naar `/taken/{id}` in Firebase
6. Firebase propageert de wijziging naar alle verbonden clients via `onValue`
7. Elke client ontvangt de update via `subscribeToData` en dispatcht `LAAD_DATA`

Bij een fout wordt er een toast getoond via `toonToast('error', ...)`. De optimistic update blijft staan (wordt niet automatisch teruggedraaid) — dat is een bewuste keuze voor responsiviteit.

---

## Belangrijke gedragsregels voor wijzigingen

- **Niet aan `Taak.id` komen na creatie** — alle foto-URLs en referenties zijn eraan gekoppeld
- **Nooit lege arrays naar `setTaken`/`setBedden`/etc. sturen** — `valideerBulkOperatie()` in [`firebaseService.ts`](src/services/firebaseService.ts) weigert dat nu, maar wees voorzichtig bij bulk-updates
- **Voor destructieve operaties eerst backup** — zie `firebaseService.backupCollectie()`
- **Taken regenereren verliest foto's** — `BeheerInstellingen.handleTeeltplanImport` met `regenereerTaken: true` vervangt alle auto-taken door nieuwe met nieuwe ID's. Hun foto-URLs (gekoppeld aan oude ID's) gaan verloren. Dit is bekend technisch schuld, gemerkt in [CHANGELOG.md](CHANGELOG.md).

---

## Build & deploy

- `npm run build` → `tsc && vite build` → output in `dist/`
- Vercel bouwt automatisch bij push naar `main` of `demo`
- Firebase Storage rules deploy je apart met `firebase deploy --only storage` (niet via Vercel)
- Realtime Database rules beheer je via de Firebase Console

Details in [SETUP.md](SETUP.md).
