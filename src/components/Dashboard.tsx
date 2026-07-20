import React, { useState, useMemo } from 'react';
import { PlattegrondViewer } from './PlattegrondViewer';
import {
  Sprout,
  Sun,
  CloudSun,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Leaf,
  Calendar,
  Scissors,
  Map as MapIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Play,
  User,
  Search
} from 'lucide-react';
import { useApp, useBedden, useTaken, useTeeltplan, useGewassenlijst } from '../context/AppContext';
import type { Bed, Sectie, BedStatus, TeeltplanItem, TeeltCode, MaandKalender, Taak } from '../types';
import { TEELTCODE_ACTIES } from '../types';
import { getWeekInfo, getWeekNummer, formatDatum, periodeNaarTekst, maandNaarTekst } from '../utils/dateUtils';
import { getTaakStatistieken, isTaakUrgent } from '../utils/taskGenerator';
import { useI18n } from '../i18n';
import { vertaalGewas, actieCodes } from '../i18n/woordenboek';
import { TaakFormulier } from './TaakFormulier';
import { ExportsTile } from './ExportsTile';

// Maand namen voor kalender
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'] as const;
const MAAND_NAMEN = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const PERIODES = ['b', 'm', 'e'] as const;
const PERIODE_NAMEN = { b: 'Begin', m: 'Midden', e: 'Eind' };

// Plattegrond URLs per sectie
const PLATTEGROND_URLS: Record<Sectie, string> = {
  'A': '/images/plattegrond-sectie-a.png',
  'B': '/images/plattegrond-sectie-b.png',
  'C': '/images/plattegrond-sectie-c.png',
  'D': '/images/plattegrond-sectie-d.png',
  'E': '/images/plattegrond-sectie-e.png',
  'Kas': '/images/plattegrond-kas.png',
};

// ============================================
// PLATTEGROND MODAL
// ============================================

interface PlattegrondModalProps {
  sectie: Sectie;
  onSluiten: () => void;
  taal: 'nl' | 'en';
}

