import React, { useState, useRef } from 'react';
import {
  Plus,
  X,
  Droplets,
  Leaf,
  Scissors,
  HelpCircle,
  MapPin,
  Camera,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import type { Taak, AdHocProbleem } from '../types';
import { ADHOC_PROBLEMEN } from '../types';
import { nuISO, vandaagISO } from '../utils/dateUtils';
import { uploadMultipleFotos } from '../services/storageService';
import { MAX_FOTOS_PER_TAAK } from '../utils/fotoUtils';

// ============================================
// PROBLEEM ICONEN
// ============================================

const PROBLEEM_ICONEN: Record<AdHocProbleem, React.ReactNode> = {
  'Slakken': <span className="text-2xl">🐌</span>,
  'Woelmuizen': <span className="text-2xl">🐭</span>,
  'Onkruid': <Leaf className="w-6 h-6" />,
  'Water geven': <Droplets className="w-6 h-6" />,
  'Oogstrijp': <Scissors className="w-6 h-6" />,
  'Overig': <HelpCircle className="w-6 h-6" />,
};

const PROBLEEM_KLEUREN: Record<AdHocProbleem, string> = {
  'Slakken': 'bg-red-100 text-red-600 border-red-200',
  'Woelmuizen': 'bg-orange-100 text-orange-600 border-orange-200',
  'Onkruid': 'bg-green-100 text-green-600 border-green-200',
  'Water geven': 'bg-blue-100 text-blue-600 border-blue-200',
  'Oogstrijp': 'bg-purple-100 text-purple-600 border-purple-200',
  'Overig': 'bg-gray-100 text-gray-600 border-gray-200',
};

// ============================================
// FAB (FLOATING ACTION BUTTON)
// ============================================

interface AdHocFABProps {
  onClick: () => void;
}

export function AdHocFAB({ onClick }: AdHocFABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-16 h-16 bg-tuin-600 text-white rounded-full shadow-lg hover:bg-tuin-700 hover:shadow-xl transition-all flex items-center justify-center z-40"
      aria-label="Snelle taak toevoegen"
    >
      <Plus className="w-8 h-8" />
    </button>
  );
}

// ============================================
// AD-HOC FORMULIER
// ============================================

interface AdHocFormulierProps {
  onSluiten: () => void;
}

