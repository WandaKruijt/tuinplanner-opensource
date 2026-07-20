# TuinPlanner opzetten voor je eigen tuin

Deze handleiding leidt je stap voor stap door de installatie van een eigen TuinPlanner. Je hebt geen programmeerkennis nodig, wel een uurtje tijd en een Google-account. Alles kan met de gratis abonnementen van Firebase en Vercel.

**Overzicht van wat je gaat doen:**

1. De code ophalen en lokaal proberen
2. Een eigen Firebase-project aanmaken (database, opslag en inloggen)
3. Accounts en beveiligingsregels instellen
4. De app publiceren op Vercel
5. Optioneel: automatische vertaling aanzetten

## Stap 1 — Code ophalen en lokaal proberen

Installeer eerst [Node.js](https://nodejs.org) (LTS-versie). Daarna:

```bash
git clone https://github.com/WandaKruijt/tuinplanner-opensource.git
cd tuinplanner-opensource
npm install
npm run dev:demo
```

Open http://localhost:5173. Je ziet de app met voorbeelddata, zonder dat er iets is ingesteld. Zo weet je dat alles werkt en kan je alvast rondkijken.

## Stap 2 — Firebase-project aanmaken

Ga naar de [Firebase Console](https://console.firebase.google.com) en maak een nieuw project aan (bijvoorbeeld `tuinplanner-mijntuin`). Het gratis **Spark-abonnement** volstaat.

Zet daarna drie onderdelen aan:

1. **Realtime Database** (Build → Realtime Database → Create database). Kies een Europese locatie (bijv. `europe-west1`) en start in *locked mode*; de goede regels stel je in stap 3 in.
2. **Authentication** (Build → Authentication → Get started). Zet de aanmeldmethode **E-mail/wachtwoord** aan.
3. **Storage** (Build → Storage). Nodig voor foto's bij taken.

Haal vervolgens de configuratiewaarden op: Projectinstellingen (tandwiel) → General → Your apps → Web app toevoegen. Je krijgt dan waarden zoals `apiKey` en `databaseURL`.

Kopieer in de projectmap `.env.example` naar `.env` en vul alles in:

```
VITE_GARDEN_NAME=Buurttuin De Wortel
VITE_ADMIN_EMAILS=voorzitter@mijntuin.nl
VITE_COMMUNITY_EMAIL=community@mijntuin.nl
VITE_FIREBASE_API_KEY=...      (enzovoort, uit de Firebase Console)
```

## Stap 3 — Accounts en beveiligingsregels

**Accounts.** Maak in Firebase Authentication twee gebruikers aan (Users → Add user):

- het **community-account**: het adres uit `VITE_COMMUNITY_EMAIL`, met een gedeeld wachtwoord dat je aan alle tuinleden geeft;
- het **admin-account**: het adres uit `VITE_ADMIN_EMAILS`, met een sterk persoonlijk wachtwoord. Je kan meerdere admins toevoegen (kommagescheiden in de env-variabele).

**Databaseregels.** Open [firebase-rules.template.json](firebase-rules.template.json), vervang overal `ADMIN-EMAIL-HIER@example.com` door je eigen admin-adres en plak de inhoud in Firebase: Realtime Database → Rules → publiceren. Deze regels zorgen ervoor dat alleen ingelogde leden kunnen lezen, en dat alleen de admin het teeltplan, de bedden en de gewassen kan overschrijven.

**Opslagregels.** Plak de inhoud van [storage.rules](storage.rules) in Storage → Rules en publiceer.

Test het geheel lokaal met `npm run dev`: log in met het admin-account, ga naar Beheer en importeer je bedden en gewassen (er staan voorbeeld-CSV's in de app onder Beheer).

## Stap 4 — Publiceren op Vercel

1. Maak een account op [vercel.com](https://vercel.com) (gratis Hobby-abonnement) en maak een fork of eigen kopie van deze repository op GitHub.
2. Kies in Vercel **New Project** en importeer je repository. Vercel herkent Vite automatisch.
3. Voeg onder **Environment Variables** alle variabelen uit je `.env` toe.
4. Deploy. Je app staat daarna op `https://jouwproject.vercel.app`.

Voeg tot slot je Vercel-domein toe aan Firebase Authentication → Settings → Authorized domains, anders werkt inloggen niet vanaf de site.

**Let op:** het Hobby-abonnement van Vercel is alleen voor niet-commercieel gebruik. Dat sluit aan bij de licentie van TuinPlanner.

## Stap 5 — Optioneel: automatische vertaling

De app is tweetalig. Vaste teksten zijn altijd in beide talen beschikbaar. Wil je dat ook door leden ingevoerde tekst (taaknotities en dergelijke) automatisch naar het Engels wordt vertaald, vraag dan een gratis API-sleutel aan op [deepl.com/pro-api](https://www.deepl.com/pro-api) en zet die in de variabele `VITE_DEEPL_API_KEY` (lokaal in `.env` en op Vercel bij de Environment Variables). Zonder sleutel werkt de app gewoon; er wordt dan alleen niet vertaald.

## Eigen demo-omgeving (optioneel)

Wil je naast je productie-app een openbare demo (zoals de demo van dit project), maak dan in Vercel een tweede project aan op dezelfde repository en zet daar het build-commando op `npm run build:demo`. Die site draait dan zonder Firebase, op de voorbeelddata uit `public/demo-data.json`.

## Eigen plattegronden

De plattegronden in `public/images/plattegronden/` zijn voorbeelden (van de Phood Community Tuin). Vervang ze door kaarten van je eigen tuin met dezelfde bestandsnamen, of pas de paden aan in [src/components/Plattegronden.tsx](src/components/Plattegronden.tsx).

## Problemen?

- App start maar laadt geen data → controleer de Firebase-variabelen in `.env` en of de databaseregels zijn gepubliceerd.
- Inloggen lukt niet op de gepubliceerde site → controleer de Authorized domains in Firebase Authentication.
- Admin ziet geen beheerknoppen → controleer of het ingelogde adres exact overeenkomt met `VITE_ADMIN_EMAILS` én met het adres in de databaseregels.

Zie verder [DEVELOPMENT.md](DEVELOPMENT.md) voor ontwikkelaarsdocumentatie.