function PlattegrondModal({ sectie, onSluiten, taal }: PlattegrondModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const sectieNaam = sectie === 'Kas'
    ? (taal === 'nl' ? 'Kas' : 'Greenhouse')
    : `${taal === 'nl' ? 'Sectie' : 'Section'} ${sectie}`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MapIcon className="w-6 h-6" />
          {taal === 'nl' ? 'Plattegrond' : 'Map'}: {sectieNaam}
        </h2>
        <button
          onClick={onSluiten}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 z-10">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={taal === 'nl' ? 'Uitzoomen' : 'Zoom out'}
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <span className="px-3 text-sm font-medium text-gray-700 min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={taal === 'nl' ? 'Inzoomen' : 'Zoom in'}
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={taal === 'nl' ? 'Reset' : 'Reset'}
        >
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Image container */}
      <div
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
        >
          <img
            src={PLATTEGROND_URLS[sectie]}
            alt={`Plattegrond ${sectieNaam}`}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            draggable={false}
            onError={(e) => {
              // Toon placeholder als afbeelding niet bestaat
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div class="bg-white/10 border-2 border-dashed border-white/30 rounded-xl p-12 text-center">
                  <p class="text-white/70 text-lg mb-2">${taal === 'nl' ? 'Plattegrond nog niet beschikbaar' : 'Map not yet available'}</p>
                  <p class="text-white/50 text-sm">${PLATTEGROND_URLS[sectie]}</p>
                </div>
              `;
            }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center">
        {taal === 'nl'
          ? 'Scroll om te zoomen • Sleep om te verplaatsen'
          : 'Scroll to zoom • Drag to move'}
      </div>
    </div>
  );
}

// ============================================
// BED KAART COMPONENT
// ============================================

interface BedKaartProps {
  bed: Bed;
  status: BedStatus;
  onClick: () => void;
  selectedGewas?: string | null;
}

function BedKaart({ bed, status, onClick, selectedGewas }: BedKaartProps) {
  const { taal } = useI18n();

  const getZonIcoon = () => {
    switch (bed.zonSchaduw) {
      case 'Zon': return <Sun className="w-4 h-4 text-amber-600" />;
      case 'Halfschaduw': return <CloudSun className="w-4 h-4 text-amber-500" />;
      case 'Schaduw': return <Cloud className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const isHighlighted = selectedGewas && status.gewassen.some(
    g => g.toLowerCase() === selectedGewas.toLowerCase()
  );
  const isDimmed = selectedGewas && !isHighlighted;

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md hover:scale-105 text-left w-full ${
        isHighlighted
          ? 'border-green-500 bg-green-100 ring-2 ring-green-300 shadow-md hover:bg-green-200'
          : 'border-amber-300 bg-amber-100 hover:bg-amber-200'
      } ${isDimmed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`font-bold text-lg ${isHighlighted ? 'text-green-900' : 'text-amber-900'}`}>{bed.id}</span>
        {getZonIcoon()}
      </div>

      {status.gewassen.length > 0 && (
        <div className="space-y-1">
          {status.gewassen.slice(0, 2).map((gewas, i) => {
            const isMatch = selectedGewas && gewas.toLowerCase() === selectedGewas.toLowerCase();
            return (
              <div key={i} className={`flex items-center gap-1 text-xs ${isMatch ? 'text-green-800 font-semibold' : isHighlighted ? 'text-green-700' : 'text-amber-800'}`}>
                <Sprout className="w-3 h-3" />
                <span className="truncate">{taal === 'en' ? vertaalGewas(gewas) : gewas}</span>
              </div>
            );
          })}
          {status.gewassen.length > 2 && (
            <span className={`text-xs ${isHighlighted ? 'text-green-600' : 'text-amber-600'}`}>
              +{status.gewassen.length - 2}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ============================================
// SECTIE GRID COMPONENT
// ============================================

interface SectieGridProps {
  sectie: Sectie;
  bedden: Bed[];
  bedStatussen: Map<string, BedStatus>;
  onBedKlik: (bedId: string) => void;
  onPlattegrondKlik: (sectie: Sectie) => void;
  taal: 'nl' | 'en';
  selectedGewas?: string | null;
}

// Sorteer functie voor bedden (A1, A2, ... A10, A11)
function sorteerBedden(bedden: Bed[]): Bed[] {
  return [...bedden].sort((a, b) => {
    // Extract letter prefix and number
    const aMatch = a.id.match(/^([A-Za-z]+)(\d+)$/);
    const bMatch = b.id.match(/^([A-Za-z]+)(\d+)$/);

    if (aMatch && bMatch) {
      // Compare prefix first
      if (aMatch[1] !== bMatch[1]) {
        return aMatch[1].localeCompare(bMatch[1]);
      }
      // Then compare numbers
      return parseInt(aMatch[2]) - parseInt(bMatch[2]);
    }
    // Fallback to string comparison
    return a.id.localeCompare(b.id);
  });
}

function SectieGrid({ sectie, bedden, bedStatussen, onBedKlik, onPlattegrondKlik, taal, selectedGewas }: SectieGridProps) {
  const sectieBedden = sorteerBedden(bedden.filter(b => b.sectie === sectie));

  if (sectieBedden.length === 0) return null;

  const sectieNaam = sectie === 'Kas'
    ? (taal === 'nl' ? 'Kas' : 'Greenhouse')
    : `${taal === 'nl' ? 'Sectie' : 'Section'} ${sectie}`;

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-tuin-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-tuin-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
            {sectie}
          </span>
          {sectieNaam}
        </h3>
        <button
          onClick={() => onPlattegrondKlik(sectie)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-tuin-700 bg-tuin-50 hover:bg-tuin-100 rounded-lg transition-colors"
          title={taal === 'nl' ? 'Bekijk plattegrond' : 'View map'}
        >
          <MapIcon className="w-4 h-4" />
          {taal === 'nl' ? 'Plattegrond' : 'Map'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sectieBedden.map(bed => (
          <BedKaart
            key={bed.id}
            bed={bed}
            status={bedStatussen.get(bed.id) || {
              bedId: bed.id,
              gewassen: [],
              heeftTaken: false,
              aantalOpenTaken: 0,
              heeftUrgenteTaken: false
            }}
            onClick={() => onBedKlik(bed.id)}
            selectedGewas={selectedGewas}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// SECTIE FILTER CHIPS COMPONENT
// ============================================

interface SectieFilterChipsProps {
  secties: Sectie[];
  activeSectie: Sectie | 'Alle';
  onSectieKlik: (sectie: Sectie | 'Alle') => void;
  beddenPerSectie: Map<Sectie, number>;
  taal: 'nl' | 'en';
}

function SectieFilterChips({ secties, activeSectie, onSectieKlik, beddenPerSectie, taal }: SectieFilterChipsProps) {
  const totaalBedden = Array.from(beddenPerSectie.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <LayoutGrid className="w-5 h-5 text-tuin-600" />
        <span className="text-sm font-medium text-gray-700">
          {taal === 'nl' ? 'Filter op sectie' : 'Filter by section'}
        </span>
      </div>
      <div className="filter-chips-container">
        {/* Alle secties chip */}
        <button
          onClick={() => onSectieKlik('Alle')}
          className={`filter-chip ${activeSectie === 'Alle' ? 'filter-chip-active' : 'filter-chip-inactive'}`}
        >
          {taal === 'nl' ? 'Alle secties' : 'All sections'}
          <span className="filter-chip-count">{totaalBedden}</span>
        </button>

        {/* Sectie chips */}
        {secties.map(sectie => {
          const aantalBedden = beddenPerSectie.get(sectie) || 0;
          if (aantalBedden === 0) return null;

          const sectieNaam = sectie === 'Kas'
            ? (taal === 'nl' ? 'Kas' : 'Greenhouse')
            : `${taal === 'nl' ? 'Sectie' : 'Section'} ${sectie}`;

          return (
            <button
              key={sectie}
              onClick={() => onSectieKlik(sectie)}
              className={`filter-chip ${activeSectie === sectie ? 'filter-chip-active' : 'filter-chip-inactive'}`}
            >
              {sectieNaam}
              <span className="filter-chip-count">{aantalBedden}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// STATISTIEKEN KAART
// ============================================

interface StatKaartProps {
  titel: string;
  waarde: number;
  icoon: React.ReactNode;
  variant: 'open' | 'inProgress' | 'urgent' | 'completed';
  onClick?: () => void;
  isCommissie?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  taken?: Taak[];
  taal?: 'nl' | 'en';
  onTaakClick?: (taak: Taak) => void;
}

// Subtiele pastel kleuren per status variant
const statKaartStyles = {
  open: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-slate-200',
    iconColor: 'text-slate-500',
    numberColor: 'text-slate-800',
    labelColor: 'text-slate-500',
    iconOpacity: 'opacity-70',
  },
  inProgress: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-200',
    iconColor: 'text-orange-700',
    numberColor: 'text-orange-900',
    labelColor: 'text-orange-700',
    iconOpacity: 'opacity-70',
  },
  urgent: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-200',
    iconColor: 'text-red-600',
    numberColor: 'text-red-900',
    labelColor: 'text-red-700',
    iconOpacity: 'opacity-100', // Urgent mag opvallen
  },
  completed: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-200',
    iconColor: 'text-green-600',
    numberColor: 'text-green-900',
    labelColor: 'text-green-700',
    iconOpacity: 'opacity-70',
  },
};

function StatKaart({ titel, waarde, icoon, variant, onClick, isCommissie, isExpanded, onToggleExpand, taken, taal, onTaakClick }: StatKaartProps) {
  const styles = statKaartStyles[variant];

  // Helper functie om taak beschrijving kort te maken
  const korteBeschrijving = (taak: Taak) => {
    const beschrijving = taal === 'en' && taak.beschrijving_en ? taak.beschrijving_en : taak.beschrijving;
    return beschrijving.length > 50 ? beschrijving.substring(0, 47) + '...' : beschrijving;
  };

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl overflow-hidden transition-all`}>
      <button
        onClick={isCommissie && onToggleExpand ? onToggleExpand : onClick}
        className={`w-full p-5 flex items-center gap-4 text-left hover:shadow-md transition-all cursor-pointer`}
      >
        <div className={`w-8 h-8 flex items-center justify-center ${styles.iconBg} rounded-lg ${styles.iconOpacity}`}>
          {React.cloneElement(icoon as React.ReactElement, {
            className: `w-[18px] h-[18px] ${styles.iconColor}`
          })}
        </div>
        <div className="flex-1">
          <p className={`text-[32px] leading-none font-semibold ${styles.numberColor}`}>{waarde}</p>
          <p className={`text-sm font-medium ${styles.labelColor}`}>{titel}</p>
        </div>
        {isCommissie && waarde > 0 && (
          <div className={`${styles.iconColor}`}>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        )}
      </button>

      {/* Uitklapbare takenlijst voor commissie */}
      {isCommissie && isExpanded && taken && taken.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 max-h-64 overflow-y-auto">
          {/* Urgent variant: groepeer in verlopen / deadline deze week / overig */}
          {variant === 'urgent' ? (() => {
            const huidigeWeek = getWeekNummer(new Date());
            const verlopen = taken.filter(t => t.windowEnd !== undefined && t.windowEnd < huidigeWeek);
            const deadlineDezeWeek = taken.filter(t => t.windowEnd !== undefined && t.windowEnd === huidigeWeek);
            const overig = taken.filter(t => t.windowEnd === undefined || t.windowEnd > huidigeWeek);

            const renderTaakItem = (taak: Taak) => (
              <div
                key={taak.id}
                onClick={() => onTaakClick?.(taak)}
                className="flex items-start gap-2 text-sm p-2 bg-white/50 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{korteBeschrijving(taak)}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    {taak.bedId && <span>Bed {taak.bedId}</span>}
                    {taak.bronGewas && <span>• {taak.bronGewas}</span>}
                    {taak.windowEnd && <span className="text-blue-600">wk {taak.windowStart}-{taak.windowEnd}</span>}
                  </div>
                </div>
              </div>
            );

            return (
              <div className="space-y-3">
                {verlopen.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                      🔴 {taal === 'nl' ? 'Verlopen' : 'Overdue'}
                    </p>
                    <div className="space-y-1">{verlopen.slice(0, 5).map(renderTaakItem)}</div>
                    {verlopen.length > 5 && <p className="text-xs text-gray-400 pl-2">+{verlopen.length - 5} {taal === 'nl' ? 'meer' : 'more'}</p>}
                  </div>
                )}
                {deadlineDezeWeek.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
                      🟠 {taal === 'nl' ? 'Deadline deze week' : 'Due this week'}
                    </p>
                    <div className="space-y-1">{deadlineDezeWeek.slice(0, 5).map(renderTaakItem)}</div>
                    {deadlineDezeWeek.length > 5 && <p className="text-xs text-gray-400 pl-2">+{deadlineDezeWeek.length - 5} {taal === 'nl' ? 'meer' : 'more'}</p>}
                  </div>
                )}
                {overig.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                      {taal === 'nl' ? 'Overig urgent' : 'Other urgent'}
                    </p>
                    <div className="space-y-1">{overig.slice(0, 5).map(renderTaakItem)}</div>
                    {overig.length > 5 && <p className="text-xs text-gray-400 pl-2">+{overig.length - 5} {taal === 'nl' ? 'meer' : 'more'}</p>}
                  </div>
                )}
              </div>
            );
          })() : (
            /* Andere varianten: normale lijst */
            <div className="space-y-2">
              {taken.slice(0, 10).map(taak => (
                <div
                  key={taak.id}
                  onClick={() => onTaakClick?.(taak)}
                  className="flex items-start gap-2 text-sm p-2 bg-white/50 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{korteBeschrijving(taak)}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {taak.bedId && <span>Bed {taak.bedId}</span>}
                      {taak.bronGewas && <span>• {taak.bronGewas}</span>}
                      {taak.assignedTo && (Array.isArray(taak.assignedTo) ? taak.assignedTo.length > 0 : taak.assignedTo) && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Play className="w-3 h-3" />
                          {Array.isArray(taak.assignedTo) ? taak.assignedTo.join(', ') : taak.assignedTo}
                        </span>
                      )}
                      {taak.afgerondDoor && (
                        <span className="flex items-center gap-1 text-green-600">
                          <User className="w-3 h-3" />
                          {taak.afgerondDoor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {taken.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-1">
                  +{taken.length - 10} {taal === 'nl' ? 'meer' : 'more'}...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// BED DETAIL MODAL
// ============================================

interface BedDetailModalProps {
  bed: Bed;
  teeltItems: TeeltplanItem[];
  onSluiten: () => void;
  t: ReturnType<typeof useI18n>['t'];
}

// Helper functie om acties uit kalender te halen
function getActiesUitKalender(kalender: MaandKalender, gewas: string, teelt: string, deelVanBed: string): {
  maand: string;
  maandIndex: number;
  periode: string;
  code: TeeltCode;
  actie: string;
}[] {
  const acties: {
    maand: string;
    maandIndex: number;
    periode: string;
    code: TeeltCode;
    actie: string;
  }[] = [];

  MAANDEN.forEach((maand, maandIndex) => {
    const maandData = kalender[maand];
    if (!maandData) return;

    PERIODES.forEach(periode => {
      const code = maandData[periode] as TeeltCode;
      if (code && code !== 'x') {
        acties.push({
          maand: MAAND_NAMEN[maandIndex],
          maandIndex,
          periode: PERIODE_NAMEN[periode],
          code,
          actie: TEELTCODE_ACTIES[code] || code
        });
      }
    });
  });

  return acties;
}

// Kleur voor teeltcode
function getCodeKleur(code: TeeltCode): string {
  switch (code) {
    case 'kz':
    case 'bz':
    case 'kvz':
    case 'bvz':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'ku':
    case 'bu':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'o':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function BedDetailModal({ bed, teeltItems, onSluiten, t }: BedDetailModalProps) {
  const [actieveTab, setActieveTab] = useState<'gewassen' | 'kalender'>('gewassen');
  const { taal } = useI18n();

  // Periode labels mapping
  const periodeLabels: Record<string, string> = {
    'Begin': t.dashboard.begin,
    'Midden': t.dashboard.middle,
    'Eind': t.dashboard.end,
  };

  // Groepeer teeltitems per gewas en teelt
  const gewassenData = teeltItems.map(item => ({
    gewas: item.gewas,
    teelt: item.teelt || '',
    deelVanBed: item.deelVanBed || 'Heel bed',
    opmerkingen: item.opmerkingen || '',
    kalender: item.kalender
  }));

  // Verzamel alle acties per gewas met kalender info
  const alleActies = teeltItems.flatMap(item => {
    const acties = getActiesUitKalender(
      item.kalender,
      item.gewas,
      item.teelt || '',
      item.deelVanBed || 'Heel bed'
    );
    return acties.map(a => ({
      ...a,
      gewas: item.gewas,
      teelt: item.teelt || '',
      deelVanBed: item.deelVanBed || 'Heel bed'
    }));
  });

  // Sorteer op maand en periode
  alleActies.sort((a, b) => {
    if (a.maandIndex !== b.maandIndex) return a.maandIndex - b.maandIndex;
    const periodeOrder = { 'Begin': 0, 'Midden': 1, 'Eind': 2 };
    return periodeOrder[a.periode as keyof typeof periodeOrder] - periodeOrder[b.periode as keyof typeof periodeOrder];
  });

  // Groepeer acties per maand
  const actiesPerMaand = alleActies.reduce((acc, actie) => {
    const key = actie.maand;
    if (!acc[key]) acc[key] = [];
    acc[key].push(actie);
    return acc;
  }, {} as Record<string, typeof alleActies>);

  const getZonIcoon = () => {
    switch (bed.zonSchaduw) {
      case 'Zon': return <Sun className="w-5 h-5 text-amber-500" />;
      case 'Halfschaduw': return <CloudSun className="w-5 h-5 text-amber-400" />;
      case 'Schaduw': return <Cloud className="w-5 h-5 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-tuin-50">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 bg-tuin-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
              {bed.id}
            </span>
            <div>
              <h2 className="text-xl font-bold text-tuin-800">{t.dashboard.bedDetails} {bed.id}</h2>
              <div className="flex items-center gap-2 text-sm text-tuin-600">
                {getZonIcoon()}
                <span>{bed.zonSchaduw || t.common.noData}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onSluiten}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActieveTab('gewassen')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              actieveTab === 'gewassen'
                ? 'text-tuin-700 border-b-2 border-tuin-600 bg-tuin-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Leaf className="w-4 h-4" />
            {t.dashboard.cropInfo} ({gewassenData.length})
          </button>
          <button
            onClick={() => setActieveTab('kalender')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              actieveTab === 'kalender'
                ? 'text-tuin-700 border-b-2 border-tuin-600 bg-tuin-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {t.dashboard.yearPlanning} ({alleActies.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {actieveTab === 'gewassen' ? (
            <>
              {/* Bed info */}
              {(bed.grootte || bed.lengte || bed.breedte) && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  {bed.grootte && <p><strong>{t.dashboard.size}:</strong> {bed.grootte} m²</p>}
                  {bed.lengte && bed.breedte && <p><strong>{t.dashboard.dimensions}:</strong> {bed.lengte} x {bed.breedte} m</p>}
                  {bed.vakken && <p><strong>{t.dashboard.sections_label}:</strong> {bed.vakken}</p>}
                </div>
              )}

              {/* Plan voor bed */}
              {bed.planVoorBed && (
                <div className="mb-4 p-3 bg-tuin-50 border border-tuin-200 rounded-lg">
                  <p className="text-sm font-medium text-tuin-700 mb-1">{t.dashboard.planForBed}:</p>
                  <p className="text-sm text-tuin-600">{bed.planVoorBed}</p>
                </div>
              )}

              {/* Gewassen */}
              <div className="mb-4">
                {gewassenData.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">{t.dashboard.noCrops}</p>
                ) : (
                  <div className="space-y-3">
                    {gewassenData.map((item, index) => {
                      const gewasNaam = taal === 'en' ? vertaalGewas(item.gewas) : item.gewas;
                      return (
                        <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Sprout className="w-5 h-5 text-tuin-600" />
                              <span className="font-medium text-tuin-800">{gewasNaam}</span>
                            </div>
                            {item.teelt && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                                {item.teelt}
                              </span>
                            )}
                          </div>
                          {item.deelVanBed !== 'Heel bed' && (
                            <p className="text-xs text-gray-500 mt-1 ml-7">
                              {t.dashboard.part}: {taal === 'en' && item.deelVanBed === 'Heel bed' ? 'Whole bed' : item.deelVanBed}
                            </p>
                          )}
                          {item.opmerkingen && (
                            <p className="text-xs text-gray-600 mt-1 ml-7 italic">
                              {item.opmerkingen}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Opmerkingen */}
              {bed.opmerkingen && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">{t.dashboard.remarks}:</p>
                  <p className="text-sm text-gray-600">{bed.opmerkingen}</p>
                </div>
              )}
            </>
          ) : (
            /* Kalender tab */
            <div>
              {alleActies.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  {t.dashboard.noActions}
                </p>
              ) : (
                <div className="space-y-4">
                  {MAAND_NAMEN.map((maand, index) => {
                    const maandActies = actiesPerMaand[maand];
                    if (!maandActies || maandActies.length === 0) return null;

                    return (
                      <div key={maand} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 font-medium text-gray-700 text-sm">
                          {maand}
                        </div>
                        <div className="divide-y divide-gray-100">
                          {maandActies.map((actie, i) => {
                            const actieGewas = taal === 'en' ? vertaalGewas(actie.gewas) : actie.gewas;
                            const actieNaam = taal === 'en' ? (actieCodes[actie.code] || actie.actie) : actie.actie;
                            const periodeTekst = taal === 'en' ? periodeLabels[actie.periode] : actie.periode;
                            return (
                              <div key={i} className="px-3 py-2 flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-14 flex-shrink-0">
                                  {periodeTekst}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getCodeKleur(actie.code)}`}>
                                  {actieNaam}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-gray-800 truncate block">
                                    {actieGewas}
                                  </span>
                                  {actie.teelt && (
                                    <span className="text-xs text-amber-600">
                                      {actie.teelt}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onSluiten}
            className="w-full px-4 py-3 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export function Dashboard() {
  const { dispatch, isCommissie, saveTaak, toonToast } = useApp();
  const bedden = useBedden();
  const taken = useTaken();
  const teeltplan = useTeeltplan();
  const gewassenlijst = useGewassenlijst();
  const { t, taal } = useI18n();

  // State voor bed detail modal
  const [geselecteerdBed, setGeselecteerdBed] = useState<Bed | null>(null);
  // State voor plattegrond modal
  const [plattegrondSectie, setPlattegrondSectie] = useState<Sectie | null>(null);
  // State voor sectie filter
  const [activeSectie, setActiveSectie] = useState<Sectie | 'Alle'>('Alle');
  // State voor uitklapbare statistieken (commissie modus)
  const [expandedStat, setExpandedStat] = useState<'open' | 'inProgress' | 'urgent' | 'completed' | null>(null);
  // State voor taak bewerken modal - bewaar alleen de ID
  const [bewerkTaakId, setBewerkTaakId] = useState<string | null>(null);
  // State voor gewas filter
  const [selectedGewas, setSelectedGewas] = useState<string | null>(null);

  // Haal de actuele taak op uit de globale state (zodat wijzigingen altijd zichtbaar zijn)
  const bewerkTaak = useMemo(() => {
    if (!bewerkTaakId) return null;
    return taken.find(t => t.id === bewerkTaakId) || null;
  }, [bewerkTaakId, taken]);

  const weekInfo = getWeekInfo();
  const stats = getTaakStatistieken(taken);

  // Filter taken per statistiek categorie (gearchiveerde taken excluden)
  const takenPerCategorie = useMemo(() => {
    const actief = taken.filter(t => t.status !== 'Gearchiveerd');
    const open = actief.filter(t => t.status === 'Open');
    const inUitvoering = actief.filter(t => t.status === 'In uitvoering');
    const urgent = actief.filter(t => isTaakUrgent(t) && t.status !== 'Afgerond');
    const afgerond = actief.filter(t => t.status === 'Afgerond');
    return { open, inUitvoering, urgent, afgerond };
  }, [taken]);

  // Bereken aantal bedden per sectie
  const beddenPerSectie = useMemo(() => {
    const counts = new Map<Sectie, number>();
    bedden.forEach(bed => {
      const current = counts.get(bed.sectie) || 0;
      counts.set(bed.sectie, current + 1);
    });
    return counts;
  }, [bedden]);

  // Filter secties op basis van actieve filter
  const gefilterdeSecties = useMemo(() => {
    const alleSecties: Sectie[] = ['A', 'B', 'C', 'D', 'E', 'Kas'];
    if (activeSectie === 'Alle') {
      return alleSecties;
    }
    return [activeSectie];
  }, [activeSectie]);

  // Handler voor statistiek knoppen
  const handleStatKlik = (filter: 'open' | 'in_uitvoering' | 'urgent' | 'afgerond') => {
    // Eerst naar taken tab
    dispatch({ type: 'SET_TAB', payload: 'taken' });

    // Reset alle filters en set alleen de gewenste filter
    // Gebruik RESET_EN_SET_FILTERS zodat oude filters (sectie, gewas, etc.) niet blijven hangen
    switch (filter) {
      case 'open':
        dispatch({ type: 'RESET_EN_SET_FILTERS', payload: { status: 'Open' } });
        break;
      case 'in_uitvoering':
        dispatch({ type: 'RESET_EN_SET_FILTERS', payload: { status: 'In uitvoering' } });
        break;
      case 'urgent':
        // Voor urgent: toon alleen dynamisch berekende urgente taken (excl. afgerond)
        dispatch({ type: 'RESET_EN_SET_FILTERS', payload: { prioriteit: 'Urgent' } });
        break;
      case 'afgerond':
        dispatch({ type: 'RESET_EN_SET_FILTERS', payload: { status: 'Afgerond' } });
        break;
    }
  };

  // Bereken bed statussen
  const bedStatussen = new Map<string, BedStatus>();

  bedden.forEach(bed => {
    const bedGewassen = teeltplan
      .filter(t => t.bedId === bed.id)
      .map(t => t.gewas);

    const bedTaken = taken.filter(t =>
      t.bedId === bed.id && t.status !== 'Afgerond'
    );

    // Gebruik de centrale isTaakUrgent functie voor consistente urgentie logica
    const heeftUrgent = bedTaken.some(t => isTaakUrgent(t));

    bedStatussen.set(bed.id, {
      bedId: bed.id,
      gewassen: [...new Set(bedGewassen)],
      heeftTaken: bedTaken.length > 0,
      aantalOpenTaken: bedTaken.length,
      heeftUrgenteTaken: heeftUrgent
    });
  });

  // Verzamel alle unieke gewassen uit bedStatussen voor het filter
  const alleGewassen = useMemo(() => {
    const gewasSet = new Set<string>();
    bedStatussen.forEach(status => {
      status.gewassen.forEach(g => gewasSet.add(g));
    });
    return Array.from(gewasSet).sort((a, b) => a.localeCompare(b));
  }, [bedStatussen]);

  // Bereken hoeveel bedden het geselecteerde gewas bevatten
  const aantalGevondenBedden = useMemo(() => {
    if (!selectedGewas) return 0;
    let count = 0;
    bedStatussen.forEach(status => {
      if (status.gewassen.some(g => g.toLowerCase() === selectedGewas.toLowerCase())) {
        count++;
      }
    });
    return count;
  }, [selectedGewas, bedStatussen]);

  const handleBedKlik = (bedId: string) => {
    const bed = bedden.find(b => b.id === bedId);
    if (bed) {
      setGeselecteerdBed(bed);
    }
  };

  // === HIDDEN: Verwachte opbrengst berekening — later weer activeren ===
  // const verwachteOpbrengst = useMemo(() => { ... }, [teeltplan, gewassenlijst]);
  // const totaalKg = useMemo(() => { ... }, [verwachteOpbrengst]);
  const verwachteOpbrengst: Array<{ gewas: string; oppervlakte: number; verwacht: number | null; eenheid: string }> = [];
  const totaalKg = 0;
  // === END HIDDEN ===

  const secties: Sectie[] = ['A', 'B', 'C', 'D', 'E', 'Kas'];

  return (
    <div className="space-y-6">
      {/* Header - Versoberd met witte achtergrond */}
      <div className="bg-white rounded-xl p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">{t.dashboard.welcome}</h2>
        <p className="text-base text-gray-600">
          {t.dashboard.week} {weekInfo.weekNummer} - {periodeNaarTekst(weekInfo.periode)} {maandNaarTekst(new Date().getMonth())}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {formatDatum(weekInfo.startDatum)} - {formatDatum(weekInfo.eindDatum)}
        </p>
      </div>

      {/* Statistieken - Subtiele pastel kleuren */}
      <div className={`grid gap-3 ${isCommissie ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <StatKaart
          titel={t.dashboard.openTasks}
          waarde={stats.open}
          icoon={<Clock />}
          variant="open"
          onClick={() => handleStatKlik('open')}
          isCommissie={isCommissie}
          isExpanded={expandedStat === 'open'}
          onToggleExpand={() => setExpandedStat(expandedStat === 'open' ? null : 'open')}
          taken={takenPerCategorie.open}
          taal={taal}
          onTaakClick={(taak) => setBewerkTaakId(taak.id)}
        />
        <StatKaart
          titel={t.dashboard.inProgress}
          waarde={stats.inUitvoering}
          icoon={<Sprout />}
          variant="inProgress"
          onClick={() => handleStatKlik('in_uitvoering')}
          isCommissie={isCommissie}
          isExpanded={expandedStat === 'inProgress'}
          onToggleExpand={() => setExpandedStat(expandedStat === 'inProgress' ? null : 'inProgress')}
          taken={takenPerCategorie.inUitvoering}
          taal={taal}
          onTaakClick={(taak) => setBewerkTaakId(taak.id)}
        />
        <StatKaart
          titel={t.dashboard.urgent}
          waarde={stats.urgent}
          icoon={<AlertTriangle />}
          variant="urgent"
          onClick={() => handleStatKlik('urgent')}
          isCommissie={isCommissie}
          isExpanded={expandedStat === 'urgent'}
          onToggleExpand={() => setExpandedStat(expandedStat === 'urgent' ? null : 'urgent')}
          taken={takenPerCategorie.urgent}
          taal={taal}
          onTaakClick={(taak) => setBewerkTaakId(taak.id)}
        />
        <StatKaart
          titel={t.dashboard.completed}
          waarde={stats.afgerond}
          icoon={<CheckCircle />}
          variant="completed"
          onClick={() => handleStatKlik('afgerond')}
          isCommissie={isCommissie}
          isExpanded={expandedStat === 'completed'}
          onToggleExpand={() => setExpandedStat(expandedStat === 'completed' ? null : 'completed')}
          taken={takenPerCategorie.afgerond}
          taal={taal}
          onTaakClick={(taak) => setBewerkTaakId(taak.id)}
        />
      </div>

      {/* Exports sectie - alleen commissie */}
      {isCommissie && (
        <ExportsTile isCommissie={isCommissie} />
      )}

      {/* === HIDDEN: Verwachte opbrengst tabel — later weer activeren === */}
      {/* {isCommissie && verwachteOpbrengst.length > 0 && ( ... )} */}
      {/* === END HIDDEN === */}

      {/* Snelle actie */}
      <div>
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'weekoverzicht' })}
          className="w-full bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-center gap-3"
        >
          <div className="p-2 bg-tuin-100 rounded-lg">
            <Calendar className="w-5 h-5 text-tuin-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-tuin-800">{t.dashboard.tasksThisWeek}</p>
            <p className="text-sm text-tuin-600">{t.dashboard.viewWeekOverview}</p>
          </div>
        </button>
      </div>

      {/* Bedden grid per sectie */}
      {bedden.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-md">
          <Sprout className="w-16 h-16 text-tuin-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tuin-800 mb-2">
            {t.dashboard.noBeds}
          </h3>
          <p className="text-tuin-600 mb-4">
            {t.dashboard.noBedData}
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_TAB', payload: 'importeren' })}
            className="px-6 py-3 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors"
          >
            {t.nav.import}
          </button>
        </div>
      ) : (
        <>
          {/* Gewas Filter */}
          {alleGewassen.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Search className="w-5 h-5 text-tuin-600" />
                <span className="text-sm font-medium text-gray-700">
                  {taal === 'nl' ? 'Zoek gewas' : 'Search crop'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedGewas || ''}
                  onChange={(e) => setSelectedGewas(e.target.value || null)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">
                    {taal === 'nl' ? '— Selecteer een gewas —' : '— Select a crop —'}
                  </option>
                  {alleGewassen.map(gewas => (
                    <option key={gewas} value={gewas}>
                      {taal === 'en' ? vertaalGewas(gewas) : gewas}
                    </option>
                  ))}
                </select>
                {selectedGewas && (
                  <button
                    onClick={() => setSelectedGewas(null)}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    {taal === 'nl' ? 'Wis' : 'Clear'}
                  </button>
                )}
              </div>
              {selectedGewas && (
                <div className="mt-2 text-sm text-green-700 font-medium">
                  {taal === 'nl'
                    ? `"${selectedGewas}" gevonden in ${aantalGevondenBedden} ${aantalGevondenBedden === 1 ? 'bed' : 'bedden'}`
                    : `"${vertaalGewas(selectedGewas)}" found in ${aantalGevondenBedden} ${aantalGevondenBedden === 1 ? 'bed' : 'beds'}`
                  }
                </div>
              )}
            </div>
          )}

          {/* Sectie Filter Chips */}
          <SectieFilterChips
            secties={secties}
            activeSectie={activeSectie}
            onSectieKlik={setActiveSectie}
            beddenPerSectie={beddenPerSectie}
            taal={taal}
          />

          {/* Gefilterde bedden grids */}
          <div className="space-y-6">
            {gefilterdeSecties.map(sectie => (
              <SectieGrid
                key={sectie}
                sectie={sectie}
                bedden={bedden}
                bedStatussen={bedStatussen}
                onBedKlik={handleBedKlik}
                onPlattegrondKlik={setPlattegrondSectie}
                taal={taal}
                selectedGewas={selectedGewas}
              />
            ))}
          </div>
        </>
      )}

      {/* Bed Detail Modal */}
      {geselecteerdBed && (
        <BedDetailModal
          bed={geselecteerdBed}
          teeltItems={teeltplan.filter(item => item.bedId === geselecteerdBed.id)}
          onSluiten={() => setGeselecteerdBed(null)}
          t={t}
        />
      )}

      {/* Plattegrond Modal */}
      {plattegrondSectie && (
        <PlattegrondViewer
          imageUrl={PLATTEGROND_URLS[plattegrondSectie]}
          title={`${taal === 'nl' ? 'Plattegrond' : 'Map'}: ${plattegrondSectie === 'Kas' ? (taal === 'nl' ? 'Kas' : 'Greenhouse') : `${taal === 'nl' ? 'Sectie' : 'Section'} ${plattegrondSectie}`}`}
          onSluiten={() => setPlattegrondSectie(null)}
          downloadNaam={`plattegrond-sectie-${plattegrondSectie.toLowerCase()}.png`}
        />
      )}

      {/* Taak Bewerken Modal */}
      {bewerkTaak && (
        <TaakFormulier
          taak={bewerkTaak}
          onOpslaan={async (taak) => {
            dispatch({ type: 'UPDATE_TAAK', payload: taak });
            await saveTaak(taak);
            toonToast('success', taal === 'nl' ? 'Taak bijgewerkt' : 'Task updated');
            setBewerkTaakId(null);
          }}
          onAnnuleren={() => setBewerkTaakId(null)}
        />
      )}
    </div>
  );
}