export function AdHocFormulier({ onSluiten }: AdHocFormulierProps) {
  const { dispatch, toonToast, saveTaak } = useApp();
  const { taal } = useI18n();

  const [stap, setStap] = useState<1 | 2>(1);
  const [probleem, setProbleem] = useState<AdHocProbleem | null>(null);
  const [locatie, setLocatie] = useState('');
  const [beschrijving, setBeschrijving] = useState('');
  const [toelichting, setToelichting] = useState('');

  // Foto state (meerdere foto's)
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Vertalingen voor problemen
  const probleemVertalingen: Record<AdHocProbleem, string> = {
    'Slakken': 'Slugs',
    'Woelmuizen': 'Voles',
    'Onkruid': 'Weeds',
    'Water geven': 'Watering',
    'Oogstrijp': 'Ready to harvest',
    'Overig': 'Other',
  };

  // Foto handlers
  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setFotoError(null);

    const beschikbaar = MAX_FOTOS_PER_TAAK - fotoPreviews.length;
    const teVerwerken = files.slice(0, beschikbaar);

    const nieuwePreviews: string[] = [];
    const nieuweFiles: File[] = [];

    teVerwerken.forEach(file => {
      if (file.size > 10 * 1024 * 1024) return;
      if (!file.type.startsWith('image/')) return;
      nieuwePreviews.push(URL.createObjectURL(file));
      nieuweFiles.push(file);
    });

    if (nieuwePreviews.length === 0 && teVerwerken.length > 0) {
      setFotoError(taal === 'nl'
        ? 'Ongeldige bestanden. Alleen afbeeldingen tot 10MB zijn toegestaan.'
        : 'Invalid files. Only images up to 10MB are allowed.');
      return;
    }

    setFotoPreviews(prev => [...prev, ...nieuwePreviews]);
    setSelectedFiles(prev => [...prev, ...nieuweFiles]);
    e.target.value = '';
  };

  const handleFotoVerwijderen = (index: number) => {
    setFotoPreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProbleemKies = (p: AdHocProbleem) => {
    setProbleem(p);
    if (p !== 'Overig') {
      setBeschrijving(taal === 'en' ? probleemVertalingen[p] : p);
    } else {
      setBeschrijving('');
    }
    setStap(2);
  };

  const handleOpslaan = async () => {
    if (!probleem || !beschrijving.trim()) return;

    setIsUploading(true);

    try {
      // Genereer taak ID
      const taakId = `taak-adhoc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Upload foto's als er bestanden geselecteerd zijn
      let fotoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        try {
          fotoUrls = await uploadMultipleFotos(selectedFiles, 'taken', taakId);
        } catch (uploadError) {
          console.error('Foto upload mislukt:', uploadError);
          toonToast('error', taal === 'nl'
            ? 'Foto upload mislukt. Taak wordt opgeslagen zonder foto\'s.'
            : 'Photo upload failed. Task will be saved without photos.');
        }
      }

      // Locatie tekst voor beschrijving
      const locatieTekst = locatie.trim()
        ? ` (${locatie.trim()})`
        : '';

      const taak: Taak = {
        id: taakId,
        beschrijving: beschrijving.trim() + locatieTekst,
        sectie: '',
        bedId: '',
        type: 'Onderhoud',
        prioriteit: probleem === 'Slakken' || probleem === 'Woelmuizen' ? 'Hoog' : 'Normaal',
        status: 'Open',
        deadline: vandaagISO(),
        aangemaakt: nuISO(),
        gewijzigd: nuISO(),
        isAutomatisch: false,
        commentaar: toelichting.trim(),
        isAdHoc: true,
        adHocProbleem: probleem,
        fotoUrls: fotoUrls.length > 0 ? fotoUrls : undefined,
        communityZichtbaar: true,
      };

      // Sla op naar Firebase EN lokale state
      dispatch({ type: 'VOEG_TAAK_TOE', payload: taak });
      await saveTaak(taak);

      // Reset foto state
      setFotoPreviews([]);
      setSelectedFiles([]);

      toonToast('success', taal === 'nl' ? 'Taak toegevoegd!' : 'Task added!');
      onSluiten();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-tuin-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-tuin-600" />
            </div>
            <h2 className="text-lg font-bold text-tuin-800">
              {taal === 'nl' ? 'Snelle taak' : 'Quick task'}
            </h2>
          </div>
          <button
            onClick={onSluiten}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stap indicator */}
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s === stap ? 'bg-tuin-600' :
                s < stap ? 'bg-tuin-300' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Stap 1: Kies probleem */}
        {stap === 1 && (
          <div className="p-4">
            {/* Uitnodigende introductietekst */}
            <div className="mb-4 p-3 bg-tuin-50 rounded-lg border border-tuin-100">
              <p className="text-sm text-tuin-700">
                {taal === 'nl'
                  ? '👀 Zie je iets in de tuin dat aandacht verdient? Meld het hier zodat we het samen kunnen oppakken!'
                  : '👀 Spotted something in the garden that needs attention? Report it here so we can take care of it together!'}
              </p>
            </div>

            <h3 className="text-sm font-medium text-gray-600 mb-3">
              {taal === 'nl' ? 'Wat wil je melden?' : 'What would you like to report?'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {ADHOC_PROBLEMEN.map(p => (
                <button
                  key={p}
                  onClick={() => handleProbleemKies(p)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border-2
                    transition-all hover:scale-105
                    ${PROBLEEM_KLEUREN[p]}
                  `}
                >
                  {PROBLEEM_ICONEN[p]}
                  <span className="text-sm font-medium">
                    {taal === 'en' ? probleemVertalingen[p] : p}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stap 2: Details invullen */}
        {stap === 2 && (
          <div className="p-4 space-y-4">
            <button
              onClick={() => setStap(1)}
              className="text-sm text-tuin-600 hover:text-tuin-700 flex items-center gap-1"
            >
              ← {taal === 'nl' ? 'Terug' : 'Back'}
            </button>

            {probleem && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${PROBLEEM_KLEUREN[probleem]}`}>
                {PROBLEEM_ICONEN[probleem]}
                <span className="font-medium">
                  {taal === 'en' ? probleemVertalingen[probleem] : probleem}
                </span>
              </div>
            )}

            {/* Locatie */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                {taal === 'nl' ? 'Locatie' : 'Location'}
                <span className="text-gray-400 font-normal ml-1">
                  ({taal === 'nl' ? 'optioneel' : 'optional'})
                </span>
              </label>
              <input
                type="text"
                value={locatie}
                onChange={(e) => setLocatie(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
                placeholder={taal === 'nl'
                  ? 'bijv. A3, B1-B4, Kas, bij de composthoop...'
                  : 'e.g. A3, B1-B4, Greenhouse, near the compost...'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-1p-ignore
                data-lpignore="true"
              />
              <p className="text-xs text-gray-500 mt-1">
                {taal === 'nl'
                  ? 'Geef aan waar je dit hebt gezien'
                  : 'Describe where you noticed this'}
              </p>
            </div>

            {/* Beschrijving */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {taal === 'nl' ? 'Beschrijving' : 'Description'}
              </label>
              <textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none"
                rows={2}
                placeholder={taal === 'nl'
                  ? 'Korte beschrijving van wat je hebt gezien...'
                  : 'Brief description of what you noticed...'}
              />
            </div>

            {/* Toelichting / Notities */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {taal === 'nl' ? 'Extra informatie' : 'Additional info'}
                <span className="text-gray-400 font-normal ml-1">
                  ({taal === 'nl' ? 'optioneel' : 'optional'})
                </span>
              </label>
              <textarea
                value={toelichting}
                onChange={(e) => setToelichting(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none"
                rows={2}
                placeholder={taal === 'nl'
                  ? 'Tips, suggesties of andere opmerkingen...'
                  : 'Tips, suggestions or other remarks...'}
              />
            </div>

            {/* Foto upload (meerdere foto's) */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                {taal === 'nl' ? "Foto's" : 'Photos'}
                <span className="text-gray-400 font-normal ml-1">
                  ({taal === 'nl' ? 'optioneel' : 'optional'})
                </span>
                <span className="text-gray-400 font-normal ml-1">
                  {fotoPreviews.length}/{MAX_FOTOS_PER_TAAK}
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Bestaande foto previews */}
                {fotoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleFotoVerwijderen(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Toevoeg-knop als er nog ruimte is */}
                {fotoPreviews.length < MAX_FOTOS_PER_TAAK && (
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-tuin-400 hover:bg-tuin-50 transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <Plus className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {taal === 'nl' ? 'Foto' : 'Photo'}
                    </span>
                  </button>
                )}
              </div>

              <input
                ref={fotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFotoSelect}
                className="hidden"
                multiple
              />

              {fotoError && (
                <p className="text-sm text-red-500 mt-2">{fotoError}</p>
              )}

              <p className="text-xs text-gray-500 mt-1">
                {taal === 'nl'
                  ? `JPG, PNG, WebP of GIF (max 10MB per foto, max ${MAX_FOTOS_PER_TAAK} foto's)`
                  : `JPG, PNG, WebP or GIF (max 10MB per photo, max ${MAX_FOTOS_PER_TAAK} photos)`}
              </p>
            </div>

            {/* Opslaan */}
            <button
              onClick={handleOpslaan}
              disabled={!beschrijving.trim() || isUploading}
              className={`
                w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2
                ${beschrijving.trim() && !isUploading
                  ? 'bg-tuin-600 text-white hover:bg-tuin-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {taal === 'nl' ? 'Opslaan...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {taal === 'nl' ? 'Taak Aanmaken' : 'Create Task'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// GECOMBINEERDE COMPONENT
// ============================================

export function AdHocTaakButton() {
  const [toonFormulier, setToonFormulier] = useState(false);
  const { state } = useApp();

  // Toon alleen op weekoverzicht pagina EN alleen in community modus
  const isWeekOverzicht = state.ui.huidigeTab === 'weekoverzicht';
  const isCommunityModus = state.ui.rol === 'community';

  if (!isWeekOverzicht || !isCommunityModus) {
    return null;
  }

  return (
    <>
      <AdHocFAB onClick={() => setToonFormulier(true)} />
      {toonFormulier && (
        <AdHocFormulier onSluiten={() => setToonFormulier(false)} />
      )}
    </>
  );
}
