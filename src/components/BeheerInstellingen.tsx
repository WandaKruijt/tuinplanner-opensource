import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Settings,
  Info,
  Database,
  RefreshCw,
  Download,
  Upload,
  Cloud,
  CloudOff,
  LogOut,
  Languages,
  Loader2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  SkipForward,
  Lock,
  ClipboardList,
  BookOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { formatDatumTijd } from '../utils/dateUtils';
import { genereerVensterTaken, opruimenOudeTaken, corrigeerTeeltplanDeadlines } from '../utils/taskGenerator';
import { vertaalBatch, vertaalNaarEngels, isTranslationAvailable } from '../services/translationService';
import {
  parseBeddenCSV,
  parseTeeltplanCSV,
  parseTeeltplanCSVNieuw,
  parseGewassenlijstCSV,
  parseTakenCSV,
  parseInstructiesCSV,
  leesBestandAlsTekst
} from '../utils/csvParser';
// wisAlleData verwijderd - was localStorage-only en had geen effect op Firebase
// Voor echte data wis functionaliteit, gebruik firebaseService
import {
  mergeBedden,
  mergeTeeltplan,
  mergeTaken,
  mergeInstructies,
  saveImportLog,
  getImportLogs,
  clearImportLogs
} from '../utils/importMerge';
import type { Taak, OogstItem, OogstInstructie, Signalering, ImportLog, Instructie, GewassenlijstItem, TeeltplanItem } from '../types';
import {
  mergeTeeltplan as mergeTeeltplanNieuw,
  mergeGewassenlijst as mergeGewassenlijstNieuw,
  type TeeltplanMergeResultaat,
  type GewassenlijstMergeResultaat
} from '../utils/teeltplanMerge';
import * as firebaseService from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';

// Bevestigingstekst voor "Alles wissen" functie
const WIS_BEVESTIGING_TEKST = 'alles wissen';

// ============================================
// IMPORT RESULTAAT TYPE
// ============================================

interface ImportResultaat {
  totaal: number;
  toegevoegd: number;
  overgeslagen: number;
  fouten: string[];
  waarschuwingen: string[];
}

// ============================================
// FILE UPLOAD COMPONENT (uit Importeren.tsx)
// ============================================

interface FileUploadProps {
  titel: string;
  beschrijving: string;
  accept: string;
  onUpload: (file: File) => void;
  status: 'idle' | 'loading' | 'success' | 'error';
  resultaat?: ImportResultaat;
  taal: 'nl' | 'en';
}

function FileUpload({ titel, beschrijving, accept, onUpload, status, resultaat, taal }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-start gap-4">
        <div className={`
          p-3 rounded-lg
          ${status === 'success' ? 'bg-tuin-100' :
            status === 'error' ? 'bg-red-100' :
            status === 'loading' ? 'bg-blue-100' : 'bg-gray-100'}
        `}>
          {status === 'success' ? <CheckCircle className="w-6 h-6 text-tuin-600" /> :
           status === 'error' ? <AlertCircle className="w-6 h-6 text-red-600" /> :
           status === 'loading' ? <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" /> :
           <FileSpreadsheet className="w-6 h-6 text-gray-500" />}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{titel}</h3>
          <p className="text-sm text-gray-500 mb-3">{beschrijving}</p>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            id={`upload-${titel}`}
          />
          <label
            htmlFor={`upload-${titel}`}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors
              ${status === 'loading'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-tuin-600 text-white hover:bg-tuin-700'
              }
            `}
          >
            <Upload className="w-4 h-4" />
            {taal === 'nl' ? 'Bestand kiezen' : 'Choose file'}
          </label>

          {/* Resultaat feedback met merge info */}
          {resultaat && (
            <div className="mt-3 space-y-2">
              {status === 'success' && (
                <div className="text-sm space-y-1">
                  {resultaat.toegevoegd > 0 && (
                    <p className="text-tuin-600 flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      {taal === 'nl'
                        ? `${resultaat.toegevoegd} nieuwe items toegevoegd`
                        : `${resultaat.toegevoegd} new items added`}
                    </p>
                  )}
                  {resultaat.overgeslagen > 0 && (
                    <p className="text-gray-500 flex items-center gap-1">
                      <SkipForward className="w-4 h-4" />
                      {taal === 'nl'
                        ? `${resultaat.overgeslagen} bestaande items overgeslagen`
                        : `${resultaat.overgeslagen} existing items skipped`}
                    </p>
                  )}
                  {resultaat.toegevoegd === 0 && resultaat.overgeslagen > 0 && (
                    <p className="text-amber-600 text-xs">
                      {taal === 'nl'
                        ? 'Alle items bestonden al in de database'
                        : 'All items already existed in database'}
                    </p>
                  )}
                </div>
              )}

              {resultaat.waarschuwingen.length > 0 && (
                <div className="text-sm text-amber-600">
                  <p className="flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    {resultaat.waarschuwingen.length} {taal === 'nl' ? 'waarschuwingen' : 'warnings'}
                  </p>
                  <ul className="ml-5 mt-1 list-disc text-xs">
                    {resultaat.waarschuwingen.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {resultaat.waarschuwingen.length > 3 && (
                      <li>+{resultaat.waarschuwingen.length - 3} {taal === 'nl' ? 'meer...' : 'more...'}</li>
                    )}
                  </ul>
                </div>
              )}

              {resultaat.fouten.length > 0 && (
                <div className="text-sm text-red-600">
                  <p className="flex items-center gap-1 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    {resultaat.fouten.length} {taal === 'nl' ? 'fouten' : 'errors'}
                  </p>
                  <ul className="ml-5 mt-1 list-disc text-xs">
                    {resultaat.fouten.slice(0, 3).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                    {resultaat.fouten.length > 3 && (
                      <li>+{resultaat.fouten.length - 3} {taal === 'nl' ? 'meer...' : 'more...'}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// IMPORT LOG VIEWER COMPONENT (uit Importeren.tsx)
// ============================================

interface ImportLogViewerProps {
  logs: ImportLog[];
  onClear: () => void;
  taal: 'nl' | 'en';
}

function ImportLogViewer({ logs, onClear, taal }: ImportLogViewerProps) {
  const [uitgeklapt, setUitgeklapt] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>{taal === 'nl' ? 'Nog geen import logs' : 'No import logs yet'}</p>
      </div>
    );
  }

  const formatDatum = (isoString: string) => {
    const datum = new Date(isoString);
    return datum.toLocaleDateString(taal === 'nl' ? 'nl-NL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      nl: { bedden: 'Bedden', gewassen: 'Gewassen', teeltplan: 'Teeltplan', oogstlijst: 'Oogstlijst', taken: 'Taken', instructies: 'Instructies' },
      en: { bedden: 'Beds', gewassen: 'Crops', teeltplan: 'Growing plan', oogstlijst: 'Harvest list', taken: 'Tasks', instructies: 'Instructions' }
    };
    return labels[taal][type] || type;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {logs.length} {taal === 'nl' ? 'imports gelogd' : 'imports logged'}
        </p>
        <button
          onClick={onClear}
          className="text-sm text-red-600 hover:text-red-700"
        >
          {taal === 'nl' ? 'Wis logs' : 'Clear logs'}
        </button>
      </div>

      {logs.slice(0, 10).map(log => (
        <div key={log.id} className="bg-gray-50 rounded-lg border border-gray-200">
          <button
            onClick={() => setUitgeklapt(uitgeklapt === log.id ? null : log.id)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">
                  {getTypeLabel(log.type)}
                </span>
                <span className="text-xs text-gray-500">
                  {log.bestandsnaam}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs">
                <span className="text-gray-500">{formatDatum(log.timestamp)}</span>
                <span className="text-tuin-600">+{log.toegevoegd} {taal === 'nl' ? 'nieuw' : 'new'}</span>
                {log.overgeslagen > 0 && (
                  <span className="text-gray-500">{log.overgeslagen} {taal === 'nl' ? 'overgeslagen' : 'skipped'}</span>
                )}
                {log.fouten > 0 && (
                  <span className="text-red-600">{log.fouten} {taal === 'nl' ? 'fouten' : 'errors'}</span>
                )}
              </div>
            </div>
            {uitgeklapt === log.id ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {uitgeklapt === log.id && log.entries.length > 0 && (
            <div className="px-4 pb-3 border-t border-gray-200 pt-3">
              <div className="max-h-60 overflow-y-auto space-y-1">
                {log.entries.map(entry => (
                  <div
                    key={entry.id}
                    className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                      entry.actie === 'toegevoegd' ? 'bg-tuin-50 text-tuin-700' :
                      entry.actie === 'overgeslagen' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-50 text-red-700'
                    }`}
                  >
                    {entry.actie === 'toegevoegd' && <Plus className="w-3 h-3" />}
                    {entry.actie === 'overgeslagen' && <SkipForward className="w-3 h-3" />}
                    {entry.actie === 'fout' && <AlertCircle className="w-3 h-3" />}
                    <span className="font-medium">{entry.itemBeschrijving}</span>
                    {entry.reden && (
                      <span className="text-gray-500 ml-auto truncate max-w-[200px]">
                        {entry.reden}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {logs.length > 10 && (
        <p className="text-xs text-center text-gray-500">
          +{logs.length - 10} {taal === 'nl' ? 'oudere logs (niet getoond)' : 'older logs (not shown)'}
        </p>
      )}
    </div>
  );
}

