# Demomodus

De demomodus laat TuinPlanner draaien **zonder Firebase-project**, met voorbeelddata in het geheugen. Handig om de app te bekijken voordat je iets instelt, en voor een openbare demo-site.

## Hoe het werkt

Bij `vite --mode demo` vervangt [vite.config.ts](../../vite.config.ts) de firebase-modules door de shims in deze map:

| Module | Shim | Gedrag |
|---|---|---|
| `firebase/app` | firebaseAppShim.ts | Doet niets |
| `firebase/database` | firebaseDatabaseShim.ts | In-memory database, geladen uit `public/demo-data.json` |
| `firebase/auth` | firebaseAuthShim.ts | Automatisch ingelogd als admin; elk wachtwoord is geldig |
| `firebase/storage` | firebaseStorageShim.ts | Foto's als object-URL in het geheugen |

De rest van de applicatiecode is **identiek** aan de productieversie. Er is dus geen aparte demo-branch die kan achterlopen: elke wijziging in de app zit automatisch ook in de demo.

Wijzigingen die een bezoeker in de demo maakt (taken afvinken, notities, foto's) werken echt, maar staan alleen in het geheugen en verdwijnen bij het herladen van de pagina.

## Demo starten

```bash
npm run dev:demo     # lokaal
npm run build:demo   # productie-build van de demo
```

Voor een gehoste demo maak je een apart Vercel-project met build-commando `npm run build:demo`.

## Demo-data verversen

`public/demo-data.json` is een geanonimiseerde momentopname. Nieuwe versie maken vanuit een Firebase-export:

```bash
node scripts/maak-demo-data.cjs pad/naar/firebase-export.json
```

Het script verwijdert foto-verwijzingen, persoonsnamen, community-notities en signaleringen.
