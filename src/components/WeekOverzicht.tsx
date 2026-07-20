import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle,
  Clock,
  Play,
  Wrench,
  MessageSquare,
  X,
  User,
  Link as LinkIcon,
  AlertCircle,
  Sprout,
  Check,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Repeat,
  Pin
} from 'lucide-react';
import { useApp, useTaken, useTeeltplan, useBedVoortgang } from '../context/AppContext';
import { useI18n } from '../i18n';
import { vertaalGewas, actieTypes } from '../i18n/woordenboek';
import type { Taak, TaakStatus, TaakNotitie, TeeltCode, BedVoortgang } from '../types';
import { TaakFormulier } from './TaakFormulier';
import { TranslatedText } from './TranslatedText';
import { TEELTCODE_ACTIES, TEELTCODE_ACTIES_EN, TEELTCODE_TAAKTYPE } from '../types';
import {
  getWeekInfo,
  getWeekGrenzen,
  getWeekNummer,
  formatDatum,
  periodeNaarTekst,
  maandNaarTekst,
  nuISO,
  vandaagISO,
  bepaalPeriode,
} from '../utils/dateUtils';
import { getTeeltSamenvatting, berekenDynamischePrioriteit } from '../utils/taskGenerator';
import { getTaakFotos } from '../utils/fotoUtils';
import { GegroepeerdeTeeltplanTaken } from './GegroepeerdeTeeltplanTaken';
import { usePinnedTasks } from '../hooks/usePinnedTasks';

// ============================================
// HELPER FUNCTIE VOOR WEEK NAAR DEADLINE
// ============================================

/**
 * Berekent een deadline datum (vrijdag van de week) op basis van weeknummer en jaar
 */