// ============================================
// MAIN BEHEER INSTELLINGEN COMPONENT
// ============================================

export function BeheerInstellingen() {
  const {
    state,
    dispatch,
    toonToast,
    saveTaken,
    saveBedden,
    saveGewassen,
    saveTeeltplan,
    saveGewassenlijst,
    saveOogstlijst,
    saveOogstInstructie,
    saveSignaleringen,
    saveInstructies
  } = useApp();
  const { taal, t } = useI18n();
  const { isAdmin, loginAdmin, error: authError } = useAuth();
  const gebruiker = state.ui.gebruikersnaam || 'commissie';

  // ============================================
  // STATE UIT INSTELLINGEN.TSX
  // ============================================
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, type: '' });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // ============================================
  // STATE UIT IMPORTEREN.TSX
  // ============================================
  // CSV upload states
  const [beddenStatus, setBeddenStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gewassenStatus, setGewassenStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [teeltplanStatus, setTeeltplanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [takenStatus, setTakenStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [instructiesStatus, setInstructiesStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gewassenlijstStatus, setGewassenlijstStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [beddenResultaat, setBeddenResultaat] = useState<ImportResultaat>();
  const [gewassenResultaat, setGewassenResultaat] = useState<ImportResultaat>();
  const [teeltplanResultaat, setTeeltplanResultaat] = useState<ImportResultaat>();
  const [takenResultaat, setTakenResultaat] = useState<ImportResultaat>();
  const [instructiesResultaat, setInstructiesResultaat] = useState<ImportResultaat>();
  const [gewassenlijstResultaat, setGewassenlijstResultaat] = useState<ImportResultaat>();

  // Import modus: merge of replace
  const [teeltplanImportModus, setTeeltplanImportModus] = useState<'merge' | 'replace'>('merge');
  const [gewassenlijstImportModus, setGewassenlijstImportModus] = useState<'merge' | 'replace'>('merge');

  // Dry-run resultaten
  const [teeltplanDryRun, setTeeltplanDryRun] = useState<TeeltplanMergeResultaat | null>(null);
  const [gewassenlijstDryRun, setGewassenlijstDryRun] = useState<GewassenlijstMergeResultaat | null>(null);

  // Pending CSV data (na dry-run, voor bevestiging)
  const [pendingTeeltplanCSV, setPendingTeeltplanCSV] = useState<TeeltplanItem[] | null>(null);
  const [pendingTeeltplanFile, setPendingTeeltplanFile] = useState<string>('');
  const [pendingGewassenlijstCSV, setPendingGewassenlijstCSV] = useState<GewassenlijstItem[] | null>(null);
  const [pendingGewassenlijstFile, setPendingGewassenlijstFile] = useState<string>('');

  // Regenerate tasks checkbox
  const [regenereerTaken, setRegenereerTaken] = useState(true);

  // Import logs
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [toonLogs, setToonLogs] = useState(false);

  // Instructies komen nu uit Firebase via AppContext (niet meer localStorage)

  // Modal voor "Alles wissen" bevestiging
  const [toonWisModal, setToonWisModal] = useState(false);
  const [wisBevestiging, setWisBevestiging] = useState('');

  // Admin login modal
  const [toonAdminModal, setToonAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [toonWachtwoord, setToonWachtwoord] = useState(false);

  // Laad import logs bij mount
  useEffect(() => {
    setImportLogs(getImportLogs());
  }, []);

  // Bereken zaadinkoop per variant
  const zaadinkoop = useMemo(() => {
    const gewassenlijst = state.data.gewassenlijst || [];
    const teeltplan = state.data.teeltplan || [];
    if (gewassenlijst.length === 0 || teeltplan.length === 0) return [];

    // Bouw lookup van gewassenlijst per gewasSoort
    const glLookup: Map<string, typeof gewassenlijst[0]> = new Map();
    gewassenlijst.forEach(gl => {
      if (gl.gewasSoort) {
        glLookup.set(gl.gewasSoort.toLowerCase(), gl);
      }
    });

    // Aggregeer oppervlakte per variant (gewasSoort) uit teeltplan
    const oppPerVariant: Map<string, number> = new Map();
    teeltplan.forEach(tp => {
      const variantRaw = tp.gewasSoort || tp.gewas;
      if (!variantRaw) return; // Skip items zonder gewas
      const variant = variantRaw.toLowerCase();
      const opp = tp.oppervlakte || 0;
      oppPerVariant.set(variant, (oppPerVariant.get(variant) || 0) + opp);
    });

    // Bereken benodigd zaad per variant
    const resultaat: Array<{
      variant: string;
      gewas: string;
      oppervlakte: number;
      benodigdZaad: number | null;
      link?: string;
    }> = [];

    oppPerVariant.forEach((opp, variantLower) => {
      const gl = glLookup.get(variantLower);
      if (!gl) return; // Geen gewassenlijst data voor deze variant

      const benodigdZaad = gl.zaadPer10m2
        ? Math.round((opp / 10) * gl.zaadPer10m2)
        : null;

      if (benodigdZaad === null) return; // Alleen tonen als zaadPer10m2 data beschikbaar is

      resultaat.push({
        variant: gl.gewasSoort,
        gewas: gl.gewas,
        oppervlakte: Math.round(opp * 10) / 10,
        benodigdZaad,
        link: gl.link
      });
    });

    // Sorteer op gewas (groepsnaam) zodat varianten bij elkaar staan
    resultaat.sort((a, b) => a.gewas.localeCompare(b.gewas) || a.variant.localeCompare(b.variant));

    return resultaat;
  }, [state.data.gewassenlijst, state.data.teeltplan]);

  // ============================================
  // HANDLERS UIT INSTELLINGEN.TSX
  // ============================================

  // Test de DeepL API verbinding
  const handleTestVertaling = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const testTekst = 'Dit is een test van de vertaalfunctie.';
      const vertaling = await vertaalNaarEngels(testTekst);

      if (vertaling) {
        setTestResult({
          success: true,
          message: `Vertaling werkt! "${testTekst}" → "${vertaling}"`
        });
      } else {
        setTestResult({
          success: false,
          message: 'Geen vertaling ontvangen. Check de console (F12) voor details.'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Batch vertaal alle bestaande data
  const handleBatchVertalen = async () => {
    if (!isTranslationAvailable()) {
      toonToast('error', 'DeepL API key niet geconfigureerd. Neem contact op met de beheerder.');
      return;
    }

    const bevestig = window.confirm(
      'Dit vertaalt alle bestaande teksten naar Engels. Dit kan enkele minuten duren en kost API credits. Doorgaan?'
    );
    if (!bevestig) return;

    setIsTranslating(true);
    let totaalVertaald = 0;

    try {
      // 1. Vertaal Taken
      const takenZonderVertaling = state.data.taken.filter(
        t => (t.beschrijving && !t.beschrijving_en) || (t.commentaar && !t.commentaar_en)
      );

      if (takenZonderVertaling.length > 0) {
        setTranslationProgress({ current: 0, total: takenZonderVertaling.length, type: 'Taken' });

        for (let i = 0; i < takenZonderVertaling.length; i += 10) {
          const batch = takenZonderVertaling.slice(i, i + 10);
          const tekstenBatch: string[] = [];

          batch.forEach(taak => {
            tekstenBatch.push(taak.beschrijving || '');
            tekstenBatch.push(taak.instructies || '');
            tekstenBatch.push(taak.commentaar || '');
          });

          const vertalingen = await vertaalBatch(tekstenBatch);

          const updatedTaken = [...state.data.taken];
          batch.forEach((taak, batchIndex) => {
            const taakIndex = updatedTaken.findIndex(t => t.id === taak.id);
            if (taakIndex !== -1) {
              const baseIndex = batchIndex * 3;
              if (vertalingen[baseIndex]) updatedTaken[taakIndex].beschrijving_en = vertalingen[baseIndex];
              if (vertalingen[baseIndex + 1]) updatedTaken[taakIndex].instructies_en = vertalingen[baseIndex + 1];
              if (vertalingen[baseIndex + 2]) updatedTaken[taakIndex].commentaar_en = vertalingen[baseIndex + 2];
            }
          });

          await saveTaken(updatedTaken);
          setTranslationProgress({ current: Math.min(i + 10, takenZonderVertaling.length), total: takenZonderVertaling.length, type: 'Taken' });
          totaalVertaald += batch.length;
        }
      }

      // 2. Vertaal Oogstlijst items
      const oogstZonderVertaling = (state.data.oogstlijst || []).filter(
        (o: OogstItem) => o.hoeveelheidPp && !o.hoeveelheidPp_en
      );

      if (oogstZonderVertaling.length > 0) {
        setTranslationProgress({ current: 0, total: oogstZonderVertaling.length, type: 'Oogstlijst' });

        const updatedOogstlijst = [...(state.data.oogstlijst || [])];

        for (let i = 0; i < oogstZonderVertaling.length; i += 10) {
          const batch = oogstZonderVertaling.slice(i, i + 10);
          const tekstenBatch: string[] = [];

          batch.forEach((item: OogstItem) => {
            tekstenBatch.push(item.hoeveelheidPp || '');
            tekstenBatch.push(item.oogstmethode || '');
            tekstenBatch.push(item.bijzonderheden || '');
          });

          const vertalingen = await vertaalBatch(tekstenBatch);

          batch.forEach((item: OogstItem, batchIndex: number) => {
            const itemIndex = updatedOogstlijst.findIndex(o => o.id === item.id);
            if (itemIndex !== -1) {
              const baseIndex = batchIndex * 3;
              if (vertalingen[baseIndex]) updatedOogstlijst[itemIndex].hoeveelheidPp_en = vertalingen[baseIndex];
              if (vertalingen[baseIndex + 1]) updatedOogstlijst[itemIndex].oogstmethode_en = vertalingen[baseIndex + 1];
              if (vertalingen[baseIndex + 2]) updatedOogstlijst[itemIndex].bijzonderheden_en = vertalingen[baseIndex + 2];
            }
          });

          setTranslationProgress({ current: Math.min(i + 10, oogstZonderVertaling.length), total: oogstZonderVertaling.length, type: 'Oogstlijst' });
          totaalVertaald += batch.length;
        }

        await saveOogstlijst(updatedOogstlijst);
      }

      // 3. Vertaal Oogst Instructies
      const instructiesZonderVertaling = (state.data.oogstInstructies || []).filter(
        (i: OogstInstructie) => i.titel && !i.titel_en
      );

      if (instructiesZonderVertaling.length > 0) {
        setTranslationProgress({ current: 0, total: instructiesZonderVertaling.length, type: 'Instructies' });

        for (let i = 0; i < instructiesZonderVertaling.length; i += 5) {
          const batch = instructiesZonderVertaling.slice(i, i + 5);
          const tekstenBatch: string[] = [];

          batch.forEach((instr: OogstInstructie) => {
            tekstenBatch.push(instr.titel || '');
            tekstenBatch.push(instr.instructie || '');
            tekstenBatch.push(instr.tips || '');
          });

          const vertalingen = await vertaalBatch(tekstenBatch);

          for (let j = 0; j < batch.length; j++) {
            const instr = batch[j];
            const baseIndex = j * 3;
            const updatedInstr = { ...instr };
            if (vertalingen[baseIndex]) updatedInstr.titel_en = vertalingen[baseIndex];
            if (vertalingen[baseIndex + 1]) updatedInstr.instructie_en = vertalingen[baseIndex + 1];
            if (vertalingen[baseIndex + 2]) updatedInstr.tips_en = vertalingen[baseIndex + 2];
            await saveOogstInstructie(updatedInstr);
          }

          setTranslationProgress({ current: Math.min(i + 5, instructiesZonderVertaling.length), total: instructiesZonderVertaling.length, type: 'Instructies' });
          totaalVertaald += batch.length;
        }
      }

      // 4. Vertaal Signaleringen
      const signalenZonderVertaling = (state.data.signaleringen || []).filter(
        (s: Signalering) => s.bericht && !s.bericht_en
      );

      if (signalenZonderVertaling.length > 0) {
        setTranslationProgress({ current: 0, total: signalenZonderVertaling.length, type: 'Berichten' });

        const updatedSignaleringen = [...(state.data.signaleringen || [])];

        for (let i = 0; i < signalenZonderVertaling.length; i += 10) {
          const batch = signalenZonderVertaling.slice(i, i + 10);
          const tekstenBatch: string[] = [];

          batch.forEach((sig: Signalering) => {
            tekstenBatch.push(sig.bericht || '');
            tekstenBatch.push(sig.reactie || '');
          });

          const vertalingen = await vertaalBatch(tekstenBatch);

          batch.forEach((sig: Signalering, batchIndex: number) => {
            const sigIndex = updatedSignaleringen.findIndex(s => s.id === sig.id);
            if (sigIndex !== -1) {
              const baseIndex = batchIndex * 2;
              if (vertalingen[baseIndex]) updatedSignaleringen[sigIndex].bericht_en = vertalingen[baseIndex];
              if (vertalingen[baseIndex + 1]) updatedSignaleringen[sigIndex].reactie_en = vertalingen[baseIndex + 1];
            }
          });

          setTranslationProgress({ current: Math.min(i + 10, signalenZonderVertaling.length), total: signalenZonderVertaling.length, type: 'Berichten' });
          totaalVertaald += batch.length;
        }

        await saveSignaleringen(updatedSignaleringen);
      }

      if (totaalVertaald > 0) {
        toonToast('success', `${totaalVertaald} items vertaald naar Engels!`);
      } else {
        toonToast('info', 'Alle teksten zijn al vertaald.');
      }
    } catch (error) {
      console.error('Batch vertaal fout:', error);
      toonToast('error', 'Fout bij vertalen. Probeer het later opnieuw.');
    } finally {
      setIsTranslating(false);
      setTranslationProgress({ current: 0, total: 0, type: '' });
    }
  };

  // Tel items zonder vertaling
  const countOnvertaald = () => {
    const taken = state.data.taken.filter(t => t.beschrijving && !t.beschrijving_en).length;
    const oogst = (state.data.oogstlijst || []).filter((o: OogstItem) => o.hoeveelheidPp && !o.hoeveelheidPp_en).length;
    const instructiesCount = (state.data.oogstInstructies || []).filter((i: OogstInstructie) => i.titel && !i.titel_en).length;
    const signalen = (state.data.signaleringen || []).filter((s: Signalering) => s.bericht && !s.bericht_en).length;
    return { taken, oogst, instructies: instructiesCount, signalen, totaal: taken + oogst + instructiesCount + signalen };
  };

  const onvertaald = countOnvertaald();

  // Sanitize ID voor Firebase
  const sanitizeId = (id: string): string => {
    return id.replace(/[.#$[\]/]/g, '_');
  };

  // Upload alle lokale data naar Firebase
  const handleUploadNaarFirebase = async () => {
    try {
      const lokaleDataStr = localStorage.getItem('tuinplanner_data');
      if (!lokaleDataStr) {
        toonToast('info', 'Geen lokale data gevonden om te uploaden');
        return;
      }

      const lokaleData = JSON.parse(lokaleDataStr);

      const sanitizedBedden = (lokaleData.bedden || []).map((b: { id: string }) => ({
        ...b,
        id: sanitizeId(b.id)
      }));

      const sanitizedGewassen = (lokaleData.gewassen || []).map((g: { id: string }) => ({
        ...g,
        id: sanitizeId(g.id)
      }));

      const sanitizedTeeltplan = (lokaleData.teeltplan || []).map((t: { id: string; bedId: string }) => ({
        ...t,
        id: sanitizeId(t.id),
        bedId: sanitizeId(t.bedId)
      }));

      const sanitizedTaken = (lokaleData.taken || []).map((t: { id: string; bedId?: string }) => ({
        ...t,
        id: sanitizeId(t.id),
        bedId: t.bedId ? sanitizeId(t.bedId) : t.bedId
      }));

      toonToast('info', 'Uploaden gestart...');

      await saveBedden(sanitizedBedden);
      await saveGewassen(sanitizedGewassen);
      await saveTeeltplan(sanitizedTeeltplan);
      await saveTaken(sanitizedTaken);

      toonToast('success', `Data geupload: ${sanitizedBedden.length} bedden, ${sanitizedGewassen.length} gewassen, ${sanitizedTeeltplan.length} teeltplan items, ${sanitizedTaken.length} taken`);
    } catch (error) {
      console.error('Upload error:', error);
      toonToast('error', `Fout bij uploaden: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  };

  const handleGenereerTaken = async () => {
    const nieuweTaken = genereerVensterTaken(
      state.data.teeltplan,
      state.data.taken
    );

    // Corrigeer ook bestaande taken met verkeerde deadlines
    const gecorrigeerd = corrigeerTeeltplanDeadlines(state.data.taken);
    const gecorrigeerdeIds = new Set(gecorrigeerd.map(t => t.id));

    if (nieuweTaken.length === 0 && gecorrigeerd.length === 0) {
      toonToast('info', taal === 'nl' ? 'Geen nieuwe taken om te genereren' : 'No new tasks to generate');
      return;
    }

    const bijgewerkteTaken = state.data.taken.map(t =>
      gecorrigeerdeIds.has(t.id) ? gecorrigeerd.find(g => g.id === t.id)! : t
    );
    const alleTaken = [...bijgewerkteTaken, ...nieuweTaken];
    await saveTaken(alleTaken);

    const meldingen: string[] = [];
    if (nieuweTaken.length > 0) meldingen.push(`${nieuweTaken.length} nieuwe taken`);
    if (gecorrigeerd.length > 0) meldingen.push(`${gecorrigeerd.length} deadlines gecorrigeerd`);
    toonToast('success', meldingen.join(', '));
  };

  const handleOpruimen = async () => {
    const opgerumideTaken = opruimenOudeTaken(state.data.taken);
    const aantalVerwijderd = state.data.taken.length - opgerumideTaken.length;

    if (aantalVerwijderd === 0) {
      toonToast('info', 'Geen oude taken om op te ruimen');
      return;
    }

    await saveTaken(opgerumideTaken);
    toonToast('success', `${aantalVerwijderd} oude taken opgeruimd`);
  };

  const handleWisAutomatischeTaken = async () => {
    const automatischeTaken = state.data.taken.filter(t => t.isAutomatisch);

    if (automatischeTaken.length === 0) {
      toonToast('info', taal === 'nl' ? 'Geen automatische taken om te wissen' : 'No automatic tasks to delete');
      return;
    }

    const bevestig = window.confirm(
      taal === 'nl'
        ? `Weet je zeker dat je alle ${automatischeTaken.length} automatische taken wilt wissen? Handmatige taken blijven behouden.`
        : `Are you sure you want to delete all ${automatischeTaken.length} automatic tasks? Manual tasks will be kept.`
    );

    if (!bevestig) return;

    const overgeblevenTaken = state.data.taken.filter(t => !t.isAutomatisch);
    await saveTaken(overgeblevenTaken);
    toonToast('success', taal === 'nl'
      ? `${automatischeTaken.length} automatische taken gewist`
      : `${automatischeTaken.length} automatic tasks deleted`);
  };

  // Uitloggen functie
  const handleUitloggen = () => {
    if (window.confirm('Weet je zeker dat je wilt uitloggen?')) {
      localStorage.removeItem('tuinplanner_authenticated');
      window.location.reload();
    }
  };

  // ============================================
  // HANDLERS UIT IMPORTEREN.TSX
  // ============================================

  const handleBeddenUpload = async (file: File) => {
    setBeddenStatus('loading');
    try {
      const content = await leesBestandAlsTekst(file);
      const parseResult = parseBeddenCSV(content);

      if (parseResult.fouten.length > 0 && parseResult.data.length === 0) {
        setBeddenStatus('error');
        setBeddenResultaat({
          totaal: 0,
          toegevoegd: 0,
          overgeslagen: 0,
          fouten: parseResult.fouten,
          waarschuwingen: parseResult.waarschuwingen
        });
        toonToast('error', 'Fout bij importeren bedden');
        return;
      }

      const mergeResult = mergeBedden(
        state.data.bedden,
        parseResult.data,
        file.name,
        gebruiker
      );

      dispatch({ type: 'SET_BEDDEN', payload: mergeResult.data });
      await saveBedden(mergeResult.data);

      saveImportLog(mergeResult.log);
      setImportLogs(getImportLogs());

      setBeddenResultaat({
        totaal: parseResult.data.length,
        toegevoegd: mergeResult.log.toegevoegd,
        overgeslagen: mergeResult.log.overgeslagen,
        fouten: parseResult.fouten,
        waarschuwingen: parseResult.waarschuwingen
      });

      if (parseResult.fouten.length > 0) {
        setBeddenStatus('error');
        toonToast('warning', `Bedden geïmporteerd met ${parseResult.fouten.length} fouten`);
      } else if (mergeResult.log.toegevoegd === 0) {
        setBeddenStatus('success');
        toonToast('info', 'Alle bedden bestonden al - niets toegevoegd');
      } else {
        setBeddenStatus('success');
        toonToast('success', `${mergeResult.log.toegevoegd} nieuwe bedden toegevoegd`);
      }
    } catch (err) {
      setBeddenStatus('error');
      setBeddenResultaat({
        totaal: 0,
        toegevoegd: 0,
        overgeslagen: 0,
        fouten: [err instanceof Error ? err.message : 'Onbekende fout'],
        waarschuwingen: []
      });
      toonToast('error', 'Fout bij importeren bedden');
    }
  };

  const handleGewassenUpload = async (file: File) => {
    setGewassenStatus('loading');
    try {
      const content = await leesBestandAlsTekst(file);
      // Gebruik parseGewassenlijstCSV — deze parst ALLE kolommen incl. link, zaad, opbrengst
      const parseResult = parseGewassenlijstCSV(content);

      if (parseResult.fouten.length > 0 && parseResult.data.length === 0) {
        setGewassenStatus('error');
        setGewassenResultaat({
          totaal: 0,
          toegevoegd: 0,
          overgeslagen: 0,
          fouten: parseResult.fouten,
          waarschuwingen: parseResult.waarschuwingen
        });
        toonToast('error', taal === 'nl' ? 'Fout bij importeren gewassen' : 'Error importing crops');
        return;
      }

      // Bouw upsert map: schrijf naar /gewassenlijst (NOOIT naar /gewassen encyclopedie)
      const gewassenlijstMap: Record<string, GewassenlijstItem> = {};
      for (const item of parseResult.data) {
        gewassenlijstMap[item.id] = item;
      }

      // Upsert naar /gewassenlijst via update() — bestaande records bijwerken, nieuwe toevoegen
      await firebaseService.upsertGewassenlijst(gewassenlijstMap);

      const toegevoegd = Object.keys(gewassenlijstMap).length;

      setGewassenResultaat({
        totaal: parseResult.data.length,
        toegevoegd,
        overgeslagen: 0,
        fouten: parseResult.fouten,
        waarschuwingen: parseResult.waarschuwingen
      });

      if (parseResult.fouten.length > 0) {
        setGewassenStatus('error');
        toonToast('warning', taal === 'nl'
          ? `Gewassenlijst geïmporteerd met ${parseResult.fouten.length} fouten`
          : `Crop list imported with ${parseResult.fouten.length} errors`);
      } else {
        setGewassenStatus('success');
        toonToast('success', taal === 'nl'
          ? `${toegevoegd} gewassen naar gewassenlijst geïmporteerd`
          : `${toegevoegd} crops imported to crop list`);
      }
    } catch (err) {
      setGewassenStatus('error');
      setGewassenResultaat({
        totaal: 0,
        toegevoegd: 0,
        overgeslagen: 0,
        fouten: [err instanceof Error ? err.message : 'Onbekende fout'],
        waarschuwingen: []
      });
      toonToast('error', taal === 'nl' ? 'Fout bij importeren gewassen' : 'Error importing crops');
    }
  };

  // Backup download helper
  const downloadBackup = (data: unknown, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // TEELTPLAN: Stap 1 - CSV uploaden en dry-run
  const handleTeeltplanUpload = async (file: File) => {
    setTeeltplanStatus('loading');
    setTeeltplanDryRun(null);
    setPendingTeeltplanCSV(null);
    try {
      const content = await leesBestandAlsTekst(file);
      // Probeer eerst nieuwe CSV-structuur (met "Gewas + Soort" kolom)
      let parseResult = parseTeeltplanCSVNieuw(content);
      // Fallback naar oude parser als nieuwe geen data oplevert
      if (parseResult.data.length === 0) {
        parseResult = parseTeeltplanCSV(content);
      }

      if (parseResult.fouten.length > 0 && parseResult.data.length === 0) {
        setTeeltplanStatus('error');
        setTeeltplanResultaat({
          totaal: 0, toegevoegd: 0, overgeslagen: 0,
          fouten: parseResult.fouten,
          waarschuwingen: parseResult.waarschuwingen
        });
        toonToast('error', taal === 'nl' ? 'Fout bij parsen teeltplan CSV' : 'Error parsing cultivation plan CSV');
        return;
      }

      // Haal huidige Firebase data op voor merge
      const bestaandeData = await firebaseService.getTeeltplanData();

      // Dry-run
      const dryRunResult = mergeTeeltplanNieuw(
        bestaandeData || {},
        parseResult.data,
        { modus: teeltplanImportModus, bestandsnaam: file.name, gebruiker }
      );

      setTeeltplanDryRun(dryRunResult);
      setPendingTeeltplanCSV(parseResult.data);
      setPendingTeeltplanFile(file.name);
      setTeeltplanStatus('idle');

      // Toon dry-run resultaten
      setTeeltplanResultaat({
        totaal: parseResult.data.length,
        toegevoegd: dryRunResult.samenvatting.nieuweRecords,
        overgeslagen: dryRunResult.samenvatting.exacteMatches + dryRunResult.samenvatting.groepMatches,
        fouten: parseResult.fouten,
        waarschuwingen: parseResult.waarschuwingen
      });

    } catch (err) {
      setTeeltplanStatus('error');
      setTeeltplanResultaat({
        totaal: 0, toegevoegd: 0, overgeslagen: 0,
        fouten: [err instanceof Error ? err.message : 'Onbekende fout'],
        waarschuwingen: []
      });
      toonToast('error', taal === 'nl' ? 'Fout bij importeren teeltplan' : 'Error importing cultivation plan');
    }
  };

  // TEELTPLAN: Stap 2 - Bevestiging en uitvoering
  const handleTeeltplanBevestig = async () => {
    if (!pendingTeeltplanCSV || !teeltplanDryRun) return;

    setTeeltplanStatus('loading');
    try {
      // Automatische backup naar Firebase (vóór destructieve operatie)
      await firebaseService.backupCollectie('teeltplan', `Import ${teeltplanImportModus}`);

      // Backup downloaden (lokaal)
      const bestaandeData = await firebaseService.getTeeltplanData();
      if (bestaandeData && Object.keys(bestaandeData).length > 0) {
        downloadBackup(bestaandeData, `teeltplan-backup-${new Date().toISOString().split('T')[0]}.json`);
      }

      if (teeltplanImportModus === 'replace') {
        // Replace: alles vervangen
        const nieuweMap: Record<string, TeeltplanItem> = {};
        pendingTeeltplanCSV.forEach(item => {
          nieuweMap[item.id] = item;
        });
        await firebaseService.setTeeltplanMap(nieuweMap);
      } else {
        // Merge: updates toepassen + nieuwe records toevoegen
        const updates = teeltplanDryRun.updates;
        const nieuweRecords = teeltplanDryRun.nieuweRecords;

        // Apply alle updates en nieuwe records
        const combinedMap: Record<string, TeeltplanItem> = {
          ...(bestaandeData || {}),
          ...updates,
          ...nieuweRecords
        };
        await firebaseService.setTeeltplanMap(combinedMap);
      }

      saveImportLog(teeltplanDryRun.log);
      setImportLogs(getImportLogs());

      // Regenereer taken indien gewenst
      if (regenereerTaken) {
        // Haal bijgewerkt teeltplan op
        const bijgewerktData = await firebaseService.getTeeltplanData();
        const bijgewerktTeeltplan: TeeltplanItem[] = bijgewerktData ? Object.values(bijgewerktData) : [];

        // Verwijder alle automatische taken
        const handmatigeTaken = state.data.taken.filter(t => !t.isAutomatisch);
        // Genereer nieuwe venster-taken
        const nieuweTaken = genereerVensterTaken(bijgewerktTeeltplan, []);
        const alleTaken = [...handmatigeTaken, ...nieuweTaken];
        await saveTaken(alleTaken);

        toonToast('success', taal === 'nl'
          ? `Teeltplan geïmporteerd. ${nieuweTaken.length} taken opnieuw gegenereerd.`
          : `Cultivation plan imported. ${nieuweTaken.length} tasks regenerated.`);
      } else {
        toonToast('success', taal === 'nl' ? 'Teeltplan geïmporteerd' : 'Cultivation plan imported');
      }

      setTeeltplanStatus('success');
      setPendingTeeltplanCSV(null);
      setTeeltplanDryRun(null);

    } catch (err) {
      setTeeltplanStatus('error');
      toonToast('error', taal === 'nl' ? 'Fout bij importeren teeltplan' : 'Error importing cultivation plan');
    }
  };

  // GEWASSENLIJST: Stap 1 - CSV uploaden en dry-run
  const handleGewassenlijstUpload = async (file: File) => {
    setGewassenlijstStatus('loading');
    setGewassenlijstDryRun(null);
    setPendingGewassenlijstCSV(null);
    try {
      const content = await leesBestandAlsTekst(file);
      const parseResult = parseGewassenlijstCSV(content);

      if (parseResult.fouten.length > 0 && parseResult.data.length === 0) {
        setGewassenlijstStatus('error');
        setGewassenlijstResultaat({
          totaal: 0, toegevoegd: 0, overgeslagen: 0,
          fouten: parseResult.fouten,
          waarschuwingen: parseResult.waarschuwingen
        });
        toonToast('error', taal === 'nl' ? 'Fout bij parsen gewassenlijst CSV' : 'Error parsing crop list CSV');
        return;
      }

      // Haal bestaande data op
      const bestaandeData = await firebaseService.getGewassenlijstData();

      // Dry-run
      const dryRunResult = mergeGewassenlijstNieuw(
        bestaandeData,
        parseResult.data,
        gewassenlijstImportModus,
        file.name,
        gebruiker
      );

      setGewassenlijstDryRun(dryRunResult);
      setPendingGewassenlijstCSV(parseResult.data);
      setPendingGewassenlijstFile(file.name);
      setGewassenlijstStatus('idle');

      setGewassenlijstResultaat({
        totaal: parseResult.data.length,
        toegevoegd: dryRunResult.samenvatting.nieuw,
        overgeslagen: dryRunResult.samenvatting.bijgewerkt,
        fouten: parseResult.fouten,
        waarschuwingen: parseResult.waarschuwingen
      });

    } catch (err) {
      setGewassenlijstStatus('error');
      setGewassenlijstResultaat({
        totaal: 0, toegevoegd: 0, overgeslagen: 0,
        fouten: [err instanceof Error ? err.message : 'Onbekende fout'],
        waarschuwingen: []
      });
      toonToast('error', taal === 'nl' ? 'Fout bij importeren gewassenlijst' : 'Error importing crop list');
    }
  };

  // GEWASSENLIJST: Stap 2 - Bevestiging en uitvoering
  const handleGewassenlijstBevestig = async () => {
    if (!pendingGewassenlijstCSV || !gewassenlijstDryRun) return;

    setGewassenlijstStatus('loading');
    try {
      // Automatische backup naar Firebase (vóór destructieve operatie)
      await firebaseService.backupCollectie('gewassenlijst', 'Import gewassenlijst');

      // Backup downloaden (lokaal, als er bestaande data is)
      const bestaandeData = await firebaseService.getGewassenlijstData();
      if (bestaandeData && Object.keys(bestaandeData).length > 0) {
        downloadBackup(bestaandeData, `gewassenlijst-backup-${new Date().toISOString().split('T')[0]}.json`);
      }

      // Schrijf de gemergede data naar Firebase
      const items = Object.values(gewassenlijstDryRun.data);
      await saveGewassenlijst(items);

      saveImportLog(gewassenlijstDryRun.log);
      setImportLogs(getImportLogs());

      const s = gewassenlijstDryRun.samenvatting;
      toonToast('success', taal === 'nl'
        ? `${s.totaal} gewassen geïmporteerd: ${s.nieuw} nieuw, ${s.bijgewerkt} bijgewerkt`
        : `${s.totaal} crops imported: ${s.nieuw} new, ${s.bijgewerkt} updated`);

      setGewassenlijstStatus('success');
      setPendingGewassenlijstCSV(null);
      setGewassenlijstDryRun(null);

    } catch (err) {
      setGewassenlijstStatus('error');
      toonToast('error', taal === 'nl' ? 'Fout bij importeren gewassenlijst' : 'Error importing crop list');
    }
  };

  const handleTakenUpload = async (file: File) => {
    setTakenStatus('loading');
    try {
      const content = await leesBestandAlsTekst(file);
      const parseResult = parseTakenCSV(content);

      if (parseResult.fouten.length > 0 && parseResult.data.length === 0) {
        setTakenStatus('error');
        setTakenResultaat({
          totaal: 0,
          toegevoegd: 0,
          overgeslagen: 0,
          fouten: parseResult.fouten,
          waarschuwingen: parseResult.waarschuwingen
        });
        toonToast('error', 'Fout bij importeren taken');
        return;
      }

      const mergeResult = mergeTaken(
        state.data.taken,
        parseResult.data,
        file.name,
        gebruiker
      );

      dispatch({ type: 'SET_TAKEN', payload: mergeResult.data });
      await saveTaken(mergeResult.data);

      saveImportLog(mergeResult.log);
      setImportLogs(getImportLogs());

      setTakenResultaat({
        totaal: parseResult.data.length,
        toegevoegd: mergeResult.log.toegevoegd,
        overgeslagen: mergeResult.log.overgeslagen,
        fouten: parseResult.fouten,
        waarschuwingen: parseResult.waarschuwingen
      });

      if (parseResult.fouten.length > 0) {
        setTakenStatus('error');
        toonToast('warning', `Taken geïmporteerd met ${parseResult.fouten.length} fouten`);
      } else if (mergeResult.log.toegevoegd === 0) {
        setTakenStatus('success');
        toonToast('info', 'Alle taken bestonden al - niets toegevoegd');
      } else {
        setTakenStatus('success');
        toonToast('success', `${mergeResult.log.toegevoegd} nieuwe taken toegevoegd`);
      }
    } catch (err) {
      setTakenStatus('error');
      setTakenResultaat({
        totaal: 0,
        toegevoegd: 0,
        overgeslagen: 0,
        fouten: [err instanceof Error ? err.message : 'Onbekende fout'],
        waarschuwingen: []
      });
      toonToast('error', 'Fout bij importeren taken');
    }
  };

  const handleInstructiesUpload = async (file: File) => {
    setInstructiesStatus('loading');
    try {
      const content = await leesBestandAlsTekst(file);
      const parseResult = parseInstructiesCSV(content);

      if (parseResult.fouten.length > 0 && parseResult.data.length === 0) {
        setInstructiesStatus('error');
        setInstructiesResultaat({
          totaal: 0,
          toegevoegd: 0,
          overgeslagen: 0,
          fouten: parseResult.fouten,
          waarschuwingen: parseResult.waarschuwingen
        });
        toonToast('error', 'Fout bij importeren instructies');
        return;
      }

      // Gebruik instructies uit Firebase (via state) in plaats van localStorage
      const mergeResult = mergeInstructies(
        state.data.instructies,
        parseResult.data,
        file.name,
        gebruiker
      );

      // Sla op naar Firebase in plaats van localStorage
      dispatch({ type: 'SET_INSTRUCTIES', payload: mergeResult.data });
      await saveInstructies(mergeResult.data);

      saveImportLog(mergeResult.log);
      setImportLogs(getImportLogs());

      setInstructiesResultaat({
        totaal: parseResult.data.length,
        toegevoegd: mergeResult.log.toegevoegd,
        overgeslagen: mergeResult.log.overgeslagen,
        fouten: parseResult.fouten,
        waarschuwingen: parseResult.waarschuwingen
      });

      if (parseResult.fouten.length > 0) {
        setInstructiesStatus('error');
        toonToast('warning', `Instructies geïmporteerd met ${parseResult.fouten.length} fouten`);
      } else if (mergeResult.log.toegevoegd === 0) {
        setInstructiesStatus('success');
        toonToast('info', 'Alle instructies bestonden al - niets toegevoegd');
      } else {
        setInstructiesStatus('success');
        toonToast('success', `${mergeResult.log.toegevoegd} nieuwe instructies toegevoegd`);
      }
    } catch (err) {
      setInstructiesStatus('error');
      setInstructiesResultaat({
        totaal: 0,
        toegevoegd: 0,
        overgeslagen: 0,
        fouten: [err instanceof Error ? err.message : 'Onbekende fout'],
        waarschuwingen: []
      });
      toonToast('error', 'Fout bij importeren instructies');
    }
  };

  const handleWisDataClick = () => {
    setWisBevestiging('');
    setToonWisModal(true);
  };

  const handleWisDataBevestig = () => {
    if (wisBevestiging.toLowerCase() !== WIS_BEVESTIGING_TEKST) {
      toonToast('error', taal === 'nl' ? 'Type "alles wissen" om te bevestigen' : 'Type "alles wissen" to confirm');
      return;
    }

    // ⚠️ VEILIGHEID: "Alles wissen" is uitgeschakeld
    // De oude wisAlleData() wiste alleen localStorage, niet Firebase.
    // Om data echt te wissen moet je naar Firebase Console gaan.
    // Dit voorkomt per ongeluk data verlies.
    toonToast('warning', taal === 'nl' 
      ? 'Data wissen is uitgeschakeld. Gebruik Firebase Console voor data beheer.' 
      : 'Data deletion is disabled. Use Firebase Console for data management.');
    setToonWisModal(false);
  };

  const handleWisLogs = () => {
    if (confirm('Weet je zeker dat je alle import logs wilt wissen?')) {
      clearImportLogs();
      setImportLogs([]);
      toonToast('info', 'Import logs gewist');
    }
  };

  // ============================================
  // ADMIN LOGIN HANDLER
  // ============================================

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    const success = await loginAdmin(adminEmail, adminPassword);
    setAdminLoading(false);

    if (success) {
      setToonAdminModal(false);
      setAdminEmail('');
      setAdminPassword('');
    }
  };

  // Admin modal wordt nu inline gerenderd om re-mount te voorkomen

  // ============================================
  // RENDER
  // ============================================

   // Als niet unlocked, toon lock scherm
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-tuin-800">
            {taal === 'nl' ? 'Beheer & Instellingen' : 'Management & Settings'}
          </h2>
        </div>

        {/* Lock message */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {taal === 'nl' ? 'Beveiligde pagina' : 'Protected page'}
          </h3>
          <p className="text-gray-600 mb-6">
            {taal === 'nl'
              ? 'Deze pagina is beveiligd met een wachtwoord. Klik op de knop hieronder om toegang te krijgen.'
              : 'This page is protected with a password. Click the button below to get access.'}
          </p>
          <button
            onClick={() => setToonAdminModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 font-medium"
          >
            <Lock className="w-5 h-5" />
            {taal === 'nl' ? 'Ontgrendelen' : 'Unlock'}
          </button>
        </div>

        {/* Admin Password Modal - inline om re-mount te voorkomen */}
        {toonAdminModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Lock className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {taal === 'nl' ? 'Admin toegang' : 'Admin access'}
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {taal === 'nl'
                  ? 'Log in met je admin account om toegang te krijgen.'
                  : 'Log in with your admin account to get access.'}
              </p>

              <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }} className="space-y-3 mb-4">
                <input
                  type="text"
                  inputMode="email"
                  name="admin-email-field"
                  id="admin-email-field"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tuin-500"
                />
                <div className="relative">
                  <input
                    type="text"
                    name="admin-pass-field"
                    id="admin-pass-field"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={taal === 'nl' ? 'Wachtwoord' : 'Password'}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tuin-500"
                    style={toonWachtwoord ? undefined : { WebkitTextSecurity: 'disc' } as React.CSSProperties}
                  />
                  <button
                    type="button"
                    onClick={() => setToonWachtwoord(!toonWachtwoord)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {toonWachtwoord ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {authError && (
                  <p className="text-sm text-red-600">{authError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setToonAdminModal(false);
                      setAdminEmail('');
                      setAdminPassword('');
                      setToonWachtwoord(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={adminLoading}
                  >
                    {taal === 'nl' ? 'Annuleren' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={adminLoading || !adminEmail || !adminPassword}
                    className="flex-1 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 disabled:opacity-50"
                  >
                    {adminLoading ? '...' : (taal === 'nl' ? 'Inloggen' : 'Login')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - consistent met andere pagina's */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-tuin-800">
          {taal === 'nl' ? 'Beheer & Instellingen' : 'Management & Settings'}
        </h2>
      </div>

      {/* SECTIE 1: Data Statistieken */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-tuin-600" />
          {taal === 'nl' ? 'Data Overzicht' : 'Data Overview'}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-4 bg-tuin-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-tuin-700">{state.data.bedden.length}</p>
            <p className="text-sm text-tuin-600">{taal === 'nl' ? 'Bedden' : 'Beds'}</p>
          </div>
          <div className="p-4 bg-tuin-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-tuin-700">{state.data.gewassen.length}</p>
            <p className="text-sm text-tuin-600">{taal === 'nl' ? 'Gewassen' : 'Crops'}</p>
          </div>
          <div className="p-4 bg-tuin-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-tuin-700">{state.data.teeltplan.length}</p>
            <p className="text-sm text-tuin-600">{taal === 'nl' ? 'Teeltplan' : 'Plan'}</p>
          </div>
          <div className="p-4 bg-tuin-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-tuin-700">{state.data.taken.length}</p>
            <p className="text-sm text-tuin-600">{taal === 'nl' ? 'Taken' : 'Tasks'}</p>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>{taal === 'nl' ? 'Laatste synchronisatie' : 'Last sync'}: {formatDatumTijd(state.data.laatsteSync)}</p>
        </div>
      </div>

      {/* Sync status */}
      <div className={`rounded-lg shadow-sm p-4 flex items-center gap-3 ${
        state.ui.isSyncing ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'
      }`}>
        {state.ui.isSyncing ? (
          <>
            <Cloud className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="text-blue-700 font-medium">{taal === 'nl' ? 'Synchroniseren...' : 'Syncing...'}</span>
          </>
        ) : (
          <>
            <Cloud className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">{taal === 'nl' ? 'Gesynchroniseerd met Firebase' : 'Synced with Firebase'}</span>
          </>
        )}
      </div>

      {/* SECTIE 2: Data Import */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-tuin-600" />
          {taal === 'nl' ? 'Data Import' : 'Data Import'}
        </h3>

        {/* Info banner over merge gedrag */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                {taal === 'nl' ? 'Slimme import' : 'Smart import'}
              </p>
              <p>
                {taal === 'nl'
                  ? <>Imports voegen alleen <strong>nieuwe items</strong> toe. Bestaande items worden niet overschreven.</>
                  : <>Imports only add <strong>new items</strong>. Existing items are not overwritten.</>
                }
              </p>
            </div>
          </div>
        </div>

        {/* CSV Files */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">
            {taal === 'nl' ? 'CSV Bestanden' : 'CSV Files'}
          </h4>

          <FileUpload
            titel="Bedden.csv"
            beschrijving={taal === 'nl'
              ? "Sectie, Bed, Vakken, Afmetingen, Zon/Schaduw, Opmerkingen"
              : "Section, Bed, Plots, Dimensions, Sun/Shade, Notes"}
            accept=".csv"
            onUpload={handleBeddenUpload}
            status={beddenStatus}
            resultaat={beddenResultaat}
            taal={taal}
          />

          <FileUpload
            titel="Gewassen.csv"
            beschrijving={taal === 'nl'
              ? "Gewas, Variant, Teeltgroep, Zaai/Oogstperiode, Maandkalender → opgeslagen in gewassenlijst"
              : "Crop, Variant, Crop group, Sow/Harvest period, Monthly calendar → saved to crop list"}
            accept=".csv"
            onUpload={handleGewassenUpload}
            status={gewassenStatus}
            resultaat={gewassenResultaat}
            taal={taal}
          />

          <FileUpload
            titel="Teeltplan.csv"
            beschrijving={taal === 'nl'
              ? "Jaar, Sectie, Bed, Gewas, Gewas+Soort, Teelt, Maandkalender"
              : "Year, Section, Bed, Crop, Crop+Variety, Cultivation, Monthly calendar"}
            accept=".csv"
            onUpload={handleTeeltplanUpload}
            status={teeltplanStatus}
            resultaat={teeltplanResultaat}
            taal={taal}
          />

          {/* Import modus selectie */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">
              {taal === 'nl' ? 'Import modus:' : 'Import mode:'}
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="teeltplanModus"
                  checked={teeltplanImportModus === 'merge'}
                  onChange={() => setTeeltplanImportModus('merge')}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {taal === 'nl' ? 'Samenvoegen (merge)' : 'Merge'}
                  </span>
                  <p className="text-xs text-gray-500">
                    {taal === 'nl'
                      ? 'Bestaande records bijwerken, nieuwe toevoegen, niets verwijderen'
                      : 'Update existing records, add new ones, delete nothing'}
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="teeltplanModus"
                  checked={teeltplanImportModus === 'replace'}
                  onChange={() => setTeeltplanImportModus('replace')}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {taal === 'nl' ? 'Vervangen (replace)' : 'Replace'}
                  </span>
                  <p className="text-xs text-orange-600">
                    {taal === 'nl'
                      ? 'Alle bestaande records verwijderen en vervangen. Handmatige notities gaan verloren.'
                      : 'Delete all existing records and replace. Manual notes will be lost.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Regenereer taken checkbox */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={regenereerTaken}
                onChange={e => setRegenereerTaken(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                {taal === 'nl'
                  ? 'Automatische taken opnieuw genereren na import'
                  : 'Regenerate automatic tasks after import'}
              </span>
            </label>
          </div>

          {/* Dry-run resultaten */}
          {teeltplanDryRun && pendingTeeltplanCSV && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">
                {taal === 'nl' ? 'Dry-run resultaten' : 'Dry-run results'}
              </h5>
              <div className="text-sm text-blue-700 space-y-1">
                <p>{taal === 'nl' ? 'Totaal CSV rijen' : 'Total CSV rows'}: {teeltplanDryRun.samenvatting.totaalCSV}</p>
                {teeltplanImportModus === 'merge' && (
                  <>
                    <p>{taal === 'nl' ? 'Exacte matches' : 'Exact matches'}: {teeltplanDryRun.samenvatting.exacteMatches}</p>
                    <p>{taal === 'nl' ? 'Groep matches' : 'Group matches'}: {teeltplanDryRun.samenvatting.groepMatches}</p>
                    <p>{taal === 'nl' ? 'Nieuwe records' : 'New records'}: {teeltplanDryRun.samenvatting.nieuweRecords}</p>
                    {teeltplanDryRun.samenvatting.gesplitst > 0 && (
                      <p className="text-orange-600">
                        {taal === 'nl' ? 'Gesplitste records' : 'Split records'}: {teeltplanDryRun.samenvatting.gesplitst}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleTeeltplanBevestig}
                  className="px-4 py-2 bg-tuin-600 text-white rounded-lg text-sm font-medium hover:bg-tuin-700 transition-colors"
                >
                  {taal === 'nl' ? 'Importeren' : 'Import'}
                </button>
                <button
                  onClick={() => { setPendingTeeltplanCSV(null); setTeeltplanDryRun(null); setTeeltplanResultaat(undefined); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  {taal === 'nl' ? 'Annuleren' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Gewassenlijst CSV Import */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <h4 className="text-sm font-medium text-gray-700">
              {taal === 'nl' ? 'Gewassenlijst Importeren' : 'Import Crop List'}
            </h4>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {taal === 'nl'
              ? 'Zaadbehoeften, opbrengst en leverancierslinks per variant'
              : 'Seed requirements, yield and supplier links per variety'}
          </p>

          <FileUpload
            titel="Gewassenlijst.csv"
            beschrijving={taal === 'nl'
              ? "Gewas+Soort, Gewas, Variant, Zaad, Opbrengst, Link"
              : "Crop+Variety, Crop, Variant, Seed, Yield, Link"}
            accept=".csv"
            onUpload={handleGewassenlijstUpload}
            status={gewassenlijstStatus}
            resultaat={gewassenlijstResultaat}
            taal={taal}
          />

          {/* Import modus selectie */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">
              {taal === 'nl' ? 'Import modus:' : 'Import mode:'}
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gewassenlijstModus"
                  checked={gewassenlijstImportModus === 'merge'}
                  onChange={() => setGewassenlijstImportModus('merge')}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {taal === 'nl' ? 'Samenvoegen (merge)' : 'Merge'}
                  </span>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gewassenlijstModus"
                  checked={gewassenlijstImportModus === 'replace'}
                  onChange={() => setGewassenlijstImportModus('replace')}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {taal === 'nl' ? 'Vervangen (replace)' : 'Replace'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Dry-run resultaten */}
          {gewassenlijstDryRun && pendingGewassenlijstCSV && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">
                {taal === 'nl' ? 'Dry-run resultaten' : 'Dry-run results'}
              </h5>
              <div className="text-sm text-blue-700 space-y-1">
                <p>{taal === 'nl' ? 'Totaal' : 'Total'}: {gewassenlijstDryRun.samenvatting.totaal}</p>
                <p>{taal === 'nl' ? 'Nieuw' : 'New'}: {gewassenlijstDryRun.samenvatting.nieuw}</p>
                <p>{taal === 'nl' ? 'Bijgewerkt' : 'Updated'}: {gewassenlijstDryRun.samenvatting.bijgewerkt}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleGewassenlijstBevestig}
                  className="px-4 py-2 bg-tuin-600 text-white rounded-lg text-sm font-medium hover:bg-tuin-700 transition-colors"
                >
                  {taal === 'nl' ? 'Importeren' : 'Import'}
                </button>
                <button
                  onClick={() => { setPendingGewassenlijstCSV(null); setGewassenlijstDryRun(null); setGewassenlijstResultaat(undefined); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  {taal === 'nl' ? 'Annuleren' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Taken CSV Import */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-tuin-600" />
            <h4 className="text-sm font-medium text-gray-700">
              {taal === 'nl' ? 'Taken Importeren' : 'Import Tasks'}
            </h4>
          </div>

          <FileUpload
            titel="Taken.csv"
            beschrijving={taal === 'nl'
              ? "Beschrijving, Type, Prioriteit, Deadline"
              : "Description, Type, Priority, Deadline"}
            accept=".csv"
            onUpload={handleTakenUpload}
            status={takenStatus}
            resultaat={takenResultaat}
            taal={taal}
          />
        </div>

        {/* Instructies CSV Import */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-700">
              {taal === 'nl' ? 'Werkwijzen / Instructies' : 'How-to / Instructions'}
            </h4>
          </div>

          <FileUpload
            titel="Instructies.csv"
            beschrijving={taal === 'nl'
              ? "Titel, Categorie, Instructie, Gewas, Tips"
              : "Title, Category, Instructions, Crop, Tips"}
            accept=".csv"
            onUpload={handleInstructiesUpload}
            status={instructiesStatus}
            resultaat={instructiesResultaat}
            taal={taal}
          />

          {state.data.instructies.length > 0 && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              {taal === 'nl'
                ? `${state.data.instructies.length} instructies geladen`
                : `${state.data.instructies.length} instructions loaded`}
            </div>
          )}
        </div>
      </div>

      {/* SECTIE 3: Import History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={() => setToonLogs(!toonLogs)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-800 w-full"
        >
          <History className="w-5 h-5 text-tuin-600" />
          {taal === 'nl' ? 'Import Geschiedenis' : 'Import History'}
          {toonLogs ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          {importLogs.length > 0 && (
            <span className="text-xs font-normal bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {importLogs.length}
            </span>
          )}
        </button>

        {toonLogs && (
          <div className="mt-4">
            <ImportLogViewer logs={importLogs} onClear={handleWisLogs} taal={taal} />
          </div>
        )}
      </div>

      {/* SECTIE 4: Synchronisatie & Integraties */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-tuin-600" />
          {taal === 'nl' ? 'Synchronisatie & Integraties' : 'Sync & Integrations'}
        </h3>

        {/* App info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-tuin-100 rounded-lg">
              <Info className="w-6 h-6 text-tuin-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">TuinPlanner</h4>
              <p className="text-gray-500 text-sm mb-1">Versie {state.data.versie}</p>
              <p className="text-xs text-gray-600">
                {taal === 'nl'
                  ? 'Een webapplicatie voor het plannen en coördineren van taken in de community tuin.'
                  : 'A web application for planning and coordinating tasks in the community garden.'}
              </p>
            </div>
          </div>
        </div>

        {/* Upload naar Firebase */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{taal === 'nl' ? 'Upload naar Firebase' : 'Upload to Firebase'}</p>
              <p className="text-sm text-gray-500">
                {taal === 'nl'
                  ? 'Eenmalig: upload alle lokale data naar Firebase'
                  : 'One-time: upload all local data to Firebase'}
              </p>
            </div>
            <button
              onClick={handleUploadNaarFirebase}
              disabled={state.ui.isSyncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {taal === 'nl' ? 'Uploaden' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Automatische taken */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">
            {taal === 'nl' ? 'Automatische Taken' : 'Automatic Tasks'}
          </h4>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">{taal === 'nl' ? 'Genereer taken uit teeltplan' : 'Generate tasks from plan'}</p>
              <p className="text-sm text-gray-500">
                {taal === 'nl'
                  ? 'Scan het teeltplan en maak taken aan voor alle periodes'
                  : 'Scan the plan and create tasks for all periods'}
              </p>
            </div>
            <button
              onClick={handleGenereerTaken}
              disabled={state.ui.isSyncing}
              className="px-4 py-2 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors disabled:opacity-50"
            >
              {taal === 'nl' ? 'Genereren' : 'Generate'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">{taal === 'nl' ? 'Opruimen oude taken' : 'Clean up old tasks'}</p>
              <p className="text-sm text-gray-500">
                {taal === 'nl'
                  ? 'Verwijder afgeronde automatische taken ouder dan 2 weken'
                  : 'Remove completed automatic tasks older than 2 weeks'}
              </p>
            </div>
            <button
              onClick={handleOpruimen}
              disabled={state.ui.isSyncing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {taal === 'nl' ? 'Opruimen' : 'Clean up'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="font-medium text-gray-800">{taal === 'nl' ? 'Wis alle automatische taken' : 'Delete all automatic tasks'}</p>
              <p className="text-sm text-gray-500">
                {taal === 'nl'
                  ? 'Verwijder alle taken uit het teeltplan. Handmatige taken blijven behouden.'
                  : 'Remove all tasks from cultivation plan. Manual tasks are kept.'}
              </p>
            </div>
            <button
              onClick={handleWisAutomatischeTaken}
              disabled={state.ui.isSyncing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {taal === 'nl' ? 'Wissen' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTIE 5: Zaadinkoop overzicht */}
      {zaadinkoop.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 text-lg mb-4">
            {taal === 'nl' ? `Zaadinkoop ${new Date().getFullYear()}` : `Seed Purchase ${new Date().getFullYear()}`}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">
                    {taal === 'nl' ? 'Variant' : 'Variety'}
                  </th>
                  <th className="text-right px-3 py-2 text-gray-600 font-medium">
                    {taal === 'nl' ? 'Opp' : 'Area'}
                  </th>
                  <th className="text-right px-3 py-2 text-gray-600 font-medium">
                    {taal === 'nl' ? 'Benodigd' : 'Required'}
                  </th>
                  <th className="text-center px-3 py-2 text-gray-600 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {zaadinkoop.map((rij, index) => (
                  <tr key={`${rij.variant}-${index}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="text-gray-800">{rij.variant}</div>
                    </td>
                    <td className="text-right px-3 py-2 text-gray-600">
                      {rij.oppervlakte.toLocaleString('nl-NL', { minimumFractionDigits: 1 })} m&sup2;
                    </td>
                    <td className="text-right px-3 py-2 text-gray-800 font-medium">
                      {rij.benodigdZaad !== null ? `~${rij.benodigdZaad} g` : '\u2014'}
                    </td>
                    <td className="text-center px-3 py-2">
                      {rij.link && (
                        <a
                          href={rij.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-tuin-600 hover:text-tuin-800 font-medium"
                        >
                          {taal === 'nl' ? 'Bestellen' : 'Order'}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTIE 6: Teeltcodes legenda */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 text-lg mb-4">
          {taal === 'nl' ? 'Teeltcodes Legenda' : 'Cultivation Codes Legend'}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { code: 'kz', beschrijving: taal === 'nl' ? 'Kas zaaien' : 'Greenhouse sowing' },
            { code: 'bz', beschrijving: taal === 'nl' ? 'Buiten zaaien' : 'Outdoor sowing' },
            { code: 'kvz', beschrijving: taal === 'nl' ? 'Kas voorzaaien' : 'Greenhouse pre-sowing' },
            { code: 'bvz', beschrijving: taal === 'nl' ? 'Buiten voorzaaien' : 'Outdoor pre-sowing' },
            { code: 'ku', beschrijving: taal === 'nl' ? 'Kas uitplanten' : 'Greenhouse transplanting' },
            { code: 'bu', beschrijving: taal === 'nl' ? 'Buiten uitplanten' : 'Outdoor transplanting' },
            { code: 'o', beschrijving: taal === 'nl' ? 'Oogsten' : 'Harvesting' },
            { code: 'x', beschrijving: taal === 'nl' ? 'Actief (onderhoud)' : 'Active (maintenance)' },
          ].map(({ code, beschrijving }) => (
            <div key={code} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <span className="font-mono font-bold text-tuin-600 w-8">{code}</span>
              <span className="text-sm text-gray-600">{beschrijving}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTIE 6: Vertalingen */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <Languages className="w-5 h-5 text-purple-600" />
          {taal === 'nl' ? 'Vertalingen (NL → EN)' : 'Translations (NL → EN)'}
        </h3>

        {/* API Status */}
        <div className={`mb-4 p-4 rounded-lg border ${
          isTranslationAvailable()
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTranslationAvailable() ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-green-700 font-medium">DeepL API {taal === 'nl' ? 'geconfigureerd' : 'configured'}</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-red-700 font-medium">DeepL API {taal === 'nl' ? 'NIET geconfigureerd' : 'NOT configured'}</span>
                </>
              )}
            </div>
            <button
              onClick={handleTestVertaling}
              disabled={isTesting || !isTranslationAvailable()}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {taal === 'nl' ? 'Testen...' : 'Testing...'}
                </>
              ) : (
                taal === 'nl' ? 'Test vertaling' : 'Test translation'
              )}
            </button>
          </div>

          {testResult && (
            <div className={`mt-3 p-2 rounded text-sm ${
              testResult.success
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {testResult.message}
            </div>
          )}
        </div>

        {/* Status van onvertaalde items */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-800 mb-2">{taal === 'nl' ? 'Onvertaalde items:' : 'Untranslated items:'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{taal === 'nl' ? 'Taken:' : 'Tasks:'}</span>
              <span className={onvertaald.taken > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>{onvertaald.taken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{taal === 'nl' ? 'Oogstlijst:' : 'Harvest:'}</span>
              <span className={onvertaald.oogst > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>{onvertaald.oogst}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{taal === 'nl' ? 'Instructies:' : 'Instructions:'}</span>
              <span className={onvertaald.instructies > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>{onvertaald.instructies}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{taal === 'nl' ? 'Berichten:' : 'Messages:'}</span>
              <span className={onvertaald.signalen > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>{onvertaald.signalen}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t flex justify-between">
            <span className="font-medium text-gray-800">{taal === 'nl' ? 'Totaal:' : 'Total:'}</span>
            <span className={onvertaald.totaal > 0 ? 'text-orange-600 font-bold' : 'text-green-600 font-bold'}>{onvertaald.totaal}</span>
          </div>
        </div>

        {/* Progress indicator */}
        {isTranslating && translationProgress.total > 0 && (
          <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="text-purple-700 font-medium">
                {taal === 'nl' ? `Bezig met vertalen van ${translationProgress.type}...` : `Translating ${translationProgress.type}...`}
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(translationProgress.current / translationProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-purple-600 mt-1">
              {translationProgress.current} / {translationProgress.total}
            </p>
          </div>
        )}

        {/* Batch vertaal knop */}
        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div>
            <p className="font-medium text-gray-800">{taal === 'nl' ? 'Alle teksten vertalen' : 'Translate all texts'}</p>
            <p className="text-sm text-gray-500">
              {taal === 'nl'
                ? 'Vertaal alle onvertaalde teksten naar Engels via DeepL'
                : 'Translate all untranslated texts to English via DeepL'}
            </p>
          </div>
          <button
            onClick={handleBatchVertalen}
            disabled={isTranslating || onvertaald.totaal === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {taal === 'nl' ? 'Vertalen...' : 'Translating...'}
              </>
            ) : (
              <>
                <Languages className="w-4 h-4" />
                {taal === 'nl' ? `Vertalen (${onvertaald.totaal})` : `Translate (${onvertaald.totaal})`}
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTIE 7: Sessie / Uitloggen */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <LogOut className="w-5 h-5 text-red-600" />
          {taal === 'nl' ? 'Sessie' : 'Session'}
        </h3>
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
          <div>
            <p className="font-medium text-gray-800">{taal === 'nl' ? 'Uitloggen' : 'Log out'}</p>
            <p className="text-sm text-gray-500">
              {taal === 'nl'
                ? 'Log uit en keer terug naar het inlogscherm'
                : 'Log out and return to login screen'}
            </p>
          </div>
          <button
            onClick={handleUitloggen}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {taal === 'nl' ? 'Uitloggen' : 'Log out'}
          </button>
        </div>
      </div>

      {/* DANGER ZONE - onderaan */}
      <div className="bg-red-50 rounded-lg shadow-sm p-6 border-2 border-red-200">
        <h3 className="font-semibold text-red-700 text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-red-800">
              {taal === 'nl' ? 'Alle data wissen' : 'Delete all data'}
            </h4>
            <p className="text-sm text-red-600 mb-3">
              {taal === 'nl'
                ? 'Dit verwijdert alle opgeslagen data inclusief bedden, gewassen, teeltplan en taken.'
                : 'This deletes all stored data including beds, crops, growing plan and tasks.'}
              <span className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <Lock className="w-3 h-3" />
                {taal === 'nl' ? 'Beveiligd met code' : 'Protected with code'}
              </span>
            </p>
            <button
              onClick={handleWisDataClick}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {taal === 'nl' ? 'Alles wissen' : 'Delete all'}
            </button>
          </div>
        </div>
      </div>

      {/* PIN Modal voor "Alles wissen" */}
      {toonWisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Lock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  {taal === 'nl' ? 'Weet je het zeker?' : 'Are you sure?'}
                </h3>
                <p className="text-sm text-gray-500">
                  {taal === 'nl' ? 'Dit verwijdert alle lokale data' : 'This will delete all local data'}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {taal === 'nl' 
                ? 'Type "alles wissen" om te bevestigen:' 
                : 'Type "alles wissen" to confirm:'}
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleWisDataBevestig(); }}>
              <input
                type="text"
                value={wisBevestiging}
                onChange={(e) => setWisBevestiging(e.target.value)}
                placeholder="alles wissen"
                className="w-full px-4 py-3 text-center border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                autoFocus
                autoComplete="off"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setToonWisModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {taal === 'nl' ? 'Annuleren' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={wisBevestiging.toLowerCase() !== WIS_BEVESTIGING_TEKST}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  {taal === 'nl' ? 'Bevestigen' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
