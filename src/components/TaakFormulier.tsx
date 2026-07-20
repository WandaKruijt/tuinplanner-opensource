import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Save, Sprout, Scissors, Leaf, Wrench, HelpCircle, CheckCircle, User, MessageSquare, Link, Camera, Loader2, AlertTriangle, Play, ChevronLeft, ChevronRight, CalendarRange, MapPin, Info } from 'lucide-react';
import type { Taak, TaakType, TaakPrioriteit, TaakStatus, Sectie, AdHocProbleem } from '../types';
import { useApp, useBedden } from '../context/AppContext';
import { nuISO, vandaagISO } from '../utils/dateUtils';
import { SECTIES, ADHOC_PROBLEMEN } from '../types';
import { useI18n } from '../i18n';
import { vertaalBatch } from '../services/translationService';
import { uploadMultipleFotos } from '../services/storageService';
import { formateerBestandsgrootte } from '../utils/imageUtils';
import { getTaakFotos, MAX_FOTOS_PER_TAAK } from '../utils/fotoUtils';

// ============================================
// AUTO-RESIZE TEXTAREA HOOK
// ============================================

function useAutoResize(minRows: number = 2) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const textarea = ref.current;
    if (textarea) {
      // Reset height to calculate scrollHeight correctly
      textarea.style.height = 'auto';
      // Calculate line height based on computed style
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const minHeight = lineHeight * minRows + 24; // 24 for padding
      const newHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [minRows]);

  useEffect(() => {
    resize();
  }, [resize]);

  return { ref, resize };
}

// ============================================
// TAAK TYPE ICONEN
// ============================================

export const TAAK_TYPE_ICONEN: Record<TaakType, React.ReactNode> = {
  Zaaien: <Sprout className="w-5 h-5" />,
  Planten: <Leaf className="w-5 h-5" />,
  Oogsten: <Scissors className="w-5 h-5" />,
  Onderhoud: <Wrench className="w-5 h-5" />,
  Overig: <HelpCircle className="w-5 h-5" />,
};

// ============================================
// PROPS
// ============================================

