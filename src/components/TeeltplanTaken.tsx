import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  Play,
  AlertTriangle,
  Zap,
  ArrowUpDown,
  Filter,
  Calendar,
  Sprout,
  MapPin,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  MessageSquare,
  User
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Taak, TaakType, TaakStatus, Sectie, TeeltCode } from '../types';
import { SECTIES, TEELTCODE_ACTIES, TEELTCODE_ACTIES_EN } from '../types';
import { TaakFormulier } from './TaakFormulier';
import { formatDatum } from '../utils/dateUtils';
import { berekenDynamischePrioriteit } from '../utils/taskGenerator';
import { useI18n } from '../i18n';
import { TranslatedText } from './TranslatedText';
import { GegroepeerdeTeeltplanTaken } from './GegroepeerdeTeeltplanTaken';
import { useTeeltplanTaakActies } from '../hooks/useTeeltplanTaakActies';

// ============================================
// SORTEER OPTIES
// ============================================

type SorteerVeld = 'deadline' | 'maand' | 'gewas' | 'locatie' | 'sectie' | 'status';
type SorteerRichting = 'asc' | 'desc';

interface SorteerOptie {
  veld: SorteerVeld;
  labelNl: string;
  labelEn: string;
  icon: React.ReactNode;
}

const SORTEER_OPTIES: SorteerOptie[] = [
  { veld: 'deadline', labelNl: 'Datum', labelEn: 'Date', icon: <Calendar className="w-4 h-4" /> },
  { veld: 'maand', labelNl: 'Maand', labelEn: 'Month', icon: <Calendar className="w-4 h-4" /> },
  { veld: 'gewas', labelNl: 'Gewas', labelEn: 'Crop', icon: <Sprout className="w-4 h-4" /> },
  { veld: 'locatie', labelNl: 'Locatie', labelEn: 'Location', icon: <MapPin className="w-4 h-4" /> },
  { veld: 'sectie', labelNl: 'Sectie', labelEn: 'Section', icon: <MapPin className="w-4 h-4" /> },
  { veld: 'status', labelNl: 'Status', labelEn: 'Status', icon: <Clock className="w-4 h-4" /> },
];

// ============================================
// FILTER STATE
// ============================================

interface TeeltplanFilters {
  gewas: string;
  locatie: string;
  sectie: string;
  status: TaakStatus | 'Alle';
  taakType: TaakType | 'Alle';
  maand: number | 'Alle'; // 0-11 of 'Alle'
}

const defaultFilters: TeeltplanFilters = {
  gewas: 'Alle',
  locatie: 'Alle',
  sectie: 'Alle',
  status: 'Alle',
  taakType: 'Alle',
  maand: 'Alle',
};

// ============================================
// TEELTPLAN TAKEN COMPONENT
// ============================================

