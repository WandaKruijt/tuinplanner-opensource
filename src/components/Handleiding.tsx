import React from 'react';
import {
  HelpCircle,
  Calendar,
  Apple,
  BookOpen,
  MessageCircle,
  Plus,
  Check,
  Lock,
  LayoutDashboard,
  ListTodo,
  Upload,
  Settings,
  Map,
  Sprout,
  Code,
  Sparkles
} from 'lucide-react';
import { useI18n } from '../i18n';
import { GARDEN_NAME } from '../config/appConfig';

// ============================================
// HANDLEIDING / HELP PAGINA
// ============================================

interface SectieProps {
  titel: string;
  icoon: React.ReactNode;
  children: React.ReactNode;
  kleur?: string;
}

function Sectie({ titel, icoon, children, kleur = 'tuin' }: SectieProps) {
  const kleuren = {
    tuin: 'bg-tuin-50 border-tuin-200',
    amber: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className={`rounded-xl border ${kleuren[kleur as keyof typeof kleuren]} p-4 mb-4`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${kleur === 'amber' ? 'bg-amber-100' : 'bg-tuin-100'}`}>
          {icoon}
        </div>
        <h3 className="font-bold text-gray-800">{titel}</h3>
      </div>
      <div className="text-gray-600 text-sm space-y-2">
        {children}
      </div>
    </div>
  );
}

interface FunctieItemProps {
  icoon: React.ReactNode;
  titel: string;
  beschrijving: string;
}

function FunctieItem({ icoon, titel, beschrijving }: FunctieItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="text-tuin-600 mt-0.5">
        {icoon}
      </div>
      <div>
        <p className="font-medium text-gray-700">{titel}</p>
        <p className="text-gray-500 text-sm">{beschrijving}</p>
      </div>
    </div>
  );
}

export function Handleiding() {
  const { taal } = useI18n();

  const content = taal === 'nl' ? {
    title: 'Handleiding',
    subtitle: 'Welkom bij TuinPlanner! Hier vind je een overzicht van alle functies.',

    // Open deel
    openTitle: 'Voor iedereen',
    openSubtitle: 'Deze functies zijn beschikbaar voor alle tuinleden',

    weekOverzicht: {
      titel: 'Weekoverzicht',
      beschrijving: 'Je startpunt voor de tuinwerkzaamheden:',
      items: [
        { titel: 'Teeltplan taken', beschrijving: 'Bekijk welke zaaien, planten en oogsten er deze week gepland staan.' },
        { titel: 'Handmatige taken', beschrijving: 'Zie extra taken die de commissie heeft toegevoegd.' },
        { titel: 'Taak afvinken', beschrijving: 'Klik op een bed om aan te geven dat je het hebt gedaan. Vul je naam in.' },
        { titel: 'Snelle taak melden', beschrijving: 'Zie je slakken, onkruid of iets anders? Klik op de groene + knop om het te melden.' },
      ]
    },

    oogstlijst: {
      titel: 'Oogstlijst',
      beschrijving: 'Wat kun je deze week oogsten:',
      items: [
        { titel: 'Beschikbare gewassen', beschrijving: 'Groene items zijn klaar om te oogsten.' },
        { titel: 'Hoeveelheid per persoon', beschrijving: 'Zie hoeveel je mag meenemen.' },
        { titel: 'Locatie', beschrijving: 'Waar vind je het gewas in de tuin.' },
        { titel: 'Oogst registreren', beschrijving: 'Klik op "Oogsten" en vul je naam in.' },
      ]
    },

    oogstinstructies: {
      titel: 'Hoe Oogsten',
      beschrijving: 'Instructies per gewas:',
      items: [
        { titel: 'Oogstmethode', beschrijving: 'Hoe je elk gewas het beste kunt oogsten.' },
        { titel: 'Tips', beschrijving: 'Extra tips voor het beste resultaat.' },
      ]
    },

    berichten: {
      titel: 'Berichten',
      beschrijving: 'Communiceer met de commissie:',
      items: [
        { titel: 'Probleem melden', beschrijving: 'Iets mis in de tuin? Laat het weten.' },
        { titel: 'Vraag stellen', beschrijving: 'Heb je een vraag over de tuin?' },
        { titel: 'Suggestie', beschrijving: 'Ideeën voor verbetering?' },
        { titel: 'Compliment', beschrijving: 'Iets moois gezien? Deel het!' },
      ]
    },

    // Besloten deel
    geslotenTitle: 'Commissie functies',
    geslotenSubtitle: 'Extra functies achter het slotje (PIN vereist)',

    dashboard: {
      titel: 'Dashboard',
      beschrijving: 'Overzicht van de hele tuin:',
      items: [
        { titel: 'Statistieken', beschrijving: 'Aantal open taken, urgente items, voortgang.' },
        { titel: 'Secties en bedden', beschrijving: 'Bekijk alle bedden per sectie.' },
        { titel: 'Plattegronden', beschrijving: 'Bekijk de kaart van elke sectie.' },
        { titel: 'Bed details', beschrijving: 'Klik op een bed voor het teeltplan.' },
      ]
    },

    taken: {
      titel: 'Alle Taken',
      beschrijving: 'Volledig takenbeheer:',
      items: [
        { titel: 'Taken aanmaken', beschrijving: 'Voeg handmatig taken toe.' },
        { titel: 'Taken bewerken', beschrijving: 'Wijzig beschrijving, prioriteit, deadline.' },
        { titel: 'Instructies toevoegen', beschrijving: 'Voeg uitleg toe voor de community.' },
        { titel: 'Filteren en zoeken', beschrijving: 'Vind snel de juiste taken.' },
      ]
    },

    importeren: {
      titel: 'Importeren',
      beschrijving: 'Data inladen:',
      items: [
        { titel: 'Bedden CSV', beschrijving: 'Importeer de beddenlijst.' },
        { titel: 'Gewassen CSV', beschrijving: 'Importeer gewas informatie.' },
        { titel: 'Teeltplan CSV', beschrijving: 'Importeer het jaarplan.' },
      ]
    },

    instellingen: {
      titel: 'Instellingen',
      beschrijving: 'Beheer de app:',
      items: [
        { titel: 'Data exporteren', beschrijving: 'Maak een backup van alle data.' },
        { titel: 'Data wissen', beschrijving: 'Reset de app (voorzichtig!).' },
      ]
    },

    tip: 'Tip: Schakel tussen community en commissie modus via het slotje in de navigatie.',

    // Over TuinPlanner
    overTitle: 'Over TuinPlanner',
    overIntro: `Een plannings- en taakbeheer app voor ${GARDEN_NAME}. Teamleden kunnen taken inzien, afvinken en opmerkingen achterlaten. Real-time synchronisatie via Firebase houdt alles up-to-date.`,
    overTech: 'Tech stack: React, TypeScript, Tailwind CSS, Firebase',
    overCredits: 'TuinPlanner is open source ontwikkeld door Riel Roots, Permacultuur Community Tuin Eindhoven (Wanda Kruijt & Claude Code, Anthropic), voortgekomen uit het Phood Community Garden initiatief, en vrij te gebruiken voor niet-commerciële tuinprojecten.',
  } : {
    title: 'User Guide',
    subtitle: 'Welcome to TuinPlanner! Here you\'ll find an overview of all features.',

    // Open deel
    openTitle: 'For everyone',
    openSubtitle: 'These features are available to all garden members',

    weekOverzicht: {
      titel: 'Week Overview',
      beschrijving: 'Your starting point for garden work:',
      items: [
        { titel: 'Cultivation tasks', beschrijving: 'See what sowing, planting and harvesting is planned this week.' },
        { titel: 'Manual tasks', beschrijving: 'See extra tasks added by the committee.' },
        { titel: 'Mark complete', beschrijving: 'Click on a bed to indicate you\'ve done it. Enter your name.' },
        { titel: 'Report quick task', beschrijving: 'See slugs, weeds or something else? Click the green + button to report it.' },
      ]
    },

    oogstlijst: {
      titel: 'Harvest List',
      beschrijving: 'What you can harvest this week:',
      items: [
        { titel: 'Available crops', beschrijving: 'Green items are ready to harvest.' },
        { titel: 'Amount per person', beschrijving: 'See how much you can take.' },
        { titel: 'Location', beschrijving: 'Where to find the crop in the garden.' },
        { titel: 'Register harvest', beschrijving: 'Click "Harvest" and enter your name.' },
      ]
    },

    oogstinstructies: {
      titel: 'How to Harvest',
      beschrijving: 'Instructions per crop:',
      items: [
        { titel: 'Harvest method', beschrijving: 'How to best harvest each crop.' },
        { titel: 'Tips', beschrijving: 'Extra tips for the best result.' },
      ]
    },

    berichten: {
      titel: 'Messages',
      beschrijving: 'Communicate with the committee:',
      items: [
        { titel: 'Report problem', beschrijving: 'Something wrong in the garden? Let us know.' },
        { titel: 'Ask question', beschrijving: 'Have a question about the garden?' },
        { titel: 'Suggestion', beschrijving: 'Ideas for improvement?' },
        { titel: 'Compliment', beschrijving: 'Seen something nice? Share it!' },
      ]
    },

    // Besloten deel
    geslotenTitle: 'Committee features',
    geslotenSubtitle: 'Extra features behind the lock (PIN required)',

    dashboard: {
      titel: 'Dashboard',
      beschrijving: 'Overview of the entire garden:',
      items: [
        { titel: 'Statistics', beschrijving: 'Number of open tasks, urgent items, progress.' },
        { titel: 'Sections and beds', beschrijving: 'View all beds per section.' },
        { titel: 'Maps', beschrijving: 'View the map of each section.' },
        { titel: 'Bed details', beschrijving: 'Click on a bed for the cultivation plan.' },
      ]
    },

    taken: {
      titel: 'All Tasks',
      beschrijving: 'Full task management:',
      items: [
        { titel: 'Create tasks', beschrijving: 'Manually add tasks.' },
        { titel: 'Edit tasks', beschrijving: 'Change description, priority, deadline.' },
        { titel: 'Add instructions', beschrijving: 'Add explanation for the community.' },
        { titel: 'Filter and search', beschrijving: 'Quickly find the right tasks.' },
      ]
    },

    importeren: {
      titel: 'Import',
      beschrijving: 'Load data:',
      items: [
        { titel: 'Beds CSV', beschrijving: 'Import the bed list.' },
        { titel: 'Crops CSV', beschrijving: 'Import crop information.' },
        { titel: 'Cultivation plan CSV', beschrijving: 'Import the year plan.' },
      ]
    },

    instellingen: {
      titel: 'Settings',
      beschrijving: 'Manage the app:',
      items: [
        { titel: 'Export data', beschrijving: 'Create a backup of all data.' },
        { titel: 'Clear data', beschrijving: 'Reset the app (be careful!).' },
      ]
    },

    tip: 'Tip: Switch between community and committee mode via the lock icon in the navigation.',

    // Over TuinPlanner
    overTitle: 'About TuinPlanner',
    overIntro: `A planning and task management app for ${GARDEN_NAME}. Team members can view tasks, check them off, and leave comments. Real-time synchronization via Firebase keeps everything up-to-date.`,
    overTech: 'Tech stack: React, TypeScript, Tailwind CSS, Firebase',
    overCredits: 'TuinPlanner is open source, developed by Riel Roots, Permaculture Community Garden Eindhoven (Wanda Kruijt & Claude Code, Anthropic), which grew out of the Phood Community Garden initiative. Free to use for non-commercial garden projects.',
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-tuin-100 rounded-lg">
            <HelpCircle className="w-6 h-6 text-tuin-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{content.title}</h1>
        </div>
        <p className="text-gray-600">{content.subtitle}</p>
      </div>

      {/* Open deel */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sprout className="w-5 h-5 text-tuin-600" />
          <h2 className="text-lg font-bold text-tuin-800">{content.openTitle}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">{content.openSubtitle}</p>

        <Sectie
          titel={content.weekOverzicht.titel}
          icoon={<Calendar className="w-5 h-5 text-tuin-600" />}
        >
          <p className="mb-2">{content.weekOverzicht.beschrijving}</p>
          {content.weekOverzicht.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={i === 3 ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>

        <Sectie
          titel={content.oogstlijst.titel}
          icoon={<Apple className="w-5 h-5 text-tuin-600" />}
        >
          <p className="mb-2">{content.oogstlijst.beschrijving}</p>
          {content.oogstlijst.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={<Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>

        <Sectie
          titel={content.oogstinstructies.titel}
          icoon={<BookOpen className="w-5 h-5 text-tuin-600" />}
        >
          <p className="mb-2">{content.oogstinstructies.beschrijving}</p>
          {content.oogstinstructies.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={<Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>

        <Sectie
          titel={content.berichten.titel}
          icoon={<MessageCircle className="w-5 h-5 text-tuin-600" />}
        >
          <p className="mb-2">{content.berichten.beschrijving}</p>
          {content.berichten.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={<Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>
      </div>

      {/* Gesloten deel */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-amber-800">{content.geslotenTitle}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">{content.geslotenSubtitle}</p>

        <Sectie
          titel={content.dashboard.titel}
          icoon={<LayoutDashboard className="w-5 h-5 text-amber-600" />}
          kleur="amber"
        >
          <p className="mb-2">{content.dashboard.beschrijving}</p>
          {content.dashboard.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={i === 2 ? <Map className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>

        <Sectie
          titel={content.taken.titel}
          icoon={<ListTodo className="w-5 h-5 text-amber-600" />}
          kleur="amber"
        >
          <p className="mb-2">{content.taken.beschrijving}</p>
          {content.taken.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={<Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>

        <Sectie
          titel={content.importeren.titel}
          icoon={<Upload className="w-5 h-5 text-amber-600" />}
          kleur="amber"
        >
          <p className="mb-2">{content.importeren.beschrijving}</p>
          {content.importeren.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={<Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>

        <Sectie
          titel={content.instellingen.titel}
          icoon={<Settings className="w-5 h-5 text-amber-600" />}
          kleur="amber"
        >
          <p className="mb-2">{content.instellingen.beschrijving}</p>
          {content.instellingen.items.map((item, i) => (
            <FunctieItem
              key={i}
              icoon={<Check className="w-4 h-4" />}
              titel={item.titel}
              beschrijving={item.beschrijving}
            />
          ))}
        </Sectie>
      </div>

      {/* Tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 mb-8">
        <p>💡 {content.tip}</p>
      </div>

      {/* Over TuinPlanner */}
      <div className="bg-gradient-to-r from-tuin-600 to-tuin-700 rounded-xl shadow-sm p-6 text-white">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Sprout className="w-5 h-5" />
          {content.overTitle}
        </h3>
        <p className="text-tuin-100 text-sm mb-4">{content.overIntro}</p>
        <div className="flex items-center gap-2 text-sm text-tuin-200 mb-2">
          <Code className="w-4 h-4" />
          <span>{content.overTech}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-tuin-200">
          <Sparkles className="w-4 h-4" />
          <span>{content.overCredits}</span>
        </div>
      </div>
    </div>
  );
}
