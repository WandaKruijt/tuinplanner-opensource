# Beveiliging

## Rollenmodel

TuinPlanner kent twee rollen, bepaald door het e-mailadres waarmee wordt ingelogd:

| Rol | Account | Rechten |
|---|---|---|
| Community | gedeeld account (`VITE_COMMUNITY_EMAIL`) | lezen, taken afvinken, notities en foto's toevoegen |
| Admin | persoonlijke accounts (`VITE_ADMIN_EMAILS`) | alles, inclusief teeltplan, bedden, gewassen en imports |

Binnen de community-rol bestaat daarnaast een **commissiemodus**: leden wisselen daarnaar via het slotje in de navigatie, met de pincode uit `VITE_COMMISSIE_PIN`. Die modus toont extra bewerkknoppen, maar is een gemaksdrempel in de browser en geen beveiligingsgrens.

De handhaving gebeurt op twee plekken, en die moeten overeenkomen:

1. **In de app** via `VITE_ADMIN_EMAILS` (bepaalt welke knoppen zichtbaar zijn).
2. **In Firebase** via de databaseregels uit [firebase-rules.template.json](firebase-rules.template.json) (bepaalt wat er echt mag). Dit is de echte beveiliging; de app-kant is alleen gemak.

## Uitgangspunten

- Zonder login is er geen toegang tot de database.
- Statische kerndata (bedden, gewassen, teeltplan) kan alleen de admin overschrijven.
- Vóór elke destructieve import maakt de app automatisch een backup in de database.
- Er staan geen geheimen in de code: alle sleutels gaan via environment variables. De Firebase `apiKey` is overigens geen geheim; de beveiliging zit in de database- en storageregels.
- Bewaar geen applicatiedata in `localStorage`; die is alleen voor UI-voorkeuren.

## Kwetsbaarheid melden

Vond je een beveiligingsprobleem in TuinPlanner? Maak dan géén openbaar GitHub-issue aan, maar meld het vertrouwelijk via de beheerder van deze repository (GitHub → Security → Report a vulnerability).
