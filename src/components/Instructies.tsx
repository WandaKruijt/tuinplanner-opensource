import { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  X,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sprout,
  Camera,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
  Tag,
  Link as LinkIcon,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { nuISO } from '../utils/dateUtils';
import type {
  Instructie,
  InstructieHoofdcategorie,
  Seizoen
} from '../types';
import {
  INSTRUCTIE_SUBCATEGORIEEN,
  HOOFDCATEGORIE_LABELS,
  getSubcategorieLabel,
  getSubcategorieIcon
} from '../types';
import { TranslatedText } from './TranslatedText';
import { vertaalBatch } from '../services/translationService';
import { uploadFoto, verwijderFoto } from '../services/storageService';
import { isGeldigeAfbeelding } from '../utils/imageUtils';

// ============================================
// CONSTANTEN
// ============================================

const SEIZOEN_LABELS: Record<Seizoen, { nl: string; en: string; icon: string }> = {
  lente: { nl: 'Lente', en: 'Spring', icon: '🌸' },
  zomer: { nl: 'Zomer', en: 'Summer', icon: '☀️' },
  herfst: { nl: 'Herfst', en: 'Autumn', icon: '🍂' },
  winter: { nl: 'Winter', en: 'Winter', icon: '❄️' }
};

const CATEGORIE_KLEUREN: Record<InstructieHoofdcategorie, { bg: string; text: string; border: string }> = {
  gewassen: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  tuinonderhoud: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  praktisch: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  onkruid: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' }
};

// ============================================
// HOOFDCOMPONENT
// ============================================

export function Instructies() {
  const {
    state,
    isCommissie,
    saveInstructie,
    deleteInstructie,
    toonToast
  } = useApp();
  const { taal, t } = useI18n();

  // UI State
  const [toonFormulier, setToonFormulier] = useState(false);
  const [editInstructie, setEditInstructie] = useState<Instructie | null>(null);
  const [detailInstructie, setDetailInstructie] = useState<Instructie | null>(null);

  // Filter State
  const [zoekterm, setZoekterm] = useState('');
  const [filterHoofdcategorie, setFilterHoofdcategorie] = useState<InstructieHoofdcategorie | 'alle'>('alle');
  const [filterSubcategorie, setFilterSubcategorie] = useState<string>('alle');
  const [filterGewas, setFilterGewas] = useState<string>('alle');

  const instructies = state.data.instructies || [];

  // Alle unieke gewassen uit instructies
  const alleGewassen = useMemo(() => {
    const gewasSet = new Set<string>();
    instructies.forEach(i => {
      if (i.gewasNaam) gewasSet.add(i.gewasNaam);
    });
    // Ook gewassen uit teeltplan toevoegen
    state.data.teeltplan.forEach(item => {
      if (item.gewas) gewasSet.add(item.gewas);
    });
    return Array.from(gewasSet).sort();
  }, [instructies, state.data.teeltplan]);

  // Beschikbare subcategorieën voor huidige hoofdcategorie
  const beschikbareSubcategorieen = useMemo(() => {
    if (filterHoofdcategorie === 'alle') {
      return [];
    }
    return INSTRUCTIE_SUBCATEGORIEEN[filterHoofdcategorie];
  }, [filterHoofdcategorie]);

  // Filter en sorteer instructies
  const gefilterdeInstructies = useMemo(() => {
    let result = [...instructies];

    // Filter op hoofdcategorie
    if (filterHoofdcategorie !== 'alle') {
      result = result.filter(i => i.hoofdcategorie === filterHoofdcategorie);
    }

    // Filter op subcategorie
    if (filterSubcategorie !== 'alle') {
      result = result.filter(i => i.subcategorie === filterSubcategorie);
    }

    // Filter op gewas (alleen bij gewassen categorie)
    if (filterGewas !== 'alle') {
      result = result.filter(i => i.gewasNaam === filterGewas);
    }

    // Filter op zoekterm
    if (zoekterm) {
      const zoekLower = zoekterm.toLowerCase();
      result = result.filter(i =>
        i.titel.toLowerCase().includes(zoekLower) ||
        i.instructie.toLowerCase().includes(zoekLower) ||
        (i.gewasNaam && i.gewasNaam.toLowerCase().includes(zoekLower)) ||
        (i.tags && i.tags.some(tag => tag?.toLowerCase()?.includes(zoekLower)))
      );
    }

    // Sorteer alfabetisch op titel
    result.sort((a, b) => a.titel.localeCompare(b.titel));

    return result;
  }, [instructies, filterHoofdcategorie, filterSubcategorie, filterGewas, zoekterm]);

  // Handlers
  const handleNieuw = () => {
    setEditInstructie(null);
    setToonFormulier(true);
  };

  const handleEdit = (instructie: Instructie) => {
    setEditInstructie(instructie);
    setDetailInstructie(null);
    setToonFormulier(true);
  };

  const handleDelete = async (instructieId: string) => {
    if (confirm(taal === 'nl' ? 'Weet je zeker dat je deze instructie wilt verwijderen?' : 'Are you sure you want to delete this instruction?')) {
      await deleteInstructie(instructieId);
      setDetailInstructie(null);
      toonToast('success', taal === 'nl' ? 'Instructie verwijderd' : 'Instruction deleted');
    }
  };

  const handleBekijk = (instructie: Instructie) => {
    setDetailInstructie(instructie);
  };

  // Reset subcategorie en gewas filter als hoofdcategorie wijzigt
  const handleHoofdcategorieChange = (categorie: InstructieHoofdcategorie | 'alle') => {
    setFilterHoofdcategorie(categorie);
    setFilterSubcategorie('alle');
    if (categorie !== 'gewassen') {
      setFilterGewas('alle');
    }
  };

  // Detail weergave
  if (detailInstructie) {
    return (
      <InstructieDetail
        instructie={detailInstructie}
        isCommissie={isCommissie}
        taal={taal}
        onTerug={() => setDetailInstructie(null)}
        onEdit={() => handleEdit(detailInstructie)}
        onDelete={() => handleDelete(detailInstructie.id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-tuin-800 flex items-center gap-2">
            <BookOpen className="w-7 h-7" />
            {taal === 'nl' ? 'Instructies' : 'Instructions'}
          </h2>
          <p className="text-gray-500 mt-1">
            {taal === 'nl'
              ? "Tips, handleidingen en how-to's voor de tuin"
              : "Tips, guides and how-to's for the garden"}
          </p>
        </div>

        {isCommissie && (
          <button
            onClick={handleNieuw}
            className="flex items-center gap-2 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {taal === 'nl' ? 'Nieuwe instructie' : 'New instruction'}
          </button>
        )}
      </div>

      {/* Hoofdcategorie tabs */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleHoofdcategorieChange('alle')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${filterHoofdcategorie === 'alle'
                ? 'bg-tuin-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {taal === 'nl' ? 'Alle' : 'All'}
          </button>
          {(Object.keys(HOOFDCATEGORIE_LABELS) as InstructieHoofdcategorie[]).map(cat => {
            const label = HOOFDCATEGORIE_LABELS[cat];
            const kleuren = CATEGORIE_KLEUREN[cat];
            return (
              <button
                key={cat}
                onClick={() => handleHoofdcategorieChange(cat)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                  ${filterHoofdcategorie === cat
                    ? `${kleuren.bg} ${kleuren.text} border ${kleuren.border}`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span>{label.icon}</span>
                {taal === 'nl' ? label.label : label.label_en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zoeken en filteren */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Zoekbalk */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              placeholder={taal === 'nl' ? 'Zoek op titel of gewas...' : 'Search by title or crop...'}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>

          {/* Subcategorie filter */}
          {filterHoofdcategorie !== 'alle' && (
            <select
              value={filterSubcategorie}
              onChange={(e) => setFilterSubcategorie(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
            >
              <option value="alle">
                {taal === 'nl' ? 'Alle subcategorieën' : 'All subcategories'}
              </option>
              {beschikbareSubcategorieen.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.icon} {taal === 'nl' ? sub.label : sub.label_en}
                </option>
              ))}
            </select>
          )}

          {/* Gewas filter (alleen bij gewassen) */}
          {filterHoofdcategorie === 'gewassen' && (
            <select
              value={filterGewas}
              onChange={(e) => setFilterGewas(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
            >
              <option value="alle">
                {taal === 'nl' ? 'Alle gewassen' : 'All crops'}
              </option>
              {alleGewassen.map(gewas => (
                <option key={gewas} value={gewas}>{gewas}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Instructies Grid */}
      {gefilterdeInstructies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">
            {zoekterm
              ? (taal === 'nl' ? 'Geen instructies gevonden voor deze zoekopdracht' : 'No instructions found for this search')
              : (taal === 'nl' ? 'Nog geen instructies toegevoegd' : 'No instructions added yet')}
          </p>
          {isCommissie && !zoekterm && (
            <button
              onClick={handleNieuw}
              className="mt-4 text-tuin-600 hover:text-tuin-700 font-medium"
            >
              + {taal === 'nl' ? 'Voeg de eerste instructie toe' : 'Add the first instruction'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gefilterdeInstructies.map(instructie => (
            <InstructieKaart
              key={instructie.id}
              instructie={instructie}
              isCommissie={isCommissie}
              taal={taal}
              onBekijk={() => handleBekijk(instructie)}
              onEdit={() => handleEdit(instructie)}
              onDelete={() => handleDelete(instructie.id)}
            />
          ))}
        </div>
      )}

      {/* Formulier Modal */}
      {toonFormulier && (
        <InstructieFormulier
          instructie={editInstructie}
          alleGewassen={alleGewassen}
          onClose={() => setToonFormulier(false)}
          onSave={async (instructie) => {
            await saveInstructie(instructie);
            setToonFormulier(false);
            toonToast('success', editInstructie
              ? (taal === 'nl' ? 'Instructie bijgewerkt' : 'Instruction updated')
              : (taal === 'nl' ? 'Instructie toegevoegd' : 'Instruction added'));
          }}
        />
      )}
    </div>
  );
}

// ============================================
// INSTRUCTIE KAART COMPONENT
// ============================================

interface InstructieKaartProps {
  instructie: Instructie;
  isCommissie: boolean;
  taal: 'nl' | 'en';
  onBekijk: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function InstructieKaart({
  instructie,
  isCommissie,
  taal,
  onBekijk,
  onEdit,
  onDelete
}: InstructieKaartProps) {
  const kleuren = CATEGORIE_KLEUREN[instructie.hoofdcategorie];
  const hoofdLabel = HOOFDCATEGORIE_LABELS[instructie.hoofdcategorie];
  const subcatLabel = getSubcategorieLabel(instructie.hoofdcategorie, instructie.subcategorie, taal);
  const subcatIcon = getSubcategorieIcon(instructie.hoofdcategorie, instructie.subcategorie);

  // Beperk instructie tekst tot preview
  const previewTekst = instructie.instructie.length > 100
    ? instructie.instructie.substring(0, 100) + '...'
    : instructie.instructie;

  return (
    <div
      onClick={onBekijk}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header met gewas icoon (indien van toepassing) */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {instructie.gewasNaam ? (
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">
              🥬
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-lg ${kleuren.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
              {subcatIcon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">
              <TranslatedText nl={instructie.titel} en={instructie.titel_en} />
            </h3>
            {instructie.gewasNaam && (
              <p className="text-sm text-tuin-600 font-medium">{instructie.gewasNaam}</p>
            )}
          </div>
          <span className="text-lg">{subcatIcon}</span>
        </div>

        {/* Preview tekst */}
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
          <TranslatedText nl={previewTekst} en={instructie.instructie_en} />
        </p>

        {/* Tips preview */}
        {instructie.tips && (
          <div className="mt-2 text-sm text-amber-700 flex items-center gap-1">
            <span>💡</span>
            <span className="truncate">
              <TranslatedText nl={instructie.tips} en={instructie.tips_en} />
            </span>
          </div>
        )}

        {/* Foto thumbnail (indien aanwezig) */}
        {instructie.fotos && instructie.fotos.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={instructie.fotos[0]}
              alt={instructie.titel}
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {instructie.fotos.length} {taal === 'nl' ? 'foto' : 'photo'}{instructie.fotos.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Categorie badge */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded-full ${kleuren.bg} ${kleuren.text} border ${kleuren.border}`}>
            {taal === 'nl' ? hoofdLabel.label : hoofdLabel.label_en} &gt; {subcatLabel}
          </span>
        </div>
      </div>

      {/* Acties - alleen voor commissie */}
      {isCommissie && (
        <div
          className={`px-4 py-3 border-t border-gray-100 flex items-center justify-end ${kleuren.bg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 text-gray-500 hover:text-tuin-600 transition-colors"
              title={taal === 'nl' ? 'Bewerken' : 'Edit'}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
              title={taal === 'nl' ? 'Verwijderen' : 'Delete'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// INSTRUCTIE DETAIL COMPONENT
// ============================================

interface InstructieDetailProps {
  instructie: Instructie;
  isCommissie: boolean;
  taal: 'nl' | 'en';
  onTerug: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function InstructieDetail({
  instructie,
  isCommissie,
  taal,
  onTerug,
  onEdit,
  onDelete
}: InstructieDetailProps) {
  const [toonFotoModal, setToonFotoModal] = useState<string | null>(null);

  const kleuren = CATEGORIE_KLEUREN[instructie.hoofdcategorie];
  const hoofdLabel = HOOFDCATEGORIE_LABELS[instructie.hoofdcategorie];
  const subcatLabel = getSubcategorieLabel(instructie.hoofdcategorie, instructie.subcategorie, taal);
  const subcatIcon = getSubcategorieIcon(instructie.hoofdcategorie, instructie.subcategorie);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onTerug}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {taal === 'nl' ? 'Terug' : 'Back'}
        </button>

        {isCommissie && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 text-tuin-600 hover:bg-tuin-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            {taal === 'nl' ? 'Bewerken' : 'Edit'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Foto banner (eerste foto) */}
        {instructie.fotos && instructie.fotos.length > 0 && (
          <div
            className="h-48 bg-cover bg-center cursor-pointer"
            style={{ backgroundImage: `url(${instructie.fotos[0]})` }}
            onClick={() => setToonFotoModal(instructie.fotos![0])}
          />
        )}

        <div className="p-6">
          {/* Titel */}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            <TranslatedText nl={instructie.titel} en={instructie.titel_en} />
          </h1>

          {/* Categorie badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm ${kleuren.bg} ${kleuren.text} border ${kleuren.border}`}>
              {hoofdLabel.icon} {taal === 'nl' ? hoofdLabel.label : hoofdLabel.label_en}
            </span>
            <span className="text-gray-400">&gt;</span>
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              {subcatIcon} {subcatLabel}
            </span>
            {instructie.gewasNaam && (
              <>
                <span className="text-gray-400">|</span>
                <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 flex items-center gap-1">
                  <Sprout className="w-4 h-4" />
                  {instructie.gewasNaam}
                </span>
              </>
            )}
          </div>

          {/* Seizoen */}
          {instructie.seizoen && instructie.seizoen.length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
              <span>🗓️</span>
              {instructie.seizoen.map(s => (
                <span key={s} className="px-2 py-0.5 rounded bg-gray-100">
                  {SEIZOEN_LABELS[s].icon} {taal === 'nl' ? SEIZOEN_LABELS[s].nl : SEIZOEN_LABELS[s].en}
                </span>
              ))}
            </div>
          )}

          {/* Instructie tekst */}
          <div className="prose prose-gray max-w-none mt-6">
            <p className="whitespace-pre-wrap text-gray-700">
              <TranslatedText nl={instructie.instructie} en={instructie.instructie_en} />
            </p>
          </div>

          {/* Tips */}
          {instructie.tips && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                <span>💡</span>
                {taal === 'nl' ? 'Tips' : 'Tips'}
              </h3>
              <p className="text-amber-900 whitespace-pre-wrap">
                <TranslatedText nl={instructie.tips} en={instructie.tips_en} />
              </p>
            </div>
          )}

          {/* Foto's */}
          {instructie.fotos && instructie.fotos.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {taal === 'nl' ? "Foto's" : 'Photos'}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {instructie.fotos.map((foto, index) => (
                  <button
                    key={index}
                    onClick={() => setToonFotoModal(foto)}
                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={foto}
                      alt={`${instructie.titel} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Link */}
          {instructie.link && (
            <a
              href={instructie.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2 text-tuin-600 hover:text-tuin-700 font-medium"
            >
              <LinkIcon className="w-5 h-5" />
              {taal === 'nl' ? 'Meer informatie' : 'More information'}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Tags */}
          {instructie.tags && instructie.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              {instructie.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Commissie acties */}
          {isCommissie && (
            <div className="mt-8 pt-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 text-tuin-600 border border-tuin-200 rounded-lg hover:bg-tuin-50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {taal === 'nl' ? 'Bewerken' : 'Edit'}
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {taal === 'nl' ? 'Verwijderen' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Foto Modal */}
      {toonFotoModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setToonFotoModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={toonFotoModal}
              alt={instructie.titel}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setToonFotoModal(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// INSTRUCTIE FORMULIER COMPONENT
// ============================================

interface InstructieFormulierProps {
  instructie: Instructie | null;
  alleGewassen: string[];
  onClose: () => void;
  onSave: (instructie: Instructie) => void;
}

function InstructieFormulier({ instructie, alleGewassen, onClose, onSave }: InstructieFormulierProps) {
  const { state, toonToast } = useApp();
  const { taal } = useI18n();

  const [formData, setFormData] = useState({
    hoofdcategorie: instructie?.hoofdcategorie || 'gewassen' as InstructieHoofdcategorie,
    subcategorie: instructie?.subcategorie || '',
    gewasNaam: instructie?.gewasNaam || '',
    titel: instructie?.titel || '',
    instructie: instructie?.instructie || '',
    tips: instructie?.tips || '',
    link: instructie?.link || '',
    seizoen: instructie?.seizoen || [] as Seizoen[],
    tags: instructie?.tags?.join(', ') || ''
  });

  const [gewasZoekterm, setGewasZoekterm] = useState('');
  const [toonGewasSuggesties, setToonGewasSuggesties] = useState(false);

  // Foto state
  const [fotos, setFotos] = useState<string[]>(instructie?.fotos || []);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);

  // State voor unsaved changes dialoog
  const [toonUnsavedChangesDialoog, setToonUnsavedChangesDialoog] = useState(false);

  // Detecteer of er onopgeslagen wijzigingen zijn
  const hasUnsavedChanges = useMemo(() => {
    const origHoofdcategorie = instructie?.hoofdcategorie || 'gewassen';
    const origSubcategorie = instructie?.subcategorie || '';
    const origGewasNaam = instructie?.gewasNaam || '';
    const origTitel = instructie?.titel || '';
    const origInstructie = instructie?.instructie || '';
    const origTips = instructie?.tips || '';
    const origLink = instructie?.link || '';
    const origSeizoen = instructie?.seizoen || [];
    const origTags = instructie?.tags?.join(', ') || '';
    const origFotos = instructie?.fotos || [];

    return (
      formData.hoofdcategorie !== origHoofdcategorie ||
      formData.subcategorie !== origSubcategorie ||
      formData.gewasNaam !== origGewasNaam ||
      formData.titel !== origTitel ||
      formData.instructie !== origInstructie ||
      formData.tips !== origTips ||
      formData.link !== origLink ||
      JSON.stringify(formData.seizoen.sort()) !== JSON.stringify([...origSeizoen].sort()) ||
      formData.tags !== origTags ||
      JSON.stringify(fotos) !== JSON.stringify(origFotos) ||
      selectedFiles.length > 0
    );
  }, [formData, fotos, selectedFiles, instructie]);

  // Handler voor sluiten met check op unsaved changes
  const handleSluitenMetCheck = () => {
    if (hasUnsavedChanges) {
      setToonUnsavedChangesDialoog(true);
    } else {
      onClose();
    }
  };

  // Handler voor annuleren zonder opslaan
  const handleAnnulerenZonderOpslaan = () => {
    setToonUnsavedChangesDialoog(false);
    onClose();
  };

  // Handler voor opslaan en sluiten vanuit dialoog
  const handleOpslaanEnSluiten = () => {
    setToonUnsavedChangesDialoog(false);
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  // Beschikbare subcategorieën
  const beschikbareSubcategorieen = INSTRUCTIE_SUBCATEGORIEEN[formData.hoofdcategorie];

  // Filter gewassen op zoekterm
  const gefilterdeGewassen = useMemo(() => {
    const zoek = gewasZoekterm || formData.gewasNaam;
    if (!zoek) return alleGewassen.slice(0, 10);
    return alleGewassen.filter(g =>
      g?.toLowerCase()?.includes(zoek?.toLowerCase() || '')
    ).slice(0, 10);
  }, [alleGewassen, gewasZoekterm, formData.gewasNaam]);

  // Foto handlers
  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFotoError(null);

    // Max 3 foto's totaal
    const beschikbareSlots = 3 - fotos.length - selectedFiles.length;
    if (files.length > beschikbareSlots) {
      setFotoError(taal === 'nl'
        ? `Je kunt nog maximaal ${beschikbareSlots} foto's toevoegen`
        : `You can add a maximum of ${beschikbareSlots} more photos`);
      return;
    }

    // Valideer alle bestanden
    for (const file of files) {
      if (!isGeldigeAfbeelding(file)) {
        setFotoError(taal === 'nl'
          ? 'Ongeldig bestandstype. Alleen JPG, PNG, WebP en GIF zijn toegestaan.'
          : 'Invalid file type. Only JPG, PNG, WebP and GIF are allowed.');
        return;
      }
    }

    // Maak previews
    const newPreviews: string[] = [];
    files.forEach(file => {
      newPreviews.push(URL.createObjectURL(file));
    });

    setSelectedFiles(prev => [...prev, ...files]);
    setFotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleFotoVerwijderen = async (index: number, isBestaand: boolean) => {
    if (isBestaand) {
      // Verwijder bestaande foto
      const fotoUrl = fotos[index];
      try {
        await verwijderFoto(fotoUrl);
      } catch (error) {
        console.warn('Kon foto niet verwijderen:', error);
      }
      setFotos(prev => prev.filter((_, i) => i !== index));
    } else {
      // Verwijder nieuwe preview
      const previewIndex = index - fotos.length;
      setFotoPreviews(prev => prev.filter((_, i) => i !== previewIndex));
      setSelectedFiles(prev => prev.filter((_, i) => i !== previewIndex));
    }
  };

  const handleSeizoenToggle = (seizoen: Seizoen) => {
    setFormData(prev => ({
      ...prev,
      seizoen: prev.seizoen.includes(seizoen)
        ? prev.seizoen.filter(s => s !== seizoen)
        : [...prev.seizoen, seizoen]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subcategorie) {
      toonToast('error', taal === 'nl' ? 'Kies een subcategorie' : 'Choose a subcategory');
      return;
    }

    if (formData.hoofdcategorie === 'gewassen' && !formData.gewasNaam) {
      toonToast('error', taal === 'nl' ? 'Kies een gewas' : 'Choose a crop');
      return;
    }

    setIsSaving(true);

    try {
      const instructieId = instructie?.id || `instr-${Date.now()}`;

      // Upload nieuwe foto's
      let definitieveFotos = [...fotos];
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        for (const file of selectedFiles) {
          try {
            const url = await uploadFoto(file, 'instructies', instructieId);
            definitieveFotos.push(url);
          } catch (uploadError) {
            console.error('Foto upload mislukt:', uploadError);
          }
        }
        setIsUploading(false);
      }

      // Verzamel teksten die vertaald moeten worden
      const tekstenOmTeVertalen = [
        formData.titel,
        formData.instructie,
        formData.tips
      ];

      // Vertaal naar Engels
      const vertalingen = await vertaalBatch(tekstenOmTeVertalen);

      // Parse tags
      const tagsList = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const nieuweInstructie: Instructie = {
        id: instructieId,
        hoofdcategorie: formData.hoofdcategorie,
        subcategorie: formData.subcategorie,
        titel: formData.titel,
        instructie: formData.instructie,
        aangemaakt: instructie?.aangemaakt || nuISO(),
        aangemaaktDoor: instructie?.aangemaaktDoor || state.ui.gebruikersnaam || 'commissie',
        gewijzigd: nuISO()
      };

      // Voeg vertalingen toe
      if (vertalingen[0]) nieuweInstructie.titel_en = vertalingen[0];
      if (vertalingen[1]) nieuweInstructie.instructie_en = vertalingen[1];
      if (vertalingen[2]) nieuweInstructie.tips_en = vertalingen[2];

      // Voeg optionele velden toe
      if (formData.gewasNaam) nieuweInstructie.gewasNaam = formData.gewasNaam;
      if (formData.tips) nieuweInstructie.tips = formData.tips;
      if (formData.link) nieuweInstructie.link = formData.link;
      if (formData.seizoen.length > 0) nieuweInstructie.seizoen = formData.seizoen;
      if (tagsList.length > 0) nieuweInstructie.tags = tagsList;
      if (definitieveFotos.length > 0) nieuweInstructie.fotos = definitieveFotos;

      onSave(nieuweInstructie);
    } catch (error) {
      console.error('Fout bij opslaan instructie:', error);
      toonToast('error', taal === 'nl' ? 'Kon instructie niet opslaan' : 'Could not save instruction');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSluitenMetCheck();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          handleSluitenMetCheck();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {instructie
              ? (taal === 'nl' ? 'Instructie bewerken' : 'Edit instruction')
              : (taal === 'nl' ? 'Nieuwe instructie' : 'New instruction')}
          </h3>
          <button onClick={handleSluitenMetCheck} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Hoofdcategorie keuze */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {taal === 'nl' ? 'Hoofdcategorie *' : 'Main category *'}
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(HOOFDCATEGORIE_LABELS) as InstructieHoofdcategorie[]).map(cat => {
                const label = HOOFDCATEGORIE_LABELS[cat];
                const isSelected = formData.hoofdcategorie === cat;
                const kleuren = CATEGORIE_KLEUREN[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, hoofdcategorie: cat, subcategorie: '', gewasNaam: '' })}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                      ${isSelected
                        ? `${kleuren.bg} ${kleuren.text} border-2 ${kleuren.border}`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                      }
                    `}
                  >
                    <span>{label.icon}</span>
                    {taal === 'nl' ? label.label : label.label_en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {taal === 'nl' ? 'Subcategorie *' : 'Subcategory *'}
            </label>
            <select
              required
              value={formData.subcategorie}
              onChange={(e) => setFormData({ ...formData, subcategorie: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
            >
              <option value="">{taal === 'nl' ? 'Kies subcategorie...' : 'Choose subcategory...'}</option>
              {beschikbareSubcategorieen.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.icon} {taal === 'nl' ? sub.label : sub.label_en}
                </option>
              ))}
            </select>
          </div>

          {/* Gewas (alleen bij gewassen categorie) */}
          {formData.hoofdcategorie === 'gewassen' && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {taal === 'nl' ? 'Gewas *' : 'Crop *'}
              </label>
              <div className="relative">
                <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required={formData.hoofdcategorie === 'gewassen'}
                  value={formData.gewasNaam}
                  onChange={e => {
                    setFormData({ ...formData, gewasNaam: e.target.value });
                    setGewasZoekterm(e.target.value);
                    setToonGewasSuggesties(true);
                  }}
                  onFocus={() => setToonGewasSuggesties(true)}
                  onBlur={() => setTimeout(() => setToonGewasSuggesties(false), 200)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
                  placeholder={taal === 'nl' ? 'Zoek of typ gewas...' : 'Search or type crop...'}
                />
              </div>
              {toonGewasSuggesties && gefilterdeGewassen.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {gefilterdeGewassen.map(gewas => (
                    <button
                      key={gewas}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, gewasNaam: gewas });
                        setToonGewasSuggesties(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Sprout className="w-4 h-4 text-tuin-500" />
                      {gewas}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {taal === 'nl' ? 'Titel *' : 'Title *'}
            </label>
            <input
              type="text"
              required
              value={formData.titel}
              onChange={e => setFormData({ ...formData, titel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              placeholder={taal === 'nl' ? 'Bijv. Snijbiet oogsten' : 'E.g. Harvesting chard'}
            />
          </div>

          {/* Instructie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {taal === 'nl' ? 'Instructie *' : 'Instruction *'}
            </label>
            <textarea
              required
              value={formData.instructie}
              onChange={e => setFormData({ ...formData, instructie: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none"
              rows={5}
              placeholder={taal === 'nl'
                ? 'Beschrijf stap voor stap...'
                : 'Describe step by step...'}
            />
          </div>

          {/* Tips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {taal === 'nl' ? 'Tips (optioneel)' : 'Tips (optional)'}
            </label>
            <textarea
              value={formData.tips}
              onChange={e => setFormData({ ...formData, tips: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none"
              rows={3}
              placeholder={taal === 'nl'
                ? 'Extra tips of aandachtspunten...'
                : 'Extra tips or points of attention...'}
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {taal === 'nl' ? 'Link naar video of website (optioneel)' : 'Link to video or website (optional)'}
            </label>
            <input
              type="url"
              value={formData.link}
              onChange={e => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              placeholder="https://..."
            />
          </div>

          {/* Foto's */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {taal === 'nl' ? "Foto's (optioneel, max 3)" : 'Photos (optional, max 3)'}
            </label>

            {/* Bestaande + nieuwe foto's */}
            {(fotos.length > 0 || fotoPreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {fotos.map((foto, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square">
                    <img
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleFotoVerwijderen(index, true)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {fotoPreviews.map((preview, index) => (
                  <div key={`preview-${index}`} className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleFotoVerwijderen(fotos.length + index, false)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {fotos.length + selectedFiles.length < 3 && (
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-tuin-500 hover:text-tuin-600 transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {taal === 'nl' ? 'Uploaden...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    {taal === 'nl' ? 'Foto toevoegen' : 'Add photo'}
                  </>
                )}
              </button>
            )}

            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFotoSelect}
              className="hidden"
              multiple
            />

            {fotoError && (
              <p className="mt-2 text-sm text-red-500">{fotoError}</p>
            )}
          </div>

          {/* Seizoen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {taal === 'nl' ? 'Seizoen (optioneel)' : 'Season (optional)'}
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SEIZOEN_LABELS) as Seizoen[]).map(seizoen => {
                const label = SEIZOEN_LABELS[seizoen];
                const isSelected = formData.seizoen.includes(seizoen);
                return (
                  <button
                    key={seizoen}
                    type="button"
                    onClick={() => handleSeizoenToggle(seizoen)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1
                      ${isSelected
                        ? 'bg-tuin-100 text-tuin-700 border border-tuin-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span>{label.icon}</span>
                    {taal === 'nl' ? label.nl : label.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {taal === 'nl' ? 'Tags (optioneel)' : 'Tags (optional)'}
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              placeholder={taal === 'nl' ? 'Tags gescheiden door komma\'s' : 'Tags separated by commas'}
            />
            <p className="mt-1 text-xs text-gray-500">
              {taal === 'nl' ? 'Bijv. kas, zomer, beginners' : 'E.g. greenhouse, summer, beginners'}
            </p>
          </div>

          {/* Acties */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSluitenMetCheck}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {taal === 'nl' ? 'Annuleren' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {taal === 'nl' ? 'Opslaan...' : 'Saving...'}
                </>
              ) : (
                taal === 'nl' ? 'Opslaan' : 'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Unsaved Changes Dialoog */}
    {toonUnsavedChangesDialoog && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {taal === 'nl' ? 'Onopgeslagen wijzigingen' : 'Unsaved changes'}
            </h3>
          </div>
          <p className="text-gray-600 mb-6">
            {taal === 'nl'
              ? 'Je hebt wijzigingen gemaakt die nog niet zijn opgeslagen. Wil je deze opslaan of annuleren?'
              : 'You have unsaved changes. Do you want to save them or discard?'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleAnnulerenZonderOpslaan}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {taal === 'nl' ? 'Annuleren' : 'Discard'}
            </button>
            <button
              onClick={handleOpslaanEnSluiten}
              className="flex-1 px-4 py-2.5 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors"
            >
              {taal === 'nl' ? 'Opslaan' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
