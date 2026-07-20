# 🌻 TuinPlanner

> Open source planning en coördinatie voor gemeenschapstuinen.

TuinPlanner is een web-app waarmee de commissie en community van een gemeenschapstuin het teeltplan, de wekelijkse taken en de oogst bijhouden. De app draait in de browser, synchroniseert realtime via Firebase en is tweetalig (NL/EN).

TuinPlanner is ontwikkeld door en voor Riel Roots, Permacultuur Community Tuin Eindhoven (voortgekomen uit het Phood Community Garden initiatief) en wordt als open source beschikbaar gesteld voor andere verenigingen en niet-commerciële tuinprojecten.

## Wat kan je ermee?

### Voor de commissie
- Teeltplan per bed beheren (maandkalender met begin/midden/eind-periodes en teeltcodes)
- Automatische taken genereren uit het teeltplan (venstertaken met zachte en harde deadline)
- Takentitels, notities en gewasgroep-publicatie per week bewerken
- Ad-hoc taken toevoegen (slakken, water geven, onkruid, oogstrijp)
- Foto's toevoegen aan taken
- Oogst registreren en instructies per gewas beheren
- CSV-import voor teeltplan, gewassen en taken, met dry-run en automatische backup

### Voor de community
- Weekoverzicht met wat er deze week gedaan moet worden
- Taken afvinken met naam
- Notities en foto's aan taken toevoegen
- Oogstinstructies en gewassen-encyclopedie raadplegen
- Plattegronden per sectie bekijken
- Ingebouwde handleiding

### Taalondersteuning
- Volledig tweetalig (Nederlands / Engels)
- Optioneel: automatische vertaling van gebruikerstekst via DeepL

## Demo bekijken

Je kunt de app zonder installatie of Firebase-project uitproberen:

```bash
git clone https://github.com/WandaKruijt/tuinplanner-opensource.git
cd tuinplanner-opensource
npm install
npm run dev:demo
```

De demomodus draait volledig op voorbeelddata in het geheugen. Je bent automatisch ingelogd als admin en kan alles doorklikken; wijzigingen verdwijnen bij het herladen van de pagina. Zie [src/demo/README.md](src/demo/README.md) voor hoe dit werkt.

## Zelf gebruiken met je eigen tuin

Elke vereniging draait een **eigen kopie** van TuinPlanner, met een eigen (gratis) Firebase-project en eigen hosting. Er is geen centrale server en er worden geen gegevens of API-sleutels gedeeld met het oorspronkelijke project.

Volg [SETUP.md](SETUP.md) voor de complete installatie: Firebase-project aanmaken, accounts en beveiligingsregels instellen en de app publiceren op Vercel. Voor een kleine vereniging volstaan de gratis abonnementen van Firebase (Spark) en Vercel (Hobby).

**Geen programmeerervaring?** Met een AI-assistent zoals Claude Code of OpenAI Codex kan je de installatie in gewone taal laten uitvoeren. Zie [SETUP-MET-AI.md](SETUP-MET-AI.md).

## Tech stack

| Onderdeel | Keuze |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Database | Firebase Realtime Database |
| Bestandsopslag | Firebase Cloud Storage (foto's) |
| Auth | Firebase Auth (e-mail/wachtwoord, twee rollen: community en admin) |
| Vertaling (optioneel) | DeepL API via een eigen serverless endpoint |
| Hosting | Vercel (of andere statische hosting) |

## Documentatie

- [SETUP.md](SETUP.md) — stap voor stap je eigen TuinPlanner opzetten
- [SETUP-MET-AI.md](SETUP-MET-AI.md) — opzetten zonder programmeerkennis, met Claude Code of Codex
- [ARCHITECTURE.md](ARCHITECTURE.md) — technische opzet en datamodel
- [DEVELOPMENT.md](DEVELOPMENT.md) — lokaal ontwikkelen, scripts en conventies
- [SECURITY.md](SECURITY.md) — rollen, beveiligingsregels en meldpunt
- [CONTRIBUTING.md](CONTRIBUTING.md) — bijdragen aan het project

## Licentie

TuinPlanner is beschikbaar onder de [PolyForm Noncommercial License 1.0.0](LICENSE.md). Je mag de software vrij gebruiken, aanpassen en delen voor **niet-commerciële doeleinden**, zoals verenigingen, buurttuinen, scholen en andere non-profitinitiatieven. Commercieel gebruik is niet toegestaan.

## Credits

Gemaakt door [Wanda Kruijt](https://www.linkedin.com/in/wandakruijt/) van Riel Roots, Permacultuur Community Tuin Eindhoven, samen met Claude Code (Anthropic). Riel Roots komt voort uit het Phood Community Garden initiatief. Van Excel-sheets naar werkende app.
