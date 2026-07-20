import { useState, useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  Wrench,
  MessageSquare,
  Sprout,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Pin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { vertaalBatch } from '../services/translationService';
import { berekenDynamischePrioriteit } from '../utils/taskGenerator';
import { TEELTCODE_ACTIES, TEELTCODE_ACTIES_EN } from '../types';
import type { Taak, TaakgroepOverride, TeeltCode } from '../types';
import { usePinnedTasks } from '../hooks/usePinnedTasks';

export interface TaakGroep {
  sleutel: string;
  actie: string;
  gewas: string;
  taken: Taak[];
}

interface GegroepeerdeTeeltplanTakenProps {
  taken: Taak[];
  isCommissie: boolean;
  jaar: number;
  toonWeekNummer?: boolean;
  onTaakOpen: (taak: Taak) => void;
  onTaakAfvinken: (taak: Taak) => void;
  onTaakHeropenen: (taak: Taak) => void;
  onVerschuifWeek: (taak: Taak, richting: -1 | 1) => void;
  onPubliceer?: (taken: Taak[]) => void;
  onDepubliceer?: (taken: Taak[]) => void;
  onGroepVerwijder?: (taken: Taak[]) => void;
  // 'pinned' = render alleen groepen met gepinde sleutel,
  // 'rest' = render alleen niet-gepinde groepen,
  // undefined/'all' = render alles (default).
  filterMode?: 'pinned' | 'rest' | 'all';
  // Aangepaste kop-titel voor de blok (bv. "Vastgepind").
  kopTitel?: string;
}

export function GegroepeerdeTeeltplanTaken({ taken, isCommissie, jaar, toonWeekNummer, onTaakOpen, onTaakAfvinken, onTaakHeropenen, onVerschuifWeek, onPubliceer, onDepubliceer, onGroepVerwijder, filterMode = 'all', kopTitel }: GegroepeerdeTeeltplanTakenProps) {
  const { taal, t } = useI18n();
  const { saveTaakgroepOverride, deleteTaakgroepOverride, toonToast, state } = useApp();
  const taakgroepOverrides = state.data.taakgroepOverrides;
  const { isPinned, togglePin } = usePinnedTasks();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitel, setEditTitel] = useState('');
  const [editNotitie, setEditNotitie] = useState('');
  const [editAantalItems, setEditAantalItems] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Sleutel-prefix voor groep-pins zodat ze niet botsen met losse taak-pins.
  const groepPinKey = (sleutel: string) => `groep:${sleutel}`;

  const overrideMap = useMemo(() => {
    const map = new Map<string, TaakgroepOverride>();
    taakgroepOverrides
      .filter(o => o.jaar === jaar)
      .forEach(o => map.set(o.groepKey, o));
    return map;
  }, [taakgroepOverrides, jaar]);

  const sanitizeFirebaseKey = (key: string) => key.replace(/[.#$\[\]\/]/g, '_');

  const handleStartEdit = (groepKey: string, defaultTitel: string) => {
    const existing = overrideMap.get(groepKey);
    setEditingKey(groepKey);
    setEditTitel(existing?.customTitel || defaultTitel);
    setEditNotitie(existing?.notitie || '');
    setEditAantalItems(existing?.aantalItems !== undefined ? String(existing.aantalItems) : '');
  };

  const handleSaveOverride = async (groepKey: string) => {
    const titel = editTitel.trim();
    const notitie = editNotitie.trim();
    const aantalRaw = editAantalItems.trim();
    const aantalNum = aantalRaw === '' ? undefined : Number.parseInt(aantalRaw, 10);
    const aantalItems = (aantalNum !== undefined && Number.isFinite(aantalNum) && aantalNum >= 0) ? aantalNum : undefined;

    if (!titel && !notitie && aantalItems === undefined) {
      await handleResetOverride(groepKey);
      return;
    }

    setIsSaving(true);

    let titel_en: string | undefined;
    let notitie_en: string | undefined;
    try {
      const vertalingen = await vertaalBatch([titel || '', notitie || '']);
      titel_en = vertalingen[0] || undefined;
      notitie_en = vertalingen[1] || undefined;
    } catch {
      console.warn('Auto-vertaling mislukt, wordt overgeslagen');
    }

    const override: TaakgroepOverride = {
      id: sanitizeFirebaseKey(`${groepKey}-${jaar}`),
      groepKey,
      customTitel: titel || undefined,
      customTitel_en: titel_en,
      notitie: notitie || undefined,
      notitie_en: notitie_en,
      aantalItems,
      jaar,
      gewijzigdDoor: state.ui.gebruikersnaam || 'Commissie',
      gewijzigdOp: new Date().toISOString(),
    };
    await saveTaakgroepOverride(override);
    setIsSaving(false);
    setEditingKey(null);
    toonToast('success', taal === 'nl' ? 'Groep aanpassing opgeslagen' : 'Group override saved');
  };

  const handleResetOverride = async (groepKey: string) => {
    const overrideId = sanitizeFirebaseKey(`${groepKey}-${jaar}`);
    await deleteTaakgroepOverride(overrideId);
    setEditingKey(null);
    toonToast('info', taal === 'nl' ? 'Groep hersteld naar standaard' : 'Group reset to default');
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
  };

  if (taken.length === 0) {
    return null;
  }

  // Groepeer taken op teeltcode-actie + gewas
  const groepen: TaakGroep[] = [];
  const groepMap = new Map<string, TaakGroep>();

  taken.forEach(taak => {
    const teeltCode = taak.bronTeeltCode || '';
    const actie = (taal === 'nl'
      ? TEELTCODE_ACTIES[teeltCode as TeeltCode]
      : TEELTCODE_ACTIES_EN[teeltCode as TeeltCode]
    ) || taak.type || (taal === 'nl' ? 'Overig' : 'Other');
    const gewas = taak.bronGewas || (taal === 'nl' ? 'Onbekend' : 'Unknown');
    const sleutel = `${teeltCode}-${gewas}`;

    if (!groepMap.has(sleutel)) {
      const nieuweGroep: TaakGroep = { sleutel, actie, gewas, taken: [] };
      groepMap.set(sleutel, nieuweGroep);
      groepen.push(nieuweGroep);
    }
    groepMap.get(sleutel)!.taken.push(taak);
  });

  // Groepsvolgorde volgt de input-volgorde van taken (eerste voorkomen per groep)
  // zodat externe sorteer (deadline, maand, locatie, etc.) behouden blijft.
  // Maar: gepinde groepen altijd bovenaan.
  groepen.sort((a, b) => {
    const aPinned = isPinned(groepPinKey(a.sleutel)) ? 1 : 0;
    const bPinned = isPinned(groepPinKey(b.sleutel)) ? 1 : 0;
    return bPinned - aPinned;
  });

  // Filter op pinned-status indien parent dat vraagt (voor split "Vastgepind" vs "Rest"-blok)
  const gefilterdeGroepen = filterMode === 'pinned'
    ? groepen.filter(g => isPinned(groepPinKey(g.sleutel)))
    : filterMode === 'rest'
      ? groepen.filter(g => !isPinned(groepPinKey(g.sleutel)))
      : groepen;

  // Niets te tonen — laat de hele kaart weg zodat de parent geen lege blok ziet.
  if (gefilterdeGroepen.length === 0) {
    return null;
  }

  // Hulpfunctie: actie waarbij we in community mode de bedden willen verbergen.
  // Alleen voorzaaien / kluitjes maken (bi, bvz, kvz) gebeurt in trays, niet in bedden,
  // dus daar verwarren bed-chips de community-leden. Bij rechtstreeks zaaien in bed (bz, kz, x)
  // en bij uitplanten (bu, ku) zijn de bed-chips juist relevant en blijven ze zichtbaar.
  // Kijkt ook naar de zichtbare titel — een commissie kan via een override beslissen
  // dat een directe-zaai-groep alsnog als "kluitjes maken" wordt uitgevoerd.
  const isVerbergBeddenGroep = (groep: TaakGroep, displayTitel: string): boolean => {
    const titelLc = (displayTitel || '').toLowerCase();
    if (titelLc.includes('kluitjes') || titelLc.includes('voorzaai') || titelLc.includes('plug') || titelLc.includes('pre-sow')) {
      return true;
    }
    const code = groep.taken[0]?.bronTeeltCode;
    if (code === 'bi' || code === 'bvz' || code === 'kvz') return true;
    if (code) return false;
    const lc = groep.actie.toLowerCase();
    return lc.includes('voorzaai') || lc.includes('pre-sow');
  };

  const extractBedLabel = (taak: Taak): string => {
    if (taak.bedId) return taak.bedId;
    const match = taak.beschrijving.match(/in (?:bed )?([A-Z]\d+)/i);
    return match ? match[1] : '?';
  };

  const extractDeelVanBed = (taak: Taak): string | null => {
    const match = taak.beschrijving.match(/\(([^)]+)\)/);
    return match ? match[1] : null;
  };

  // Sorteer op bed-label: sectie-letter oplopend, dan bed-nummer oplopend (A1, A2, B1, B3, ...)
  const sorteerOpBed = (a: Taak, b: Taak): number => {
    const bedA = extractBedLabel(a);
    const bedB = extractBedLabel(b);
    const letterA = bedA.match(/^[A-Z]/i)?.[0]?.toUpperCase() || '';
    const letterB = bedB.match(/^[A-Z]/i)?.[0]?.toUpperCase() || '';
    if (letterA !== letterB) return letterA.localeCompare(letterB);
    const numA = parseInt(bedA.replace(/^[A-Z]/i, '')) || 0;
    const numB = parseInt(bedB.replace(/^[A-Z]/i, '')) || 0;
    return numA - numB;
  };

  const getStatusKleur = (taak: Taak) => {
    if (taak.status === 'Afgerond') return 'bg-tuin-100 text-tuin-700 border-tuin-300';
    const dynamischePrioriteit = berekenDynamischePrioriteit(taak);
    if (dynamischePrioriteit === 'Hoog') return 'bg-red-50 text-red-700 border-red-200';
    if (dynamischePrioriteit === 'Normaal') return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
  };

  const getActieIcon = (actie: string) => {
    const lc = actie.toLowerCase();
    if (lc.includes('oogst') || lc.includes('harvest')) return <CheckCircle className="w-4 h-4" />;
    if (lc.includes('uitplant') || lc.includes('transplant')) return <Sprout className="w-4 h-4" />;
    if (lc.includes('zaai') || lc.includes('sow') || lc.includes('pre-sow')) return <Sprout className="w-4 h-4" />;
    return <Wrench className="w-4 h-4" />;
  };

  const zichtbareTaken = gefilterdeGroepen.flatMap(g => g.taken);
  const totaalActief = zichtbareTaken.filter(t => t.status !== 'Afgerond').length;
  const totaalAfgerond = zichtbareTaken.filter(t => t.status === 'Afgerond').length;

  const isPinnedBlok = filterMode === 'pinned';
  const defaultKopTitel = taal === 'nl' ? 'Uit teeltplan' : 'From cultivation plan';
  const effectieveKopTitel = kopTitel ?? defaultKopTitel;

  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${isPinnedBlok ? 'ring-2 ring-amber-400' : ''}`}>
      <div className={`px-4 py-3 border-b ${isPinnedBlok
        ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200'
        : 'bg-gradient-to-r from-tuin-50 to-tuin-100 border-tuin-200'}`}>
        <h4 className={`font-semibold flex items-center gap-2 ${isPinnedBlok ? 'text-amber-800' : 'text-tuin-800'}`}>
          {isPinnedBlok ? <Pin className="w-4 h-4 fill-current" /> : <Sprout className="w-4 h-4" />}
          {effectieveKopTitel}
          <span className={`text-sm font-normal ${isPinnedBlok ? 'text-amber-700' : 'text-tuin-600'}`}>
            ({totaalActief} {taal === 'nl' ? 'open' : 'open'}{totaalAfgerond > 0 ? `, ${totaalAfgerond} ${taal === 'nl' ? 'klaar' : 'done'}` : ''})
          </span>
        </h4>
      </div>

      <div className="divide-y divide-gray-100">
        {gefilterdeGroepen.map(groep => {
          const actieveTaken = groep.taken.filter(t => t.status !== 'Afgerond').sort(sorteerOpBed);
          const afgerondeTaken = groep.taken.filter(t => t.status === 'Afgerond').sort(sorteerOpBed);
          const override = overrideMap.get(groep.sleutel);
          const isEditing = editingKey === groep.sleutel;
          const groepPinId = groepPinKey(groep.sleutel);
          const groepIsPinned = isPinned(groepPinId);

          const standaardTitel = `${groep.actie}: ${groep.gewas}`;
          const displayTitel = override
            ? (taal === 'nl' ? override.customTitel : override.customTitel_en) || standaardTitel
            : standaardTitel;
          const isKluitjesGroep = isVerbergBeddenGroep(groep, displayTitel);
          const verbergBedden = !isCommissie && isKluitjesGroep;
          const aantalItemsDisplay = override?.aantalItems ?? groep.taken.length;
          const displayNotitie = override
            ? (taal === 'nl' ? override.notitie : override.notitie_en)
            : undefined;

          return (
            <div key={groep.sleutel} className={`p-4 ${groepIsPinned ? 'bg-amber-50/60 border-l-4 border-l-amber-400' : ''}`}>
              {isEditing ? (
                <div className="mb-3 space-y-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      {t.weekOverview.customTitle}
                    </label>
                    <input
                      type="text"
                      value={editTitel}
                      onChange={(e) => setEditTitel(e.target.value)}
                      placeholder={standaardTitel}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-tuin-500 focus:border-tuin-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      {t.weekOverview.groupNote}
                    </label>
                    <textarea
                      value={editNotitie}
                      onChange={(e) => setEditNotitie(e.target.value)}
                      placeholder={t.weekOverview.groupNotePlaceholder}
                      rows={2}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-tuin-500 focus:border-tuin-500"
                    />
                  </div>
                  {isKluitjesGroep && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        {taal === 'nl'
                          ? `Aantal items (trays/kluitjes) — standaard: ${groep.taken.length}`
                          : `Number of items (trays/plugs) — default: ${groep.taken.length}`}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editAantalItems}
                        onChange={(e) => setEditAantalItems(e.target.value)}
                        placeholder={String(groep.taken.length)}
                        className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-tuin-500 focus:border-tuin-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {taal === 'nl'
                          ? 'Laat leeg om het aantal bedden te gebruiken. Pas aan als je minder of meer trays maakt dan bedden.'
                          : 'Leave empty to use the bed count. Adjust if you make fewer or more trays than beds.'}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveOverride(groep.sleutel)}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs bg-tuin-600 text-white rounded hover:bg-tuin-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving
                        ? (taal === 'nl' ? 'Opslaan...' : 'Saving...')
                        : t.weekOverview.saveOverride}
                    </button>
                    {override && (
                      <button
                        onClick={() => handleResetOverride(groep.sleutel)}
                        className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        {t.weekOverview.resetOverride}
                      </button>
                    )}
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      {t.weekOverview.cancelEdit}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-tuin-600">{getActieIcon(groep.actie)}</span>
                    <span className="font-medium text-gray-800">
                      {displayTitel}
                    </span>
                    <button
                      onClick={() => togglePin(groepPinId)}
                      className={`p-1 rounded transition-colors ${
                        groepIsPinned
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title={groepIsPinned
                        ? (taal === 'nl' ? 'Losmaken van bovenaan' : 'Unpin from top')
                        : (taal === 'nl' ? 'Vastpinnen bovenaan' : 'Pin to top')}
                    >
                      <Pin className={`w-3.5 h-3.5 ${groepIsPinned ? 'fill-current' : ''}`} />
                    </button>
                    {override?.customTitel && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded"
                        title={`${override.gewijzigdDoor} — ${new Date(override.gewijzigdOp).toLocaleDateString('nl-NL')}`}
                      >
                        {t.weekOverview.titleCustomized}
                      </span>
                    )}
                    {isCommissie && (
                      <button
                        onClick={() => handleStartEdit(groep.sleutel, standaardTitel)}
                        className="p-1 text-gray-400 hover:text-tuin-600 hover:bg-tuin-50 rounded transition-colors"
                        title={t.weekOverview.editGroupTitle}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isCommissie && onGroepVerwijder && (
                      <button
                        onClick={() => {
                          const msg = taal === 'nl'
                            ? `Alle ${groep.taken.length} taken van "${groep.gewas}" (${groep.actie}) verwijderen?`
                            : `Delete all ${groep.taken.length} tasks for "${groep.gewas}" (${groep.actie})?`;
                          if (confirm(msg)) {
                            onGroepVerwijder(groep.taken);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={taal === 'nl' ? 'Hele groep verwijderen' : 'Delete entire group'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isCommissie && onPubliceer && onDepubliceer && (() => {
                      const alleGepubliceerd = groep.taken.every(t => t.communityZichtbaar === true);
                      if (alleGepubliceerd) {
                        return (
                          <button
                            onClick={() => onDepubliceer(groep.taken)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-tuin-100 text-tuin-700 rounded hover:bg-tuin-200 transition-colors"
                            title={taal === 'nl' ? 'Depubliceren' : 'Unpublish'}
                          >
                            <Eye className="w-3 h-3" />
                            {taal === 'nl' ? 'Gepubliceerd' : 'Published'}
                          </button>
                        );
                      } else {
                        return (
                          <button
                            onClick={() => onPubliceer(groep.taken)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            title={taal === 'nl' ? 'Publiceer voor community' : 'Publish for community'}
                          >
                            <EyeOff className="w-3 h-3" />
                            {taal === 'nl' ? 'Publiceer' : 'Publish'}
                          </button>
                        );
                      }
                    })()}
                  </div>
                  <span className="text-sm text-gray-500">
                    {isKluitjesGroep && override?.aantalItems !== undefined && isCommissie
                      ? `${override.aantalItems} ${taal === 'nl' ? 'items' : 'items'} · ${groep.taken.length} ${taal === 'nl' ? 'bedden' : 'beds'}`
                      : verbergBedden
                        ? `${aantalItemsDisplay} ${taal === 'nl' ? 'items' : 'items'}`
                        : `${groep.taken.length} ${taal === 'nl' ? 'bedden' : 'beds'}`}
                  </span>
                </div>
              )}

              {!isEditing && displayNotitie && (
                <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  {displayNotitie}
                </div>
              )}

              {verbergBedden ? (
                <div className="flex flex-wrap items-center gap-3">
                  {actieveTaken.length > 0 ? (
                    <>
                      <span className="text-sm text-gray-600">
                        {taal === 'nl'
                          ? `Nog ${aantalItemsDisplay} ${aantalItemsDisplay === 1 ? 'item' : 'items'} te doen`
                          : `${aantalItemsDisplay} ${aantalItemsDisplay === 1 ? 'item' : 'items'} to do`}
                      </span>
                      <button
                        onClick={() => {
                          actieveTaken.forEach(taak => onTaakAfvinken(taak));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-tuin-600 text-white hover:bg-tuin-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {taal === 'nl' ? 'Alle items gedaan' : 'All items done'}
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-tuin-600 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      {taal === 'nl'
                        ? `Alle ${aantalItemsDisplay} ${aantalItemsDisplay === 1 ? 'item' : 'items'} afgerond`
                        : `All ${aantalItemsDisplay} ${aantalItemsDisplay === 1 ? 'item' : 'items'} completed`}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {actieveTaken.map(taak => {
                    const bedLabel = extractBedLabel(taak);
                    const deelVanBed = extractDeelVanBed(taak);
                    const heeftVenster = taak.isAutomatisch && taak.windowStart !== undefined && taak.windowEnd !== undefined;
                    const kanEerder = heeftVenster && (taak.scheduledWeek ?? 0) > taak.windowStart!;
                    const kanLater = heeftVenster && (taak.scheduledWeek ?? 0) < taak.windowEnd!;

                    return (
                      <div
                        key={taak.id}
                        className={`
                          inline-flex items-center gap-0.5 rounded-lg border text-sm
                          transition-colors
                          ${getStatusKleur(taak)}
                        `}
                      >
                        {isCommissie && heeftVenster && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerschuifWeek(taak, -1);
                            }}
                            disabled={!kanEerder}
                            className={`
                              flex items-center justify-center w-8 h-8 min-w-[44px] min-h-[44px]
                              rounded-l-lg transition-colors text-base font-medium
                              ${kanEerder
                                ? 'hover:bg-black/10 active:bg-black/20 cursor-pointer'
                                : 'opacity-0 cursor-default pointer-events-none'}
                            `}
                            title={taal === 'nl' ? 'Week eerder' : 'Week earlier'}
                          >
                            ‹
                          </button>
                        )}

                        <button
                          onClick={() => onTaakOpen(taak)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 cursor-pointer"
                          title={taak.beschrijving}
                        >
                          {isCommissie && onPubliceer && onDepubliceer && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (taak.communityZichtbaar) {
                                  onDepubliceer([taak]);
                                } else {
                                  onPubliceer([taak]);
                                }
                              }}
                              className={`p-0.5 rounded transition-colors cursor-pointer ${
                                taak.communityZichtbaar
                                  ? 'text-tuin-600 hover:bg-tuin-100'
                                  : 'text-gray-300 hover:bg-gray-100'
                              }`}
                              title={taak.communityZichtbaar
                                ? (taal === 'nl' ? 'Zichtbaar voor community — klik om te verbergen' : 'Visible to community — click to hide')
                                : (taal === 'nl' ? 'Verborgen voor community — klik om te publiceren' : 'Hidden from community — click to publish')
                              }
                              role="button"
                            >
                              {taak.communityZichtbaar ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </span>
                          )}
                          <span className="font-medium">{bedLabel}</span>
                          {toonWeekNummer && taak.scheduledWeek !== undefined && (
                            <span className="text-xs opacity-60">wk{taak.scheduledWeek}</span>
                          )}
                          {deelVanBed && (
                            <span className="text-xs opacity-75">({deelVanBed})</span>
                          )}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaakAfvinken(taak);
                            }}
                            className="ml-0.5 p-0.5 rounded hover:bg-white/50 transition-colors cursor-pointer"
                            title={taal === 'nl' ? 'Markeer als klaar' : 'Mark as done'}
                            role="button"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </button>

                        {isCommissie && heeftVenster && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerschuifWeek(taak, 1);
                            }}
                            disabled={!kanLater}
                            className={`
                              flex items-center justify-center w-8 h-8 min-w-[44px] min-h-[44px]
                              rounded-r-lg transition-colors text-base font-medium
                              ${kanLater
                                ? 'hover:bg-black/10 active:bg-black/20 cursor-pointer'
                                : 'opacity-0 cursor-default pointer-events-none'}
                            `}
                            title={taal === 'nl' ? 'Week later' : 'Week later'}
                          >
                            ›
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {afgerondeTaken.map(taak => {
                    const bedLabel = extractBedLabel(taak);

                    return (
                      <div
                        key={taak.id}
                        onClick={() => onTaakOpen(taak)}
                        className="
                          inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm
                          bg-tuin-50 text-tuin-600 border-tuin-200 opacity-60
                          transition-colors cursor-pointer hover:opacity-80
                        "
                        role="button"
                        title={`${taak.beschrijving} - ${taal === 'nl' ? 'Afgerond' : 'Completed'}${taak.afgerondDoor ? ` ${taal === 'nl' ? 'door' : 'by'} ${taak.afgerondDoor}` : ''}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="font-medium line-through">{bedLabel}</span>
                        {toonWeekNummer && taak.scheduledWeek !== undefined && (
                          <span className="text-xs opacity-60">wk{taak.scheduledWeek}</span>
                        )}
                        {isCommissie && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaakHeropenen(taak);
                            }}
                            className="ml-1 p-0.5 rounded hover:bg-white/50 transition-colors"
                            title={taal === 'nl' ? 'Heropenen' : 'Reopen'}
                          >
                            <Clock className="w-3 h-3" />
                          </button>
                        )}
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
  );
}
