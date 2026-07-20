# Bijdragen aan TuinPlanner

Dit document beschrijft hoe je veranderingen doorvoert, hoe de commit-stijl eruitziet, en — belangrijkst — **hoe de documentatie bijgehouden wordt**.

Voor dev-setup, zie [DEVELOPMENT.md](DEVELOPMENT.md). Voor architectuur, zie [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Werkwijze

TuinPlanner is een klein project met (meestal) één ontwikkelaar. De workflow is bewust simpel:

1. Werk direct op `main` voor productie-werk, of op `demo` voor de demo-app
2. Test lokaal (`npm run dev`) voordat je commit
3. Commit in logische eenheden (niet 10 dingen tegelijk)
4. Push — Vercel deployt automatisch naar de juiste URL

Feature-branches zijn niet nodig voor solo-werk, maar gebruik ze gerust als je een grotere refactor wilt uitproberen zonder `main` te raken.

### Vóór een push: korte checklist

- [ ] `npx tsc --noEmit` — geen type-errors
- [ ] `npm run build` — productie-build slaagt
- [ ] Lokaal getest in de browser
- [ ] Commit-bericht volgt de conventie hieronder
- [ ] [CHANGELOG.md](CHANGELOG.md) bijgewerkt (zie "Documentatie-onderhoud")
- [ ] Andere docs bijgewerkt indien nodig (zie "Documentatie-onderhoud")

---

## Commit-berichten

Commit-berichten zijn **in het Nederlands** en starten met een type-prefix:

| Prefix | Wanneer |
|---|---|
| `feat:` | Nieuwe functionaliteit |
| `fix:` | Bugfix |
| `docs:` | Documentatie-wijziging (inclusief in-app handleiding) |
| `refactor:` | Code-restructurering zonder gedragsverandering |
| `chore:` | Infrastructuur, build-config, dependencies |
| `style:` | Alleen opmaak/Tailwind-klassen |

Format: `type: korte samenvatting (onder 70 tekens)`.

Voorbeelden uit deze repo:
```
feat: multi-foto's, doorposten teeltplan-taken en plattegronden pagina
fix: storage rules paden en foto-URL consistentie
docs: handleiding commissie werkproces teeltplan taken
chore: fix deployment setup en voeg DEPLOYMENT.md toe
```

Voor grotere wijzigingen: voeg een body met bullet-list toe achter een lege regel. Voorbeeld:

```
fix: storage rules paden en foto-URL consistentie

- storage.rules: paden aangepast naar fotos/taken, fotos/oogstInstructies, …
- TaakFormulier + AdHocTaak: alleen nog fotoUrls schrijven
- AdHocTaak: toast-melding bij foto-upload-fout
```

---

## Code-wijzigingen: wat wel en niet

### Wel doen
- Kleine, gerichte wijzigingen per commit
- Bestaande patronen volgen (zie [DEVELOPMENT.md](DEVELOPMENT.md))
- Nederlandse domein-termen gebruiken (`Taak`, `gewas`, `bed`)
- `getTaakFotos()` gebruiken om foto's te lezen, nooit `taak.fotoUrl` direct
- `<TranslatedText nl=... en=... />` voor user-content

### Niet doen
- **`MigratieHelper.tsx` committen.** Dat is een lokale eenmalige tool. Als je in [`BeheerInstellingen.tsx`](src/components/BeheerInstellingen.tsx) werkt en de MigratieHelper staat geïmporteerd: verwijder die regels voor de commit.
- **Destructieve bulk-operaties zonder backup.** Gebruik `firebaseService.backupCollectie()` vóór destructieve imports.
- **Nieuwe localStorage-afhankelijkheid voor data.** localStorage is alleen nog voor UI-voorkeuren (taal, tab). Zie [`docs/archief/SECURITY-LESSONS-LEARNED.md`](docs/archief/SECURITY-LESSONS-LEARNED.md).
- **`.env` of `.env.keys` committen.** Die staan in `.gitignore` — laat dat zo.
- **Firebase service-account-sleutels in de repo.** Never.

---

## Documentatie-onderhoud

> **Dit is de kern van dit document.** Documentatie die niet bijgehouden wordt raakt binnen enkele weken verouderd en is dan erger dan geen documentatie. Behandel docs als code: een wijziging in het gedrag is niet af tot de docs kloppen.

### Bij elke commit: CHANGELOG

Elke commit die gebruiker-zichtbaar gedrag verandert, hoort terug in [CHANGELOG.md](CHANGELOG.md) onder de kop **"Nog niet gereleased"**. Bij een release verplaats je die regels naar een nieuwe versie-sectie met datum.

**Wel in CHANGELOG:** features, bugfixes die gebruikers raken, wijzigingen in gedrag of UI, breaking changes in data-structuur.

**Niet in CHANGELOG:** refactoring zonder gedragsverandering, stylistische tweaks, interne helpers, test-toevoegingen.

### Bij elke wijziging: check welke docs mogelijk raken

| Soort wijziging | Update deze doc(s) |
|---|---|
| Nieuwe feature of functionaliteit | [CHANGELOG.md](CHANGELOG.md), [README.md](README.md) als feature-lijst verandert |
| Nieuwe Firebase-collectie of schema-wijziging | [ARCHITECTURE.md](ARCHITECTURE.md) sectie "Firebase Realtime Database — schema" |
| Nieuw centraal concept (venster-type, …) | [ARCHITECTURE.md](ARCHITECTURE.md) sectie "Centrale concepten" |
| Nieuw script in `scripts/` | [DEVELOPMENT.md](DEVELOPMENT.md) sectie "Scripts in `scripts/`" |
| Nieuw npm-script | [DEVELOPMENT.md](DEVELOPMENT.md) sectie "Scripts" |
| Wijziging in env-vars | [`.env.example`](.env.example) + [DEVELOPMENT.md](DEVELOPMENT.md) |
| Wijziging in rol-rechten | [SECURITY.md](SECURITY.md) sectie "Rol-matrix" |
| Wijziging in deploy-proces | [DEPLOYMENT.md](DEPLOYMENT.md) |
| In-app UI-tekst | [`src/components/Handleiding.tsx`](src/components/Handleiding.tsx) (voor eindgebruikers) |

Als je niet zeker weet welke docs raken: scan de [docs/INDEX.md](docs/INDEX.md) en kijk welke titels overlappen met je wijziging.

### Maandelijks: korte docs-sweep (15 minuten)

Eens per maand (bv. op de 1e, of na een release):

1. Open [CHANGELOG.md](CHANGELOG.md). Staat er een "Nog niet gereleased" sectie met inhoud? Maak er een release van met de datum van vandaag.
2. Lees [README.md](README.md) in één minuut door. Klopt het feature-overzicht nog? Klopt de tech-stack nog?
3. Open [docs/INDEX.md](docs/INDEX.md). Is er een nieuw document dat hier nog niet in staat? Voeg toe.
4. Scan `docs/archief/` — staan er nieuwe bestanden die daar terecht zijn gekomen en historisch zijn? Zo ja, noem ze kort in [`docs/archief/README.md`](docs/archief/README.md).

### Per kwartaal: diepere revisie (30 minuten)

Eens per kwartaal:

1. Doorloop [ARCHITECTURE.md](ARCHITECTURE.md) — beschrijven de Firebase-schema-sectie en de centrale concepten nog de werkelijkheid?
2. Doorloop [DEVELOPMENT.md](DEVELOPMENT.md) — zijn de scripts nog actueel? Zijn er nieuwe bestanden die in "Waar vind ik wat?" thuishoren?
3. Check of er docs in `docs/` zijn die naar `docs/archief/` kunnen (eenmalige migraties, afgeronde incidenten).
4. Een bestand dat nergens naar linkt is een kandidaat voor archivering of verwijdering.

### Bij een release

Naast de CHANGELOG-regel:

1. Bump versie in [`package.json`](package.json) volgens [Semantic Versioning](https://semver.org/lang/nl/) (MAJOR.MINOR.PATCH)
2. Commit met `chore: bump version naar X.Y.Z`
3. Tag optioneel: `git tag vX.Y.Z && git push --tags`

### Algemene regels

- **Docs dicht bij de code.** Liever één sectie in ARCHITECTURE.md dan een apart bestand dat niemand vindt.
- **Linken is gratis.** Wanneer je iets in docs noemt dat ergens anders staat uitgelegd, link erheen.
- **Eerlijk over beperkingen.** Als een feature half af is of een bekende bug heeft: noem dat in CHANGELOG of de relevante doc. Stilte wordt later frustratie.
- **Bij twijfel: korter is beter.** Een lange doc die niemand leest helpt minder dan drie regels die raak zijn.

---

## Als je Claude Code of andere AI-assistenten gebruikt

Deze repo wordt mede onderhouden met Claude Code (CLI). Werkafspraken:

- Claude volgt de regels in deze CONTRIBUTING.md en in de auto-memory
- Claude moet commit-berichten ondertekenen met `Co-Authored-By: Claude Opus <...>` (of de relevante modelversie)
- Claude moet **niet** `MigratieHelper.tsx` meenemen in commits
- Claude moet bij iedere functionele wijziging voorstellen om CHANGELOG.md bij te werken

Die regels staan ook als persistente memory zodat ze per sessie onthouden worden.

---

## Samenvatting voor haastige mensen

1. Commit in het Nederlands met `feat:` / `fix:` / `docs:` / `chore:` / `refactor:`
2. Update [CHANGELOG.md](CHANGELOG.md) bij elke gedrags-zichtbare wijziging
3. Update de relevante andere doc uit de tabel bij "Bij elke wijziging"
4. Eens per maand 15 min schoonmaak, eens per kwartaal 30 min diepere revisie
5. `MigratieHelper.tsx` blijft lokaal, `.env` blijft lokaal, service-account-sleutels nooit in git