export function TeeltplanTaken() {
  const { state, dispatch, toonToast, saveTaak, deleteTaak, isCommissie } = useApp();
  const { t, taal } = useI18n();
  const { handlePubliceer, handleDepubliceer, handleVerschuifWeek, handleTaakHeropenen } = useTeeltplanTaakActies();

  const [zoekterm, setZoekterm] = useState('');
  const [filters, setFilters] = useState<TeeltplanFilters>(defaultFilters);
  const [sorteerVeld, setSorteerVeld] = useState<SorteerVeld>('deadline');
  const [sorteerRichting, setSorteerRichting] = useState<SorteerRichting>('asc');
  const [toonFilters, setToonFilters] = useState(false);
  const [bewerkTaak, setBewerkTaak] = useState<Taak | null>(null);
  const [notitieTaak, setNotitieTaak] = useState<Taak | null>(null);
  const [nieuweNotitie, setNieuweNotitie] = useState('');

  const huidigJaar = new Date().getFullYear();

  // Haal alleen automatische teeltplan taken op
  const teeltplanTaken = useMemo(() => {
    return state.data.taken.filter(t => t.isAutomatisch === true);
  }, [state.data.taken]);

  // Verzamel unieke waarden voor filter dropdowns
  const beschikbareGewassen = useMemo(() =>
    [...new Set(teeltplanTaken.filter(t => t.bronGewas).map(t => t.bronGewas!))].sort(),
    [teeltplanTaken]
  );

  const beschikbareLocaties = useMemo(() =>
    [...new Set(teeltplanTaken.filter(t => t.locatie).map(t => t.locatie!))].sort(),
    [teeltplanTaken]
  );

  // Pas filters toe
  const gefilterdeTaken = useMemo(() => {
    let result = [...teeltplanTaken];

    // Zoekterm
    if (zoekterm.trim()) {
      const zoek = zoekterm.toLowerCase();
      result = result.filter(taak => {
        const doorzoekbaar = [
          taak.beschrijving,
          taak.beschrijving_en,
          taak.bronGewas,
          taak.bronGewasSoort,
          taak.sectie,
          taak.bedId,
          taak.bronTeeltCode ? (taal === 'nl' ? TEELTCODE_ACTIES[taak.bronTeeltCode] : TEELTCODE_ACTIES_EN[taak.bronTeeltCode]) : '',
        ];
        return doorzoekbaar.some(veld => veld && String(veld).toLowerCase().includes(zoek));
      });
    }

    // Gewas filter
    if (filters.gewas !== 'Alle') {
      result = result.filter(t => t.bronGewas === filters.gewas);
    }

    // Locatie filter
    if (filters.locatie !== 'Alle') {
      result = result.filter(t => t.locatie === filters.locatie);
    }

    // Sectie filter
    if (filters.sectie !== 'Alle') {
      result = result.filter(t => t.sectie === filters.sectie);
    }

    // Status filter - "Alle" verbergt gearchiveerde taken (net als TaakLijst)
    if (filters.status === 'Gearchiveerd') {
      result = result.filter(t => t.status === 'Gearchiveerd');
    } else if (filters.status !== 'Alle') {
      result = result.filter(t => t.status === filters.status);
    } else {
      // "Alle" toont alles BEHALVE gearchiveerde taken
      result = result.filter(t => t.status !== 'Gearchiveerd');
    }

    // Taak type filter
    if (filters.taakType !== 'Alle') {
      result = result.filter(t => t.type === filters.taakType);
    }

    // Maand filter
    if (filters.maand !== 'Alle') {
      result = result.filter(t => new Date(t.deadline).getMonth() === filters.maand);
    }

    return result;
  }, [teeltplanTaken, zoekterm, filters, taal]);

  // Sorteer
  const gesorteerd = useMemo(() => {
    const sorted = [...gefilterdeTaken];

    sorted.sort((a, b) => {
      let vergelijk = 0;

      switch (sorteerVeld) {
        case 'deadline':
          vergelijk = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case 'maand': {
          // Sorteer op maand (uit deadline)
          const maandA = new Date(a.deadline).getMonth();
          const maandB = new Date(b.deadline).getMonth();
          vergelijk = maandA - maandB;
          if (vergelijk === 0) {
            vergelijk = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
          break;
        }
        case 'gewas':
          vergelijk = (a.bronGewas || '').localeCompare(b.bronGewas || '');
          if (vergelijk === 0) {
            vergelijk = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
          break;
        case 'locatie':
          vergelijk = (a.locatie || '').localeCompare(b.locatie || '');
          if (vergelijk === 0) {
            vergelijk = (a.bronGewas || '').localeCompare(b.bronGewas || '');
          }
          break;
        case 'sectie':
          vergelijk = (a.sectie || '').localeCompare(b.sectie || '');
          if (vergelijk === 0) {
            vergelijk = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
          break;
        case 'status': {
          const statusWaarde: Record<string, number> = { 'Open': 0, 'In uitvoering': 1, 'Afgerond': 2, 'Gearchiveerd': 3 };
          vergelijk = (statusWaarde[a.status] ?? 4) - (statusWaarde[b.status] ?? 4);
          if (vergelijk === 0) {
            vergelijk = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
          break;
        }
      }

      return sorteerRichting === 'asc' ? vergelijk : -vergelijk;
    });

    return sorted;
  }, [gefilterdeTaken, sorteerVeld, sorteerRichting]);

  // Stats
  const stats = useMemo(() => {
    const actief = teeltplanTaken.filter(t => t.status !== 'Gearchiveerd');
    return {
      totaal: actief.length,
      open: actief.filter(t => t.status === 'Open').length,
      inUitvoering: actief.filter(t => t.status === 'In uitvoering').length,
      afgerond: actief.filter(t => t.status === 'Afgerond').length,
      gearchiveerd: teeltplanTaken.filter(t => t.status === 'Gearchiveerd').length,
    };
  }, [teeltplanTaken]);

  // Actieve filter tags
  const actieveFilterTags: { key: keyof TeeltplanFilters; label: string; value: string }[] = [];
  if (filters.gewas !== 'Alle') actieveFilterTags.push({ key: 'gewas', label: taal === 'nl' ? 'Gewas' : 'Crop', value: filters.gewas });
  if (filters.locatie !== 'Alle') actieveFilterTags.push({ key: 'locatie', label: taal === 'nl' ? 'Locatie' : 'Location', value: filters.locatie === 'kas' ? 'Kas' : filters.locatie === 'buiten' ? 'Buiten' : filters.locatie });
  if (filters.sectie !== 'Alle') actieveFilterTags.push({ key: 'sectie', label: taal === 'nl' ? 'Sectie' : 'Section', value: filters.sectie });
  if (filters.status !== 'Alle') actieveFilterTags.push({ key: 'status', label: 'Status', value: filters.status });
  if (filters.taakType !== 'Alle') actieveFilterTags.push({ key: 'taakType', label: taal === 'nl' ? 'Type' : 'Type', value: filters.taakType });

  // Maand namen voor display
  const maandNamenVol = taal === 'nl'
    ? ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (filters.maand !== 'Alle') actieveFilterTags.push({ key: 'maand', label: taal === 'nl' ? 'Maand' : 'Month', value: maandNamenVol[filters.maand as number] });

  // Handlers
  const handleSorteerKlik = (veld: SorteerVeld) => {
    if (sorteerVeld === veld) {
      setSorteerRichting(r => r === 'asc' ? 'desc' : 'asc');
    } else {
      setSorteerVeld(veld);
      setSorteerRichting('asc');
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setZoekterm('');
  };

  const handleStatusWijzig = async (taak: Taak, nieuweStatus: TaakStatus) => {
    const bijgewerkt = { ...taak, status: nieuweStatus, gewijzigd: new Date().toISOString() };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('success', taal === 'nl' ? `Status gewijzigd naar "${nieuweStatus}"` : `Status changed to "${nieuweStatus}"`);
  };

  const handleVerwijder = async (taak: Taak) => {
    const confirmMsg = taal === 'nl'
      ? `Weet je zeker dat je "${taak.beschrijving}" wilt verwijderen?`
      : `Are you sure you want to delete "${taak.beschrijving}"?`;
    if (confirm(confirmMsg)) {
      dispatch({ type: 'VERWIJDER_TAAK', payload: taak.id });
      await deleteTaak(taak.id);
      toonToast('success', taal === 'nl' ? 'Taak verwijderd' : 'Task deleted');
    }
  };

  const handleOpslaan = async (taak: Taak) => {
    dispatch({ type: 'UPDATE_TAAK', payload: taak });
    await saveTaak(taak);
    toonToast('success', taal === 'nl' ? 'Taak bijgewerkt' : 'Task updated');
    setBewerkTaak(null);
  };

  const handleNotitieOpslaan = async () => {
    if (!notitieTaak || !nieuweNotitie.trim()) return;
    const bestaandCommentaar = notitieTaak.commentaar || '';
    const timestamp = new Date().toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const gebruiker = state.ui.gebruikersnaam || (taal === 'nl' ? 'Anoniem' : 'Anonymous');
    const nieuweEntry = `[${timestamp} - ${gebruiker}] ${nieuweNotitie.trim()}`;
    const bijgewerktCommentaar = bestaandCommentaar
      ? `${bestaandCommentaar}\n---\n${nieuweEntry}`
      : nieuweEntry;
    const bijgewerkteTaak = { ...notitieTaak, commentaar: bijgewerktCommentaar };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkteTaak });
    await saveTaak(bijgewerkteTaak);
    toonToast('success', taal === 'nl' ? 'Notitie toegevoegd' : 'Note added');
    setNotitieTaak(null);
    setNieuweNotitie('');
  };

  const handleArchiveer = async (taak: Taak) => {
    const confirmMsg = taal === 'nl' ? 'Wilt u deze taak archiveren?' : 'Archive this task?';
    if (confirm(confirmMsg)) {
      const gebruiker = state.ui.gebruikersnaam || (taal === 'nl' ? 'Onbekend' : 'Unknown');
      const bijgewerkt: Taak = {
        ...taak,
        status: 'Gearchiveerd' as TaakStatus,
        archivedAt: new Date().toISOString(),
        archivedBy: gebruiker,
        gewijzigd: new Date().toISOString(),
      };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
      toonToast('success', taal === 'nl' ? 'Taak gearchiveerd' : 'Task archived');
    }
  };

  const handleTerugzetten = async (taak: Taak) => {
    const confirmMsg = taal === 'nl' ? 'Taak terugzetten uit archief?' : 'Restore task from archive?';
    if (confirm(confirmMsg)) {
      const bijgewerkt: Taak = {
        ...taak,
        status: 'Afgerond' as TaakStatus,
        gewijzigd: new Date().toISOString(),
      };
      delete bijgewerkt.archivedAt;
      delete bijgewerkt.archivedBy;
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
      toonToast('success', taal === 'nl' ? 'Taak teruggezet' : 'Task restored');
    }
  };

  // Is archief-weergave actief?
  const isArchiefWeergave = filters.status === ('Gearchiveerd' as TaakStatus);

  // Maand namen
  const maandNamen = taal === 'nl'
    ? ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-tuin-800">
            {taal === 'nl' ? 'Teeltplan Taken' : 'Cultivation Plan Tasks'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {taal === 'nl'
              ? `${stats.totaal} taken — ${stats.open} open, ${stats.inUitvoering} in uitvoering, ${stats.afgerond} afgerond${stats.gearchiveerd > 0 ? `, ${stats.gearchiveerd} gearchiveerd` : ''}`
              : `${stats.totaal} tasks — ${stats.open} open, ${stats.inUitvoering} in progress, ${stats.afgerond} completed${stats.gearchiveerd > 0 ? `, ${stats.gearchiveerd} archived` : ''}`}
          </p>
        </div>
      </div>

      {/* Zoekbalk */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="search-bar-modern has-icon">
          <Search className="search-icon w-5 h-5" />
          <input
            type="search"
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            placeholder={taal === 'nl' ? 'Zoek op gewas, actie, bed...' : 'Search crop, action, bed...'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            data-1p-ignore
            data-lpignore="true"
            className="input-no-suggest"
          />
          {zoekterm && (
            <button
              onClick={() => setZoekterm('')}
              className="p-2 hover:bg-gray-100 rounded-lg mr-1 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Sorteer + Filter balk */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sorteer knoppen */}
        {SORTEER_OPTIES.map(optie => (
          <button
            key={optie.veld}
            onClick={() => handleSorteerKlik(optie.veld)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sorteerVeld === optie.veld
                ? 'bg-tuin-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {optie.icon}
            {taal === 'nl' ? optie.labelNl : optie.labelEn}
            {sorteerVeld === optie.veld && (
              sorteerRichting === 'asc'
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ))}

        {/* Separator */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Filter toggle */}
        <button
          onClick={() => setToonFilters(!toonFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            toonFilters || actieveFilterTags.length > 0
              ? 'bg-tuin-100 text-tuin-700 border border-tuin-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {taal === 'nl' ? 'Filters' : 'Filters'}
          {actieveFilterTags.length > 0 && (
            <span className="px-1.5 py-0.5 bg-tuin-600 text-white text-xs rounded-full min-w-[18px] text-center">
              {actieveFilterTags.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toonFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Reset */}
        {(actieveFilterTags.length > 0 || zoekterm) && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {taal === 'nl' ? 'Reset' : 'Reset'}
          </button>
        )}
      </div>

      {/* Maand selectie chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium mr-1">{taal === 'nl' ? 'Maand:' : 'Month:'}</span>
        <button
          onClick={() => setFilters(f => ({ ...f, maand: 'Alle' }))}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filters.maand === 'Alle'
              ? 'bg-tuin-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {taal === 'nl' ? 'Alle' : 'All'}
        </button>
        {maandNamen.map((naam, index) => (
          <button
            key={index}
            onClick={() => setFilters(f => ({ ...f, maand: f.maand === index ? 'Alle' : index }))}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.maand === index
                ? 'bg-tuin-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {naam}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {toonFilters && (
        <div className="bg-white rounded-xl shadow-sm p-4 animate-fade-in border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Gewas */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{taal === 'nl' ? 'Gewas' : 'Crop'}</label>
              <select
                value={filters.gewas}
                onChange={(e) => setFilters(f => ({ ...f, gewas: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{taal === 'nl' ? 'Alle gewassen' : 'All crops'}</option>
                {beschikbareGewassen.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Locatie */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{taal === 'nl' ? 'Locatie' : 'Location'}</label>
              <select
                value={filters.locatie}
                onChange={(e) => setFilters(f => ({ ...f, locatie: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{taal === 'nl' ? 'Alle locaties' : 'All locations'}</option>
                {beschikbareLocaties.map(l => (
                  <option key={l} value={l}>{l === 'kas' ? 'Kas' : l === 'buiten' ? 'Buiten' : l}</option>
                ))}
              </select>
            </div>

            {/* Sectie */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{taal === 'nl' ? 'Sectie' : 'Section'}</label>
              <select
                value={filters.sectie}
                onChange={(e) => setFilters(f => ({ ...f, sectie: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{taal === 'nl' ? 'Alle secties' : 'All sections'}</option>
                {SECTIES.map(s => (
                  <option key={s} value={s}>{t.sections[s] || s}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as TaakStatus | 'Alle' }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{taal === 'nl' ? 'Alle statussen' : 'All statuses'}</option>
                <option value="Open">{t.tasks.statuses.open}</option>
                <option value="In uitvoering">{t.tasks.statuses.inProgress}</option>
                <option value="Afgerond">{t.tasks.statuses.completed}</option>
                <option value="Gearchiveerd">{taal === 'nl' ? 'Gearchiveerd' : 'Archived'}</option>
              </select>
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{taal === 'nl' ? 'Type' : 'Type'}</label>
              <select
                value={filters.taakType}
                onChange={(e) => setFilters(f => ({ ...f, taakType: e.target.value as TaakType | 'Alle' }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{taal === 'nl' ? 'Alle types' : 'All types'}</option>
                <option value="Zaaien">{t.tasks.types.sowing}</option>
                <option value="Planten">{t.tasks.types.planting}</option>
                <option value="Oogsten">{t.tasks.types.harvesting}</option>
                <option value="Onderhoud">{t.tasks.types.maintenance}</option>
                <option value="Overig">{t.tasks.types.other}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Actieve filter tags */}
      {actieveFilterTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actieveFilterTags.map(tag => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 px-2 py-1 bg-tuin-100 text-tuin-800 rounded-full text-xs"
            >
              <span className="font-medium">{tag.label}:</span> {tag.value}
              <button
                onClick={() => setFilters(f => ({ ...f, [tag.key]: 'Alle' }))}
                className="ml-0.5 p-0.5 hover:bg-tuin-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Resultaten teller */}
      <div className="text-sm text-gray-500">
        {gesorteerd.length} {taal === 'nl' ? 'van' : 'of'} {teeltplanTaken.length} {taal === 'nl' ? 'taken' : 'tasks'}
        {sorteerVeld && (
          <span className="ml-2 text-tuin-600">
            — {taal === 'nl' ? 'gesorteerd op' : 'sorted by'} {SORTEER_OPTIES.find(o => o.veld === sorteerVeld)?.[taal === 'nl' ? 'labelNl' : 'labelEn']?.toLowerCase()}
            {' '}{sorteerRichting === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* Taken lijst */}
      {gesorteerd.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {taal === 'nl' ? 'Geen teeltplan taken gevonden' : 'No cultivation plan tasks found'}
          </h3>
          <p className="text-gray-500">
            {teeltplanTaken.length === 0
              ? (taal === 'nl' ? 'Er zijn nog geen automatische taken gegenereerd uit het teeltplan.' : 'No tasks have been generated from the cultivation plan yet.')
              : (taal === 'nl' ? 'Pas de filters of zoekterm aan.' : 'Adjust your filters or search term.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Vastgepind blok — altijd helemaal bovenaan */}
          <GegroepeerdeTeeltplanTaken
            taken={gesorteerd}
            isCommissie={isCommissie}
            jaar={huidigJaar}
            toonWeekNummer={true}
            filterMode="pinned"
            kopTitel={taal === 'nl' ? '📌 Vastgepind' : '📌 Pinned'}
            onTaakOpen={(taak) => setBewerkTaak(taak)}
            onTaakAfvinken={(taak) => handleStatusWijzig(taak, 'Afgerond')}
            onTaakHeropenen={handleTaakHeropenen}
            onVerschuifWeek={handleVerschuifWeek}
            onPubliceer={handlePubliceer}
            onDepubliceer={handleDepubliceer}
            onGroepVerwijder={async (takenLijst) => {
              for (const taak of takenLijst) {
                dispatch({ type: 'VERWIJDER_TAAK', payload: taak.id });
                await deleteTaak(taak.id);
              }
              toonToast('success', taal === 'nl'
                ? `${takenLijst.length} ${takenLijst.length === 1 ? 'taak' : 'taken'} verwijderd`
                : `${takenLijst.length} ${takenLijst.length === 1 ? 'task' : 'tasks'} deleted`);
            }}
          />

          {/* Rest van de groepen */}
          <GegroepeerdeTeeltplanTaken
            taken={gesorteerd}
            isCommissie={isCommissie}
            jaar={huidigJaar}
            toonWeekNummer={true}
            filterMode="rest"
            onTaakOpen={(taak) => setBewerkTaak(taak)}
            onTaakAfvinken={(taak) => handleStatusWijzig(taak, 'Afgerond')}
            onTaakHeropenen={handleTaakHeropenen}
            onVerschuifWeek={handleVerschuifWeek}
            onPubliceer={handlePubliceer}
            onDepubliceer={handleDepubliceer}
            onGroepVerwijder={async (takenLijst) => {
              for (const taak of takenLijst) {
                dispatch({ type: 'VERWIJDER_TAAK', payload: taak.id });
                await deleteTaak(taak.id);
              }
              toonToast('success', taal === 'nl'
                ? `${takenLijst.length} ${takenLijst.length === 1 ? 'taak' : 'taken'} verwijderd`
                : `${takenLijst.length} ${takenLijst.length === 1 ? 'task' : 'tasks'} deleted`);
            }}
          />
        </div>
      )}

      {/* Bewerk formulier */}
      {bewerkTaak && (
        <TaakFormulier
          taak={bewerkTaak}
          onOpslaan={handleOpslaan}
          onAnnuleren={() => setBewerkTaak(null)}
        />
      )}

      {/* Notitie Modal */}
      {notitieTaak && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {taal === 'nl' ? 'Notitie toevoegen' : 'Add note'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{notitieTaak.beschrijving}</p>
            </div>
            <div className="p-4 space-y-4">
              {notitieTaak.commentaar && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {taal === 'nl' ? 'Eerdere notities:' : 'Previous notes:'}
                  </p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {notitieTaak.commentaar}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {taal === 'nl' ? 'Nieuwe notitie' : 'New note'}
                </label>
                <textarea
                  value={nieuweNotitie}
                  onChange={(e) => setNieuweNotitie(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none"
                  rows={3}
                  placeholder={taal === 'nl' ? 'Typ je notitie hier...' : 'Type your note here...'}
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => { setNotitieTaak(null); setNieuweNotitie(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleNotitieOpslaan}
                disabled={!nieuweNotitie.trim()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  nieuweNotitie.trim()
                    ? 'bg-tuin-600 text-white hover:bg-tuin-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TEELTPLAN TAAK RIJ COMPONENT
// ============================================

interface TeeltplanTaakRijProps {
  taak: Taak;
  taal: 'nl' | 'en';
  t: ReturnType<typeof useI18n>['t'];
  maandNamen: string[];
  onEdit: () => void;
  onDelete: () => void;
  onStatusWijzig: (status: TaakStatus) => void;
  onNotitie: () => void;
  onArchiveer: () => void;
  onTerugzetten: () => void;
  isArchiefWeergave: boolean;
}

function TeeltplanTaakRij({ taak, taal, t, maandNamen, onEdit, onDelete, onStatusWijzig, onNotitie, onArchiveer, onTerugzetten, isArchiefWeergave }: TeeltplanTaakRijProps) {
  const [toonActies, setToonActies] = useState(false);
  const dynamischePrioriteit = berekenDynamischePrioriteit(taak);
  const isVerlopen = taak.windowEnd !== undefined
    ? taak.isOverdue === true
    : new Date(taak.deadline) < new Date(new Date().setHours(0, 0, 0, 0));

  const deadlineDatum = new Date(taak.deadline);
  const maandIndex = deadlineDatum.getMonth();

  // Kleur op basis van prioriteit
  const borderKleur = taak.status === 'Afgerond' ? 'border-l-green-500'
    : taak.status === 'Gearchiveerd' ? 'border-l-gray-400'
    : dynamischePrioriteit === 'Hoog' ? 'border-l-red-500'
    : dynamischePrioriteit === 'Normaal' ? 'border-l-amber-500'
    : 'border-l-gray-400';

  // Locatie label
  const locatieLabel = taak.locatie === 'kas'
    ? (taal === 'nl' ? 'Kas' : 'Greenhouse')
    : taak.locatie === 'buiten'
    ? (taal === 'nl' ? 'Buiten' : 'Outdoors')
    : '';

  // Actie label
  const actieLabel = taak.bronTeeltCode
    ? (taal === 'nl' ? TEELTCODE_ACTIES[taak.bronTeeltCode] : TEELTCODE_ACTIES_EN[taak.bronTeeltCode])
    : '';

  const getStatusBadge = () => {
    switch (taak.status) {
      case 'Open':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" /> {t.tasks.statuses.open}
          </span>
        );
      case 'In uitvoering':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            <Play className="w-3 h-3" /> {t.tasks.statuses.inProgress}
          </span>
        );
      case 'Afgerond':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-tuin-600 bg-tuin-100 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" /> {t.tasks.statuses.completed}
          </span>
        );
      case 'Gearchiveerd':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            <Archive className="w-3 h-3" /> {taal === 'nl' ? 'Gearchiveerd' : 'Archived'}
          </span>
        );
    }
  };

  return (
    <div
      onClick={onEdit}
      className={`bg-white rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition-shadow cursor-pointer ${borderKleur} ${
        taak.status === 'Afgerond' || taak.status === 'Gearchiveerd' ? 'opacity-60' : ''
      }`}
    >
      {/* Titel + labels */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className={`font-medium text-gray-800 ${taak.status === 'Afgerond' || taak.status === 'Gearchiveerd' ? 'line-through' : ''}`}>
          {taak.bronGewas || taak.beschrijving}
        </h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          {actieLabel && (
            <span className="text-xs px-2 py-0.5 bg-tuin-50 text-tuin-700 rounded-full">
              {actieLabel}
            </span>
          )}
          {isVerlopen && taak.status !== 'Afgerond' && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {taal === 'nl' ? 'Verlopen' : 'Overdue'}
            </span>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDatum(taak.deadline)}
        </span>
        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
          {maandNamen[maandIndex]}
        </span>
        {taak.windowStart !== undefined && taak.windowEnd !== undefined && (
          <span className="text-xs text-gray-400">
            wk {taak.windowStart}–{taak.windowEnd}
          </span>
        )}
        {locatieLabel && (
          <span className="flex items-center gap-1 text-xs">
            <MapPin className="w-3 h-3" />
            {locatieLabel}
          </span>
        )}
        {taak.bedId && (
          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{t.form.bed} {taak.bedId}</span>
        )}
        {taak.sectie && !taak.bedId && (
          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{t.form.section} {taak.sectie}</span>
        )}
      </div>

      {/* Commentaar preview */}
      {taak.commentaar && (
        <div className="flex items-start gap-1 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded mb-2">
          <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            <TranslatedText nl={taak.commentaar} en={taak.commentaar_en} />
          </span>
        </div>
      )}

      {/* Assigned info */}
      {taak.assignedTo && Array.isArray(taak.assignedTo) && taak.assignedTo.length > 0 && taak.status !== 'Afgerond' && (
        <div className="flex items-center gap-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">
          <Play className="w-4 h-4 flex-shrink-0" />
          <span>{t.tasks.workingBy} <span className="font-medium">{taak.assignedTo.join(', ')}</span></span>
        </div>
      )}

      {taak.status === 'Afgerond' && taak.afgerondDoor && (
        <div className="flex items-center gap-1 text-sm text-tuin-600 bg-tuin-50 px-2 py-1 rounded mb-2">
          <User className="w-4 h-4 flex-shrink-0" />
          <span>{t.form.completedBy} <span className="font-medium">{taak.afgerondDoor}</span></span>
        </div>
      )}

      {/* Status en acties dropdown */}
      <div className="flex items-center justify-between">
        {getStatusBadge()}

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setToonActies(!toonActies)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>

          {toonActies && (
            <div className="absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border py-1 w-48 z-10">
              {taak.status !== 'In uitvoering' && taak.status !== 'Afgerond' && taak.status !== 'Gearchiveerd' && (
                <button
                  onClick={() => { onStatusWijzig('In uitvoering'); setToonActies(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 text-blue-500" />
                  {taal === 'nl' ? 'Start uitvoering' : 'Start task'}
                </button>
              )}
              {taak.status !== 'Afgerond' && taak.status !== 'Gearchiveerd' && (
                <button
                  onClick={() => { onStatusWijzig('Afgerond'); setToonActies(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-tuin-500" />
                  {t.tasks.markComplete}
                </button>
              )}
              {taak.status === 'Afgerond' && (
                <button
                  onClick={() => { onStatusWijzig('Open'); setToonActies(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-gray-500" />
                  {taal === 'nl' ? 'Heropenen' : 'Reopen'}
                </button>
              )}
              <hr className="my-1" />
              <button
                onClick={() => { onNotitie(); setToonActies(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-blue-500" />
                {taal === 'nl' ? 'Notitie toevoegen' : 'Add note'}
              </button>
              <button
                onClick={() => { onEdit(); setToonActies(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
                {t.common.edit}
              </button>
              <button
                onClick={() => { onDelete(); setToonActies(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                {t.common.delete}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Commissie knoppen onderaan: Bewerken, Verwijderen, Archiveren/Terugzetten */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-2 py-1 text-xs text-tuin-600 hover:bg-tuin-50 rounded transition-colors min-w-[44px] min-h-[44px] justify-center"
        >
          <Edit2 className="w-3 h-3" />
          {t.common.edit}
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors min-w-[44px] min-h-[44px] justify-center"
        >
          <Trash2 className="w-3 h-3" />
          {t.common.delete}
        </button>
        {/* Archiveer-knop: bij afgeronde taken */}
        {taak.status === 'Afgerond' && (
          <button
            onClick={onArchiveer}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors min-w-[44px] min-h-[44px] justify-center ml-auto"
            title={taal === 'nl' ? 'Archiveren' : 'Archive'}
          >
            <Archive className="w-3.5 h-3.5" />
            {taal === 'nl' ? 'Archiveren' : 'Archive'}
          </button>
        )}
        {/* Terugzetten-knop: in archief-weergave */}
        {isArchiefWeergave && taak.status === 'Gearchiveerd' && (
          <button
            onClick={onTerugzetten}
            className="flex items-center gap-1 px-2 py-1 text-xs text-tuin-600 hover:bg-tuin-50 rounded transition-colors min-w-[44px] min-h-[44px] justify-center ml-auto"
            title={taal === 'nl' ? 'Terugzetten' : 'Restore'}
          >
            <ArchiveRestore className="w-3.5 h-3.5" />
            {taal === 'nl' ? 'Terugzetten' : 'Restore'}
          </button>
        )}
      </div>
    </div>
  );
}
