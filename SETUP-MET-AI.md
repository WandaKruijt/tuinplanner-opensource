# TuinPlanner opzetten zonder programmeerkennis (met AI-hulp)

Geen ervaring met code, terminals of Firebase? Geen probleem. Met een AI-programmeerassistent zoals **Claude Code** (Anthropic) of **Codex** (OpenAI) zet je TuinPlanner op door in gewone taal te beschrijven wat je wilt. De assistent voert de technische stappen voor je uit en legt onderweg uit wat er gebeurt. TuinPlanner zelf is ook zo gebouwd: door een tuinvrijwilliger samen met Claude Code, zonder programmeerachtergrond.

## Wat heb je nodig?

- Een computer (Windows of Mac) en een uurtje tijd.
- Een AI-programmeerassistent, één van deze twee:
  - **Claude Code** — [claude.com/claude-code](https://claude.com/claude-code). Er is een desktop-app; een betaald Claude-abonnement volstaat.
  - **Codex** — [openai.com/codex](https://openai.com/codex). Werkt vergelijkbaar en valt onder een ChatGPT-abonnement.
- Een Google-account (voor de gratis Firebase-database) en een gratis [GitHub](https://github.com)- en [Vercel](https://vercel.com)-account.

Beide assistenten kunnen bestanden op je computer lezen en schrijven en opdrachten uitvoeren; ze vragen daarbij steeds jouw toestemming.

## Zo werkt het

Installeer de assistent, open hem in een lege map en geef hem de opdracht in je eigen woorden. Deze startprompt kan je letterlijk kopiëren:

> Ik ben vrijwilliger bij een gemeenschapstuin en heb geen programmeerervaring.
> Haal het project https://github.com/WandaKruijt/tuinplanner-opensource op
> en volg de stappen in SETUP.md om het voor onze tuin op te zetten.
> Leg me bij elke stap in eenvoudige taal uit wat je doet en wat je van mij
> nodig hebt. Onze tuin heet: [naam van je tuin].

De assistent haalt dan de code op, start eerst de demo zodat je de app kan bekijken, en loopt daarna met je door de echte installatie: het aanmaken van het Firebase-project, het invullen van de instellingen en het online zetten via Vercel.

Handige vervolgprompts:

> Start eerst de demoversie, zodat ik kan zien hoe de app eruitziet.

> Ik heb het Firebase-project aangemaakt. Help me de waarden in het
> .env-bestand in te vullen en de beveiligingsregels te publiceren.

> Zet de app nu online op Vercel en controleer of inloggen werkt.

> Vervang de voorbeeld-plattegronden door onze eigen kaarten; ik heb ze
> als afbeeldingen in de map Downloads staan.

## Tips

- **Doe stappen in de externe schermen zelf.** Het aanmaken van accounts en wachtwoorden in Firebase, GitHub en Vercel doe je zelf in de browser; de assistent vertelt precies waar je moet klikken. Deel wachtwoorden niet in de chat.
- **Vraag door.** Snap je een stap niet, vraag dan gewoon "leg dit uit alsof ik nog nooit van een database heb gehoord". De assistent past zich aan.
- **Fout gemaakt?** Beschrijf wat je ziet (of plak de foutmelding) en vraag de assistent het op te lossen. Dat is de normale manier van werken.
- **Later aanpassen kan ook zo.** Ook teksten wijzigen, je eigen gewassen importeren of de app bijwerken naar een nieuwe versie kan je via dezelfde weg aan de assistent vragen.

De volledige technische stappen staan in [SETUP.md](SETUP.md); dat document gebruikt de assistent als draaiboek.
