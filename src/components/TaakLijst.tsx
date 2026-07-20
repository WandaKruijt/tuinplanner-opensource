import React, { useState, useMemo } from 'react';
import {
  Plus,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Play,
  AlertTriangle,
  MessageSquare,
  Zap,
  User,
  Search,
  X,
  Camera,
  SlidersHorizontal,
  LayoutGrid,
  Archive,
  ArchiveRestore,
  Pin
} from 'lucide-react';
import { useApp, useGefilterdeTaken } from '../context/AppContext';
import type { Taak, TaakType, TaakPrioriteit, TaakStatus, Sectie, FilterOpties, TaakBron } from '../types';
import { TaakFormulier, TAAK_TYPE_ICONEN } from './TaakFormulier';
import { formatDatum } from '../utils/dateUtils';
import { berekenDynamischePrioriteit } from '../utils/taskGenerator';
import { getTaakFotos } from '../utils/fotoUtils';
import { SECTIES } from '../types';
import { useI18n } from '../i18n';
import { TranslatedText } from './TranslatedText';
import { GegroepeerdeTeeltplanTaken } from './GegroepeerdeTeeltplanTaken';
import { useTeeltplanTaakActies } from '../hooks/useTeeltplanTaakActies';
import { usePinnedTasks } from '../hooks/usePinnedTasks';

// ============================================
// FOTO GALERIJ MODAL COMPONENT
// ============================================

