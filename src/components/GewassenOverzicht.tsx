/**
 * GewassenOverzicht.tsx
 * Overzichtspagina van alle gewassen in de encyclopedie
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Sprout, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import type { VerrijktGewas } from '../types';
import { TEELTGROEP_EMOJI, TEELTGROEP_EN } from '../types';
import { searchGewassen, getUniekeTeeltgroepen, filterOpTeeltgroep } from '../utils/gewasUtils';
import { GewasDetailPage } from './GewasDetailPage';
import { DEMO_MODE } from '../config/appConfig';

// ============================================
// GEWAS KAART COMPONENT
// ============================================

interface GewasKaartProps {
  gewas: VerrijktGewas;
  onClick: () => void;
}

function GewasKaart({ gewas, onClick }: GewasKaartProps) {
  const { taal } = useI18n();
  const emoji = TEELTGROEP_EMOJI[gewas.teeltgroep] || '🌱';

  // Vertaalde naam en teeltgroep
  const gewasNaam = taal === 'en' && gewas.naam_en ? gewas.naam_en : (gewas.naam || (taal === 'nl' ? 'Onbekend' : 'Unknown'));
  const teeltgroepNaam = taal === 'en' ? (TEELTGROEP_EN[gewas.teeltgroep] || gewas.teeltgroep) : gewas.teeltgroep;

  // Beperk beschrijving tot 100 karakters
  const beschrijving = taal === 'en' && gewas.beschrijving_en
    ? gewas.beschrijving_en
    : gewas.beschrijving;
  const korteBeschrijving = beschrijving
    ? (beschrijving.length > 100 ? beschrijving.substring(0, 100) + '...' : beschrijving)
    : '';

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md hover:border-tuin-200 transition-all group"
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 group-hover:text-tuin-600 transition-colors">
            {gewasNaam}
          </h3>
          <span className="text-xs text-gray-500">{teeltgroepNaam || ''}</span>
          {korteBeschrijving && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {korteBeschrijving}
            </p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-tuin-500 transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}

// ============================================
// FILTER CHIPS COMPONENT
// ============================================

interface FilterChipsProps {
  teeltgroepen: string[];
  actief: string;
  onChange: (teeltgroep: string) => void;
}

function FilterChips({ teeltgroepen, actief, onChange }: FilterChipsProps) {
  const { taal } = useI18n();

  return (
    <div className="filter-chips-container">
      <button
        onClick={() => onChange('Alle')}
        className={`filter-chip ${actief === 'Alle' ? 'filter-chip-active' : 'filter-chip-inactive'}`}
      >
        {taal === 'nl' ? 'Alle' : 'All'}
      </button>
      {teeltgroepen.map(groep => {
        const emoji = TEELTGROEP_EMOJI[groep] || '🌱';
        const groepNaam = taal === 'en' ? (TEELTGROEP_EN[groep] || groep) : groep;
        return (
          <button
            key={groep}
            onClick={() => onChange(groep)}
            className={`filter-chip ${actief === groep ? 'filter-chip-active' : 'filter-chip-inactive'}`}
          >
            {emoji} {groepNaam}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GewassenOverzicht() {
  const { state } = useApp();
  const { taal, t } = useI18n();

  const [zoekterm, setZoekterm] = useState('');
  const [filterTeeltgroep, setFilterTeeltgroep] = useState('Alle');
  const [geselecteerdGewas, setGeselecteerdGewas] = useState<VerrijktGewas | null>(null);
  const [toonDropdown, setToonDropdown] = useState(false);
  const zoekContainerRef = useRef<HTMLDivElement>(null);

  // Haal verrijkte gewassen en teeltplan uit state
  const alleVerrijkteGewassen = state.data.verrijkteGewassen || [];
  const teeltplan = state.data.teeltplan || [];

  // Filter encyclopedie: toon alleen gewassen die in het teeltplan voorkomen
  // (in demomodus tonen we de volledige encyclopedie)
  const verrijkteGewassen = useMemo(() => {
    if (DEMO_MODE) return alleVerrijkteGewassen;
    if (teeltplan.length === 0) return alleVerrijkteGewassen;

    // Bouw een set van gewas-namen uit het teeltplan (lowercase voor case-insensitive matching)
    const teeltplanGewassen = new Set(
      teeltplan.map(item => item.gewas?.toLowerCase().trim()).filter(Boolean)
    );

    return alleVerrijkteGewassen.filter(gewas => {
      const id = gewas.id?.toLowerCase().trim();
      const naam = gewas.naam?.toLowerCase().trim();
      return teeltplanGewassen.has(id) || teeltplanGewassen.has(naam);
    });
  }, [alleVerrijkteGewassen, teeltplan]);

  // Krijg unieke teeltgroepen
  const teeltgroepen = useMemo(() => {
    return getUniekeTeeltgroepen(verrijkteGewassen);
  }, [verrijkteGewassen]);

  // Filter en zoek gewassen
  const gefilterdeGewassen = useMemo(() => {
    let result = verrijkteGewassen;

    // Filter op teeltgroep
    if (filterTeeltgroep !== 'Alle') {
      result = filterOpTeeltgroep(result, filterTeeltgroep);
    }

    // Zoek als er een zoekterm is
    if (zoekterm.trim()) {
      result = searchGewassen(result, zoekterm, 100);
    }

    // Sorteer alfabetisch
    return result.sort((a, b) => (a.naam || '').localeCompare(b.naam || ''));
  }, [verrijkteGewassen, filterTeeltgroep, zoekterm]);

  // Zoeksuggesties (max 8 resultaten voor dropdown)
  const zoekSuggesties = useMemo(() => {
    if (!zoekterm.trim()) return [];
    return searchGewassen(verrijkteGewassen, zoekterm, 8);
  }, [verrijkteGewassen, zoekterm]);

  // Sluit dropdown bij klik buiten
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoekContainerRef.current && !zoekContainerRef.current.contains(e.target as Node)) {
        setToonDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selecteer gewas uit dropdown
  const handleSelectGewas = (gewas: VerrijktGewas) => {
    setGeselecteerdGewas(gewas);
    setZoekterm('');
    setToonDropdown(false);
  };

  // Toon detail pagina als een gewas is geselecteerd
  if (geselecteerdGewas) {
    return (
      <GewasDetailPage
        gewas={geselecteerdGewas}
        onBack={() => setGeselecteerdGewas(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-tuin-800 flex items-center gap-2">
          <Sprout className="w-7 h-7" />
          {taal === 'nl' ? 'Gewassen Encyclopedie' : 'Crop Encyclopedia'}
        </h2>
        <p className="text-gray-500 mt-1">
          {taal === 'nl'
            ? 'Alles wat je moet weten over de gewassen in de community permacultuur tuin'
            : 'Everything you need to know about crops in the community permaculture garden'}
        </p>
      </div>

      {/* Zoekbalk met dropdown */}
      <div ref={zoekContainerRef} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <input
          type="search"
          value={zoekterm}
          onChange={(e) => {
            setZoekterm(e.target.value);
            setToonDropdown(true);
          }}
          onFocus={() => setToonDropdown(true)}
          placeholder={taal === 'nl' ? 'Zoek gewas...' : 'Search crop...'}
          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 transition-colors input-no-suggest"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-form-type="other"
          data-1p-ignore
          data-lpignore="true"
          enterKeyHint="search"
        />
        {zoekterm && (
          <button
            onClick={() => {
              setZoekterm('');
              setToonDropdown(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Dropdown met zoeksuggesties */}
        {toonDropdown && zoekterm.trim().length >= 2 && zoekSuggesties.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
            <div className="py-2">
              {zoekSuggesties.map(gewas => {
                const emoji = TEELTGROEP_EMOJI[gewas.teeltgroep] || '🌱';
                const naam = taal === 'en' && gewas.naam_en ? gewas.naam_en : (gewas.naam || '');
                const teeltgroep = taal === 'en' ? (TEELTGROEP_EN[gewas.teeltgroep] || gewas.teeltgroep) : gewas.teeltgroep;
                return (
                  <button
                    key={gewas.id || gewas.naam}
                    onClick={() => handleSelectGewas(gewas)}
                    className="w-full px-4 py-3 text-left hover:bg-tuin-50 flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{naam}</div>
                      <div className="text-xs text-gray-500">{teeltgroep}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
            {zoekSuggesties.length === 8 && (
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 text-center">
                {taal === 'nl' ? 'Typ verder om meer resultaten te zien' : 'Type more to see additional results'}
              </div>
            )}
          </div>
        )}

        {/* Minimaal 2 karakters melding */}
        {toonDropdown && zoekterm.trim().length === 1 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 text-center text-gray-500 text-sm">
            {taal === 'nl' ? 'Type minimaal 2 letters' : 'Type at least 2 letters'}
          </div>
        )}

        {/* Geen resultaten in dropdown */}
        {toonDropdown && zoekterm.trim().length >= 2 && zoekSuggesties.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 text-center text-gray-500 text-sm">
            {taal === 'nl' ? 'Geen gewassen gevonden' : 'No crops found'}
          </div>
        )}
      </div>

      {/* Filter chips */}
      {teeltgroepen.length > 0 && (
        <FilterChips
          teeltgroepen={teeltgroepen}
          actief={filterTeeltgroep}
          onChange={setFilterTeeltgroep}
        />
      )}

      {/* Resultaten teller */}
      <p className="text-sm text-gray-500">
        {gefilterdeGewassen.length} {taal === 'nl' ? 'gewassen gevonden' : 'crops found'}
      </p>

      {/* Gewassen grid */}
      {gefilterdeGewassen.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Sprout className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">
            {taal === 'nl'
              ? 'Geen gewassen gevonden'
              : 'No crops found'}
          </p>
          {zoekterm && (
            <button
              onClick={() => setZoekterm('')}
              className="mt-4 text-tuin-600 hover:text-tuin-700 font-medium"
            >
              {taal === 'nl' ? 'Wis zoekterm' : 'Clear search'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gefilterdeGewassen.map(gewas => (
            <GewasKaart
              key={gewas.id || gewas.naam}
              gewas={gewas}
              onClick={() => setGeselecteerdGewas(gewas)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default GewassenOverzicht;