interface TaakFormulierProps {
  taak?: Taak;
  isAdHoc?: boolean;
  adHocProbleem?: AdHocProbleem;
  onOpslaan: (taak: Taak) => void;
  onAnnuleren: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function TaakFormulier({
  taak,
  isAdHoc = false,
  adHocProbleem,
  onOpslaan,
  onAnnuleren
}: TaakFormulierProps) {
  const bedden = useBedden();
  const { dispatch, saveTaak: saveTaakContext } = useApp();
  const { t, taal } = useI18n();

  // Type labels mapping
  const typeLabels: Record<TaakType, string> = {
    Zaaien: t.tasks.types.sowing,
    Planten: t.tasks.types.planting,
    Oogsten: t.tasks.types.harvesting,
    Onderhoud: t.tasks.types.maintenance,
    Overig: t.tasks.types.other,
  };

  // Priority labels mapping
  const priorityLabels: Record<TaakPrioriteit, string> = {
    Hoog: t.tasks.priorities.high,
    Normaal: t.tasks.priorities.normal,
    Laag: t.tasks.priorities.low,
  };

  // Status labels mapping
  const statusLabels: Record<TaakStatus, string> = {
    Open: t.tasks.statuses.open,
    'In uitvoering': t.tasks.statuses.inProgress,
    Afgerond: t.tasks.statuses.completed,
    Gearchiveerd: taal === 'nl' ? 'Gearchiveerd' : 'Archived',
  };

  // Form state
  const [beschrijving, setBeschrijving] = useState(taak?.beschrijving || '');
  const [sectie, setSectie] = useState<Sectie | ''>(taak?.sectie || '');
  const [bedId, setBedId] = useState(taak?.bedId || '');
  const [type, setType] = useState<TaakType>(taak?.type || (isAdHoc ? 'Onderhoud' : 'Overig'));
  const [prioriteit, setPrioriteit] = useState<TaakPrioriteit>(taak?.prioriteit || 'Normaal');
  const [status, setStatus] = useState<TaakStatus>(taak?.status || 'Open');
  const [startdatum, setStartdatum] = useState(
    taak?.startdatum || (taak?.aangemaakt ? taak.aangemaakt.split('T')[0] : vandaagISO())
  );
  const [deadline, setDeadline] = useState(taak?.deadline || vandaagISO());
  const [scheduledWeek, setScheduledWeek] = useState<number | undefined>(taak?.scheduledWeek);
  const [commentaar, setCommentaar] = useState(taak?.commentaar || '');
  const [instructies, setInstructies] = useState(taak?.instructies || '');
  const [isHerhalend, setIsHerhalend] = useState(taak?.isHerhalend || false);

  // Lokale state voor assignedTo (zodat verwijderen personen werkt zonder modal te sluiten)
  const [localAssignedTo, setLocalAssignedTo] = useState<string[] | undefined>(
    taak?.assignedTo ? (Array.isArray(taak.assignedTo) ? taak.assignedTo : [taak.assignedTo]) : undefined
  );

  // Sync localAssignedTo en status met taak prop wanneer deze verandert (bijv. door Firebase sync)
  useEffect(() => {
    const newAssignedTo = taak?.assignedTo
      ? (Array.isArray(taak.assignedTo) ? taak.assignedTo : [taak.assignedTo])
      : undefined;
    setLocalAssignedTo(newAssignedTo);
    // Ook status syncen als deze veranderd is
    if (taak?.status) {
      setStatus(taak.status);
    }
  }, [taak?.assignedTo, taak?.status]);

  // Foto state (multi-foto)
  const [fotoUrls, setFotoUrls] = useState<string[]>(() => getTaakFotos(taak));
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize hooks voor textareas
  const beschrijvingTextarea = useAutoResize(3);
  const commentaarTextarea = useAutoResize(2);

  // Filter bedden op sectie
  const gefilterdeBedden = sectie
    ? bedden.filter(b => b.sectie === sectie)
    : bedden;

  // Update beschrijving als ad-hoc probleem wijzigt
  useEffect(() => {
    if (isAdHoc && adHocProbleem && !taak) {
      setBeschrijving(adHocProbleem === 'Overig' ? '' : adHocProbleem);
      setType('Onderhoud');
    }
  }, [adHocProbleem, isAdHoc, taak]);

  // State voor saving
  const [isSaving, setIsSaving] = useState(false);

  // State voor unsaved changes dialoog
  const [toonUnsavedChangesDialoog, setToonUnsavedChangesDialoog] = useState(false);

  // Detecteer of er onopgeslagen wijzigingen zijn
  const hasUnsavedChanges = useMemo(() => {
    const origBeschrijving = taak?.beschrijving || '';
    const origSectie = taak?.sectie || '';
    const origBedId = taak?.bedId || '';
    const origType = taak?.type || (isAdHoc ? 'Onderhoud' : 'Overig');
    const origPrioriteit = taak?.prioriteit || 'Normaal';
    const origStatus = taak?.status || 'Open';
    const origStartdatum = taak?.startdatum || vandaagISO();
    const origDeadline = taak?.deadline || vandaagISO();
    const origCommentaar = taak?.commentaar || '';
    const origInstructies = taak?.instructies || '';
    const origFotoUrls = JSON.stringify(getTaakFotos(taak));
    const origIsHerhalend = taak?.isHerhalend || false;

    return (
      beschrijving !== origBeschrijving ||
      sectie !== origSectie ||
      bedId !== origBedId ||
      type !== origType ||
      prioriteit !== origPrioriteit ||
      status !== origStatus ||
      startdatum !== origStartdatum ||
      deadline !== origDeadline ||
      commentaar !== origCommentaar ||
      instructies !== origInstructies ||
      JSON.stringify(fotoUrls) !== origFotoUrls ||
      selectedFiles.length > 0 ||
      isHerhalend !== origIsHerhalend
    );
  }, [beschrijving, sectie, bedId, type, prioriteit, status, startdatum, deadline, commentaar, instructies, fotoUrls, selectedFiles, taak, isAdHoc, isHerhalend]);

  // Handler voor sluiten met check op unsaved changes
  const handleSluitenMetCheck = () => {
    if (hasUnsavedChanges) {
      setToonUnsavedChangesDialoog(true);
    } else {
      onAnnuleren();
    }
  };

  // Handler voor annuleren zonder opslaan
  const handleAnnulerenZonderOpslaan = () => {
    setToonUnsavedChangesDialoog(false);
    onAnnuleren();
  };

  // Handler voor opslaan en sluiten vanuit dialoog
  const handleOpslaanEnSluiten = async () => {
    setToonUnsavedChangesDialoog(false);
    // Trigger form submit
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  // Foto handlers (multi-foto)
  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setFotoError(null);

    const huidigeAantal = fotoUrls.length + fotoPreviews.length;
    const beschikbaar = MAX_FOTOS_PER_TAAK - huidigeAantal;
    const teVerwerken = files.slice(0, beschikbaar);

    const nieuwePreviews: string[] = [];
    const nieuweFiles: File[] = [];

    teVerwerken.forEach((file: File) => {
      if (file.size > 10 * 1024 * 1024) return; // Max 10MB per bestand
      if (!file.type.startsWith('image/')) return;
      nieuwePreviews.push(URL.createObjectURL(file));
      nieuweFiles.push(file);
    });

    if (nieuweFiles.length === 0 && teVerwerken.length > 0) {
      setFotoError(taal === 'nl'
        ? 'Bestanden zijn te groot of ongeldig type (max 10MB, alleen afbeeldingen).'
        : 'Files are too large or invalid type (max 10MB, images only).');
      return;
    }

    setFotoPreviews(prev => [...prev, ...nieuwePreviews]);
    setSelectedFiles(prev => [...prev, ...nieuweFiles]);
    e.target.value = '';
  };

  const handleFotoVerwijderen = (index: number) => {
    const totaalBestaand = fotoUrls.length;
    if (index < totaalBestaand) {
      // Verwijder bestaande foto URL
      setFotoUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      // Verwijder nieuwe preview/file
      const previewIndex = index - totaalBestaand;
      setFotoPreviews(prev => prev.filter((_, i) => i !== previewIndex));
      setSelectedFiles(prev => prev.filter((_, i) => i !== previewIndex));
    }
  };

  // Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!beschrijving.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      // Genereer taak ID voor nieuwe taken (nodig voor foto upload)
      const taakId = taak?.id || `taak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Upload foto's als er nieuwe zijn geselecteerd
      let nieuweFotoUrls = [...fotoUrls];
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        try {
          const geupload = await uploadMultipleFotos(selectedFiles, 'taken', taakId);
          nieuweFotoUrls = [...nieuweFotoUrls, ...geupload];
        } catch (uploadError) {
          console.error('Foto upload mislukt:', uploadError);
          setFotoError(taal === 'nl'
            ? 'Foto upload mislukt. Taak wordt opgeslagen zonder nieuwe foto\'s.'
            : 'Photo upload failed. Task will be saved without new photos.');
          // Behoud bestaande foto's
        } finally {
          setIsUploading(false);
        }
      }

      // Verzamel teksten die vertaald moeten worden
      const tekstenOmTeVertalen = [
        beschrijving.trim(),
        instructies.trim(),
        commentaar
      ];

      // Vertaal naar Engels (in batch voor efficiëntie)
      const vertalingen = await vertaalBatch(tekstenOmTeVertalen);

      // Escalatie-reset: als deadline is gewijzigd en taak was auto-ge-escaleerd, herstel originele prioriteit
      const isDeadlineGewijzigd = taak && deadline !== taak.deadline;
      const resetEscalatie = isDeadlineGewijzigd && taak?.isAutoEscalated;
      const effectievePrioriteit = resetEscalatie ? (taak?.origPrioriteit || prioriteit) : prioriteit;

      const nieuweTaak: Taak = {
        id: taakId,
        beschrijving: beschrijving.trim(),
        sectie,
        bedId,
        type,
        prioriteit: effectievePrioriteit,
        status,
        startdatum,
        deadline,
        aangemaakt: taak?.aangemaakt || nuISO(),
        gewijzigd: nuISO(),
        isAutomatisch: taak?.isAutomatisch || false,
        bronGewas: taak?.bronGewas,
        bronTeeltCode: taak?.bronTeeltCode,
        instructies: instructies.trim() || undefined,
        commentaar,
        isAdHoc: isAdHoc || taak?.isAdHoc || false,
        adHocProbleem: isAdHoc ? adHocProbleem : taak?.adHocProbleem,
        fotoUrls: nieuweFotoUrls.length > 0 ? nieuweFotoUrls : undefined,
        communityZichtbaar: taak?.communityZichtbaar ?? true,
        // Behoud bestaande velden die niet in het formulier worden bewerkt
        communityNotities: taak?.communityNotities,
        // Gebruik localAssignedTo (kan gewijzigd zijn door verwijderen) i.p.v. originele taak.assignedTo
        assignedTo: localAssignedTo,
        assignedAt: localAssignedTo && localAssignedTo.length > 0 ? taak?.assignedAt : undefined,
        afgerondDoor: taak?.afgerondDoor,
        afgerondOp: taak?.afgerondOp,
        bedIds: taak?.bedIds,
        // Behoud venster-velden voor automatische taken
        windowStart: taak?.windowStart,
        windowEnd: taak?.windowEnd,
        scheduledWeek: scheduledWeek ?? taak?.scheduledWeek, // Gebruik lokale state indien gewijzigd
        locatie: taak?.locatie,
        isOverdue: taak?.isOverdue,
        jaar: taak?.jaar,
        deelVanBed: taak?.deelVanBed,
        // Herhaling
        isHerhalend: isHerhalend || undefined,
        einddatumHerhaling: isHerhalend ? deadline : undefined,
        afgevinktWeeks: taak?.afgevinktWeeks,
        // Escalatie: reset als deadline is gewijzigd, anders behouden
        isAutoEscalated: resetEscalatie ? undefined : taak?.isAutoEscalated,
        origPrioriteit: resetEscalatie ? undefined : taak?.origPrioriteit,
      };

      // Voeg vertalingen toe - gebruik nieuwe vertaling of behoud bestaande
      nieuweTaak.beschrijving_en = vertalingen[0] || taak?.beschrijving_en;
      nieuweTaak.instructies_en = vertalingen[1] || taak?.instructies_en;
      nieuweTaak.commentaar_en = vertalingen[2] || taak?.commentaar_en;

      onOpslaan(nieuweTaak);
    } catch (error) {
      console.error('Fout bij opslaan taak:', error);
      // Bij fout toch opslaan - behoud bestaande vertalingen
      const isDeadlineGewijzigdErr = taak && deadline !== taak.deadline;
      const resetEscalatieErr = isDeadlineGewijzigdErr && taak?.isAutoEscalated;
      const effectievePrioriteitErr = resetEscalatieErr ? (taak?.origPrioriteit || prioriteit) : prioriteit;

      const nieuweTaak: Taak = {
        id: taak?.id || `taak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        beschrijving: beschrijving.trim(),
        sectie,
        bedId,
        type,
        prioriteit: effectievePrioriteitErr,
        status,
        startdatum,
        deadline,
        aangemaakt: taak?.aangemaakt || nuISO(),
        gewijzigd: nuISO(),
        isAutomatisch: taak?.isAutomatisch || false,
        bronGewas: taak?.bronGewas,
        bronTeeltCode: taak?.bronTeeltCode,
        instructies: instructies.trim() || undefined,
        commentaar,
        isAdHoc: isAdHoc || taak?.isAdHoc || false,
        adHocProbleem: isAdHoc ? adHocProbleem : taak?.adHocProbleem,
        fotoUrls: fotoUrls.length > 0 ? fotoUrls : undefined,
        communityZichtbaar: taak?.communityZichtbaar ?? true,
        // Behoud bestaande velden die niet in het formulier worden bewerkt
        communityNotities: taak?.communityNotities,
        // Gebruik localAssignedTo (kan gewijzigd zijn door verwijderen) i.p.v. originele taak.assignedTo
        assignedTo: localAssignedTo,
        assignedAt: localAssignedTo && localAssignedTo.length > 0 ? taak?.assignedAt : undefined,
        afgerondDoor: taak?.afgerondDoor,
        afgerondOp: taak?.afgerondOp,
        bedIds: taak?.bedIds,
        // Behoud bestaande vertalingen bij fout
        beschrijving_en: taak?.beschrijving_en,
        instructies_en: taak?.instructies_en,
        commentaar_en: taak?.commentaar_en,
        // Behoud venster-velden voor automatische taken
        windowStart: taak?.windowStart,
        windowEnd: taak?.windowEnd,
        scheduledWeek: scheduledWeek ?? taak?.scheduledWeek, // Gebruik lokale state indien gewijzigd
        locatie: taak?.locatie,
        isOverdue: taak?.isOverdue,
        jaar: taak?.jaar,
        deelVanBed: taak?.deelVanBed,
        // Herhaling
        isHerhalend: isHerhalend || undefined,
        einddatumHerhaling: isHerhalend ? deadline : undefined,
        afgevinktWeeks: taak?.afgevinktWeeks,
        // Escalatie
        isAutoEscalated: resetEscalatieErr ? undefined : taak?.isAutoEscalated,
        origPrioriteit: resetEscalatieErr ? undefined : taak?.origPrioriteit,
      };
      onOpslaan(nieuweTaak);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={(e) => {
        // Sluit modal als er buiten geklikt wordt
        if (e.target === e.currentTarget) {
          handleSluitenMetCheck();
        }
      }}
      onKeyDown={(e) => {
        // Sluit modal met Escape toets
        if (e.key === 'Escape') {
          handleSluitenMetCheck();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden my-4 box-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-tuin-800">
            {taak ? t.form.editTask : isAdHoc ? t.form.quickTask : t.form.newTask}
          </h2>
          <button
            onClick={handleSluitenMetCheck}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Beschrijving */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.form.descriptionRequired}
            </label>
            <textarea
              ref={beschrijvingTextarea.ref}
              value={beschrijving}
              onChange={(e) => {
                setBeschrijving(e.target.value);
                beschrijvingTextarea.resize();
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none overflow-hidden"
              placeholder={t.form.descriptionPlaceholder}
              required
            />
          </div>

          {/* Sectie en Bed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.form.section}
              </label>
              <select
                value={sectie}
                onChange={(e) => {
                  setSectie(e.target.value as Sectie | '');
                  setBedId('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              >
                <option value="">{t.form.noSection}</option>
                {SECTIES.map(s => (
                  <option key={s} value={s}>{t.sections[s] || `${t.form.section} ${s}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.form.bed}
              </label>
              <select
                value={bedId}
                onChange={(e) => setBedId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
                disabled={!sectie}
              >
                <option value="">{t.form.noBed}</option>
                {gefilterdeBedden.map(b => (
                  <option key={b.id} value={b.id}>{b.id}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.form.taskType}
            </label>
            <div className="flex flex-wrap gap-2">
              {(['Zaaien', 'Planten', 'Oogsten', 'Onderhoud', 'Overig'] as TaakType[]).map(taakType => (
                <button
                  key={taakType}
                  type="button"
                  onClick={() => setType(taakType)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                    ${type === taakType
                      ? 'border-tuin-500 bg-tuin-50 text-tuin-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {TAAK_TYPE_ICONEN[taakType]}
                  <span className="text-sm font-medium">{typeLabels[taakType]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prioriteit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.form.priority}
            </label>
            <div className="flex gap-2">
              {(['Hoog', 'Normaal', 'Laag'] as TaakPrioriteit[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioriteit(p)}
                  className={`
                    flex-1 py-2 rounded-lg border-2 font-medium transition-all
                    ${prioriteit === p
                      ? p === 'Hoog'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : p === 'Normaal'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Status (alleen bij bewerken) */}
          {taak && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.form.status}
              </label>
              <div className="flex gap-2">
                {(['Open', 'In uitvoering', 'Afgerond'] as TaakStatus[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`
                      flex-1 py-2 rounded-lg border-2 font-medium transition-all text-sm
                      ${status === s
                        ? s === 'Afgerond'
                          ? 'border-tuin-500 bg-tuin-50 text-tuin-700'
                          : s === 'In uitvoering'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-500 bg-gray-50 text-gray-700'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Startdatum en Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.form.startDate}
              </label>
              <input
                type="date"
                value={startdatum}
                onChange={(e) => setStartdatum(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isHerhalend ? t.form.deadlineRepeat : t.form.deadline}
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={startdatum}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              />
            </div>
          </div>

          {/* Aangemaakt datum (read-only, alleen bij bestaande taak) */}
          {taak?.aangemaakt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarRange className="w-4 h-4" />
              <span>
                {t.form.createdAt}:{' '}
                {new Date(taak.aangemaakt).toLocaleDateString(
                  taal === 'nl' ? 'nl-NL' : 'en-GB',
                  { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                )}
              </span>
            </div>
          )}

          {/* Wekelijks herhalend (alleen voor niet-automatische taken) */}
          {!taak?.isAutomatisch && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHerhalend}
                  onChange={(e) => setIsHerhalend(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-tuin-600 focus:ring-tuin-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t.form.weeklyRecurring}
                </span>
              </label>

            </div>
          )}

          {/* Planning-blok voor venster-taken (US-3, US-4, US-8) */}
          {taak?.isAutomatisch && taak?.windowStart !== undefined && taak?.windowEnd !== undefined && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <CalendarRange className="w-5 h-5" />
                <span>{taal === 'nl' ? 'Planning' : 'Planning'}</span>
              </div>

              {/* Venster info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarRange className="w-4 h-4 text-blue-500" />
                  <span>{taal === 'nl' ? 'Venster' : 'Window'}: <span className="font-medium text-gray-800">wk {taak.windowStart} → {taak.windowEnd}</span></span>
                </div>
                {taak.locatie && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>{taal === 'nl' ? 'Locatie' : 'Location'}: <span className="font-medium text-gray-800 capitalize">{taak.locatie}</span></span>
                  </div>
                )}
              </div>

              {/* Variant info (als variant verschilt van gewas) */}
              {taak.bronGewasSoort && taak.bronGewasSoort !== taak.bronGewas && (
                <div className="text-sm text-gray-600">
                  <span className="text-gray-500">{taal === 'nl' ? 'Variant' : 'Variety'}:</span>{' '}
                  <span className="font-medium text-gray-800">{taak.bronGewasSoort}</span>
                </div>
              )}

              {/* Deel van bed info */}
              {taak.deelVanBed && taak.deelVanBed !== 'Heel bed' && (
                <div className="text-sm text-gray-600">
                  <span className="text-gray-500">{taal === 'nl' ? 'Positie' : 'Position'}:</span>{' '}
                  <span className="font-medium text-gray-800">{taak.deelVanBed}</span>
                </div>
              )}

              {/* Verschuifknoppen */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{taal === 'nl' ? 'Gepland' : 'Scheduled'}:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setScheduledWeek((prev) => Math.max((prev ?? taak.windowStart!) - 1, taak.windowStart!))}
                    disabled={(scheduledWeek ?? taak.scheduledWeek ?? taak.windowStart) === taak.windowStart}
                    className="p-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title={taal === 'nl' ? 'Week eerder' : 'Week earlier'}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-800 min-w-[80px] text-center">
                    Week {scheduledWeek ?? taak.scheduledWeek ?? taak.windowStart}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScheduledWeek((prev) => Math.min((prev ?? taak.windowStart!) + 1, taak.windowEnd!))}
                    disabled={(scheduledWeek ?? taak.scheduledWeek ?? taak.windowStart) === taak.windowEnd}
                    className="p-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title={taal === 'nl' ? 'Week later' : 'Week later'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Hint */}
              <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-100/50 rounded px-2 py-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  {taal === 'nl'
                    ? `Verschuifbaar tussen week ${taak.windowStart} en ${taak.windowEnd}`
                    : `Adjustable between week ${taak.windowStart} and ${taak.windowEnd}`}
                </span>
              </div>

              {/* Verlopen waarschuwing */}
              {taak.isOverdue && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {taal === 'nl'
                      ? 'Let op: het venster voor deze taak is verlopen!'
                      : 'Warning: the window for this task has expired!'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Foto Upload (multi-foto) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Camera className="w-4 h-4 inline mr-1" />
              {taal === 'nl' ? "Foto's toevoegen" : 'Add photos'}
              <span className="text-gray-400 font-normal ml-1">
                ({taal === 'nl' ? 'optioneel' : 'optional'})
              </span>
            </label>

            {/* Teller */}
            <p className="text-xs text-gray-500 mb-2">
              {fotoUrls.length + fotoPreviews.length}/{MAX_FOTOS_PER_TAAK} {taal === 'nl' ? "foto's" : 'photos'}
            </p>

            {/* Grid van foto's + toevoeg-knop */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {/* Bestaande foto's */}
              {fotoUrls.map((url, index) => (
                <div key={`existing-${index}`} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`${taal === 'nl' ? 'Foto' : 'Photo'} ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleFotoVerwijderen(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title={taal === 'nl' ? 'Foto verwijderen' : 'Remove photo'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Nieuwe previews */}
              {fotoPreviews.map((preview, index) => (
                <div key={`preview-${index}`} className="relative aspect-square">
                  <img
                    src={preview}
                    alt={`${taal === 'nl' ? 'Nieuwe foto' : 'New photo'} ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border-2 border-tuin-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleFotoVerwijderen(fotoUrls.length + index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title={taal === 'nl' ? 'Foto verwijderen' : 'Remove photo'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Toevoeg-knop (als er ruimte is) */}
              {fotoUrls.length + fotoPreviews.length < MAX_FOTOS_PER_TAAK && (
                <label
                  htmlFor="foto-upload"
                  className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-tuin-500 hover:bg-tuin-50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-tuin-600" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">
                        {taal === 'nl' ? 'Toevoegen' : 'Add'}
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Verborgen file input */}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFotoSelect}
              className="hidden"
              id="foto-upload"
            />

            {/* Nieuwe bestanden geselecteerd - toon info */}
            {selectedFiles.length > 0 && (
              <p className="text-xs text-tuin-600 mt-1">
                {selectedFiles.length} {taal === 'nl' ? 'nieuwe foto\'s geselecteerd' : 'new photos selected'}
                {' ('}
                {formateerBestandsgrootte(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                {') - '}
                {taal === 'nl' ? 'worden gecomprimeerd bij opslaan' : 'will be compressed on save'}
              </p>
            )}

            {/* Error message */}
            {fotoError && (
              <p className="text-xs text-red-600 mt-1">{fotoError}</p>
            )}

            <p className="text-xs text-gray-500 mt-1">
              {taal === 'nl'
                ? `Max ${MAX_FOTOS_PER_TAAK} foto's, max 10MB per foto. Worden automatisch verkleind.`
                : `Max ${MAX_FOTOS_PER_TAAK} photos, max 10MB per photo. Will be automatically resized.`}
            </p>
          </div>

          {/* Commentaar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.form.notes}
            </label>
            <textarea
              ref={commentaarTextarea.ref}
              value={commentaar}
              onChange={(e) => {
                setCommentaar(e.target.value);
                commentaarTextarea.resize();
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 resize-none overflow-hidden"
              placeholder={t.form.notesPlaceholder}
            />
          </div>

          {/* Instructies URL (alleen bij nieuwe/bewerkte taak, niet ad-hoc) */}
          {!isAdHoc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Link className="w-4 h-4 inline mr-1" />
                {taal === 'nl' ? 'Link naar instructie of tip' : 'Link to instruction or tip'}
                <span className="text-gray-400 font-normal ml-1">
                  ({taal === 'nl' ? 'optioneel' : 'optional'})
                </span>
              </label>
              <input
                type="url"
                value={instructies}
                onChange={(e) => setInstructies(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
                placeholder={taal === 'nl'
                  ? 'https://youtube.com/... of website URL'
                  : 'https://youtube.com/... or website URL'}
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
                  ? 'Voeg een link toe naar een video of website met extra uitleg'
                  : 'Add a link to a video or website with extra instructions'}
              </p>
            </div>
          )}

          {/* Automatisch label */}
          {taak?.isAutomatisch && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <Sprout className="w-4 h-4" />
              <span>
                {t.form.autoGenerated}: {taak.bronGewas}
              </span>
            </div>
          )}

          {/* Community notities (alleen tonen, niet bewerken) */}
          {taak?.communityNotities && taak.communityNotities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                {t.form.communityNotes} ({taak.communityNotities.length})
              </label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {taak.communityNotities.map(notitie => (
                  <div key={notitie.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <User className="w-3 h-3" />
                      <span className="font-medium text-amber-700">{notitie.auteur}</span>
                      <span>•</span>
                      <span>{new Date(notitie.aangemaakt).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{notitie.tekst}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bezig met taak info (meerdere personen mogelijk) - commissie kan verwijderen */}
          {taak && (status === 'In uitvoering' || localAssignedTo && localAssignedTo.length > 0) && localAssignedTo && localAssignedTo.length > 0 && (
            <div className="bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2 text-sm">
                <Play className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <span className="text-amber-700 font-medium">
                    {t.tasks.workingBy}:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {localAssignedTo.map((naam, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-sm">
                        {naam}
                        <button
                          type="button"
                          onClick={async () => {
                            const newAssigned = localAssignedTo.filter(n => n !== naam);
                            const newStatus = newAssigned.length > 0 ? 'In uitvoering' : 'Open';

                            // Update lokale state zodat UI direct bijwerkt
                            setLocalAssignedTo(newAssigned.length > 0 ? newAssigned : undefined);
                            setStatus(newStatus as TaakStatus);

                            // Update ook in database zonder modal te sluiten
                            const updatedTaak: Taak = {
                              ...taak,
                              assignedTo: newAssigned.length > 0 ? newAssigned : undefined,
                              assignedAt: newAssigned.length > 0 ? taak.assignedAt : undefined,
                              status: newStatus as TaakStatus,
                              gewijzigd: nuISO()
                            };
                            dispatch({ type: 'UPDATE_TAAK', payload: updatedTaak });
                            await saveTaakContext(updatedTaak);
                          }}
                          className="text-amber-600 hover:text-amber-800 hover:bg-amber-200 rounded-full p-0.5"
                          title={taal === 'nl' ? 'Verwijderen' : 'Remove'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {taak.assignedAt && (
                    <span className="text-amber-600 text-xs block mt-1">
                      {taal === 'nl' ? 'Gestart op' : 'Started at'}: {new Date(taak.assignedAt).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Afgerond info */}
          {taak?.status === 'Afgerond' && taak?.afgerondDoor && (
            <div className="flex items-center gap-2 text-sm bg-tuin-50 px-3 py-2 rounded-lg border border-tuin-200">
              <CheckCircle className="w-4 h-4 text-tuin-600" />
              <div className="flex-1">
                <span className="text-tuin-700 font-medium">
                  {t.form.completedBy} {taak.afgerondDoor}
                </span>
                {taak.afgerondOp && (
                  <span className="text-tuin-600 ml-2">
                    {t.form.completedOn} {new Date(taak.afgerondOp).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSluitenMetCheck}
              disabled={isSaving}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t.form.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving
                ? (taal === 'nl' ? 'Vertalen...' : 'Translating...')
                : t.form.save}
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
