# Demomodus

De demomodus laat TuinPlanner draaien **zonder Firebase-project**, met voorbeelddata in het geheugen. Handig om de app te bekijken voordat je iets instelt, en voor een openbare demo-site.

## Hoe het werkt

Bij `vite --mode demo` vervangt [vite.config.ts](../../vite.config.ts) de firebase-modules door de shims in deze map:

| Module | Shim | Gedrag |
|---|---|---|
| `firebase/app` | firebaseAppShim.ts | Doet niets |
| `firebase/database` | firebaseDatabaseShim.ts | In-memory database met fictieve data |
| `firebase/auth` | firebaseAuthShim.ts | Automatisch ingelogd als admin; elk wachtwoord is geldig |
| `firebase/storage` | firebaseStorageShim.ts | Foto's als object-URL in het geheugen |

De rest van de applicatiecode is **identiek** aan de productieversie. Er is dus geen aparte demo-branch die kan achterlopen: elke wijziging in de app zit automatisch ook in de demo.

## Fictieve, zelf-genererende data

De demo-data is volledig fictief en wordt bij het opstarten opgebouwd door [seedDemoData.ts](seedDemoData.ts):

- Een verzonnen tuintje van **10 bedden in sectie A**, elk met één gewas.
- De **taken** worden live gegenereerd met de echte taakgenerator van de app (`genereerVensterTaken`), op basis van de zaai/plant-kalenders in [gewasKalenders.json](gewasKalenders.json). Taken van vóór vandaag worden grotendeels als afgerond gemarkeerd.
- De **oogstlijst** wordt gevuld voor de huidige week, op basis van welke gewassen in de huidige maand oogstbaar zijn.
- De **gewassen-encyclopedie** (`public/demo-gewassen.json`, 102 tweetalige gewasbeschrijvingen) wordt volledig geladen.

Daardoor is de demo altijd actueel en seizoenscorrect, in welke maand je hem ook opent, zonder dat er ooit data hoeft te worden ververst.

Wijzigingen die een bezoeker in de demo maakt (taken afvinken, notities, foto's) werken echt, maar staan alleen in het geheugen en verdwijnen bij het herladen van de pagina.

De demo start in commissiemodus zodat alle functies zichtbaar zijn. Wisselen tussen community- en commissiemodus kan vrij; de pincode die de echte app daarvoor vraagt, is in de demo uitgeschakeld.

## Demo starten

```bash
npm run dev:demo     # lokaal
npm run build:demo   # productie-build van de demo
```

Voor een gehoste demo maak je een apart Vercel-project met build-commando `npm run build:demo`.

## Demo-tuin aanpassen

Andere gewassen of bedden in de demo? Pas de lijsten in [seedDemoData.ts](seedDemoData.ts) aan. Voor een nieuw gewas is ook een kalender nodig in [gewasKalenders.json](gewasKalenders.json); die kan je met [scripts/maak-demo-tuin-data.cjs](../../scripts/maak-demo-tuin-data.cjs) uit een teeltplan-export halen, of met de hand invullen (per maand begin/midden/eind een teeltcode zoals `bz`, `kvz` of `bu`).