function FotoGallerijModal({ fotos, startIndex, onSluiten }: { fotos: string[]; startIndex: number; onSluiten: () => void }) {
  const [huidigeIndex, setHuidigeIndex] = useState(startIndex);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onSluiten}>
      <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
        <button onClick={onSluiten} className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/30 rounded-lg z-10">
          <X className="w-6 h-6 text-white" />
        </button>
        <img src={fotos[huidigeIndex]} alt={`Foto ${huidigeIndex + 1}`} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        {fotos.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 rounded-lg px-4 py-2">
            <button onClick={() => setHuidigeIndex(i => (i - 1 + fotos.length) % fotos.length)} className="text-white hover:text-gray-300">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-white text-sm">{huidigeIndex + 1} / {fotos.length}</span>
            <button onClick={() => setHuidigeIndex(i => (i + 1) % fotos.length)} className="text-white hover:text-gray-300">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// TAAK KAART COMPONENT
// ============================================

interface TaakKaartProps {
  taak: Taak;
  onEdit: () => void;
  onDelete: () => void;
  onStatusWijzig: (nieuweStatus: TaakStatus) => void;
  onNotitieToevoegen: () => void;
  onArchiveer?: () => void;
  onTerugzetten?: () => void;
  t: ReturnType<typeof useI18n>['t'];
  taal: 'nl' | 'en';
  isCommissie: boolean;
  isArchiefWeergave?: boolean;
}

function TaakKaart({ taak, onEdit, onDelete, onStatusWijzig, onNotitieToevoegen, onArchiveer, onTerugzetten, t, taal, isCommissie, isArchiefWeergave }: TaakKaartProps) {
  const [toonActies, setToonActies] = useState(false);
  const [fotoModal, setFotoModal] = useState<{ fotos: string[]; index: number } | null>(null);
  const { isPinned, togglePin } = usePinnedTasks();
  const pinned = isPinned(taak.id);

  // Gebruik dynamische prioriteit voor automatische taken
  const dynamischePrioriteit = berekenDynamischePrioriteit(taak);

  // Check of deadline verlopen is (voor badge tonen)
  const isVerlopen = new Date(taak.deadline) < new Date(new Date().setHours(0, 0, 0, 0));
  // Urgent is nu gebaseerd op dynamische prioriteit
  const urgent = dynamischePrioriteit === 'Hoog' && taak.status !== 'Afgerond';

  // Consistente kleurlogica op basis van status en dynamische prioriteit
  const getPrioriteitKleur = () => {
    // Als afgerond of gearchiveerd, gebruik groene/grijze rand
    if (taak.status === 'Gearchiveerd') return 'border-l-gray-400';
    if (taak.status === 'Afgerond') return 'border-l-green-500';
    // Als iemand bezig is (In uitvoering met assignedTo), gebruik amber rand
    if (taak.status === 'In uitvoering' && taak.assignedTo && (Array.isArray(taak.assignedTo) ? taak.assignedTo.length > 0 : taak.assignedTo)) return 'border-l-amber-500';
    // Rood voor: hoge dynamische prioriteit (commissie hoog OF auto met verlopen deadline)
    if (dynamischePrioriteit === 'Hoog') return 'border-l-red-500';
    // Amber voor normale prioriteit (commissie normaal OF auto met deadline deze week)
    if (dynamischePrioriteit === 'Normaal') return 'border-l-amber-500';
    // Grijs voor lage prioriteit (commissie laag OF auto met deadline > 1 week)
    return 'border-l-gray-400';
  };

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
      className={`
        bg-white rounded-lg shadow-sm border-l-4 p-4
        hover:shadow-md transition-shadow cursor-pointer
        ${getPrioriteitKleur()}
        ${pinned ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
        ${taak.status === 'Afgerond' || taak.status === 'Gearchiveerd' ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Type icoon */}
        <div className={`
          p-2 rounded-lg flex-shrink-0
          ${taak.status === 'Afgerond' || taak.status === 'Gearchiveerd' ? 'bg-gray-100 text-gray-400' : 'bg-tuin-100 text-tuin-600'}
        `}>
          {TAAK_TYPE_ICONEN[taak.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-medium text-gray-800 ${taak.status === 'Afgerond' || taak.status === 'Gearchiveerd' ? 'line-through' : ''}`}>
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
                  pinned
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
                }`}
                title={pinned
                  ? (taal === 'nl' ? 'Losmaken van bovenaan' : 'Unpin from top')
                  : (taal === 'nl' ? 'Vastpinnen bovenaan' : 'Pin to top')}
              >
                <Pin className={`w-4 h-4 ${pinned ? 'fill-current' : ''}`} />
              </button>
              {taak.isAdHoc && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                  <Zap className="w-3 h-3" /> {taal === 'nl' ? 'Snelle Taak' : 'Quick Task'}
                </span>
              )}
              {taak.isAutomatisch && (
                <span className="text-xs text-tuin-600 bg-tuin-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Auto
                </span>
              )}
              {(urgent || isVerlopen) && taak.status !== 'Afgerond' && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {isVerlopen ? (taal === 'nl' ? 'Verlopen' : 'Overdue') : 'Urgent'}
                </span>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
            {taak.bedIds && taak.bedIds.length > 0 ? (
              <span className="bg-gray-100 px-2 py-0.5 rounded">{t.form.bed} {taak.bedIds.join(', ')}</span>
            ) : taak.bedId ? (
              <span className="bg-gray-100 px-2 py-0.5 rounded">{t.form.bed} {taak.bedId}</span>
            ) : null}
            {taak.sectie && !taak.bedId && (!taak.bedIds || taak.bedIds.length === 0) && (
              <span className="bg-gray-100 px-2 py-0.5 rounded">{t.form.section} {taak.sectie}</span>
            )}
            <span>{t.form.deadline}: {formatDatum(taak.deadline)}</span>
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

          {/* Community notities indicator */}
          {taak.communityNotities && taak.communityNotities.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span>
                {taak.communityNotities.length} {taal === 'nl' ? (taak.communityNotities.length > 1 ? 'notities' : 'notitie') : (taak.communityNotities.length > 1 ? 'notes' : 'note')} {taal === 'nl' ? 'van community' : 'from community'}
              </span>
            </div>
          )}

          {/* Foto thumbnails */}
          {(() => {
            const fotos = getTaakFotos(taak);
            if (fotos.length === 0) return null;
            return (
              <div className="flex gap-1 mt-2">
                <img
                  src={fotos[0]}
                  alt="Foto"
                  className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                  onClick={(e) => { e.stopPropagation(); setFotoModal({ fotos, index: 0 }); }}
                />
                {fotos.length > 1 && (
                  <span className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:bg-gray-200"
                    onClick={(e) => { e.stopPropagation(); setFotoModal({ fotos, index: 1 }); }}>
                    +{fotos.length - 1}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Bezig door info (meerdere personen mogelijk) */}
          {taak.assignedTo && (Array.isArray(taak.assignedTo) ? taak.assignedTo.length > 0 : taak.assignedTo) && taak.status !== 'Afgerond' && (
            <div className="flex items-center gap-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">
              <Play className="w-4 h-4 flex-shrink-0" />
              <span>
                {t.tasks.workingBy} <span className="font-medium">{Array.isArray(taak.assignedTo) ? taak.assignedTo.join(', ') : taak.assignedTo}</span>
                {taak.assignedAt && (
                  <span className="text-amber-500 ml-1">
                    ({new Date(taak.assignedAt).toLocaleDateString(taal === 'nl' ? 'nl-NL' : 'en-GB')})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Afgerond door info */}
          {taak.status === 'Afgerond' && taak.afgerondDoor && (
            <div className="flex items-center gap-1 text-sm text-tuin-600 bg-tuin-50 px-2 py-1 rounded mb-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span>
                {t.form.completedBy} <span className="font-medium">{taak.afgerondDoor}</span>
                {taak.afgerondOp && (
                  <span className="text-tuin-500 ml-1">
                    ({new Date(taak.afgerondOp).toLocaleDateString(taal === 'nl' ? 'nl-NL' : 'en-GB')})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Status en acties */}
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
                  {taak.status !== 'In uitvoering' && taak.status !== 'Afgerond' && (
                    <button
                      onClick={() => { onStatusWijzig('In uitvoering'); setToonActies(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 text-blue-500" />
                      {taal === 'nl' ? 'Start uitvoering' : 'Start task'}
                    </button>
                  )}
                  {taak.status !== 'Afgerond' && (
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
                    onClick={() => { onNotitieToevoegen(); setToonActies(false); }}
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
                  {isCommissie && (
                    <button
                      onClick={() => { onDelete(); setToonActies(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t.common.delete}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Commissie: directe edit en delete knoppen + archiveer/terugzetten */}
          {isCommissie && (
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
              {/* Archiveer-knop: alleen bij afgeronde taken */}
              {taak.status === 'Afgerond' && onArchiveer && (
                <button
                  onClick={onArchiveer}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors min-w-[44px] min-h-[44px] justify-center ml-auto"
                  title={taal === 'nl' ? 'Archiveren' : 'Archive'}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {taal === 'nl' ? 'Archiveren' : 'Archive'}
                </button>
              )}
              {/* Terugzetten-knop: alleen in archief-weergave */}
              {isArchiefWeergave && taak.status === 'Gearchiveerd' && onTerugzetten && (
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
          )}
        </div>
      </div>

      {/* Foto Galerij Modal */}
      {fotoModal && (
        <FotoGallerijModal
          fotos={fotoModal.fotos}
          startIndex={fotoModal.index}
          onSluiten={() => setFotoModal(null)}
        />
      )}
    </div>
  );
}

// ============================================
// MODERN FILTER BAR COMPONENT - SCENARIO A
// Compacte chips, inklapbare filters, gewas combobox
// ============================================

interface FilterBarProps {
  filters: FilterOpties;
  onFilterWijzig: (filters: Partial<FilterOpties>) => void;
  beschikbareGewassen: string[];
  zoekterm: string;
  onZoektermWijzig: (zoekterm: string) => void;
  taakStats: { totaal: number; open: number; inUitvoering: number; afgerond: number; gearchiveerd: number };
  t: ReturnType<typeof useI18n>['t'];
  taal: 'nl' | 'en';
  isCommissie: boolean;
}

function FilterBar({ filters, onFilterWijzig, beschikbareGewassen, zoekterm, onZoektermWijzig, taakStats, t, taal, isCommissie }: FilterBarProps) {
  const [gewasZoek, setGewasZoek] = useState('');
  const [toonGewasDropdown, setToonGewasDropdown] = useState(false);
  const [toonFilters, setToonFilters] = useState(false);

  // Filter gewassen op basis van zoekterm
  const gefilterdeGewassen = beschikbareGewassen.filter(gewas =>
    (gewas || '').toLowerCase().includes((gewasZoek || '').toLowerCase())
  );

  const handleGewasSelect = (gewas: string) => {
    onFilterWijzig({ gewas });
    setGewasZoek('');
    setToonGewasDropdown(false);
  };

  // Tel actieve filters (exclusief status want die is altijd zichtbaar, en exclusief gewas want die zit niet in het panel)
  const actieveExtraFilters = [
    filters.taakType !== 'Alle',
    filters.prioriteit !== 'Alle',
    filters.sectie !== 'Alle',
    filters.bron !== 'Alle',
  ].filter(Boolean).length;

  // Alle actieve filters voor tags weergave
  // NIET status - die is al zichtbaar in de chips bovenaan
  // Alleen filters uit het uitklapbare panel + gewas
  const actieveFilterTags: { key: string; label: string; value: string }[] = [];

  if (filters.taakType !== 'Alle') {
    const typeLabel = filters.taakType === 'Zaaien' ? t.tasks.types.sowing :
                      filters.taakType === 'Planten' ? t.tasks.types.planting :
                      filters.taakType === 'Oogsten' ? t.tasks.types.harvesting :
                      filters.taakType === 'Onderhoud' ? t.tasks.types.maintenance :
                      t.tasks.types.other;
    actieveFilterTags.push({ key: 'taakType', label: t.tasks.type, value: typeLabel });
  }
  if (filters.prioriteit !== 'Alle') {
    const prioLabel = filters.prioriteit === 'Hoog' ? t.tasks.priorities.high :
                      filters.prioriteit === 'Normaal' ? t.tasks.priorities.normal :
                      filters.prioriteit === 'Urgent' ? 'Urgent' :
                      t.tasks.priorities.low;
    actieveFilterTags.push({ key: 'prioriteit', label: t.tasks.priority, value: prioLabel });
  }
  if (filters.sectie !== 'Alle') {
    actieveFilterTags.push({ key: 'sectie', label: t.form.section, value: t.sections[filters.sectie] || filters.sectie });
  }
  if (filters.gewas !== 'Alle') {
    actieveFilterTags.push({ key: 'gewas', label: t.filters.crop, value: filters.gewas });
  }
  if (filters.bron !== 'Alle') {
    const bronLabel = filters.bron === 'teeltplan' ? t.filters.fromCultivationPlan : t.filters.addedByCommittee;
    actieveFilterTags.push({ key: 'bron', label: t.filters.source, value: bronLabel });
  }

  // Reset alle filters
  const resetFilters = () => {
    onFilterWijzig({
      status: 'Alle',
      taakType: 'Alle',
      prioriteit: 'Alle',
      sectie: 'Alle',
      gewas: 'Alle',
      bron: 'Alle',
    });
    onZoektermWijzig('');
  };

  // Verwijder specifieke filter
  const verwijderFilter = (key: string) => {
    onFilterWijzig({ [key]: 'Alle' });
  };

  return (
    <div className="space-y-3">
      {/* Zoekbalk */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="search-bar-modern has-icon">
          <Search className="search-icon w-5 h-5" />
          <input
            type="search"
            value={zoekterm}
            onChange={(e) => onZoektermWijzig(e.target.value)}
            placeholder={isCommissie
              ? (taal === 'nl' ? 'Zoek op taak, gewas, naam, bed...' : 'Search task, crop, name, bed...')
              : t.filters.searchPlaceholder}
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
              onClick={() => onZoektermWijzig('')}
              className="p-2 hover:bg-gray-100 rounded-lg mr-1 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Status chips + Meer filters knop */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Compacte status chips */}
        <button
          onClick={() => onFilterWijzig({ status: 'Alle' })}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filters.status === 'Alle'
              ? 'bg-tuin-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t.common.all}
          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${
            filters.status === 'Alle' ? 'bg-tuin-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {taakStats.totaal}
          </span>
        </button>

        <button
          onClick={() => onFilterWijzig({ status: 'Open' })}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filters.status === 'Open'
              ? 'bg-tuin-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-3 h-3" />
          {t.tasks.statuses.open}
          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${
            filters.status === 'Open' ? 'bg-tuin-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {taakStats.open}
          </span>
        </button>

        <button
          onClick={() => onFilterWijzig({ status: 'In uitvoering' })}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filters.status === 'In uitvoering'
              ? 'bg-tuin-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Play className="w-3 h-3" />
          {t.tasks.statuses.inProgress}
          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${
            filters.status === 'In uitvoering' ? 'bg-tuin-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {taakStats.inUitvoering}
          </span>
        </button>

        <button
          onClick={() => onFilterWijzig({ status: 'Afgerond' })}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filters.status === 'Afgerond'
              ? 'bg-tuin-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          {t.tasks.statuses.completed}
          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${
            filters.status === 'Afgerond' ? 'bg-tuin-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {taakStats.afgerond}
          </span>
        </button>

        {/* Archief chip - alleen in commissie-modus */}
        {isCommissie && taakStats.gearchiveerd > 0 && (
          <button
            onClick={() => onFilterWijzig({ status: 'Archief' })}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.status === 'Archief'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Archive className="w-3 h-3" />
            {taal === 'nl' ? 'Archief' : 'Archive'}
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${
              filters.status === 'Archief' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {taakStats.gearchiveerd}
            </span>
          </button>
        )}

        {/* Separator */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Meer filters toggle knop */}
        <button
          onClick={() => setToonFilters(!toonFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            toonFilters || actieveExtraFilters > 0
              ? 'bg-tuin-100 text-tuin-700 border border-tuin-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {t.filters.moreFilters}
          {actieveExtraFilters > 0 && (
            <span className="px-1.5 py-0.5 bg-tuin-600 text-white text-xs rounded-full min-w-[18px] text-center">
              {actieveExtraFilters}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toonFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Reset filters knop - alleen tonen als er filters actief zijn (inclusief status) */}
        {(actieveFilterTags.length > 0 || zoekterm || filters.status !== 'Alle') && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {t.filters.resetFilters}
          </button>
        )}
      </div>

      {/* Uitgebreide filters panel - KAN SLUITEN */}
      {toonFilters && (
        <div className="bg-white rounded-xl shadow-sm p-4 animate-fade-in border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Type filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{t.tasks.type}</label>
              <select
                value={filters.taakType}
                onChange={(e) => onFilterWijzig({ taakType: e.target.value as TaakType | 'Alle' })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{t.common.all}</option>
                <option value="Zaaien">{t.tasks.types.sowing}</option>
                <option value="Planten">{t.tasks.types.planting}</option>
                <option value="Oogsten">{t.tasks.types.harvesting}</option>
                <option value="Onderhoud">{t.tasks.types.maintenance}</option>
                <option value="Overig">{t.tasks.types.other}</option>
              </select>
            </div>

            {/* Prioriteit filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{t.tasks.priority}</label>
              <select
                value={filters.prioriteit}
                onChange={(e) => onFilterWijzig({ prioriteit: e.target.value as TaakPrioriteit | 'Alle' | 'Urgent' })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{t.common.all}</option>
                <option value="Urgent">Urgent</option>
                <option value="Hoog">{t.tasks.priorities.high}</option>
                <option value="Normaal">{t.tasks.priorities.normal}</option>
                <option value="Laag">{t.tasks.priorities.low}</option>
              </select>
            </div>

            {/* Sectie filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{t.form.section}</label>
              <select
                value={filters.sectie}
                onChange={(e) => onFilterWijzig({ sectie: e.target.value as Sectie | 'Alle' })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{t.common.all}</option>
                {SECTIES.map(s => (
                  <option key={s} value={s}>{t.sections[s] || s}</option>
                ))}
              </select>
            </div>

            {/* Bron filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{t.filters.source}</label>
              <select
                value={filters.bron}
                onChange={(e) => onFilterWijzig({ bron: e.target.value as TaakBron | 'Alle' })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 bg-gray-50"
              >
                <option value="Alle">{t.filters.allSources}</option>
                <option value="teeltplan">{t.filters.fromCultivationPlan}</option>
                <option value="commissie">{t.filters.addedByCommittee}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Actieve filter tags - groene verwijderbare tags */}
      {actieveFilterTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actieveFilterTags.map(tag => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 px-2 py-1 bg-tuin-100 text-tuin-800 rounded-full text-xs"
            >
              <span className="font-medium">{tag.label}:</span> {tag.value}
              <button
                onClick={() => verwijderFilter(tag.key)}
                className="ml-0.5 p-0.5 hover:bg-tuin-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN TAAK LIJST COMPONENT
// ============================================

export function TaakLijst() {
  const { state, dispatch, toonToast, saveTaak, deleteTaak, isCommissie } = useApp();
  const gefilterdeTaken = useGefilterdeTaken();
  const { t, taal } = useI18n();
  const { handlePubliceer, handleDepubliceer, handleVerschuifWeek, handleTaakHeropenen } = useTeeltplanTaakActies();
  const { isPinned } = usePinnedTasks();

  const huidigJaar = new Date().getFullYear();

  const [bewerkTaak, setBewerkTaak] = useState<Taak | null>(null);
  const [toonNieuwFormulier, setToonNieuwFormulier] = useState(false);
  const [notitieTaak, setNotitieTaak] = useState<Taak | null>(null);
  const [nieuweNotitie, setNieuweNotitie] = useState('');
  const [zoekterm, setZoekterm] = useState('');

  // Bereken taak statistieken (gearchiveerd apart tellen)
  const taakStats = useMemo(() => {
    const alleTaken = state.data.taken || [];
    const actief = alleTaken.filter(t => t.status !== 'Gearchiveerd');
    return {
      totaal: actief.length,
      open: actief.filter(t => t.status === 'Open').length,
      inUitvoering: actief.filter(t => t.status === 'In uitvoering').length,
      afgerond: actief.filter(t => t.status === 'Afgerond').length,
      gearchiveerd: alleTaken.filter(t => t.status === 'Gearchiveerd').length,
    };
  }, [state.data.taken]);

  // Uitgebreide zoekfunctie over alle velden
  const matchesSearch = (taak: Taak, term: string): boolean => {
    if (!term.trim()) return true;
    const zoek = term.toLowerCase();
    const doorzoekbaar = [
      taak.beschrijving,
      taak.beschrijving_en,
      taak.bronGewas,
      taak.sectie,
      taak.bedId,
      taak.afgerondDoor,
      Array.isArray(taak.assignedTo) ? taak.assignedTo.join(' ') : taak.assignedTo,
      taak.archivedBy,
      taak.type,
      taak.bronTeeltCode,
      taak.commentaar,
    ];
    return doorzoekbaar.some(veld =>
      veld && String(veld).toLowerCase().includes(zoek)
    );
  };

  // Filter taken op zoekterm (bovenop bestaande filters)
  const gezochteTaken = useMemo(() => {
    if (!zoekterm.trim()) return gefilterdeTaken;
    return gefilterdeTaken.filter(taak => matchesSearch(taak, zoekterm));
  }, [gefilterdeTaken, zoekterm]);

  const handleOpslaan = async (taak: Taak) => {
    if (bewerkTaak) {
      dispatch({ type: 'UPDATE_TAAK', payload: taak });
      await saveTaak(taak);
      toonToast('success', taal === 'nl' ? 'Taak bijgewerkt' : 'Task updated');
    } else {
      dispatch({ type: 'VOEG_TAAK_TOE', payload: taak });
      await saveTaak(taak);
      toonToast('success', taal === 'nl' ? 'Taak toegevoegd' : 'Task added');
    }
    setBewerkTaak(null);
    setToonNieuwFormulier(false);
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

  const handleStatusWijzig = async (taak: Taak, nieuweStatus: TaakStatus) => {
    const bijgewerkt = { ...taak, status: nieuweStatus, gewijzigd: new Date().toISOString() };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    const statusLabel = nieuweStatus === 'Open' ? t.tasks.statuses.open :
                        nieuweStatus === 'In uitvoering' ? t.tasks.statuses.inProgress :
                        t.tasks.statuses.completed;
    toonToast('success', taal === 'nl' ? `Taak gemarkeerd als "${statusLabel}"` : `Task marked as "${statusLabel}"`);
  };

  const handleNotitieOpslaan = async () => {
    if (!notitieTaak || !nieuweNotitie.trim()) return;

    // Voeg de nieuwe notitie toe aan bestaand commentaar
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
    const confirmMsg = taal === 'nl'
      ? 'Weet je zeker dat je deze taak wilt archiveren?'
      : 'Are you sure you want to archive this task?';
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
    const confirmMsg = taal === 'nl'
      ? 'Weet je zeker dat je deze taak wilt terugzetten?'
      : 'Are you sure you want to restore this task?';
    if (confirm(confirmMsg)) {
      const bijgewerkt: Taak = {
        ...taak,
        status: 'Afgerond' as TaakStatus,
        gewijzigd: new Date().toISOString(),
      };
      // Verwijder archief-velden
      delete bijgewerkt.archivedAt;
      delete bijgewerkt.archivedBy;
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
      toonToast('success', taal === 'nl' ? 'Taak teruggezet' : 'Task restored');
    }
  };

  // Is archief-weergave actief?
  const isArchiefWeergave = state.ui.filters.status === 'Archief';

  // Verzamel unieke gewassen uit alle taken (voor filter dropdown)
  const beschikbareGewassen = [...new Set(
    state.data.taken
      .filter(t => t.bronGewas)
      .map(t => t.bronGewas!)
  )].sort();

  // Bepaal welke taak een gepinde groep of een gepinde individuele taak is.
  // Voor teeltplan-taken kijken we naar de groepsleutel ('groep:teeltcode-gewas');
  // voor handmatige taken naar de losse taak-id.
  const isTaakGepind = (taak: Taak): boolean => {
    if (taak.isAutomatisch) {
      const gewasNaam = taak.bronGewas || (taal === 'nl' ? 'Onbekend' : 'Unknown');
      return isPinned(`groep:${taak.bronTeeltCode || ''}-${gewasNaam}`);
    }
    return isPinned(taak.id);
  };

  // Splits taken: gepind (voor blok bovenaan) versus rest (voor de normale secties).
  const gepindeTaken = gezochteTaken.filter(isTaakGepind);
  const restTaken = gezochteTaken.filter(t => !isTaakGepind(t));
  const gepindeAutoTaken = gepindeTaken.filter(t => t.isAutomatisch === true);
  const gepindeHandmatige = gepindeTaken.filter(t => t.isAutomatisch !== true);

  // Groepeer gezochte taken per sectie (alleen niet-gepinde)
  const geenSectieLabel = taal === 'nl' ? 'Geen sectie' : 'No section';
  const takenPerSectieGezocht = useMemo(() => {
    return restTaken.reduce((acc, taak) => {
      const sectie = taak.sectie || geenSectieLabel;
      if (!acc[sectie]) acc[sectie] = [];
      acc[sectie].push(taak);
      return acc;
    }, {} as Record<string, Taak[]>);
  }, [restTaken, geenSectieLabel]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-tuin-800">{t.nav.allTasks}</h2>
        <button
          onClick={() => setToonNieuwFormulier(true)}
          className="flex items-center gap-2 px-4 py-2 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t.form.newTask}
        </button>
      </div>

      {/* Filters */}
      <FilterBar
        filters={state.ui.filters}
        onFilterWijzig={(filters) => dispatch({ type: 'SET_FILTERS', payload: filters })}
        beschikbareGewassen={beschikbareGewassen}
        zoekterm={zoekterm}
        onZoektermWijzig={setZoekterm}
        taakStats={taakStats}
        t={t}
        taal={taal}
        isCommissie={isCommissie}
      />

      {/* Vastgepind blok — altijd helemaal bovenaan, los van sectie */}
      {gepindeTaken.length > 0 && (
        <div className="space-y-3">
          {gepindeAutoTaken.length > 0 && (
            <GegroepeerdeTeeltplanTaken
              taken={gepindeAutoTaken}
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
          )}
          {gepindeHandmatige.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden ring-2 ring-amber-400">
              {gepindeAutoTaken.length === 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-3 border-b border-amber-200">
                  <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                    📌 {taal === 'nl' ? 'Vastgepind' : 'Pinned'}
                  </h4>
                </div>
              )}
              <div className="p-4 space-y-3">
                {gepindeHandmatige.map(taak => (
                  <TaakKaart
                    key={taak.id}
                    taak={taak}
                    onEdit={() => setBewerkTaak(taak)}
                    onDelete={() => handleVerwijder(taak)}
                    onStatusWijzig={(status) => handleStatusWijzig(taak, status)}
                    onNotitieToevoegen={() => {
                      setNotitieTaak(taak);
                      setNieuweNotitie('');
                    }}
                    onArchiveer={() => handleArchiveer(taak)}
                    onTerugzetten={() => handleTerugzetten(taak)}
                    t={t}
                    taal={taal}
                    isCommissie={isCommissie}
                    isArchiefWeergave={isArchiefWeergave}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Taken lijst */}
      {gezochteTaken.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {taal === 'nl' ? 'Geen taken gevonden' : 'No tasks found'}
          </h3>
          <p className="text-gray-500">
            {state.data.taken.length === 0
              ? (taal === 'nl' ? 'Voeg je eerste taak toe of genereer taken uit het teeltplan.' : 'Add your first task or generate tasks from the cultivation plan.')
              : zoekterm.trim()
                ? (taal === 'nl' ? `Geen taken gevonden voor '${zoekterm}'` : `No tasks found for '${zoekterm}'`)
                : (taal === 'nl' ? 'Probeer de filters of zoekterm aan te passen.' : 'Try adjusting the filters or search term.')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(takenPerSectieGezocht).map(([sectie, taken]) => {
            const autoTaken = taken.filter(t => t.isAutomatisch === true);
            const overigeTaken = taken
              .filter(t => t.isAutomatisch !== true)
              .sort((a, b) => {
                const aP = isPinned(a.id) ? 1 : 0;
                const bP = isPinned(b.id) ? 1 : 0;
                return bP - aP;
              });

            return (
              <div key={sectie}>
                <h3 className="text-lg font-semibold text-tuin-700 mb-3 flex items-center gap-2">
                  {sectie !== geenSectieLabel && (
                    <span className="w-7 h-7 bg-tuin-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                      {sectie}
                    </span>
                  )}
                  {sectie === geenSectieLabel ? (taal === 'nl' ? 'Algemene taken' : 'General tasks') : (t.sections[sectie] || sectie)}
                  <span className="text-sm font-normal text-gray-500">
                    ({taken.length} {taal === 'nl' ? (taken.length === 1 ? 'taak' : 'taken') : (taken.length === 1 ? 'task' : 'tasks')})
                  </span>
                </h3>

                {/* Gegroepeerde teeltplan taken */}
                {autoTaken.length > 0 && (
                  <div className="mb-3">
                    <GegroepeerdeTeeltplanTaken
                      taken={autoTaken}
                      isCommissie={isCommissie}
                      jaar={huidigJaar}
                      toonWeekNummer={true}
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

                {/* Overige taken als losse kaartjes */}
                {overigeTaken.length > 0 && (
                  <div className="space-y-3">
                    {overigeTaken.map(taak => (
                      <TaakKaart
                        key={taak.id}
                        taak={taak}
                        onEdit={() => setBewerkTaak(taak)}
                        onDelete={() => handleVerwijder(taak)}
                        onStatusWijzig={(status) => handleStatusWijzig(taak, status)}
                        onNotitieToevoegen={() => {
                          setNotitieTaak(taak);
                          setNieuweNotitie('');
                        }}
                        onArchiveer={() => handleArchiveer(taak)}
                        onTerugzetten={() => handleTerugzetten(taak)}
                        t={t}
                        taal={taal}
                        isCommissie={isCommissie}
                        isArchiefWeergave={isArchiefWeergave}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Formulieren */}
      {(toonNieuwFormulier || bewerkTaak) && (
        <TaakFormulier
          taak={bewerkTaak || undefined}
          onOpslaan={handleOpslaan}
          onAnnuleren={() => {
            setBewerkTaak(null);
            setToonNieuwFormulier(false);
          }}
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
              {/* Bestaande notities */}
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

              {/* Nieuwe notitie input */}
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
                onClick={() => {
                  setNotitieTaak(null);
                  setNieuweNotitie('');
                }}
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