function getWeekDeadline(weekNummer: number, jaar: number): string {
  // ISO week begint op maandag, we pakken de vrijdag (dag 5)
  const jan4 = new Date(jaar, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

  const targetDate = new Date(week1Monday);
  targetDate.setDate(week1Monday.getDate() + (weekNummer - 1) * 7 + 4); // +4 = vrijdag

  return targetDate.toISOString().split('T')[0];
}

// ============================================
// HELPER COMPONENT VOOR KLIKBARE URLS
// ============================================

interface KlikbareLinkProps {
  url: string;
  className?: string;
}

function KlikbareLink({ url, className = '' }: KlikbareLinkProps) {
  // Check of het een geldige URL is
  const isUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('www.');
  const href = url.startsWith('www.') ? `https://${url}` : url;

  if (isUrl) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-blue-600 hover:text-blue-800 underline break-all ${className}`}
      >
        {url}
      </a>
    );
  }

  return <span className={className}>{url}</span>;
}

// ============================================
// ACTIE TYPE CONFIGURATIE
// ============================================

interface ActieTypeConfig {
  labelNl: string;
  labelEn: string;
  icon: string;
  color: string;
}

const ACTIE_TYPE_CONFIG: Record<string, ActieTypeConfig> = {
  'Kas zaaien': { labelNl: 'Kas zaaien', labelEn: 'Sow in greenhouse', icon: '🌱', color: 'bg-green-100 text-green-800' },
  'Kas voorzaaien': { labelNl: 'Kas voorzaaien', labelEn: 'Pre-sow in greenhouse', icon: '🌱', color: 'bg-green-100 text-green-800' },
  'Buiten zaaien': { labelNl: 'Buiten zaaien', labelEn: 'Sow outdoors', icon: '🌿', color: 'bg-emerald-100 text-emerald-800' },
  'Buiten voorzaaien': { labelNl: 'Buiten voorzaaien', labelEn: 'Pre-sow outdoors', icon: '🌿', color: 'bg-emerald-100 text-emerald-800' },
  'Kas uitplanten': { labelNl: 'Uitplanten (kas)', labelEn: 'Transplant (greenhouse)', icon: '🏠', color: 'bg-blue-100 text-blue-800' },
  'Buiten uitplanten': { labelNl: 'Uitplanten (buiten)', labelEn: 'Transplant (outdoor)', icon: '🌳', color: 'bg-teal-100 text-teal-800' },
  'Oogsten': { labelNl: 'Oogsten', labelEn: 'Harvest', icon: '✂️', color: 'bg-orange-100 text-orange-800' },
};

// ============================================
// WEEK NAVIGATIE
// ============================================

interface WeekNavigatieProps {
  datum: Date;
  onVorigeWeek: () => void;
  onVolgendeWeek: () => void;
  onDezeWeek: () => void;
}

function WeekNavigatie({ datum, onVorigeWeek, onVolgendeWeek, onDezeWeek }: WeekNavigatieProps) {
  const { taal } = useI18n();
  const weekInfo = getWeekInfo(datum);
  const isHuidigeWeek = getWeekInfo().weekNummer === weekInfo.weekNummer;

  // Gebruik weekstart voor periode/maand bepaling (consistenter dan geselecteerde datum)
  const weekStartDag = weekInfo.startDatum.getDate();
  const weekStartMaand = weekInfo.startDatum.getMonth();
  const weekStartJaar = weekInfo.startDatum.getFullYear();
  const periodeVanWeekStart = bepaalPeriode(weekStartDag, weekStartJaar, weekStartMaand + 1);

  const naarVandaagTekst = taal === 'nl' ? 'Naar vandaag' : 'Go to today';

  return (
    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
      <button
        onClick={onVorigeWeek}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <div className="text-center">
        <div className="flex items-center gap-2 justify-center">
          <Calendar className="w-5 h-5 text-tuin-600" />
          <h3 className="text-lg font-bold text-tuin-800">
            {taal === 'nl' ? 'Week' : 'Week'} {weekInfo.weekNummer}
          </h3>
          {!isHuidigeWeek && (
            <button
              onClick={onDezeWeek}
              className="text-xs text-tuin-600 hover:text-tuin-700 underline"
            >
              {naarVandaagTekst}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {formatDatum(weekInfo.startDatum)} - {formatDatum(weekInfo.eindDatum)}
        </p>
        <p className="text-xs text-tuin-600 mt-1">
          {periodeNaarTekst(periodeVanWeekStart)} {maandNaarTekst(weekStartMaand)}
        </p>
      </div>

      <button
        onClick={onVolgendeWeek}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}

// ============================================
// GEGROEPEERDE TEELT SAMENVATTING
// ============================================

interface GegroepeerdeTeeltItem {
  gewas: string;
  bedIds: string[];
}

interface ActieGroep {
  actie: string;
  config: ActieTypeConfig;
  gewassen: GegroepeerdeTeeltItem[];
}

// Interface voor teeltplan item met code en bed status
interface BedInfo {
  bedId: string;
  deelVanBed: string;
  teelt: string;
}

interface TeeltSamenvattingItem {
  gewas: string;
  bedden: BedInfo[];
  code: TeeltCode;
}

// Bed status info voor weergave
interface BedStatusInfo {
  bedId: string;
  status: 'beschikbaar' | 'uitgesteld' | 'vervroegd' | 'afgerond' | 'automatisch_doorgeschoven';
  voortgangId?: string;
  deelVanBed: string;
  teelt: string;
  geplandWeek?: number;
  oorspronkelijkeWeek?: number;
  taakId?: string; // Direct link naar de taak in "Alle Taken"
}

interface TeeltSamenvattingProps {
  datum: Date;
  weekNummer: number;
  jaar: number;
  isCommissie: boolean;
  bedVoortgang: BedVoortgang[];
  taken: Taak[]; // Voor taakId lookup
  onBedUitstel: (actie: string, gewas: string, bedId: string, code: TeeltCode, taakId?: string) => void;
  onBedVervroeg: (actie: string, gewas: string, bedId: string, code: TeeltCode, taakId?: string) => void;
  onBedAfgerond: (actie: string, gewas: string, bedId: string, code: TeeltCode, naam: string, taakId?: string) => void;
  onBedHeropenen: (actie: string, gewas: string, bedId: string, code: TeeltCode, taakId?: string) => void;
  onGewasKlik: (actie: string, gewas: string, bedIds: string[], code: TeeltCode) => void;
}

function TeeltSamenvattingKaart({
  datum,
  weekNummer,
  jaar,
  isCommissie,
  bedVoortgang,
  taken,
  onBedUitstel,
  onBedVervroeg,
  onBedAfgerond,
  onBedHeropenen,
  onGewasKlik
}: TeeltSamenvattingProps) {
  const teeltplan = useTeeltplan();
  const { state } = useApp();
  const { taal } = useI18n();
  const [uitgeklapt, setUitgeklapt] = useState<Record<string, boolean>>({});
  const [afvinkNaam, setAfvinkNaam] = useState(state.ui.gebruikersnaam || '');
  const [afvinkBed, setAfvinkBed] = useState<{actie: string, gewas: string, bedId: string, code: TeeltCode, taakId?: string} | null>(null);

  const samenvatting = getTeeltSamenvatting(teeltplan, datum);

  // Helper: zoek de taakId voor een specifiek bed/gewas/code combinatie
  const vindTaakId = (gewas: string, bedId: string, code: TeeltCode): string | undefined => {
    const taak = taken.find(t =>
      t.isAutomatisch &&
      t.bronGewas === gewas &&
      t.bronTeeltCode === code &&
      t.bedId === bedId
    );
    return taak?.id;
  };

  // Helper: krijg status voor een specifiek bed
  // Toon in week X alle bedden waar: geplandWeek === X EN status !== 'afgerond'
  const getBedStatus = (bedInfo: BedInfo, gewas: string, actie: string, code: TeeltCode, oorspronkelijkeWeekUitTeeltplan: number): BedStatusInfo | null => {
    // Zoek in voortgang data
    const voortgang = bedVoortgang.find(bv =>
      bv.bedId === bedInfo.bedId &&
      bv.gewas === gewas &&
      bv.actie === actie &&
      bv.code === code
    );

    const baseInfo = {
      bedId: bedInfo.bedId,
      deelVanBed: bedInfo.deelVanBed,
      teelt: bedInfo.teelt,
      oorspronkelijkeWeek: oorspronkelijkeWeekUitTeeltplan
    };

    if (!voortgang) {
      // Geen voortgang record = dit bed is nog in de oorspronkelijke week
      // Toon alleen als de oorspronkelijke week === huidige weergave week
      if (oorspronkelijkeWeekUitTeeltplan === weekNummer) {
        return { ...baseInfo, status: 'beschikbaar', geplandWeek: weekNummer };
      }
      // Niet tonen in andere weken
      return null;
    }

    // Er is een voortgang record
    if (voortgang.status === 'afgerond') {
      // Afgeronde bedden alleen tonen in de week waar ze afgerond zijn (geplandWeek)
      if (voortgang.geplandWeek === weekNummer && voortgang.geplandJaar === jaar) {
        return { ...baseInfo, status: 'afgerond', voortgangId: voortgang.id, geplandWeek: voortgang.geplandWeek };
      }
      return null;
    }

    // Voor alle andere statussen: toon alleen als geplandWeek === huidige week
    if (voortgang.geplandWeek === weekNummer && voortgang.geplandJaar === jaar) {
      return {
        ...baseInfo,
        status: voortgang.status as BedStatusInfo['status'],
        voortgangId: voortgang.id,
        geplandWeek: voortgang.geplandWeek,
        oorspronkelijkeWeek: voortgang.oorspronkelijkeWeek
      };
    }

    // Bed is gepland voor een andere week, niet tonen
    return null;
  };

  // Verzamel alle bedden die in deze week getoond moeten worden:
  // 1. Bedden uit teeltplan voor deze week ZONDER voortgang record (beschikbaar)
  // 2. Bedden met voortgang record waar geplandWeek === deze week (uitgesteld/vervroegd/afgerond naar hier)

  // Stap 1: Haal alle bedden uit teeltplan voor deze week
  const beddenUitTeeltplan = new Map<string, { gewas: string; actie: string; code: TeeltCode; bedInfo: BedInfo }>();
  samenvatting.forEach(item => {
    const key = `${item.gewas}-${item.actie}-${item.bedId}-${item.code}`;
    beddenUitTeeltplan.set(key, {
      gewas: item.gewas,
      actie: item.actie,
      code: item.code,
      bedInfo: { bedId: item.bedId, deelVanBed: item.deelVanBed, teelt: item.teelt }
    });
  });

  // Stap 2: Verzamel bedden die naar deze week zijn geschoven (via voortgang records)
  const geschovenBedden = bedVoortgang.filter(bv =>
    bv.geplandWeek === weekNummer && bv.geplandJaar === jaar
  );

  // Stap 3: Bouw de finale lijst van bedden met statussen
  const beddenMetStatus: { gewas: string; actie: string; code: TeeltCode; status: BedStatusInfo }[] = [];

  // Voeg teeltplan bedden toe die NIET zijn verschoven
  beddenUitTeeltplan.forEach((item, key) => {
    const voortgang = bedVoortgang.find(bv =>
      bv.bedId === item.bedInfo.bedId &&
      bv.gewas === item.gewas &&
      bv.actie === item.actie &&
      bv.code === item.code
    );

    // Zoek de taakId voor dit bed
    const taakId = vindTaakId(item.gewas, item.bedInfo.bedId, item.code);

    if (!voortgang) {
      // Geen voortgang = beschikbaar in originele week (deze week)
      beddenMetStatus.push({
        gewas: item.gewas,
        actie: item.actie,
        code: item.code,
        status: {
          bedId: item.bedInfo.bedId,
          status: 'beschikbaar',
          deelVanBed: item.bedInfo.deelVanBed,
          teelt: item.bedInfo.teelt,
          geplandWeek: weekNummer,
          oorspronkelijkeWeek: weekNummer,
          taakId
        }
      });
    } else if (voortgang.geplandWeek === weekNummer && voortgang.geplandJaar === jaar) {
      // Voortgang voor deze week
      beddenMetStatus.push({
        gewas: item.gewas,
        actie: item.actie,
        code: item.code,
        status: {
          bedId: item.bedInfo.bedId,
          status: voortgang.status as BedStatusInfo['status'],
          voortgangId: voortgang.id,
          deelVanBed: item.bedInfo.deelVanBed,
          teelt: item.bedInfo.teelt,
          geplandWeek: voortgang.geplandWeek,
          oorspronkelijkeWeek: voortgang.oorspronkelijkeWeek,
          taakId
        }
      });
    }
    // Als voortgang naar andere week verwijst, voegen we niet toe (verschoven naar andere week)
  });

  // Voeg geschoven bedden toe die NIET uit teeltplan van deze week komen
  geschovenBedden.forEach(bv => {
    const key = `${bv.gewas}-${bv.actie}-${bv.bedId}-${bv.code}`;
    // Check of dit bed al is toegevoegd via teeltplan
    const alToegevoegd = beddenMetStatus.some(b =>
      b.gewas === bv.gewas && b.actie === bv.actie && b.status.bedId === bv.bedId && b.code === bv.code
    );

    if (!alToegevoegd) {
      // Zoek de taakId voor dit bed
      const taakId = vindTaakId(bv.gewas, bv.bedId, bv.code);

      // Dit bed is van een andere week naar hier geschoven
      beddenMetStatus.push({
        gewas: bv.gewas,
        actie: bv.actie,
        code: bv.code,
        status: {
          bedId: bv.bedId,
          status: bv.status as BedStatusInfo['status'],
          voortgangId: bv.id,
          deelVanBed: '', // Niet beschikbaar uit voortgang, zou uit teeltplan moeten komen
          teelt: '',
          geplandWeek: bv.geplandWeek,
          oorspronkelijkeWeek: bv.oorspronkelijkeWeek,
          taakId
        }
      });
    }
  });

  // Filter voor community: verberg afgeronde bedden
  const gefilterdeBedden = isCommissie
    ? beddenMetStatus
    : beddenMetStatus.filter(b => b.status.status !== 'afgerond');

  // Groepeer per actie-type, dan per gewas
  const gegroepeerd: (ActieGroep & { code: TeeltCode, bedStatussen: Map<string, BedStatusInfo[]> })[] = [];
  const actieMap = new Map<string, Map<string, { statussen: BedStatusInfo[], code: TeeltCode }>>();

  gefilterdeBedden.forEach(item => {
    if (!actieMap.has(item.actie)) {
      actieMap.set(item.actie, new Map());
    }
    const gewasMap = actieMap.get(item.actie)!;
    if (!gewasMap.has(item.gewas)) {
      gewasMap.set(item.gewas, { statussen: [], code: item.code });
    }
    gewasMap.get(item.gewas)!.statussen.push(item.status);
  });

  // Converteer naar array en sorteer
  actieMap.forEach((gewasMap, actie) => {
    const gewassen: { gewas: string; bedIds: string[] }[] = [];
    const bedStatussen = new Map<string, BedStatusInfo[]>();
    let actieCode: TeeltCode = '';

    gewasMap.forEach((data, gewas) => {
      // Sorteer bedden alfanumeriek
      const gesorteerd = [...data.statussen].sort((a, b) => {
        const aMatch = a.bedId.match(/^([A-Za-z]+)(\d+)$/);
        const bMatch = b.bedId.match(/^([A-Za-z]+)(\d+)$/);
        if (aMatch && bMatch) {
          if (aMatch[1] !== bMatch[1]) return aMatch[1].localeCompare(bMatch[1]);
          return parseInt(aMatch[2]) - parseInt(bMatch[2]);
        }
        return a.bedId.localeCompare(b.bedId);
      });

      if (gesorteerd.length > 0) {
        gewassen.push({ gewas, bedIds: gesorteerd.map(s => s.bedId) });
        bedStatussen.set(gewas, gesorteerd);
      }
      actieCode = data.code;
    });

    if (gewassen.length > 0) {
      gewassen.sort((a, b) => a.gewas.localeCompare(b.gewas));
      const config = ACTIE_TYPE_CONFIG[actie] || { label: actie, icon: '📋', color: 'bg-gray-100 text-gray-800' };
      gegroepeerd.push({
        actie,
        config,
        gewassen,
        code: actieCode,
        bedStatussen
      });
    }
  });

  if (gegroepeerd.length === 0) {
    return null;
  }

  // Sorteer actie-groepen op volgorde
  const actieVolgorde = ['Kas zaaien', 'Kas voorzaaien', 'Buiten zaaien', 'Buiten voorzaaien', 'Kas uitplanten', 'Buiten uitplanten', 'Oogsten'];
  gegroepeerd.sort((a, b) => {
    const aIndex = actieVolgorde.indexOf(a.actie);
    const bIndex = actieVolgorde.indexOf(b.actie);
    if (aIndex === -1 && bIndex === -1) return a.actie.localeCompare(b.actie);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const toggleActie = (actie: string) => {
    setUitgeklapt(prev => ({ ...prev, [actie]: !prev[actie] }));
  };

  const totaalGewassen = gegroepeerd.reduce((sum, g) => sum + g.gewassen.length, 0);

  // Haal code op voor een gewas
  const getCodeVoorGewas = (actie: string, gewas: string): TeeltCode => {
    const item = samenvatting.find(s => s.actie === actie && s.gewas === gewas);
    return item?.code || '';
  };

  // Bed kleur bepalen op basis van status
  const getBedKleur = (status: BedStatusInfo['status']): string => {
    switch (status) {
      case 'afgerond': return 'bg-green-200 text-green-800';
      case 'beschikbaar': return 'bg-yellow-100 text-yellow-800'; // Geel = actie nodig deze week
      case 'uitgesteld': return 'bg-orange-100 text-orange-700'; // Oranje = uitgesteld van eerdere week
      case 'vervroegd': return 'bg-blue-100 text-blue-700'; // Blauw = vervroegd van latere week
      case 'automatisch_doorgeschoven': return 'bg-gray-200 text-gray-600'; // Grijs = automatisch
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  // Afvink modal handler
  const handleAfvinkBevestig = () => {
    if (afvinkBed && afvinkNaam.trim()) {
      onBedAfgerond(afvinkBed.actie, afvinkBed.gewas, afvinkBed.bedId, afvinkBed.code, afvinkNaam.trim(), afvinkBed.taakId);
      setAfvinkBed(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-tuin-50 to-tuin-100 px-4 py-3 border-b border-tuin-200">
          <h4 className="font-semibold text-tuin-800 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {taal === 'nl' ? 'Uit teeltplan' : 'From cultivation plan'}
            <span className="text-sm font-normal text-tuin-600">
              ({totaalGewassen} {taal === 'nl' ? (totaalGewassen === 1 ? 'gewas' : 'gewassen') : (totaalGewassen === 1 ? 'crop' : 'crops')})
            </span>
          </h4>
          {isCommissie && (
            <p className="text-xs text-tuin-600 mt-1">
              <span className="inline-block w-3 h-3 rounded bg-gray-200 mr-1"></span>{taal === 'nl' ? 'Beschikbaar' : 'Available'}
              <span className="inline-block w-3 h-3 rounded bg-green-200 ml-2 mr-1"></span>{taal === 'nl' ? 'Afgerond' : 'Done'}
              <span className="inline-block w-3 h-3 rounded bg-yellow-100 ml-2 mr-1 opacity-60"></span>{taal === 'nl' ? 'Uitgesteld' : 'Postponed'}
            </p>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {gegroepeerd.map(groep => {
            const isOpen = uitgeklapt[groep.actie] !== false;

            return (
              <div key={groep.actie}>
                <button
                  onClick={() => toggleActie(groep.actie)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{groep.config.icon}</span>
                    <span className="font-medium text-gray-800">{taal === 'nl' ? groep.config.labelNl : groep.config.labelEn}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${groep.config.color}`}>
                      {groep.gewassen.length} {taal === 'nl' ? (groep.gewassen.length === 1 ? 'gewas' : 'gewassen') : (groep.gewassen.length === 1 ? 'crop' : 'crops')}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 space-y-2">
                    {groep.gewassen.map(item => {
                      const code = getCodeVoorGewas(groep.actie, item.gewas);
                      const bedStatussen = groep.bedStatussen.get(item.gewas) || [];

                      // Tel afgeronde bedden
                      const totaalBedden = samenvatting.filter(s =>
                        s.actie === groep.actie && s.gewas === item.gewas
                      ).length;
                      const afgerondeBedden = bedVoortgang.filter(bv =>
                        bv.actie === groep.actie && bv.gewas === item.gewas && bv.status === 'afgerond'
                      ).length;

                      // Vertaal gewas
                      const gewasNaam = taal === 'en' ? vertaalGewas(item.gewas) : item.gewas;

                      return (
                        <div
                          key={item.gewas}
                          className="ml-8 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-700">{gewasNaam}</p>
                                {afgerondeBedden > 0 && (
                                  <span className="text-xs text-green-600">
                                    ({afgerondeBedden}/{totaalBedden} {taal === 'nl' ? 'klaar' : 'done'})
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {bedStatussen.map(bedStatus => (
                                  <div
                                    key={`${bedStatus.bedId}-${bedStatus.deelVanBed}`}
                                    className={`
                                      text-sm px-2 py-1 rounded flex flex-col
                                      ${getBedKleur(bedStatus.status)}
                                    `}
                                  >
                                    <div className="flex items-center gap-1">
                                      {/* Status icoon */}
                                      {bedStatus.status === 'afgerond' && (
                                        <Check className="w-3 h-3 text-green-600" />
                                      )}
                                      {bedStatus.status === 'uitgesteld' && bedStatus.oorspronkelijkeWeek && bedStatus.oorspronkelijkeWeek !== weekNummer && (
                                        <ArrowRight className="w-3 h-3 text-orange-500" />
                                      )}
                                      {bedStatus.status === 'vervroegd' && (
                                        <ArrowLeft className="w-3 h-3 text-blue-500" />
                                      )}
                                      {bedStatus.status === 'automatisch_doorgeschoven' && (
                                        <span className="text-[10px] text-gray-500">auto</span>
                                      )}

                                      <span className="font-medium">{bedStatus.bedId}</span>

                                      {/* Originele week indicator (als verschoven) */}
                                      {bedStatus.oorspronkelijkeWeek && bedStatus.oorspronkelijkeWeek !== weekNummer && bedStatus.status !== 'afgerond' && (
                                        <span className="text-[10px] opacity-70" title={taal === 'nl' ? `Origineel week ${bedStatus.oorspronkelijkeWeek}` : `Originally week ${bedStatus.oorspronkelijkeWeek}`}>
                                          (w{bedStatus.oorspronkelijkeWeek})
                                        </span>
                                      )}

                                      {/* Teelt indicator */}
                                      {bedStatus.teelt && bedStatus.teelt !== '0' && bedStatus.teelt !== '' && (
                                        <span className="text-xs bg-white/50 px-1 rounded" title={bedStatus.teelt === '1' ? 'Vroege teelt' : 'Late teelt'}>
                                          {bedStatus.teelt === '1' ? '1e' : '2e'}
                                        </span>
                                      )}

                                      {/* Commissie: vervroegen knop (naar vorige week) */}
                                      {isCommissie && bedStatus.status !== 'afgerond' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onBedVervroeg(groep.actie, item.gewas, bedStatus.bedId, code, bedStatus.taakId);
                                          }}
                                          className="ml-1 text-gray-500 hover:text-blue-500 transition-colors"
                                          title={taal === 'nl' ? 'Naar vorige week' : 'Move to previous week'}
                                        >
                                          <ArrowLeft className="w-3 h-3" />
                                        </button>
                                      )}

                                      {/* Commissie: uitstellen knop (naar volgende week) */}
                                      {isCommissie && bedStatus.status !== 'afgerond' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onBedUitstel(groep.actie, item.gewas, bedStatus.bedId, code, bedStatus.taakId);
                                          }}
                                          className="text-gray-500 hover:text-orange-500 transition-colors"
                                          title={taal === 'nl' ? 'Naar volgende week' : 'Move to next week'}
                                        >
                                          <ArrowRight className="w-3 h-3" />
                                        </button>
                                      )}

                                      {/* Iedereen: afvinken knop (alleen voor niet-afgeronde bedden) */}
                                      {bedStatus.status !== 'afgerond' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAfvinkBed({ actie: groep.actie, gewas: item.gewas, bedId: bedStatus.bedId, code, taakId: bedStatus.taakId });
                                          }}
                                          className="ml-1 text-gray-500 hover:text-green-500 transition-colors"
                                          title="Markeer als klaar"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                      )}

                                      {/* Commissie: heropenen knop (alleen voor afgeronde bedden) */}
                                      {isCommissie && bedStatus.status === 'afgerond' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onBedHeropenen(groep.actie, item.gewas, bedStatus.bedId, code, bedStatus.taakId);
                                          }}
                                          className="ml-1 text-gray-500 hover:text-blue-500 transition-colors"
                                          title={taal === 'nl' ? 'Heropenen' : 'Reopen'}
                                        >
                                          <Clock className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    {/* Deel van bed */}
                                    {bedStatus.deelVanBed && bedStatus.deelVanBed !== 'Heel bed' && (
                                      <span className="text-xs opacity-75 mt-0.5">{bedStatus.deelVanBed}</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Klik hint */}
                              <button
                                onClick={() => onGewasKlik(groep.actie, item.gewas, item.bedIds, code)}
                                className="mt-2 text-xs text-tuin-600 hover:text-tuin-700 flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                {isCommissie ? (taal === 'nl' ? 'Instructies toevoegen' : 'Add instructions') : (taal === 'nl' ? 'Bekijk instructies' : 'View instructions')}
                              </button>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                              {bedStatussen.length} {taal === 'nl' ? (bedStatussen.length === 1 ? 'bed' : 'bedden') : (bedStatussen.length === 1 ? 'bed' : 'beds')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Afvink modal */}
      {afvinkBed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{taal === 'nl' ? 'Bed afvinken' : 'Mark bed complete'}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {taal === 'en' ? (actieTypes[afvinkBed.actie] || afvinkBed.actie) : afvinkBed.actie}: {taal === 'en' ? vertaalGewas(afvinkBed.gewas) : afvinkBed.gewas} - bed {afvinkBed.bedId}
              </p>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {taal === 'nl' ? 'Jouw naam' : 'Your name'}
              </label>
              <input
                type="text"
                value={afvinkNaam}
                onChange={(e) => setAfvinkNaam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
                placeholder={taal === 'nl' ? 'Vul je naam in...' : 'Enter your name...'}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setAfvinkBed(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {taal === 'nl' ? 'Annuleren' : 'Cancel'}
              </button>
              <button
                onClick={handleAfvinkBevestig}
                disabled={!afvinkNaam.trim()}
                className="flex-1 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 disabled:opacity-50"
              >
                {taal === 'nl' ? 'Klaar!' : 'Done!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// COMMUNITY TAAK AFVINK MODAL
// ============================================

interface AfvinkModalProps {
  taak: Taak;
  onBevestig: (naam: string) => void;
  onAnnuleren: () => void;
}

function AfvinkModal({ taak, onBevestig, onAnnuleren }: AfvinkModalProps) {
  const { state } = useApp();
  const { taal } = useI18n();
  const [naam, setNaam] = useState(state.ui.gebruikersnaam || '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{taal === 'nl' ? 'Taak afronden' : 'Complete task'}</h3>
          <p className="text-sm text-gray-500 mt-1">
            <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {taal === 'nl' ? 'Jouw naam' : 'Your name'}
            </label>
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
              placeholder={taal === 'nl' ? 'Wie heeft dit gedaan?' : 'Who did this?'}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onAnnuleren}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {taal === 'nl' ? 'Annuleren' : 'Cancel'}
          </button>
          <button
            onClick={() => naam.trim() && onBevestig(naam.trim())}
            disabled={!naam.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              naam.trim()
                ? 'bg-tuin-600 text-white hover:bg-tuin-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {taal === 'nl' ? 'Afronden' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// BEZIG MET TAAK MODAL (ASSIGNMENT) - Meerdere personen
// ============================================

interface AssignmentModalProps {
  taak: Taak;
  onBevestig: (naam: string) => void;
  onStop: (naam: string) => void;
  onAnnuleren: () => void;
}

function AssignmentModal({ taak, onBevestig, onStop, onAnnuleren }: AssignmentModalProps) {
  const { state } = useApp();
  const { taal, t } = useI18n();

  // Backwards compatibility: ondersteuning voor oude string format en nieuwe array format
  const assignedPeople = Array.isArray(taak.assignedTo) ? taak.assignedTo : (taak.assignedTo ? [taak.assignedTo] : []);
  const hasAssignedPeople = assignedPeople.length > 0;

  // Check of opgeslagen gebruikersnaam al in de lijst staat
  const savedUserIsAssigned = state.ui.gebruikersnaam && assignedPeople.some(
    n => n.toLowerCase() === state.ui.gebruikersnaam!.toLowerCase()
  );

  // Als de opgeslagen naam al in de lijst staat, start met leeg veld
  const [naam, setNaam] = useState(savedUserIsAssigned ? '' : (state.ui.gebruikersnaam || ''));

  const currentUserIsAssigned = !!(naam.trim() && assignedPeople.some(
    n => n.toLowerCase() === naam.trim().toLowerCase()
  ));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            {t.tasks.workingOnTask}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Toon wie er al bezig zijn */}
          {hasAssignedPeople && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2 text-amber-800">
                <Play className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium mb-2">
                    {taal === 'nl' ? 'Bezig met deze taak:' : 'Working on this task:'}
                  </p>
                  <div className="space-y-1">
                    {assignedPeople.map((person, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/50 rounded px-2 py-1">
                        <span className="text-amber-900 font-medium">{person}</span>
                        <button
                          onClick={() => onStop(person)}
                          className="text-xs text-amber-600 hover:text-amber-800 hover:underline"
                          title={taal === 'nl' ? 'Verwijderen' : 'Remove'}
                        >
                          {taal === 'nl' ? 'stop' : 'stop'}
                        </button>
                      </div>
                    ))}
                  </div>
                  {taak.assignedAt && (
                    <p className="text-xs text-amber-600 mt-2">
                      {taal === 'nl' ? 'Gestart op' : 'Started at'}: {new Date(taak.assignedAt).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Naam invoer om jezelf toe te voegen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {hasAssignedPeople
                ? (taal === 'nl' ? 'Ook meehelpen? Vul je naam in:' : 'Want to help? Enter your name:')
                : t.tasks.enterYourName}
            </label>
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
              placeholder={taal === 'nl' ? 'Jouw naam...' : 'Your name...'}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-1p-ignore
              data-lpignore="true"
            />
            {currentUserIsAssigned && naam.trim() && (
              <p className="text-xs text-amber-600 mt-1">
                {taal === 'nl' ? 'Je staat al in de lijst!' : 'You are already in the list!'}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onAnnuleren}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {taal === 'nl' ? 'Sluiten' : 'Close'}
          </button>
          <button
            onClick={() => naam.trim() && !currentUserIsAssigned && onBevestig(naam.trim())}
            disabled={!naam.trim() || currentUserIsAssigned}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              naam.trim() && !currentUserIsAssigned
                ? 'bg-tuin-600 text-white hover:bg-tuin-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4" />
            {t.tasks.startWorking}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMMUNITY NOTITIE MODAL
// ============================================

interface NotitieModalProps {
  taak: Taak;
  onOpslaan: (tekst: string) => void;
  onAnnuleren: () => void;
}

function CommunityNotitieModal({ taak, onOpslaan, onAnnuleren }: NotitieModalProps) {
  const { state } = useApp();
  const { taal } = useI18n();
  const [tekst, setTekst] = useState('');
  const naam = state.ui.gebruikersnaam || (taal === 'nl' ? 'Anoniem' : 'Anonymous');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{taal === 'nl' ? 'Notitie toevoegen' : 'Add note'}</h3>
          <p className="text-sm text-gray-500 mt-1">
            <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Bestaande community notities */}
          {taak.communityNotities && taak.communityNotities.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 mb-2">{taal === 'nl' ? 'Eerdere notities:' : 'Previous notes:'}</p>
              {taak.communityNotities.map(notitie => (
                <div key={notitie.id} className="text-sm text-gray-700 mb-2 last:mb-0">
                  <span className="font-medium">{notitie.auteur}:</span> {notitie.tekst}
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(notitie.aangemaakt).toLocaleDateString(taal === 'nl' ? 'nl-NL' : 'en-GB')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {taal === 'nl' ? `Jouw notitie (als ${naam})` : `Your note (as ${naam})`}
            </label>
            <textarea
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none"
              rows={3}
              placeholder={taal === 'nl' ? 'Typ je opmerking of vraag hier...' : 'Type your comment or question here...'}
              autoFocus
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onAnnuleren}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {taal === 'nl' ? 'Annuleren' : 'Cancel'}
          </button>
          <button
            onClick={() => tekst.trim() && onOpslaan(tekst.trim())}
            disabled={!tekst.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tekst.trim()
                ? 'bg-tuin-600 text-white hover:bg-tuin-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {taal === 'nl' ? 'Opslaan' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMMUNITY TAAK DETAIL MODAL
// ============================================

interface CommunityTaakModalProps {
  taak: Taak;
  onSluiten: () => void;
  onAfvinken: () => void;
  onNotitie: () => void;
  onBezigMet: () => void;
}

function CommunityTaakModal({ taak, onSluiten, onAfvinken, onNotitie, onBezigMet }: CommunityTaakModalProps) {
  const { taal, t } = useI18n();
  const [toonFotoModal, setToonFotoModal] = useState<{ urls: string[]; index: number } | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{taal === 'nl' ? 'Taak details' : 'Task details'}</h3>
          <button
            onClick={onSluiten}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Taak info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-800 text-lg">
              <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
            </p>
            {(taak.bedId || taak.sectie) && (
              <p className="text-sm text-gray-500 mt-2">
                📍 {taak.bedId ? `${taal === 'nl' ? 'Bed' : 'Bed'} ${taak.bedId}` : taak.sectie ? `${taal === 'nl' ? 'Sectie' : 'Section'} ${taak.sectie}` : (taal === 'nl' ? 'Algemeen' : 'General')}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {(() => {
                const dynamischePrioriteit = berekenDynamischePrioriteit(taak);
                return (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    dynamischePrioriteit === 'Hoog' ? 'bg-red-100 text-red-700' :
                    dynamischePrioriteit === 'Normaal' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {t.tasks.priorities[dynamischePrioriteit.toLowerCase() as 'high' | 'normal' | 'low'] || dynamischePrioriteit}
                  </span>
                );
              })()}
              <span className={`text-xs px-2 py-1 rounded-full ${
                taak.status === 'Afgerond' ? 'bg-tuin-100 text-tuin-700' :
                taak.status === 'In uitvoering' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {taak.status === 'Open' ? t.tasks.statuses.open :
                 taak.status === 'In uitvoering' ? t.tasks.statuses.inProgress :
                 t.tasks.statuses.completed}
              </span>
            </div>
            {taak.isAutomatisch && taak.bronGewas && (
              <div className="mt-2 flex items-center gap-2 text-sm text-tuin-600 bg-tuin-50 rounded px-2 py-1">
                <Sprout className="w-4 h-4" />
                <span>{taal === 'nl' ? 'Uit teeltplan' : 'From cultivation plan'}: {taal === 'en' ? vertaalGewas(taak.bronGewas) : taak.bronGewas}</span>
              </div>
            )}
          </div>

          {/* Foto's van taak */}
          {(() => {
            const fotos = getTaakFotos(taak);
            if (fotos.length === 0) return null;
            return (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  {taal === 'nl' ? (fotos.length === 1 ? 'Foto' : `Foto's (${fotos.length})`) : (fotos.length === 1 ? 'Photo' : `Photos (${fotos.length})`)}
                </label>
                <div className={`grid gap-2 ${fotos.length === 1 ? 'grid-cols-1' : fotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {fotos.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setToonFotoModal({ urls: fotos, index: idx })}
                      className="rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={url}
                        alt={`${taak.beschrijving} ${idx + 1}`}
                        className={`w-full object-cover ${fotos.length === 1 ? 'h-48' : 'h-32'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Opmerkingen van commissie */}
          {taak.commentaar && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                {taal === 'nl' ? 'Opmerkingen van commissie' : 'Committee comments'}
              </label>
              <div className="bg-gray-100 rounded-lg p-3 text-gray-700 text-sm whitespace-pre-wrap">
                <TranslatedText nl={taak.commentaar} en={taak.commentaar_en} />
              </div>
            </div>
          )}

          {/* Community notities */}
          {taak.communityNotities && taak.communityNotities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                {taal === 'nl' ? 'Notities van community' : 'Community notes'} ({taak.communityNotities.length})
              </label>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {taak.communityNotities.map(notitie => (
                  <div key={notitie.id} className="bg-white rounded p-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <User className="w-3 h-3" />
                      <span className="font-medium">{notitie.auteur}</span>
                      <span>•</span>
                      <span>{new Date(notitie.aangemaakt).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}</span>
                    </div>
                    <p className="text-gray-700">{notitie.tekst}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructies/URL van commissie - ONDERAAN na content */}
          {taak.instructies && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <LinkIcon className="w-4 h-4 inline mr-1" />
                {taal === 'nl' ? 'Meer informatie' : 'More information'}
              </label>
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <KlikbareLink url={taak.instructies} />
              </div>
            </div>
          )}

          {/* Bezig met taak info (meerdere personen mogelijk) */}
          {taak.assignedTo && (Array.isArray(taak.assignedTo) ? taak.assignedTo.length > 0 : taak.assignedTo) && taak.status !== 'Afgerond' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Play className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {taal === 'nl' ? 'Bezig door' : 'Being worked on by'}:
                </p>
                <ul className="mt-1 space-y-0.5">
                  {(Array.isArray(taak.assignedTo) ? taak.assignedTo : [taak.assignedTo]).map((naam, index) => (
                    <li key={index} className="text-sm text-amber-900 font-medium">• {naam}</li>
                  ))}
                </ul>
                {taak.assignedAt && (
                  <p className="text-xs text-amber-600 mt-1">
                    {taal === 'nl' ? 'Gestart op' : 'Started at'}: {new Date(taak.assignedAt).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Afgerond info */}
          {taak.afgerondDoor && (
            <div className="bg-tuin-50 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-tuin-600" />
              <div>
                <p className="text-sm font-medium text-tuin-800">
                  {taal === 'nl' ? 'Afgerond door' : 'Completed by'} {taak.afgerondDoor}
                </p>
                {taak.afgerondOp && (
                  <p className="text-xs text-tuin-600">
                    {new Date(taak.afgerondOp).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Foto Modal (lightbox met prev/next) */}
        {toonFotoModal && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
            onClick={() => setToonFotoModal(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <img
                src={toonFotoModal.urls[toonFotoModal.index]}
                alt={`${taak.beschrijving} ${toonFotoModal.index + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              {/* Teller */}
              {toonFotoModal.urls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                  {toonFotoModal.index + 1} / {toonFotoModal.urls.length}
                </div>
              )}
              {/* Vorige */}
              {toonFotoModal.urls.length > 1 && toonFotoModal.index > 0 && (
                <button
                  onClick={() => setToonFotoModal({ ...toonFotoModal, index: toonFotoModal.index - 1 })}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {/* Volgende */}
              {toonFotoModal.urls.length > 1 && toonFotoModal.index < toonFotoModal.urls.length - 1 && (
                <button
                  onClick={() => setToonFotoModal({ ...toonFotoModal, index: toonFotoModal.index + 1 })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
              {/* Sluiten */}
              <button
                onClick={() => setToonFotoModal(null)}
                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Actie knoppen voor community */}
        {taak.status !== 'Afgerond' && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            {/* Bezig met taak knop - altijd klikbaar voor meerdere mensen */}
            {(() => {
              const assigned = Array.isArray(taak.assignedTo) ? taak.assignedTo : (taak.assignedTo ? [taak.assignedTo] : []);
              const hasAssigned = assigned.length > 0;
              return (
                <button
                  onClick={onBezigMet}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    hasAssigned
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  {hasAssigned
                    ? (taal === 'nl'
                        ? `${assigned.length === 1 ? assigned[0] + ' is' : assigned.length + ' mensen zijn'} hiermee bezig - ook meehelpen?`
                        : `${assigned.length === 1 ? assigned[0] + ' is' : assigned.length + ' people are'} working on this - join in?`)
                    : t.tasks.startWorking}
                </button>
              );
            })()}

            <div className="flex gap-3">
              <button
                onClick={onNotitie}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {taal === 'nl' ? 'Notitie toevoegen' : 'Add note'}
              </button>
              <button
                onClick={onAfvinken}
                className="flex-1 px-4 py-3 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {taal === 'nl' ? 'Taak afronden' : 'Complete task'}
              </button>
            </div>
          </div>
        )}

        {taak.status === 'Afgerond' && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onSluiten}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t.common.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMMISSIE TAKEN SECTIE (niet-teeltplan)
// ============================================

interface CommissieTakenProps {
  taken: Taak[];
  isCommissie: boolean;
  weekStart: Date;
  weekCode: number;
  onStatusWijzig: (taak: Taak, status: TaakStatus) => void;
  onTaakOpen: (taak: Taak) => void;
  onTaakEdit: (taak: Taak) => void;
  onTaakDelete: (taak: Taak) => void;
  onTaakHeropenen: (taak: Taak) => void;
}

function CommissieTakenKaart({ taken, isCommissie, weekStart, weekCode, onStatusWijzig, onTaakOpen, onTaakEdit, onTaakDelete, onTaakHeropenen }: CommissieTakenProps) {
  const { t, taal } = useI18n();
  const { isPinned, togglePin } = usePinnedTasks();

  // Helper: check of herhalende taak deze week is afgevinkt
  const isHerhalendAfgevinkt = (taak: Taak): boolean => {
    return !!(taak.isHerhalend && taak.afgevinktWeeks?.includes(weekCode));
  };

  // Check of een taak achterstallig is (deadline vóór begin van huidige week)
  const isAchterstalligeTaak = (taak: Taak): boolean => {
    const deadline = new Date(taak.deadline);
    return deadline < weekStart && taak.status !== 'Afgerond';
  };

  if (taken.length === 0) {
    return null;
  }

  const actief = taken
    .filter(t => t.status !== 'Afgerond' && !isHerhalendAfgevinkt(t))
    .sort((a, b) => (isPinned(b.id) ? 1 : 0) - (isPinned(a.id) ? 1 : 0));
  const afgerond = taken.filter(t => t.status === 'Afgerond' || isHerhalendAfgevinkt(t));

  // Bepaal de linkerrand kleur - consistent met TaakLijst
  // Gebaseerd op dynamische prioriteit (commissie-taken behouden hun prioriteit, auto-taken op basis van deadline)
  const getStatusBorderKleur = (taak: Taak): string => {
    if (taak.status === 'Afgerond' || isHerhalendAfgevinkt(taak)) return 'border-l-gray-300';
    const dynamischePrioriteit = berekenDynamischePrioriteit(taak);
    if (dynamischePrioriteit === 'Hoog') return 'border-l-red-500';
    if (dynamischePrioriteit === 'Normaal') return 'border-l-amber-500';
    return 'border-l-gray-300';
  };

  const getStatusIcon = (status: TaakStatus) => {
    switch (status) {
      case 'Open': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'In uitvoering': return <Play className="w-4 h-4 text-blue-500" />;
      case 'Afgerond': return <CheckCircle className="w-4 h-4 text-tuin-500" />;
    }
  };

  const getStatusBadge = (taak: Taak) => {
    switch (taak.status) {
      case 'Open':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" /> {taal === 'nl' ? 'Open' : 'Open'}
          </span>
        );
      case 'In uitvoering':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            <Play className="w-3 h-3" /> {taal === 'nl' ? 'Bezig' : 'In progress'}
          </span>
        );
      case 'Afgerond':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-tuin-600 bg-tuin-100 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" /> {taal === 'nl' ? 'Klaar' : 'Done'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {actief.map(taak => {
        const achterstallig = isAchterstalligeTaak(taak);
        const taakIsPinned = isPinned(taak.id);
        return (
          <div
            key={taak.id}
            onClick={() => onTaakOpen(taak)}
            className={`
              bg-white rounded-lg shadow-sm border-l-4 p-4
              hover:shadow-md transition-shadow cursor-pointer
              ${getStatusBorderKleur(taak)}
              ${taakIsPinned ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Status toggle knop */}
              {isCommissie && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus = taak.status === 'Open' ? 'In uitvoering' : 'Afgerond';
                    onStatusWijzig(taak, nextStatus);
                  }}
                  className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {getStatusIcon(taak.status)}
                </button>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-gray-800">
                    <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
                  </h4>

                  {/* Labels */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(taak.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        taakIsPinned
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title={taakIsPinned
                        ? (taal === 'nl' ? 'Losmaken van bovenaan' : 'Unpin from top')
                        : (taal === 'nl' ? 'Vastpinnen bovenaan' : 'Pin to top')}
                    >
                      <Pin className={`w-4 h-4 ${taakIsPinned ? 'fill-current' : ''}`} />
                    </button>
                    {taak.windowStart !== undefined && taak.windowEnd !== undefined && taak.status !== 'Afgerond' && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                        <CalendarRange className="w-3 h-3" /> wk {taak.windowStart}-{taak.windowEnd}
                      </span>
                    )}
                    {taak.isAdHoc && (
                      <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                        <Zap className="w-3 h-3" /> {taal === 'nl' ? 'Snelle Taak' : 'Quick Task'}
                      </span>
                    )}
                    {taak.isHerhalend && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200">
                        <Repeat className="w-3 h-3" /> {t.form.weekly}
                      </span>
                    )}
                    {achterstallig && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {taal === 'nl' ? 'Achterstallig' : 'Overdue'}
                      </span>
                    )}
                    {getStatusBadge(taak)}
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
                  {(taak.bedId || taak.sectie) && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                      📍 {taak.bedId ? `Bed ${taak.bedId}` : `Sectie ${taak.sectie}`}
                    </span>
                  )}
                  <span>{taal === 'nl' ? 'Deadline' : 'Deadline'}: {formatDatum(taak.deadline)}</span>
                </div>

                {/* Bezig door info (meerdere personen mogelijk) */}
                {taak.assignedTo && (Array.isArray(taak.assignedTo) ? taak.assignedTo.length > 0 : taak.assignedTo) && taak.status !== 'Afgerond' && (
                  <div className="flex items-center gap-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">
                    <Play className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {taal === 'nl' ? 'Bezig door' : 'Working'}: <span className="font-medium">{Array.isArray(taak.assignedTo) ? taak.assignedTo.join(', ') : taak.assignedTo}</span>
                    </span>
                  </div>
                )}

                {/* Foto thumbnails (indien aanwezig) */}
                {(() => {
                  const fotos = getTaakFotos(taak);
                  if (fotos.length === 0) return null;
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="relative">
                        <img
                          src={fotos[0]}
                          alt={taak.beschrijving}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                        />
                        {fotos.length > 1 && (
                          <span className="absolute -top-1 -right-1 bg-tuin-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            +{fotos.length - 1}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {fotos.length === 1
                          ? (taal === 'nl' ? 'Foto bijgevoegd' : 'Photo attached')
                          : (taal === 'nl' ? `${fotos.length} foto's bijgevoegd` : `${fotos.length} photos attached`)}
                      </span>
                    </div>
                  );
                })()}

                {/* Commentaar commissie */}
                {taak.commentaar && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      <TranslatedText nl={taak.commentaar} en={taak.commentaar_en} />
                    </span>
                  </div>
                )}

                {/* Community notities indicator */}
                {taak.communityNotities && taak.communityNotities.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                    <AlertCircle className="w-3 h-3" />
                    {taak.communityNotities.length} {taal === 'nl' ? (taak.communityNotities.length > 1 ? 'notities' : 'notitie') : (taak.communityNotities.length > 1 ? 'notes' : 'note')} {taal === 'nl' ? 'van community' : 'from community'}
                  </div>
                )}

                {/* Instructies/URL (onderaan na content) */}
                {taak.instructies && (
                  <div className="mt-2 flex items-start gap-2 text-sm bg-blue-50 rounded px-2 py-1">
                    <LinkIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                    <span className="line-clamp-2">
                      <KlikbareLink url={taak.instructies} />
                    </span>
                  </div>
                )}

                {/* Commissie: edit en delete knoppen */}
                {isCommissie && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaakEdit(taak);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-tuin-600 hover:bg-tuin-50 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      {taal === 'nl' ? 'Bewerken' : 'Edit'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaakDelete(taak);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {taal === 'nl' ? 'Verwijderen' : 'Delete'}
                    </button>
                  </div>
                )}

                {/* Hint om te klikken (alleen voor community) */}
                {!isCommissie && (
                  <p className="mt-2 text-xs text-gray-400">
                    {taal === 'nl' ? 'Tik om details te bekijken' : 'Tap to view details'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Afgeronde taken */}
      {afgerond.length > 0 && (
        <div className="mt-4">
          <details className="group">
            <summary className="px-2 py-2 cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-tuin-500" />
              {afgerond.length} {taal === 'nl' ? 'afgeronde taken' : 'completed tasks'}
            </summary>
            <div className="mt-2 space-y-3">
              {afgerond.map(taak => (
                <div
                  key={taak.id}
                  onClick={() => onTaakOpen(taak)}
                  className="bg-white rounded-lg shadow-sm border-l-4 border-l-tuin-500 p-4 opacity-60 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {isCommissie && (
                      <div className="mt-1 p-1.5">
                        <CheckCircle className="w-4 h-4 text-tuin-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-gray-800 line-through">
                          <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {taak.isAdHoc && (
                            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                              <Zap className="w-3 h-3" /> {taal === 'nl' ? 'Snelle Taak' : 'Quick Task'}
                            </span>
                          )}
                          {taak.isHerhalend && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200">
                              <Repeat className="w-3 h-3" /> {t.form.weekly}
                            </span>
                          )}
                          {isHerhalendAfgevinkt(taak) ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-tuin-600 bg-tuin-100 px-2 py-1 rounded-full">
                              <Check className="w-3 h-3" /> {t.form.doneThisWeek}
                            </span>
                          ) : getStatusBadge(taak)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        {taak.afgerondDoor && !taak.isHerhalend && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {taak.afgerondDoor}
                          </span>
                        )}
                        {isCommissie && (
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaakHeropenen(taak);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                              title={taal === 'nl' ? 'Heropenen' : 'Reopen'}
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaakDelete(taak);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title={taal === 'nl' ? 'Verwijderen' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

// ============================================
// HANDMATIGE TAKEN SECTIE (LEGACY - wordt niet meer gebruikt)
// ============================================

interface HandmatigeTakenProps {
  taken: Taak[];
  isCommissie: boolean;
  weekStart: Date;
  weekCode: number;
  onStatusWijzig: (taak: Taak, status: TaakStatus) => void;
  onTaakOpen: (taak: Taak) => void;
  onTaakEdit: (taak: Taak) => void;
  onTaakDelete: (taak: Taak) => void;
  onTaakHeropenen: (taak: Taak) => void;
}

function HandmatigeTakenKaart({ taken, isCommissie, weekStart, weekCode, onStatusWijzig, onTaakOpen, onTaakEdit, onTaakDelete, onTaakHeropenen }: HandmatigeTakenProps) {
  const { t, taal } = useI18n();
  const { isPinned, togglePin } = usePinnedTasks();

  // Helper: check of herhalende taak deze week is afgevinkt
  const isHerhalendAfgevinkt = (taak: Taak): boolean => {
    return !!(taak.isHerhalend && taak.afgevinktWeeks?.includes(weekCode));
  };

  // Check of een taak achterstallig is (deadline vóór begin van huidige week)
  const isAchterstalligeTaak = (taak: Taak): boolean => {
    const deadline = new Date(taak.deadline);
    return deadline < weekStart && taak.status !== 'Afgerond';
  };

  if (taken.length === 0) {
    return null;
  }

  const actief = taken
    .filter(t => t.status !== 'Afgerond' && !isHerhalendAfgevinkt(t))
    .sort((a, b) => (isPinned(b.id) ? 1 : 0) - (isPinned(a.id) ? 1 : 0));
  const afgerond = taken.filter(t => t.status === 'Afgerond' || isHerhalendAfgevinkt(t));

  // Bepaal de linkerrand kleur - consistent met TaakLijst
  // Gebaseerd op dynamische prioriteit (commissie-taken behouden hun prioriteit, auto-taken op basis van deadline)
  const getStatusBorderKleur = (taak: Taak): string => {
    if (taak.status === 'Afgerond' || isHerhalendAfgevinkt(taak)) return 'border-l-gray-300';
    const dynamischePrioriteit = berekenDynamischePrioriteit(taak);
    if (dynamischePrioriteit === 'Hoog') return 'border-l-red-500';
    if (dynamischePrioriteit === 'Normaal') return 'border-l-amber-500';
    return 'border-l-gray-300';
  };

  const getStatusIcon = (status: TaakStatus) => {
    switch (status) {
      case 'Open': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'In uitvoering': return <Play className="w-4 h-4 text-blue-500" />;
      case 'Afgerond': return <CheckCircle className="w-4 h-4 text-tuin-500" />;
    }
  };

  const getStatusBadge = (taak: Taak) => {
    switch (taak.status) {
      case 'Open':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" /> {taal === 'nl' ? 'Open' : 'Open'}
          </span>
        );
      case 'In uitvoering':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            <Play className="w-3 h-3" /> {taal === 'nl' ? 'Bezig' : 'In progress'}
          </span>
        );
      case 'Afgerond':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-tuin-600 bg-tuin-100 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" /> {taal === 'nl' ? 'Klaar' : 'Done'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {actief.map(taak => {
        const achterstallig = isAchterstalligeTaak(taak);
        const taakIsPinned = isPinned(taak.id);
        return (
          <div
            key={taak.id}
            onClick={() => onTaakOpen(taak)}
            className={`
              bg-white rounded-lg shadow-sm border-l-4 p-4
              hover:shadow-md transition-shadow cursor-pointer
              ${getStatusBorderKleur(taak)}
              ${taakIsPinned ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Status toggle knop */}
              {isCommissie && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus = taak.status === 'Open' ? 'In uitvoering' : 'Afgerond';
                    onStatusWijzig(taak, nextStatus);
                  }}
                  className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {getStatusIcon(taak.status)}
                </button>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-gray-800">
                    <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
                  </h4>

                  {/* Labels */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(taak.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        taakIsPinned
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title={taakIsPinned
                        ? (taal === 'nl' ? 'Losmaken van bovenaan' : 'Unpin from top')
                        : (taal === 'nl' ? 'Vastpinnen bovenaan' : 'Pin to top')}
                    >
                      <Pin className={`w-4 h-4 ${taakIsPinned ? 'fill-current' : ''}`} />
                    </button>
                    {taak.windowStart !== undefined && taak.windowEnd !== undefined && taak.status !== 'Afgerond' && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                        <CalendarRange className="w-3 h-3" /> wk {taak.windowStart}-{taak.windowEnd}
                      </span>
                    )}
                    {taak.isAdHoc && (
                      <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                        <Zap className="w-3 h-3" /> {taal === 'nl' ? 'Snelle Taak' : 'Quick Task'}
                      </span>
                    )}
                    {taak.isHerhalend && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200">
                        <Repeat className="w-3 h-3" /> {t.form.weekly}
                      </span>
                    )}
                    {achterstallig && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {taal === 'nl' ? 'Achterstallig' : 'Overdue'}
                      </span>
                    )}
                    {getStatusBadge(taak)}
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
                  {(taak.bedId || taak.sectie) && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                      📍 {taak.bedId ? `Bed ${taak.bedId}` : `Sectie ${taak.sectie}`}
                    </span>
                  )}
                  <span>{taal === 'nl' ? 'Deadline' : 'Deadline'}: {formatDatum(taak.deadline)}</span>
                </div>

                {/* Bezig door info (meerdere personen mogelijk) */}
                {taak.assignedTo && (Array.isArray(taak.assignedTo) ? taak.assignedTo.length > 0 : taak.assignedTo) && taak.status !== 'Afgerond' && (
                  <div className="flex items-center gap-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">
                    <Play className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {taal === 'nl' ? 'Bezig door' : 'Working'}: <span className="font-medium">{Array.isArray(taak.assignedTo) ? taak.assignedTo.join(', ') : taak.assignedTo}</span>
                    </span>
                  </div>
                )}

                {/* Foto thumbnails (indien aanwezig) */}
                {(() => {
                  const fotos = getTaakFotos(taak);
                  if (fotos.length === 0) return null;
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="relative">
                        <img
                          src={fotos[0]}
                          alt={taak.beschrijving}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                        />
                        {fotos.length > 1 && (
                          <span className="absolute -top-1 -right-1 bg-tuin-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            +{fotos.length - 1}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {fotos.length === 1
                          ? (taal === 'nl' ? 'Foto bijgevoegd' : 'Photo attached')
                          : (taal === 'nl' ? `${fotos.length} foto's bijgevoegd` : `${fotos.length} photos attached`)}
                      </span>
                    </div>
                  );
                })()}

                {/* Commentaar commissie */}
                {taak.commentaar && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      <TranslatedText nl={taak.commentaar} en={taak.commentaar_en} />
                    </span>
                  </div>
                )}

                {/* Community notities indicator */}
                {taak.communityNotities && taak.communityNotities.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                    <AlertCircle className="w-3 h-3" />
                    {taak.communityNotities.length} {taal === 'nl' ? (taak.communityNotities.length > 1 ? 'notities' : 'notitie') : (taak.communityNotities.length > 1 ? 'notes' : 'note')} {taal === 'nl' ? 'van community' : 'from community'}
                  </div>
                )}

                {/* Instructies/URL (onderaan na content) */}
                {taak.instructies && (
                  <div className="mt-2 flex items-start gap-2 text-sm bg-blue-50 rounded px-2 py-1">
                    <LinkIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                    <span className="line-clamp-2">
                      <KlikbareLink url={taak.instructies} />
                    </span>
                  </div>
                )}

                {/* Commissie: edit en delete knoppen */}
                {isCommissie && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaakEdit(taak);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-tuin-600 hover:bg-tuin-50 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      {taal === 'nl' ? 'Bewerken' : 'Edit'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaakDelete(taak);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {taal === 'nl' ? 'Verwijderen' : 'Delete'}
                    </button>
                  </div>
                )}

                {/* Hint om te klikken (alleen voor community) */}
                {!isCommissie && (
                  <p className="mt-2 text-xs text-gray-400">
                    {taal === 'nl' ? 'Tik om details te bekijken' : 'Tap to view details'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Afgeronde taken */}
      {afgerond.length > 0 && (
        <div className="mt-4">
          <details className="group">
            <summary className="px-2 py-2 cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-tuin-500" />
              {afgerond.length} {taal === 'nl' ? 'afgeronde taken' : 'completed tasks'}
            </summary>
            <div className="mt-2 space-y-3">
              {afgerond.map(taak => (
                <div
                  key={taak.id}
                  onClick={() => onTaakOpen(taak)}
                  className="bg-white rounded-lg shadow-sm border-l-4 border-l-tuin-500 p-4 opacity-60 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {isCommissie && (
                      <div className="mt-1 p-1.5">
                        <CheckCircle className="w-4 h-4 text-tuin-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-gray-800 line-through">
                          <TranslatedText nl={taak.beschrijving} en={taak.beschrijving_en} />
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {taak.isAdHoc && (
                            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                              <Zap className="w-3 h-3" /> {taal === 'nl' ? 'Snelle Taak' : 'Quick Task'}
                            </span>
                          )}
                          {taak.isHerhalend && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200">
                              <Repeat className="w-3 h-3" /> {t.form.weekly}
                            </span>
                          )}
                          {isHerhalendAfgevinkt(taak) ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-tuin-600 bg-tuin-100 px-2 py-1 rounded-full">
                              <Check className="w-3 h-3" /> {t.form.doneThisWeek}
                            </span>
                          ) : getStatusBadge(taak)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        {taak.afgerondDoor && !taak.isHerhalend && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {taak.afgerondDoor}
                          </span>
                        )}
                        {isCommissie && (
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaakHeropenen(taak);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                              title={taal === 'nl' ? 'Heropenen' : 'Reopen'}
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaakDelete(taak);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title={taal === 'nl' ? 'Verwijderen' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}


// ============================================
// MAIN WEEK OVERZICHT COMPONENT
// ============================================

export function WeekOverzicht() {
  const { state, dispatch, toonToast, saveTaak, deleteTaak, saveBedVoortgang, deleteBedVoortgang, isCommissie } = useApp();
  const { taal, t } = useI18n();
  const taken = useTaken();
  const teeltplan = useTeeltplan();
  const bedVoortgang = useBedVoortgang();
  const { pinTaak, isPinned } = usePinnedTasks();

  const [geselecteerdeDatum, setGeselecteerdeDatum] = useState(new Date());
  const [bewerkTaak, setBewerkTaak] = useState<Taak | null>(null);
  const [afvinkTaak, setAfvinkTaak] = useState<Taak | null>(null);
  const [notitieTaak, setNotitieTaak] = useState<Taak | null>(null);
  const [detailTaak, setDetailTaak] = useState<Taak | null>(null);
  const [communityDetailTaak, setCommunityDetailTaak] = useState<Taak | null>(null);
  const [assignmentTaak, setAssignmentTaak] = useState<Taak | null>(null);
  const [toonNieuwFormulier, setToonNieuwFormulier] = useState(false);

  const weekInfo = getWeekInfo(geselecteerdeDatum);
  const { start, eind } = getWeekGrenzen(geselecteerdeDatum);
  const huidigeWeekInfo = getWeekInfo();
  const isHuidigeWeek = weekInfo.weekNummer === huidigeWeekInfo.weekNummer &&
                        weekInfo.jaar === huidigeWeekInfo.jaar;

  // Auto-doorschuiven: als scheduledWeek < huidigeWeek en taak niet afgerond,
  // schuif scheduledWeek automatisch door naar huidige week
  useEffect(() => {
    const verlopenTaken = taken.filter(taak =>
      taak.isAutomatisch &&
      taak.scheduledWeek !== undefined &&
      taak.scheduledWeek < huidigeWeekInfo.weekNummer &&
      taak.status !== 'Afgerond'
    );

    verlopenTaken.forEach(async (taak) => {
      const bijgewerkt: Taak = {
        ...taak,
        scheduledWeek: huidigeWeekInfo.weekNummer,
        gewijzigd: nuISO()
      };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huidigeWeekInfo.weekNummer]);

  // Filter alle taken voor deze week (zowel handmatig als automatisch uit teeltplan)
  // Venster-taken: filter op scheduledWeek
  // Herhalende taken: toon in elke week van aanmaak tot einddatumHerhaling
  // Reguliere taken: toon in elke week van aanmaak tot deadline
  // Als we naar de huidige week kijken: toon ook achterstallige open taken
  const weekTaken = taken.filter(taak => {
    // Gearchiveerde taken nooit tonen
    if (taak.status === 'Gearchiveerd') return false;

    // Venster-taken: filter op scheduledWeek (ongewijzigd)
    if (taak.scheduledWeek !== undefined) {
      // Taak is gepland voor deze week
      if (taak.scheduledWeek === weekInfo.weekNummer) return true;

      // In huidige week: toon ook verlopen venster-taken (windowEnd < huidige week)
      if (isHuidigeWeek && taak.windowEnd !== undefined && taak.windowEnd < huidigeWeekInfo.weekNummer && taak.status !== 'Afgerond') {
        return true;
      }
      return false;
    }

    // Herhalende taken: toon in elke week van startdatum tot deadline (= herhalen tot)
    if (taak.isHerhalend) {
      const startDatum = new Date(taak.startdatum || taak.aangemaakt);
      const eindDatum = new Date(taak.einddatumHerhaling || taak.deadline);
      const { start: startWeekBegin } = getWeekGrenzen(startDatum);
      const { eind: eindWeekEnd } = getWeekGrenzen(eindDatum);

      // Zichtbaar als deze week overlapt met [startweek, deadlineweek]
      return start <= eindWeekEnd && eind >= startWeekBegin;
    }

    // Reguliere taken: toon in elke week van startdatum tot deadline
    const deadline = new Date(taak.deadline);
    const startDatum = new Date(taak.startdatum || taak.aangemaakt);
    const { start: startWeekBegin } = getWeekGrenzen(startDatum);
    const { eind: deadlineWeekEnd } = getWeekGrenzen(deadline);

    // Afgeronde taken: niet meer tonen in weken na de afrondingsweek
    if (taak.status === 'Afgerond' && taak.afgerondOp) {
      const afgerondDatum = new Date(taak.afgerondOp);
      const { eind: afgerondWeekEnd } = getWeekGrenzen(afgerondDatum);
      return start <= afgerondWeekEnd && eind >= startWeekBegin;
    }

    // Taak is zichtbaar als deze week overlapt met [aanmaakweek, deadlineweek]
    const isInRange = start <= deadlineWeekEnd && eind >= startWeekBegin;

    // Voor huidige week: ook achterstallige taken tonen die nog niet afgerond zijn
    if (isHuidigeWeek && !isInRange) {
      const isAchterstallig = deadline < start && taak.status !== 'Afgerond';
      return isAchterstallig;
    }

    return isInRange;
  });

  // Haal teeltplan suggesties op voor deze week
  const teeltSuggesties = getTeeltSamenvatting(teeltplan, geselecteerdeDatum);

  // Splits taken in teeltplan (automatisch) en commissie (handmatig)
  const alleTeeltplanTaken = weekTaken.filter(t => t.isAutomatisch === true);
  const alleCommissieTaken = weekTaken.filter(t => t.isAutomatisch !== true);

  // "Deze Week" toont alleen gepubliceerde teeltplan taken (voor zowel commissie als community).
  // Commissie publiceert taken vanuit "Teeltplan Taken" en ziet hier het resultaat.
  const teeltplanTaken = alleTeeltplanTaken.filter(t => t.communityZichtbaar === true);
  const commissieTaken = isCommissie
    ? alleCommissieTaken
    : alleCommissieTaken.filter(t => t.communityZichtbaar !== false);

  // Helper: check of een taak achterstallig is
  const isAchterstallig = (taak: Taak): boolean => {
    if (taak.status === 'Afgerond') return false;

    // Venster-taken: verlopen als windowEnd < huidige week
    if (taak.windowEnd !== undefined) {
      return taak.windowEnd < huidigeWeekInfo.weekNummer;
    }

    // Reguliere taken: verlopen als deadline < start van huidige week
    const deadline = new Date(taak.deadline);
    return deadline < start;
  };

  // Sorteer commissie taken: achterstallige eerst, dan op prioriteit
  const commissieTakenGesorteerd = [...commissieTaken].sort((a, b) => {
    // Afgeronde taken onderaan
    if (a.status === 'Afgerond' && b.status !== 'Afgerond') return 1;
    if (b.status === 'Afgerond' && a.status !== 'Afgerond') return -1;

    // Achterstallige taken bovenaan (alleen relevant in huidige week)
    const aAchterstallig = isAchterstallig(a);
    const bAchterstallig = isAchterstallig(b);
    if (aAchterstallig && !bAchterstallig) return -1;
    if (!aAchterstallig && bAchterstallig) return 1;

    const prioWaarde = { 'Hoog': 0, 'Normaal': 1, 'Laag': 2 };
    const prioDiff = prioWaarde[a.prioriteit] - prioWaarde[b.prioriteit];
    if (prioDiff !== 0) return prioDiff;

    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Sorteer alle taken voor legacy component: achterstallige eerst, dan op prioriteit
  const gesorteerd = [...weekTaken].sort((a, b) => {
    // Afgeronde taken onderaan
    if (a.status === 'Afgerond' && b.status !== 'Afgerond') return 1;
    if (b.status === 'Afgerond' && a.status !== 'Afgerond') return -1;

    // Achterstallige taken bovenaan (alleen relevant in huidige week)
    const aAchterstallig = isAchterstallig(a);
    const bAchterstallig = isAchterstallig(b);
    if (aAchterstallig && !bAchterstallig) return -1;
    if (!aAchterstallig && bAchterstallig) return 1;

    const prioWaarde = { 'Hoog': 0, 'Normaal': 1, 'Laag': 2 };
    const prioDiff = prioWaarde[a.prioriteit] - prioWaarde[b.prioriteit];
    if (prioDiff !== 0) return prioDiff;

    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const handleVorigeWeek = () => {
    const nieuw = new Date(geselecteerdeDatum);
    nieuw.setDate(nieuw.getDate() - 7);
    setGeselecteerdeDatum(nieuw);
  };

  const handleVolgendeWeek = () => {
    const nieuw = new Date(geselecteerdeDatum);
    nieuw.setDate(nieuw.getDate() + 7);
    setGeselecteerdeDatum(nieuw);
  };

  const handleDezeWeek = () => {
    setGeselecteerdeDatum(new Date());
  };

  // Helper: weekcode voor per-week afvinken (JJJJWW formaat)
  const getWeekCode = (weekNr: number, jaar: number): number => jaar * 100 + weekNr;
  const huidigeWeekCode = getWeekCode(weekInfo.weekNummer, weekInfo.jaar);

  const handleStatusWijzig = async (taak: Taak, status: TaakStatus) => {
    // Herhalende taken: per-week afvinken i.p.v. status wijzigen
    if (taak.isHerhalend && status === 'Afgerond') {
      await handleHerhalendAfvinken(taak);
      return;
    }

    const bijgewerkt = { ...taak, status, gewijzigd: nuISO() };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    const statusText = taal === 'nl'
      ? (status === 'Afgerond' ? 'afgerond' : status === 'In uitvoering' ? 'in uitvoering' : 'open')
      : (status === 'Afgerond' ? 'completed' : status === 'In uitvoering' ? 'in progress' : 'open');
    toonToast('success', taal === 'nl' ? `Taak gemarkeerd als "${statusText}"` : `Task marked as "${statusText}"`);
  };

  // Herhalende taak: per-week afvinken/ongedaan maken
  const handleHerhalendAfvinken = async (taak: Taak) => {
    const bestaandeWeeks = taak.afgevinktWeeks || [];
    const isAlAfgevinkt = bestaandeWeeks.includes(huidigeWeekCode);

    const bijgewerkt: Taak = {
      ...taak,
      afgevinktWeeks: isAlAfgevinkt
        ? bestaandeWeeks.filter(w => w !== huidigeWeekCode)
        : [...bestaandeWeeks, huidigeWeekCode],
      gewijzigd: nuISO()
    };

    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('success', isAlAfgevinkt
      ? (taal === 'nl' ? 'Afvinken ongedaan gemaakt' : 'Undo completed')
      : (taal === 'nl' ? 'Klaar deze week!' : 'Done this week!'));
  };

  // Community: taak afvinken met naam
  const handleAfvinken = async (naam: string) => {
    if (!afvinkTaak) return;

    // Sla gebruikersnaam op voor volgende keer
    if (naam !== state.ui.gebruikersnaam) {
      dispatch({ type: 'SET_GEBRUIKERSNAAM', payload: naam });
    }

    // Herhalende taken: per-week afvinken
    if (afvinkTaak.isHerhalend) {
      const bestaandeWeeks = afvinkTaak.afgevinktWeeks || [];
      const bijgewerkt: Taak = {
        ...afvinkTaak,
        afgevinktWeeks: [...bestaandeWeeks, huidigeWeekCode],
        gewijzigd: nuISO()
      };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
      toonToast('success', taal === 'nl' ? 'Klaar deze week!' : 'Done this week!');
      setAfvinkTaak(null);
      return;
    }

    const bijgewerkt: Taak = {
      ...afvinkTaak,
      status: 'Afgerond',
      afgerondDoor: naam,
      afgerondOp: nuISO(),
      gewijzigd: nuISO()
    };

    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('success', taal === 'nl' ? 'Taak afgerond!' : 'Task completed!');
    setAfvinkTaak(null);
  };

  // Community: notitie toevoegen
  const handleNotitieToevoegen = async (tekst: string) => {
    if (!notitieTaak) return;

    const nieuweNotitie: TaakNotitie = {
      id: `notitie-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tekst,
      auteur: state.ui.gebruikersnaam || 'Anoniem',
      aangemaakt: nuISO()
    };

    const bijgewerkt: Taak = {
      ...notitieTaak,
      communityNotities: [...(notitieTaak.communityNotities || []), nieuweNotitie],
      gewijzigd: nuISO()
    };

    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('success', 'Notitie toegevoegd!');
    setNotitieTaak(null);
  };

  // Community: bezig met taak starten
  const handleBezigMetTaak = async (naam: string) => {
    if (!assignmentTaak) return;

    // Sla gebruikersnaam op voor volgende keer
    if (naam !== state.ui.gebruikersnaam) {
      dispatch({ type: 'SET_GEBRUIKERSNAAM', payload: naam });
    }

    // Voeg naam toe aan de array (meerdere mensen kunnen bezig zijn)
    // Backwards compatibility: converteer string naar array indien nodig
    const huidigePersonen = Array.isArray(assignmentTaak.assignedTo)
      ? assignmentTaak.assignedTo
      : (assignmentTaak.assignedTo ? [assignmentTaak.assignedTo] : []);
    const nieuwePersonen = [...huidigePersonen, naam];

    const bijgewerkt: Taak = {
      ...assignmentTaak,
      status: 'In uitvoering',
      assignedTo: nieuwePersonen,
      assignedAt: assignmentTaak.assignedAt || nuISO(), // Behoud eerste starttijd
      gewijzigd: nuISO()
    };

    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    // Auto-pin: de taak waar je net mee bent gaan werken pop't bovenaan.
    // Voor teeltplan-taken pinnen we de hele groep (alle bedden van dat gewas/actie),
    // voor handmatige taken pinnen we de individuele taak.
    if (assignmentTaak.isAutomatisch) {
      const teeltCode = assignmentTaak.bronTeeltCode || '';
      const gewas = assignmentTaak.bronGewas || (taal === 'nl' ? 'Onbekend' : 'Unknown');
      pinTaak(`groep:${teeltCode}-${gewas}`);
    } else {
      pinTaak(assignmentTaak.id);
    }
    toonToast('success', taal === 'nl'
      ? `${naam} is nu bezig met deze taak — vastgepind bovenaan 📌`
      : `${naam} is now working on this task — pinned to top 📌`);
    setAssignmentTaak(null);
    setCommunityDetailTaak(null);
  };

  // Community: stoppen met taak
  const handleStopBezigMetTaak = async (naam: string) => {
    if (!assignmentTaak) return;

    // Verwijder de persoon uit de array
    // Backwards compatibility: converteer string naar array indien nodig
    const huidigePersonen = Array.isArray(assignmentTaak.assignedTo)
      ? assignmentTaak.assignedTo
      : (assignmentTaak.assignedTo ? [assignmentTaak.assignedTo] : []);
    const nieuwePersonen = huidigePersonen.filter(
      n => n.toLowerCase() !== naam.toLowerCase()
    );

    // Als niemand meer bezig is, zet status terug naar Open
    const nieuweStatus = nieuwePersonen.length === 0 ? 'Open' : 'In uitvoering';

    const bijgewerkt: Taak = {
      ...assignmentTaak,
      status: nieuweStatus,
      assignedTo: nieuwePersonen.length > 0 ? nieuwePersonen : undefined,
      assignedAt: nieuwePersonen.length > 0 ? assignmentTaak.assignedAt : undefined,
      gewijzigd: nuISO()
    };

    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('success', taal === 'nl' ? `${naam} is gestopt` : `${naam} stopped working`);

    // Update assignmentTaak state zodat modal bijwerkt
    if (nieuwePersonen.length > 0) {
      setAssignmentTaak(bijgewerkt);
    } else {
      setAssignmentTaak(null);
      setCommunityDetailTaak(null);
    }
  };

  // Commissie: taak opslaan
  const handleOpslaan = async (taak: Taak) => {
    dispatch({ type: 'UPDATE_TAAK', payload: taak });
    await saveTaak(taak);
    toonToast('success', taal === 'nl' ? 'Taak bijgewerkt' : 'Task updated');
    setBewerkTaak(null);
    setDetailTaak(null);
  };

  // Commissie: taak verwijderen
  const handleVerwijder = async (taak: Taak) => {
    if (confirm(`Weet je zeker dat je "${taak.beschrijving}" wilt verwijderen?`)) {
      dispatch({ type: 'VERWIJDER_TAAK', payload: taak.id });
      await deleteTaak(taak.id);
      toonToast('success', 'Taak verwijderd');
      setDetailTaak(null);
    }
  };

  // Bed uitstellen naar volgende week (vooruit schuiven)
  const handleBedUitstel = async (actie: string, gewas: string, bedId: string, code: TeeltCode, taakId?: string) => {
    // Zoek of er al een voortgang record bestaat
    const bestaand = bedVoortgang.find(bv =>
      bv.bedId === bedId && bv.gewas === gewas && bv.actie === actie && bv.code === code
    );

    // Bepaal de huidige geplande week (uit record of huidige week)
    const huidigeGeplandWeek = bestaand ? bestaand.geplandWeek : weekInfo.weekNummer;
    const huidigeGeplandJaar = bestaand ? bestaand.geplandJaar : weekInfo.jaar;
    const oorspronkelijkeWeek = bestaand ? bestaand.oorspronkelijkeWeek : weekInfo.weekNummer;
    const oorspronkelijkJaar = bestaand ? bestaand.oorspronkelijkJaar : weekInfo.jaar;

    // Bereken volgende week
    const volgendeWeek = huidigeGeplandWeek + 1;
    const volgendeJaar = volgendeWeek > 52 ? huidigeGeplandJaar + 1 : huidigeGeplandJaar;
    const correcteVolgendeWeek = volgendeWeek > 52 ? 1 : volgendeWeek;

    const nieuwRecord: BedVoortgang = {
      id: bestaand?.id || `bv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bedId,
      gewas,
      actie,
      code,
      oorspronkelijkeWeek,
      oorspronkelijkJaar,
      geplandWeek: correcteVolgendeWeek,
      geplandJaar: volgendeJaar,
      status: 'uitgesteld',
      afgerondDoor: bestaand?.afgerondDoor,
      afgerondOp: bestaand?.afgerondOp,
      aangemaakt: bestaand?.aangemaakt || nuISO(),
      gewijzigd: nuISO()
    };

    if (bestaand) {
      dispatch({ type: 'UPDATE_BED_VOORTGANG', payload: nieuwRecord });
    } else {
      dispatch({ type: 'VOEG_BED_VOORTGANG_TOE', payload: nieuwRecord });
    }
    await saveBedVoortgang(nieuwRecord);

    // Synchroniseer met taken systeem - update deadline van gerelateerde taak
    // Gebruik de meegegeven taakId als die er is, anders zoek via matching
    const bestaandeTaak = taakId
      ? taken.find(t => t.id === taakId)
      : taken.find(t =>
          t.isAutomatisch &&
          t.bronGewas === gewas &&
          t.bronTeeltCode === code &&
          t.bedId === bedId
        );

    if (bestaandeTaak) {
      // Bereken nieuwe deadline op basis van nieuwe week
      const nieuweDeadline = getWeekDeadline(correcteVolgendeWeek, volgendeJaar);
      const bijgewerkteTaak: Taak = {
        ...bestaandeTaak,
        deadline: nieuweDeadline,
        commentaar: `Week ${correcteVolgendeWeek}-${volgendeJaar}`,
        gewijzigd: nuISO()
      };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkteTaak });
      await saveTaak(bijgewerkteTaak);
    }

    toonToast('success', taal === 'nl'
      ? `Bed ${bedId} uitgesteld naar week ${correcteVolgendeWeek}`
      : `Bed ${bedId} postponed to week ${correcteVolgendeWeek}`);
  };

  // Bed vervroegen naar vorige week (terug schuiven)
  const handleBedVervroeg = async (actie: string, gewas: string, bedId: string, code: TeeltCode, taakId?: string) => {
    // Zoek of er al een voortgang record bestaat
    const bestaand = bedVoortgang.find(bv =>
      bv.bedId === bedId && bv.gewas === gewas && bv.actie === actie && bv.code === code
    );

    // Bepaal de huidige geplande week en oorspronkelijke week
    const huidigeGeplandWeek = bestaand ? bestaand.geplandWeek : weekInfo.weekNummer;
    const huidigeGeplandJaar = bestaand ? bestaand.geplandJaar : weekInfo.jaar;
    const oorspronkelijkeWeek = bestaand ? bestaand.oorspronkelijkeWeek : weekInfo.weekNummer;
    const oorspronkelijkJaar = bestaand ? bestaand.oorspronkelijkJaar : weekInfo.jaar;

    // Bereken vorige week
    const vorigeWeek = huidigeGeplandWeek - 1;
    const vorigeJaar = vorigeWeek < 1 ? huidigeGeplandJaar - 1 : huidigeGeplandJaar;
    const correcteVorigeWeek = vorigeWeek < 1 ? 52 : vorigeWeek;

    // Bepaal de nieuwe status
    let nieuweStatus: 'beschikbaar' | 'uitgesteld' | 'vervroegd';
    if (correcteVorigeWeek === oorspronkelijkeWeek && vorigeJaar === oorspronkelijkJaar) {
      // Terug naar origineel
      nieuweStatus = 'beschikbaar';
    } else if (correcteVorigeWeek < oorspronkelijkeWeek || vorigeJaar < oorspronkelijkJaar) {
      // Eerder dan origineel
      nieuweStatus = 'vervroegd';
    } else {
      // Nog steeds later dan origineel (maar dichter bij)
      nieuweStatus = 'uitgesteld';
    }

    // Gebruik de meegegeven taakId als die er is, anders zoek via matching
    const vindTaak = () => taakId
      ? taken.find(t => t.id === taakId)
      : taken.find(t =>
          t.isAutomatisch &&
          t.bronGewas === gewas &&
          t.bronTeeltCode === code &&
          t.bedId === bedId
        );

    // Als we terug zijn bij origineel en geen afronding data, kunnen we record verwijderen
    if (nieuweStatus === 'beschikbaar' && bestaand && !bestaand.afgerondDoor) {
      dispatch({ type: 'VERWIJDER_BED_VOORTGANG', payload: bestaand.id });
      await deleteBedVoortgang(bestaand.id);

      // Synchroniseer met taken systeem - reset deadline naar originele week
      const bestaandeTaak = vindTaak();

      if (bestaandeTaak) {
        const nieuweDeadline = getWeekDeadline(correcteVorigeWeek, vorigeJaar);
        const bijgewerkteTaak: Taak = {
          ...bestaandeTaak,
          deadline: nieuweDeadline,
          commentaar: `Week ${correcteVorigeWeek}-${vorigeJaar}`,
          gewijzigd: nuISO()
        };
        dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkteTaak });
        await saveTaak(bijgewerkteTaak);
      }

      toonToast('success', taal === 'nl'
        ? `Bed ${bedId} teruggezet naar originele week ${correcteVorigeWeek}`
        : `Bed ${bedId} reset to original week ${correcteVorigeWeek}`);
      return;
    }

    const nieuwRecord: BedVoortgang = {
      id: bestaand?.id || `bv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bedId,
      gewas,
      actie,
      code,
      oorspronkelijkeWeek,
      oorspronkelijkJaar,
      geplandWeek: correcteVorigeWeek,
      geplandJaar: vorigeJaar,
      status: nieuweStatus,
      afgerondDoor: bestaand?.afgerondDoor,
      afgerondOp: bestaand?.afgerondOp,
      aangemaakt: bestaand?.aangemaakt || nuISO(),
      gewijzigd: nuISO()
    };

    if (bestaand) {
      dispatch({ type: 'UPDATE_BED_VOORTGANG', payload: nieuwRecord });
    } else {
      dispatch({ type: 'VOEG_BED_VOORTGANG_TOE', payload: nieuwRecord });
    }
    await saveBedVoortgang(nieuwRecord);

    // Synchroniseer met taken systeem - update deadline van gerelateerde taak
    const bestaandeTaak = vindTaak();

    if (bestaandeTaak) {
      // Bereken nieuwe deadline op basis van nieuwe week
      const nieuweDeadline = getWeekDeadline(correcteVorigeWeek, vorigeJaar);
      const bijgewerkteTaak: Taak = {
        ...bestaandeTaak,
        deadline: nieuweDeadline,
        commentaar: `Week ${correcteVorigeWeek}-${vorigeJaar}`,
        gewijzigd: nuISO()
      };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkteTaak });
      await saveTaak(bijgewerkteTaak);
    }

    const statusTekst = nieuweStatus === 'vervroegd'
      ? (taal === 'nl' ? 'vervroegd naar' : 'moved earlier to')
      : (taal === 'nl' ? 'verplaatst naar' : 'moved to');
    toonToast('success', `Bed ${bedId} ${statusTekst} week ${correcteVorigeWeek}`);
  };

  // Bed markeren als afgerond
  const handleBedAfgerond = async (actie: string, gewas: string, bedId: string, code: TeeltCode, naam: string, taakId?: string) => {
    // Sla gebruikersnaam op
    if (naam !== state.ui.gebruikersnaam) {
      dispatch({ type: 'SET_GEBRUIKERSNAAM', payload: naam });
    }

    // Zoek of er al een voortgang record bestaat
    const bestaand = bedVoortgang.find(bv =>
      bv.bedId === bedId && bv.gewas === gewas && bv.actie === actie && bv.code === code
    );

    const nieuwRecord: BedVoortgang = bestaand ? {
      ...bestaand,
      status: 'afgerond',
      afgerondDoor: naam,
      afgerondOp: nuISO(),
      gewijzigd: nuISO()
    } : {
      id: `bv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bedId,
      gewas,
      actie,
      code,
      oorspronkelijkeWeek: weekInfo.weekNummer,
      oorspronkelijkJaar: weekInfo.jaar,
      geplandWeek: weekInfo.weekNummer,
      geplandJaar: weekInfo.jaar,
      status: 'afgerond',
      afgerondDoor: naam,
      afgerondOp: nuISO(),
      aangemaakt: nuISO(),
      gewijzigd: nuISO()
    };

    if (bestaand) {
      dispatch({ type: 'UPDATE_BED_VOORTGANG', payload: nieuwRecord });
    } else {
      dispatch({ type: 'VOEG_BED_VOORTGANG_TOE', payload: nieuwRecord });
    }
    await saveBedVoortgang(nieuwRecord);

    // Synchroniseer met taken systeem
    // Gebruik de meegegeven taakId als die er is, anders zoek via matching
    const bestaandeTaak = taakId
      ? taken.find(t => t.id === taakId)
      : taken.find(t =>
          t.isAutomatisch &&
          t.bronGewas === gewas &&
          t.bronTeeltCode === code &&
          t.bedId === bedId
        );

    if (bestaandeTaak) {
      // Update bestaande taak naar afgerond
      const bijgewerkteTaak: Taak = {
        ...bestaandeTaak,
        status: 'Afgerond',
        afgerondDoor: naam,
        afgerondOp: nuISO(),
        gewijzigd: nuISO()
      };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkteTaak });
      await saveTaak(bijgewerkteTaak);
    } else {
      // Maak nieuwe afgeronde taak aan (alleen als er geen bestaande was)
      const nieuweTaak: Taak = {
        id: `taak-bed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        beschrijving: `${actie}: ${gewas} in bed ${bedId}`,
        sectie: bedId.charAt(0) as any,
        bedId,
        type: TEELTCODE_TAAKTYPE[code],
        prioriteit: code === 'o' || code === 'bu' || code === 'ku' ? 'Hoog' : 'Normaal',
        status: 'Afgerond',
        deadline: vandaagISO(),
        aangemaakt: nuISO(),
        gewijzigd: nuISO(),
        isAutomatisch: true,
        bronGewas: gewas,
        bronTeeltCode: code,
        commentaar: `Week ${weekInfo.weekNummer}-${weekInfo.jaar}`,
        isAdHoc: false,
        afgerondDoor: naam,
        afgerondOp: nuISO()
      };
      dispatch({ type: 'VOEG_TAAK_TOE', payload: nieuweTaak });
      await saveTaak(nieuweTaak);
    }

    toonToast('success', `✓ ${actie}: ${gewas} in bed ${bedId} afgerond door ${naam}`);
  };

  // Bed heropenen (van afgerond terug naar beschikbaar)
  const handleBedHeropenen = async (actie: string, gewas: string, bedId: string, code: TeeltCode, taakId?: string) => {
    // Zoek het voortgang record
    const bestaand = bedVoortgang.find(bv =>
      bv.bedId === bedId && bv.gewas === gewas && bv.actie === actie && bv.code === code
    );

    if (!bestaand) {
      toonToast('error', taal === 'nl' ? 'Geen voortgang record gevonden' : 'No progress record found');
      return;
    }

    // Update voortgang naar beschikbaar (of verwijder als terug naar originele week)
    if (bestaand.geplandWeek === bestaand.oorspronkelijkeWeek && bestaand.geplandJaar === bestaand.oorspronkelijkJaar) {
      // Terug naar originele week, verwijder record
      dispatch({ type: 'VERWIJDER_BED_VOORTGANG', payload: bestaand.id });
      await deleteBedVoortgang(bestaand.id);
    } else {
      // Update status naar beschikbaar
      const bijgewerkt: BedVoortgang = {
        ...bestaand,
        status: 'beschikbaar',
        afgerondDoor: undefined,
        afgerondOp: undefined,
        gewijzigd: nuISO()
      };
      dispatch({ type: 'UPDATE_BED_VOORTGANG', payload: bijgewerkt });
      await saveBedVoortgang(bijgewerkt);
    }

    // Synchroniseer met taken systeem - zet eventuele taak terug naar Open
    // Gebruik de meegegeven taakId als die er is, anders zoek via matching
    const bestaandeTaak = taakId
      ? taken.find(t => t.id === taakId)
      : taken.find(t =>
          t.isAutomatisch &&
          t.bronGewas === gewas &&
          t.bronTeeltCode === code &&
          t.bedId === bedId &&
          t.status === 'Afgerond'
        );

    if (bestaandeTaak) {
      const bijgewerkteTaak: Taak = {
        ...bestaandeTaak,
        status: 'Open',
        afgerondDoor: undefined,
        afgerondOp: undefined,
        gewijzigd: nuISO()
      };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkteTaak });
      await saveTaak(bijgewerkteTaak);
    }

    toonToast('success', taal === 'nl'
      ? `Bed ${bedId} heropend`
      : `Bed ${bedId} reopened`);
  };

  // Taak heropenen (van afgerond terug naar open)
  // Verschuif een venster-taak 1 week eerder of later
  const handleVerschuifWeek = async (taak: Taak, richting: -1 | 1) => {
    if (taak.scheduledWeek === undefined || taak.windowStart === undefined || taak.windowEnd === undefined) return;
    const nieuweWeek = taak.scheduledWeek + richting;
    if (nieuweWeek < taak.windowStart || nieuweWeek > taak.windowEnd) return;

    const bijgewerkt: Taak = {
      ...taak,
      scheduledWeek: nieuweWeek,
      // Herbereken deadline op basis van nieuwe week (maandag van die week)
      deadline: (() => {
        const jan4 = new Date(weekInfo.jaar, 0, 4);
        const dayOfWeek = jan4.getDay() || 7;
        const maandag = new Date(jan4);
        maandag.setDate(jan4.getDate() - dayOfWeek + 1 + (nieuweWeek - 1) * 7);
        // Deadline = vrijdag van die week
        const vrijdag = new Date(maandag);
        vrijdag.setDate(maandag.getDate() + 4);
        return vrijdag.toISOString().split('T')[0];
      })(),
      gewijzigd: nuISO()
    };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('info', taal === 'nl'
      ? `Taak verschoven naar week ${nieuweWeek}`
      : `Task moved to week ${nieuweWeek}`);
  };

  const handleTaakHeropenen = async (taak: Taak) => {
    // Herhalende taken: per-week afvinken ongedaan maken
    if (taak.isHerhalend && taak.afgevinktWeeks?.includes(huidigeWeekCode)) {
      await handleHerhalendAfvinken(taak);
      return;
    }

    const bijgewerkt: Taak = {
      ...taak,
      status: 'Open',
      afgerondDoor: undefined,
      afgerondOp: undefined,
      gewijzigd: nuISO()
    };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);

    // Synchroniseer met bed voortgang als het een automatische taak is
    if (taak.isAutomatisch && taak.bronGewas && taak.bronTeeltCode && taak.bedId) {
      const voortgang = bedVoortgang.find(bv =>
        bv.gewas === taak.bronGewas &&
        bv.code === taak.bronTeeltCode &&
        bv.bedId === taak.bedId &&
        bv.status === 'afgerond'
      );

      if (voortgang) {
        // Update voortgang naar beschikbaar
        if (voortgang.geplandWeek === voortgang.oorspronkelijkeWeek && voortgang.geplandJaar === voortgang.oorspronkelijkJaar) {
          dispatch({ type: 'VERWIJDER_BED_VOORTGANG', payload: voortgang.id });
          await deleteBedVoortgang(voortgang.id);
        } else {
          const bijgewerktVoortgang: BedVoortgang = {
            ...voortgang,
            status: 'beschikbaar',
            afgerondDoor: undefined,
            afgerondOp: undefined,
            gewijzigd: nuISO()
          };
          dispatch({ type: 'UPDATE_BED_VOORTGANG', payload: bijgewerktVoortgang });
          await saveBedVoortgang(bijgewerktVoortgang);
        }
      }
    }

    toonToast('success', taal === 'nl' ? 'Taak heropend' : 'Task reopened');
  };

  // Teeltplan gewas klikken - maakt een taak aan of opent bestaande
  const handleTeeltplanGewasKlik = async (actie: string, gewas: string, bedIds: string[], code: TeeltCode) => {
    // Zoek of er al een taak bestaat voor deze combinatie van gewas/actie/week
    const weekKey = `${weekInfo.weekNummer}-${weekInfo.jaar}`;
    const bestaandeTaak = taken.find(t =>
      t.isAutomatisch &&
      t.bronGewas === gewas &&
      t.bronTeeltCode === code &&
      t.commentaar?.includes(weekKey)
    );

    if (bestaandeTaak) {
      // Open bestaande taak
      if (isCommissie) {
        setDetailTaak(bestaandeTaak);
      } else {
        setCommunityDetailTaak(bestaandeTaak);
      }
    } else {
      // Maak nieuwe taak aan
      const beschrijving = `${actie}: ${gewas} in ${bedIds.join(', ')}`;
      const nieuweTaak: Taak = {
        id: `taak-teelt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        beschrijving,
        sectie: bedIds[0]?.charAt(0) as any || '',
        bedId: bedIds.join(', '),
        type: TEELTCODE_TAAKTYPE[code],
        prioriteit: code === 'o' || code === 'bu' || code === 'ku' ? 'Hoog' : 'Normaal',
        status: 'Open',
        deadline: vandaagISO(),
        aangemaakt: nuISO(),
        gewijzigd: nuISO(),
        isAutomatisch: true,
        bronGewas: gewas,
        bronTeeltCode: code,
        commentaar: `Week ${weekKey}`,
        isAdHoc: false,
      };

      // Sla op naar state en Firebase
      dispatch({ type: 'VOEG_TAAK_TOE', payload: nieuweTaak });
      await saveTaak(nieuweTaak);

      // Open de nieuwe taak
      if (isCommissie) {
        setDetailTaak(nieuweTaak);
      } else {
        setCommunityDetailTaak(nieuweTaak);
      }
    }
  };

  // Handler voor nieuwe taak opslaan via TaakFormulier
  const handleNieuweTaakOpslaan = async (taak: Taak) => {
    // Zet de deadline op een datum binnen de geselecteerde week
    const taakMetWeekDeadline = {
      ...taak,
      deadline: taak.deadline || eind.toISOString().split('T')[0]
    };
    dispatch({ type: 'VOEG_TAAK_TOE', payload: taakMetWeekDeadline });
    await saveTaak(taakMetWeekDeadline);
    toonToast('success', 'Taak toegevoegd');
    setToonNieuwFormulier(false);
  };

  // Commissie: publiceer taken (maak zichtbaar voor community)
  const handlePubliceer = async (takenLijst: Taak[]) => {
    for (const taak of takenLijst) {
      const bijgewerkt: Taak = { ...taak, communityZichtbaar: true, gewijzigd: new Date().toISOString() };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
    }
    toonToast('success', taal === 'nl'
      ? `${takenLijst.length} ${takenLijst.length === 1 ? 'taak' : 'taken'} gepubliceerd`
      : `${takenLijst.length} ${takenLijst.length === 1 ? 'task' : 'tasks'} published`);
  };

  // Commissie: depubliceer taken (verberg voor community)
  const handleDepubliceer = async (takenLijst: Taak[]) => {
    for (const taak of takenLijst) {
      const bijgewerkt: Taak = { ...taak, communityZichtbaar: false, gewijzigd: new Date().toISOString() };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
    }
    toonToast('info', taal === 'nl'
      ? `${takenLijst.length} ${takenLijst.length === 1 ? 'taak' : 'taken'} gedepubliceerd`
      : `${takenLijst.length} ${takenLijst.length === 1 ? 'task' : 'tasks'} unpublished`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-tuin-800">{t.weekOverview.title}</h2>
        {isCommissie && (
          <button
            onClick={() => setToonNieuwFormulier(true)}
            className="flex items-center gap-2 px-4 py-2 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {taal === 'nl' ? 'Nieuwe taak' : 'New task'}
          </button>
        )}
      </div>

      {/* Week navigatie */}
      <WeekNavigatie
        datum={geselecteerdeDatum}
        onVorigeWeek={handleVorigeWeek}
        onVolgendeWeek={handleVolgendeWeek}
        onDezeWeek={handleDezeWeek}
      />

      {/* Vastgepind blok — staat altijd helemaal bovenaan, los van categorie */}
      {(() => {
        const heeftGepindeGroep = teeltplanTaken.some(t => {
          const code = t.bronTeeltCode || '';
          const gewas = t.bronGewas || (taal === 'nl' ? 'Onbekend' : 'Unknown');
          return isPinned(`groep:${code}-${gewas}`);
        });
        const gepindeHandmatige = commissieTakenGesorteerd.filter(t => isPinned(t.id));
        if (!heeftGepindeGroep && gepindeHandmatige.length === 0) return null;
        return (
          <div className="space-y-3">
            {heeftGepindeGroep && (
              <GegroepeerdeTeeltplanTaken
                taken={teeltplanTaken}
                isCommissie={isCommissie}
                jaar={weekInfo.jaar}
                filterMode="pinned"
                kopTitel={taal === 'nl' ? '📌 Vastgepind' : '📌 Pinned'}
                onTaakOpen={(taak) => {
                  if (isCommissie) {
                    setDetailTaak(taak);
                  } else {
                    setCommunityDetailTaak(taak);
                  }
                }}
                onTaakAfvinken={(taak) => setAfvinkTaak(taak)}
                onTaakHeropenen={handleTaakHeropenen}
                onVerschuifWeek={handleVerschuifWeek}
                onPubliceer={handlePubliceer}
                onDepubliceer={handleDepubliceer}
              />
            )}
            {gepindeHandmatige.length > 0 && (
              <CommissieTakenKaart
                taken={gepindeHandmatige}
                isCommissie={isCommissie}
                weekStart={start}
                weekCode={huidigeWeekCode}
                onStatusWijzig={handleStatusWijzig}
                onTaakOpen={(taak) => {
                  if (isCommissie) {
                    setDetailTaak(taak);
                  } else {
                    setCommunityDetailTaak(taak);
                  }
                }}
                onTaakEdit={(taak) => setDetailTaak(taak)}
                onTaakDelete={handleVerwijder}
                onTaakHeropenen={handleTaakHeropenen}
              />
            )}
          </div>
        );
      })()}

      {/* Teeltplan taken - gegroepeerd weergegeven voor zowel commissie als community */}
      {/* Commissie ziet alle taken + publish/edit controls; community ziet alleen gepubliceerde */}
      {teeltplanTaken.length > 0 && (
        <GegroepeerdeTeeltplanTaken
          taken={teeltplanTaken}
          isCommissie={isCommissie}
          jaar={weekInfo.jaar}
          filterMode="rest"
          onTaakOpen={(taak) => {
            if (isCommissie) {
              setDetailTaak(taak);
            } else {
              setCommunityDetailTaak(taak);
            }
          }}
          onTaakAfvinken={(taak) => setAfvinkTaak(taak)}
          onTaakHeropenen={handleTaakHeropenen}
          onVerschuifWeek={handleVerschuifWeek}
          onPubliceer={handlePubliceer}
          onDepubliceer={handleDepubliceer}
        />
      )}

      {/* Commissie taken (losse regels) — exclusief gepinde (die staan hierboven) */}
      <CommissieTakenKaart
        taken={commissieTakenGesorteerd.filter(t => !isPinned(t.id))}
        isCommissie={isCommissie}
        weekStart={start}
        weekCode={huidigeWeekCode}
        onStatusWijzig={handleStatusWijzig}
        onTaakOpen={(taak) => {
          if (isCommissie) {
            setDetailTaak(taak);
          } else {
            setCommunityDetailTaak(taak);
          }
        }}
        onTaakEdit={(taak) => setDetailTaak(taak)}
        onTaakDelete={handleVerwijder}
        onTaakHeropenen={handleTaakHeropenen}
      />

      {/* LEGACY: HandmatigeTakenKaart - niet meer gebruikt */}
      {/*
      <HandmatigeTakenKaart
        taken={gesorteerd}
        isCommissie={isCommissie}
        weekStart={start}
        onStatusWijzig={handleStatusWijzig}
        onTaakOpen={(taak) => {
          if (isCommissie) {
            setDetailTaak(taak);
          } else {
            setCommunityDetailTaak(taak);
          }
        }}
        onTaakEdit={(taak) => setDetailTaak(taak)}
        onTaakDelete={handleVerwijder}
        onTaakHeropenen={handleTaakHeropenen}
      />
      */}

      {/* LEGACY: TeeltSamenvattingKaart - niet meer gebruikt */}
      {/*
      <TeeltSamenvattingKaart
        datum={geselecteerdeDatum}
        weekNummer={weekInfo.weekNummer}
        jaar={weekInfo.jaar}
        isCommissie={isCommissie}
        bedVoortgang={bedVoortgang}
        taken={taken}
        onBedUitstel={handleBedUitstel}
        onBedVervroeg={handleBedVervroeg}
        onBedAfgerond={handleBedAfgerond}
        onBedHeropenen={handleBedHeropenen}
        onGewasKlik={handleTeeltplanGewasKlik}
      />
      */}

      {/* Lege state */}
      {weekTaken.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {t.weekOverview.noTasks}
          </h3>
          <p className="text-gray-500">
            {taal === 'nl'
              ? 'Er zijn geen taken voor deze week.'
              : 'There are no tasks for this week.'}
          </p>
        </div>
      )}

      {/* Modals */}
      {bewerkTaak && (
        <TaakFormulier
          taak={bewerkTaak}
          onOpslaan={handleOpslaan}
          onAnnuleren={() => setBewerkTaak(null)}
        />
      )}

      {afvinkTaak && (
        <AfvinkModal
          taak={afvinkTaak}
          onBevestig={handleAfvinken}
          onAnnuleren={() => setAfvinkTaak(null)}
        />
      )}

      {notitieTaak && (
        <CommunityNotitieModal
          taak={notitieTaak}
          onOpslaan={handleNotitieToevoegen}
          onAnnuleren={() => setNotitieTaak(null)}
        />
      )}

      {detailTaak && (
        <TaakFormulier
          taak={detailTaak}
          onOpslaan={handleOpslaan}
          onAnnuleren={() => setDetailTaak(null)}
        />
      )}

      {communityDetailTaak && (
        <CommunityTaakModal
          taak={communityDetailTaak}
          onSluiten={() => setCommunityDetailTaak(null)}
          onAfvinken={() => {
            setAfvinkTaak(communityDetailTaak);
            setCommunityDetailTaak(null);
          }}
          onNotitie={() => {
            setNotitieTaak(communityDetailTaak);
            setCommunityDetailTaak(null);
          }}
          onBezigMet={() => {
            setAssignmentTaak(communityDetailTaak);
          }}
        />
      )}

      {/* Assignment modal - bezig met taak */}
      {assignmentTaak && (
        <AssignmentModal
          taak={assignmentTaak}
          onBevestig={handleBezigMetTaak}
          onStop={handleStopBezigMetTaak}
          onAnnuleren={() => setAssignmentTaak(null)}
        />
      )}

      {/* Nieuw taak formulier (commissie) */}
      {toonNieuwFormulier && (
        <TaakFormulier
          onOpslaan={handleNieuweTaakOpslaan}
          onAnnuleren={() => setToonNieuwFormulier(false)}
        />
      )}
    </div>
  );
}
