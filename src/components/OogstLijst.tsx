import { useState, useRef, useMemo } from 'react';
import {
  Apple,
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Upload,
  Copy,
  AlertCircle,
  Leaf,
  Info,
  User,
  Users,
  Sparkles,
  ChevronDown,
  ShoppingBasket,
  Camera,
  Loader2,
  Image as ImageIcon,
  AlertTriangle,
  Undo2,
  Download,
  Youtube
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { vertaalGewas, vertaal, oogstmethodes, statusVertalingen, categorieen } from '../i18n/woordenboek';
import { nuISO } from '../utils/dateUtils';
import {
  getHuidigeWeek,
  getWeekInfoTekst,
  filterOogstlijstVoorWeek,
  parseOogstCSV,
  dupliceerNaarWeek,
  genereerOogstSuggestiesVoorMaand,
  getHuidigeMaandPeriode,
  formateerLocaties,
  type OogstSuggestie
} from '../utils/oogstParser';
import type { OogstItem, OogstStatus, OogstCategorie, OogstRegistratie } from '../types';
import { mergeOogstlijst, saveImportLog } from '../utils/importMerge';
import { TranslatedText } from './TranslatedText';
import { vertaalBatch } from '../services/translationService';
import { uploadFoto, verwijderFoto } from '../services/storageService';
import { isGeldigeAfbeelding } from '../utils/imageUtils';

// Status kleuren
const STATUS_KLEUREN: Record<OogstStatus, { bg: string; text: string; border: string }> = {
  'Beschikbaar': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'Controleren': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Op': { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
  'Gereserveerd': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
};

// Emoji's per categorie
const CATEGORIE_EMOJI: Record<OogstCategorie, string> = {
  'Groenten': '🥬',
  'Kruiden': '🌿',
  'Eetbare bloemen': '🌸'
};


export function Oogstlijst() {
  const {
    state,
    isCommissie,
    saveOogstItem,
    saveOogstlijst,
    deleteOogstItem,
    saveOogstRegistratie,
    toonToast
  } = useApp();
  const { taal, t } = useI18n();

  const [toonFormulier, setToonFormulier] = useState(false);
  const [editItem, setEditItem] = useState<OogstItem | null>(null);
  const [toonImportModal, setToonImportModal] = useState(false);
  const [toonDupliceerModal, setToonDupliceerModal] = useState(false);
  const [toonGeoogstModal, setToonGeoogstModal] = useState<OogstItem | null>(null);
  const [toonOogstersModal, setToonOogstersModal] = useState(false);

  // Bouw video lookup map uit instructies (reactief)
  const videoLookup = useMemo(() => {
    const map: Record<string, string> = {};
    const instructies = state.data.instructies || [];
    const oogstInstructies = instructies.filter(
      i => i.hoofdcategorie === 'gewassen' &&
           i.subcategorie === 'oogsten' &&
           i.link &&
           i.link.trim() !== ''
    );
    oogstInstructies.forEach(instructie => {
      const videoUrl = instructie.link!;
      if (instructie.gewasId) {
        map[instructie.gewasId.toLowerCase()] = videoUrl;
      }
      if (instructie.gewasNaam) {
        map[instructie.gewasNaam.toLowerCase()] = videoUrl;
      }
    });
    return map;
  }, [state.data.instructies]);

  // Week navigatie
  const { weekNummer: huidigeWeek, jaar: huidigJaar } = getHuidigeWeek();
  const [geselecteerdeWeek, setGeselecteerdeWeek] = useState(huidigeWeek);
  const [geselecteerdJaar, setGeselecteerdJaar] = useState(huidigJaar);

  // Filter items voor geselecteerde week
  const weekItems = filterOogstlijstVoorWeek(
    state.data.oogstlijst,
    geselecteerdeWeek,
    geselecteerdJaar
  );

  // Groepeer per categorie
  const groentenItems = weekItems.filter(i => i.categorie === 'Groenten');
  const kruidenItems = weekItems.filter(i => i.categorie === 'Kruiden');
  const bloemenItems = weekItems.filter(i => i.categorie === 'Eetbare bloemen');

  // Keuze groepen vinden
  const keuzeGroepen = new Map<string, OogstItem[]>();
  weekItems.forEach(item => {
    if (item.keuzeGroep) {
      if (!keuzeGroepen.has(item.keuzeGroep)) {
        keuzeGroepen.set(item.keuzeGroep, []);
      }
      keuzeGroepen.get(item.keuzeGroep)!.push(item);
    }
  });

  // Registraties voor deze week (exclusief soft-deleted)
  const weekRegistraties = state.data.oogstRegistraties.filter(r => {
    if (r.deleted === true) return false; // Skip soft-deleted registraties
    const item = state.data.oogstlijst.find(i => i.id === r.oogstItemId);
    return item && item.weekNummer === geselecteerdeWeek && item.jaar === geselecteerdJaar;
  });

  const navigeerWeek = (richting: number) => {
    let nieuweWeek = geselecteerdeWeek + richting;
    let nieuwJaar = geselecteerdJaar;

    if (nieuweWeek < 1) {
      nieuweWeek = 52;
      nieuwJaar--;
    } else if (nieuweWeek > 52) {
      nieuweWeek = 1;
      nieuwJaar++;
    }

    setGeselecteerdeWeek(nieuweWeek);
    setGeselecteerdJaar(nieuwJaar);
  };

  const handleNieuwItem = () => {
    setEditItem(null);
    setToonFormulier(true);
  };

  const handleEditItem = (item: OogstItem) => {
    setEditItem(item);
    setToonFormulier(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Weet je zeker dat je dit item wilt verwijderen?')) {
      await deleteOogstItem(itemId);
      toonToast('success', 'Oogst item verwijderd');
    }
  };

  const handleStatusWijziging = async (item: OogstItem, nieuweStatus: OogstStatus) => {
    await saveOogstItem({ ...item, status: nieuweStatus });
    toonToast('info', `Status gewijzigd naar ${nieuweStatus}`);
  };

  const handleImportCSV = async (csvText: string, bestandsnaam: string = 'oogstlijst.csv') => {
    try {
      const items = parseOogstCSV(csvText, state.ui.gebruikersnaam || 'import');
      if (items.length === 0) {
        toonToast('error', 'Geen geldige items gevonden in CSV');
        return;
      }

      // MERGE: voeg alleen nieuwe items toe, bestaande overslaan
      const mergeResult = mergeOogstlijst(
        state.data.oogstlijst,
        items,
        bestandsnaam,
        state.ui.gebruikersnaam || 'commissie'
      );

      // Sla gemergede data op
      await saveOogstlijst(mergeResult.data);

      // Sla import log op
      saveImportLog(mergeResult.log);

      // Feedback
      if (mergeResult.log.toegevoegd === 0) {
        toonToast('info', `Alle ${items.length} items bestonden al - niets toegevoegd`);
      } else if (mergeResult.log.overgeslagen > 0) {
        toonToast('success', `${mergeResult.log.toegevoegd} nieuwe items toegevoegd, ${mergeResult.log.overgeslagen} overgeslagen`);
      } else {
        toonToast('success', `${mergeResult.log.toegevoegd} items geimporteerd`);
      }
      setToonImportModal(false);
    } catch (error) {
      toonToast('error', 'Fout bij importeren: ' + (error as Error).message);
    }
  };

  const handleDupliceerWeek = async (doelWeek: number, doelJaar: number) => {
    const nieuweItems = dupliceerNaarWeek(
      state.data.oogstlijst,
      geselecteerdeWeek,
      geselecteerdJaar,
      doelWeek,
      doelJaar,
      state.ui.gebruikersnaam || 'commissie'
    );

    if (nieuweItems.length === 0) {
      toonToast('error', 'Geen items om te dupliceren');
      return;
    }

    // MERGE: voeg alleen items toe die nog niet bestaan
    const mergeResult = mergeOogstlijst(
      state.data.oogstlijst,
      nieuweItems,
      `dupliceer-week-${geselecteerdeWeek}`,
      state.ui.gebruikersnaam || 'commissie'
    );

    await saveOogstlijst(mergeResult.data);
    saveImportLog(mergeResult.log);

    if (mergeResult.log.toegevoegd === 0) {
      toonToast('info', 'Week al gedupliceerd - niets toegevoegd');
    } else {
      toonToast('success', `${mergeResult.log.toegevoegd} items gekopieerd naar week ${doelWeek}`);
    }
    setToonDupliceerModal(false);
  };

  const handleGeoogstRegistratie = async (item: OogstItem, gebruikersnaam: string) => {
    const registratie: OogstRegistratie = {
      id: `reg-${Date.now()}`,
      oogstItemId: item.id,
      gebruiker: gebruikersnaam,
      timestamp: nuISO()
    };

    await saveOogstRegistratie(registratie);
    toonToast('success', `Oogst geregistreerd voor ${item.gewas}`);
    setToonGeoogstModal(null);
  };

  // Undo oogst-registratie (soft delete)
  const handleUndoRegistratie = async (registratie: OogstRegistratie) => {
    const updatedRegistratie: OogstRegistratie = {
      ...registratie,
      deleted: true,
      deletedAt: nuISO()
    };
    await saveOogstRegistratie(updatedRegistratie);
    toonToast('info', taal === 'nl' ? 'Oogst ongedaan gemaakt' : 'Harvest undone');
  };

  // CSV Export voor oogstlijst
  const handleExportCSV = () => {
    // Header rij - nu met oogst-registratie kolommen
    const headers = [
      'weeknr', 'datum_van', 'datum_tot', 'gewas', 'categorie', 'hoeveelheid',
      'locatie_1', 'locatie_2', 'locatie_3', 'keuze', 'keuzegroep',
      'aantal_geoogst', 'geoogst_door'
    ];

    // Bereken week datums
    const startDatum = getWeekStartDate(geselecteerdeWeek, geselecteerdJaar);
    const eindDatum = new Date(startDatum);
    eindDatum.setDate(eindDatum.getDate() + 6);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Sorteer items: keuzegroepen bij elkaar, dan alfabetisch
    const gesorteerdeItems = [...weekItems].sort((a, b) => {
      // Eerst op keuzegroep
      const aGroep = a.keuzeGroep || '';
      const bGroep = b.keuzeGroep || '';
      if (aGroep !== bGroep) {
        if (!aGroep) return 1;  // Items zonder keuzegroep achteraan
        if (!bGroep) return -1;
        return aGroep.localeCompare(bGroep);
      }
      // Dan alfabetisch op gewas
      return a.gewas.localeCompare(b.gewas);
    });

    // Data rijen - nu met oogst-registratie data
    const rows = gesorteerdeItems.map(item => {
      // Vind registraties voor dit item (exclusief deleted)
      const itemRegistraties = weekRegistraties.filter(r => r.oogstItemId === item.id);
      const aantalGeoogst = itemRegistraties.length;

      // Maak lijst van wie heeft geoogst (unieke namen met aantal)
      const oogstersTelling = new Map<string, number>();
      itemRegistraties.forEach(r => {
        oogstersTelling.set(r.gebruiker, (oogstersTelling.get(r.gebruiker) || 0) + 1);
      });

      // Format: "Jan (2x), Piet (1x)" of gewoon "Jan, Piet" als iedereen 1x
      const geoogstDoor = Array.from(oogstersTelling.entries())
        .map(([naam, count]) => count > 1 ? `${naam} (${count}x)` : naam)
        .join(', ');

      return [
        geselecteerdeWeek.toString(),
        formatDate(startDatum),
        formatDate(eindDatum),
        item.gewas,
        item.categorie,
        item.hoeveelheidPp,
        item.locatiePrimair || '',
        item.locatieSecundair || '',
        item.locatieTertiair || '',
        item.keuzeGroep ? 'ja' : 'nee',
        item.keuzeGroep || '',
        aantalGeoogst.toString(),
        geoogstDoor
      ];
    });

    // CSV content met UTF-8 BOM voor Excel compatibiliteit
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const bestandsnaam = taal === 'nl'
      ? `oogstlijst-week${geselecteerdeWeek}-${geselecteerdJaar}.csv`
      : `harvestlist-week${geselecteerdeWeek}-${geselecteerdJaar}.csv`;
    link.download = bestandsnaam;
    link.click();
    URL.revokeObjectURL(url);

    toonToast('success', taal === 'nl' ? 'CSV geëxporteerd' : 'CSV exported');
  };

  // Helper functie om startdatum van een week te berekenen
  const getWeekStartDate = (week: number, jaar: number): Date => {
    const jan4 = new Date(jaar, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
    const targetDate = new Date(firstMonday);
    targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
    return targetDate;
  };

  const weekInfoTekst = getWeekInfoTekst(geselecteerdeWeek, geselecteerdJaar);
  const isHuidigeWeek = geselecteerdeWeek === huidigeWeek && geselecteerdJaar === huidigJaar;

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Header - consistent met Alle Taken en Weekoverzicht */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-tuin-800">{t.nav.harvestList}</h2>
        {isCommissie && (
          <button
            onClick={handleNieuwItem}
            className="flex items-center gap-2 px-4 py-2 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {taal === 'nl' ? 'Nieuw item' : 'New item'}
          </button>
        )}
      </div>

      {/* Secundaire acties - alleen commissie modus */}
      {isCommissie && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setToonOogstersModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
          >
            <Users className="w-4 h-4" />
            {taal === 'nl' ? 'Oogsters inzien' : 'View harvesters'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={weekItems.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {taal === 'nl' ? 'Exporteren' : 'Export'}
          </button>
          <button
            onClick={() => setToonDupliceerModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
          >
            <Copy className="w-4 h-4" />
            {taal === 'nl' ? 'Week kopiëren' : 'Copy week'}
          </button>
        </div>
      )}

      {/* Week navigatie */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigeerWeek(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-800">
              {weekInfoTekst}
            </h3>
            {isHuidigeWeek && (
              <span className="text-sm text-tuin-600 font-medium">{taal === 'nl' ? 'Deze week' : 'This week'}</span>
            )}
          </div>

          <button
            onClick={() => navigeerWeek(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Oogstlijst content */}
      {weekItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Apple className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">{taal === 'nl' ? 'Geen oogst gepland voor deze week' : 'No harvest planned for this week'}</p>
          {isCommissie && (
            <button
              onClick={handleNieuwItem}
              className="mt-4 text-tuin-600 hover:text-tuin-700 font-medium"
            >
              + {taal === 'nl' ? 'Voeg een gewas toe' : 'Add a crop'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Groenten sectie */}
          {groentenItems.length > 0 && (
            <CategorieGroep
              items={groentenItems}
              categorie="Groenten"
              emoji="🥬"
              label={taal === 'nl' ? 'Groenten' : 'Vegetables'}
              isCommissie={isCommissie}
              weekRegistraties={weekRegistraties}
              keuzeGroepen={keuzeGroepen}
              huidigeGebruiker={state.ui.gebruikersnaam || ''}
              videoLookup={videoLookup}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onStatusChange={handleStatusWijziging}
              onGeoogst={(item) => setToonGeoogstModal(item)}
              onUndoRegistratie={handleUndoRegistratie}
            />
          )}

          {/* Kruiden sectie */}
          {kruidenItems.length > 0 && (
            <CategorieGroep
              items={kruidenItems}
              categorie="Kruiden"
              emoji="🌿"
              label={taal === 'nl' ? 'Kruiden' : 'Herbs'}
              isCommissie={isCommissie}
              weekRegistraties={weekRegistraties}
              keuzeGroepen={keuzeGroepen}
              huidigeGebruiker={state.ui.gebruikersnaam || ''}
              videoLookup={videoLookup}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onStatusChange={handleStatusWijziging}
              onGeoogst={(item) => setToonGeoogstModal(item)}
              onUndoRegistratie={handleUndoRegistratie}
            />
          )}

          {/* Eetbare bloemen sectie */}
          {bloemenItems.length > 0 && (
            <CategorieGroep
              items={bloemenItems}
              categorie="Eetbare bloemen"
              emoji="🌸"
              label={taal === 'nl' ? 'Eetbare bloemen' : 'Edible flowers'}
              isCommissie={isCommissie}
              weekRegistraties={weekRegistraties}
              keuzeGroepen={keuzeGroepen}
              huidigeGebruiker={state.ui.gebruikersnaam || ''}
              videoLookup={videoLookup}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onStatusChange={handleStatusWijziging}
              onGeoogst={(item) => setToonGeoogstModal(item)}
              onUndoRegistratie={handleUndoRegistratie}
            />
          )}
        </div>
      )}

      {/* Registraties download knop (alleen commissie) */}
      {isCommissie && weekRegistraties.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-5 h-5 text-tuin-600" />
              <span>{weekRegistraties.length} oogst registratie{weekRegistraties.length !== 1 ? 's' : ''} deze week</span>
            </div>
            <button
              onClick={() => {
                // Genereer CSV data
                const csvRows = ['Datum,Tijd,Gebruiker,Gewas'];
                weekRegistraties.forEach(reg => {
                  const item = state.data.oogstlijst.find(i => i.id === reg.oogstItemId);
                  const datum = new Date(reg.timestamp);
                  csvRows.push(`${datum.toLocaleDateString('nl-NL')},${datum.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })},${reg.gebruiker},${item?.gewas || 'onbekend'}`);
                });
                const csvContent = csvRows.join('\n');

                // Download als bestand
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `oogst-registraties-week${geselecteerdeWeek}-${geselecteerdJaar}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4 rotate-180" />
              Download CSV
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {toonFormulier && (
        <OogstFormulier
          item={editItem}
          weekNummer={geselecteerdeWeek}
          jaar={geselecteerdJaar}
          onClose={() => setToonFormulier(false)}
          onSave={async (item) => {
            await saveOogstItem(item);
            setToonFormulier(false);
            toonToast('success', editItem ? 'Oogst item bijgewerkt' : 'Oogst item toegevoegd');
          }}
        />
      )}

      {toonOogstersModal && (
        <OogstersOverviewModal
          weekNummer={geselecteerdeWeek}
          jaar={geselecteerdJaar}
          weekRegistraties={weekRegistraties}
          oogstlijst={state.data.oogstlijst}
          onClose={() => setToonOogstersModal(false)}
        />
      )}

      {toonDupliceerModal && (
        <DupliceerModal
          bronWeek={geselecteerdeWeek}
          bronJaar={geselecteerdJaar}
          onClose={() => setToonDupliceerModal(false)}
          onDupliceer={handleDupliceerWeek}
        />
      )}

      {toonGeoogstModal && (
        <GeoogstModal
          item={toonGeoogstModal}
          gebruikersnaam={state.ui.gebruikersnaam}
          onClose={() => setToonGeoogstModal(null)}
          onBevestig={handleGeoogstRegistratie}
        />
      )}
    </div>
  );
}

// ============================================
// CATEGORIE GROEP COMPONENT (met keuze-items gegroepeerd)
// ============================================

interface CategorieGroepProps {
  items: OogstItem[];
  categorie: OogstCategorie;
  emoji: string;
  label: string;
  isCommissie: boolean;
  weekRegistraties: OogstRegistratie[];
  keuzeGroepen: Map<string, OogstItem[]>;
  huidigeGebruiker: string;
  videoLookup: Record<string, string>;
  onEdit: (item: OogstItem) => void;
  onDelete: (itemId: string) => void;
  onStatusChange: (item: OogstItem, status: OogstStatus) => void;
  onGeoogst: (item: OogstItem) => void;
  onUndoRegistratie: (registratie: OogstRegistratie) => void;
}

function CategorieGroep({
  items,
  categorie,
  emoji,
  label,
  isCommissie,
  weekRegistraties,
  keuzeGroepen,
  huidigeGebruiker,
  videoLookup,
  onEdit,
  onDelete,
  onStatusChange,
  onGeoogst,
  onUndoRegistratie
}: CategorieGroepProps) {
  const { taal } = useI18n();

  // Sorteer items: eerst niet-keuze items, dan keuze-groepen bij elkaar (gesorteerd op nummer)
  const gesorteerdeItems = useMemo(() => {
    const nietKeuzeItems = items.filter(i => !i.keuzeGroep);
    const keuzeItems = items.filter(i => i.keuzeGroep);

    // Groepeer keuze items per groep
    const keuzeGroepenLijst: OogstItem[][] = [];
    const gezien = new Set<string>();

    keuzeItems.forEach(item => {
      if (item.keuzeGroep && !gezien.has(item.keuzeGroep)) {
        gezien.add(item.keuzeGroep);
        const groepItems = keuzeItems.filter(i => i.keuzeGroep === item.keuzeGroep);
        keuzeGroepenLijst.push(groepItems);
      }
    });

    // Sorteer keuzegroepen op nummer (keuze-1, keuze-2, etc.)
    keuzeGroepenLijst.sort((a, b) => {
      const aMatch = a[0]?.keuzeGroep?.match(/(\d+)/);
      const bMatch = b[0]?.keuzeGroep?.match(/(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1]) : 999;
      const bNum = bMatch ? parseInt(bMatch[1]) : 999;
      return aNum - bNum;
    });

    return { nietKeuzeItems, keuzeGroepenLijst };
  }, [items]);

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-2xl">{emoji}</span> {label}
      </h3>

      {/* Niet-keuze items */}
      {gesorteerdeItems.nietKeuzeItems.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
          {gesorteerdeItems.nietKeuzeItems.map(item => (
            <OogstKaart
              key={item.id}
              item={item}
              isCommissie={isCommissie}
              registraties={weekRegistraties.filter(r => r.oogstItemId === item.id)}
              keuzeGroepItems={undefined}
              huidigeGebruiker={huidigeGebruiker}
              videoUrl={item.gewas ? (videoLookup[item.gewas.toLowerCase()] || undefined) : undefined}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.id)}
              onStatusChange={(status) => onStatusChange(item, status)}
              onGeoogst={() => onGeoogst(item)}
              onUndoRegistratie={onUndoRegistratie}
            />
          ))}
        </div>
      )}

      {/* Keuze groepen - elk groep in eigen container */}
      {gesorteerdeItems.keuzeGroepenLijst.map((groep, idx) => {
        const groepId = groep[0].keuzeGroep || `groep-${idx}`;
        const groepNummer = groepId.replace('keuze-', '').replace('-', ' ');
        const groepLabel = taal === 'nl'
          ? `Keuze ${groepNummer}: kies 1 van ${groep.length}`
          : `Choice ${groepNummer}: pick 1 of ${groep.length}`;
        // Verzamel alle registraties voor items in deze keuzegroep
        const groepItemIds = groep.map(g => g.id);
        const groepRegistraties = weekRegistraties.filter(r => groepItemIds.includes(r.oogstItemId));

        return (
          <div key={groepId} className="mb-4">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔄</span>
                <span className="font-semibold text-orange-700">{groepLabel}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groep.map(item => (
                  <OogstKaart
                    key={item.id}
                    item={item}
                    isCommissie={isCommissie}
                    registraties={weekRegistraties.filter(r => r.oogstItemId === item.id)}
                    keuzeGroepItems={groep}
                    keuzeGroepRegistraties={groepRegistraties}
                    isInKeuzeContainer={true}
                    huidigeGebruiker={huidigeGebruiker}
                    videoUrl={item.gewas ? (videoLookup[item.gewas.toLowerCase()] || undefined) : undefined}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item.id)}
                    onStatusChange={(status) => onStatusChange(item, status)}
                    onGeoogst={() => onGeoogst(item)}
                    onUndoRegistratie={onUndoRegistratie}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// OOGST KAART COMPONENT
// ============================================

interface OogstKaartProps {
  item: OogstItem;
  isCommissie: boolean;
  registraties: OogstRegistratie[];
  keuzeGroepItems?: OogstItem[];
  keuzeGroepRegistraties?: OogstRegistratie[];
  isInKeuzeContainer?: boolean;
  huidigeGebruiker: string;
  videoUrl?: string;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: OogstStatus) => void;
  onGeoogst: () => void;
  onUndoRegistratie: (registratie: OogstRegistratie) => void;
}

function OogstKaart({
  item,
  isCommissie,
  registraties,
  keuzeGroepItems,
  keuzeGroepRegistraties = [],
  isInKeuzeContainer = false,
  huidigeGebruiker,
  videoUrl,
  onEdit,
  onDelete,
  onStatusChange,
  onGeoogst,
  onUndoRegistratie
}: OogstKaartProps) {
  const { taal } = useI18n();
  const kleuren = STATUS_KLEUREN[item.status];
  const emoji = CATEGORIE_EMOJI[item.categorie];

  // Vertaal gewas en status als taal Engels is
  const gewasNaam = taal === 'en' ? vertaalGewas(item.gewas) : item.gewas;
  const statusTekst = taal === 'en' ? (statusVertalingen[item.status] || item.status) : item.status;

  // Check of de huidige gebruiker al heeft geoogst voor dit item
  const heeftGeoogst = registraties.some(r => r.gebruiker === huidigeGebruiker);

  // Vind de meest recente eigen registratie die kan worden ongedaan gemaakt
  // Alleen registraties < 24 uur oud
  const undoableRegistratie = useMemo(() => {
    const nu = new Date();
    const vierentwintigUurGeleden = new Date(nu.getTime() - 24 * 60 * 60 * 1000);

    return registraties
      .filter(r => {
        // Alleen eigen registraties
        if (r.gebruiker !== huidigeGebruiker) return false;
        // Alleen recente registraties (< 24 uur)
        const regDatum = new Date(r.timestamp);
        return regDatum > vierentwintigUurGeleden;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null;
  }, [registraties, huidigeGebruiker]);

  // Check of de huidige gebruiker al een ANDER item in dezelfde keuzegroep heeft geoogst
  const heeftAndereKeuzeGeoogst = useMemo(() => {
    if (!keuzeGroepItems || keuzeGroepItems.length <= 1) return false;

    // Vind registraties van de huidige gebruiker voor andere items in de keuzegroep
    const andereKeuzeItemIds = keuzeGroepItems
      .filter(ki => ki.id !== item.id)
      .map(ki => ki.id);

    return keuzeGroepRegistraties.some(
      r => r.gebruiker === huidigeGebruiker && andereKeuzeItemIds.includes(r.oogstItemId)
    );
  }, [keuzeGroepItems, keuzeGroepRegistraties, huidigeGebruiker, item.id]);

  // Vind welk gewas de gebruiker al heeft gekozen (voor de melding)
  const gekozenGewas = useMemo(() => {
    if (!heeftAndereKeuzeGeoogst || !keuzeGroepItems) return null;

    const andereKeuzeItemIds = keuzeGroepItems
      .filter(ki => ki.id !== item.id)
      .map(ki => ki.id);

    const gekozenRegistratie = keuzeGroepRegistraties.find(
      r => r.gebruiker === huidigeGebruiker && andereKeuzeItemIds.includes(r.oogstItemId)
    );

    if (gekozenRegistratie) {
      const gekozenItem = keuzeGroepItems.find(ki => ki.id === gekozenRegistratie.oogstItemId);
      const gewasNaam = gekozenItem?.gewas || null;
      // Vertaal naar Engels indien nodig
      return gewasNaam && taal === 'en' ? vertaalGewas(gewasNaam) : gewasNaam;
    }
    return null;
  }, [heeftAndereKeuzeGeoogst, keuzeGroepItems, keuzeGroepRegistraties, huidigeGebruiker, item.id, taal]);

  return (
    <div className={`rounded-lg border-2 ${kleuren.border} ${kleuren.bg} p-4 transition-all hover:shadow-md min-w-0`}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-3xl flex-shrink-0">{emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-800 text-lg truncate">{gewasNaam}</h4>
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:text-red-600 transition-colors"
                  title={taal === 'nl' ? 'Bekijk oogstvideo' : 'Watch harvest video'}
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {isCommissie && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-tuin-600 rounded"
              title="Bewerken"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
              title="Verwijderen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hoeveelheid */}
      <div className="mt-3">
        <p className={`font-medium ${kleuren.text}`}>
          <TranslatedText nl={item.hoeveelheidPp} en={item.hoeveelheidPp_en} />
        </p>
      </div>

      {/* Locaties */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700">{item.locatiePrimair}</span>
        </div>
        {item.locatieSecundair && (
          <div className="flex items-center gap-2 text-sm text-gray-500 ml-6">
            <span>of {item.locatieSecundair}</span>
          </div>
        )}
        {item.locatieTertiair && (
          <div className="flex items-center gap-2 text-sm text-gray-500 ml-6">
            <span>of {item.locatieTertiair}</span>
          </div>
        )}
      </div>

      {/* Oogstmethode */}
      {item.oogstmethode && (
        <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
          <Leaf className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <TranslatedText nl={item.oogstmethode} en={item.oogstmethode_en} />
        </div>
      )}

      {/* Bijzonderheden */}
      {item.bijzonderheden && (
        <div className="mt-2 flex items-start gap-2 text-sm text-gray-500 italic">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <TranslatedText nl={item.bijzonderheden} en={item.bijzonderheden_en} />
        </div>
      )}

      {/* Leeg oogsten indicator */}
      {item.leegOogsten && (
        <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
          <AlertCircle className="w-4 h-4" />
          <span>{taal === 'nl' ? 'Mag/moet leeg geoogst worden' : 'May/must harvest completely'}</span>
        </div>
      )}

      {/* Foto thumbnail */}
      {item.fotoUrl && (
        <div className="mt-3">
          <img
            src={item.fotoUrl}
            alt={item.gewas}
            className="w-full h-32 object-cover rounded-lg border border-gray-200"
          />
        </div>
      )}

      {/* Status badge */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${kleuren.bg} ${kleuren.text} border ${kleuren.border}`}>
          {statusTekst}
        </span>

        {/* Registraties teller met undo optie */}
        {registraties.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {registraties.length}x {taal === 'nl' ? 'geoogst' : 'harvested'}
            </span>
            {/* Undo knop voor eigen recente registratie */}
            {undoableRegistratie && (
              <button
                onClick={() => onUndoRegistratie(undoableRegistratie)}
                className="p-1 text-gray-400 hover:text-orange-600 rounded transition-colors"
                title={taal === 'nl' ? 'Maak je laatste oogstregistratie ongedaan' : 'Undo your last harvest registration'}
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Acties */}
      <div className="mt-4 flex flex-wrap gap-2">
        {item.status === 'Beschikbaar' && (
          heeftAndereKeuzeGeoogst ? (
            // Gebruiker heeft al een ander item in deze keuzegroep geoogst - blokkeer
            <div className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {taal === 'nl'
                  ? `Al gekozen: ${gekozenGewas || 'andere optie'}`
                  : `Already chosen: ${gekozenGewas || 'other option'}`}
              </span>
            </div>
          ) : heeftGeoogst ? (
            <button
              onClick={onGeoogst}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              {taal === 'nl' ? 'Geoogst' : 'Harvested'}
            </button>
          ) : (
            <button
              onClick={onGeoogst}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <ShoppingBasket className="w-4 h-4" />
              {taal === 'nl' ? 'Oogsten' : 'Harvest'}
            </button>
          )
        )}

        {isCommissie && (
          <select
            value={item.status}
            onChange={(e) => onStatusChange(e.target.value as OogstStatus)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="Beschikbaar">{taal === 'nl' ? 'Beschikbaar' : 'Available'}</option>
            <option value="Controleren">{taal === 'nl' ? 'Controleren' : 'Check first'}</option>
            <option value="Op">{taal === 'nl' ? 'Op' : 'Empty'}</option>
            <option value="Gereserveerd">{taal === 'nl' ? 'Gereserveerd' : 'Reserved'}</option>
          </select>
        )}
      </div>
    </div>
  );
}

// ============================================
// FORMULIER MODAL
// ============================================

interface OogstFormulierProps {
  item: OogstItem | null;
  weekNummer: number;
  jaar: number;
  onClose: () => void;
  onSave: (item: OogstItem) => void;
}

function OogstFormulier({ item, weekNummer, jaar, onClose, onSave }: OogstFormulierProps) {
  const { state } = useApp();
  const { taal } = useI18n();
  const [toonSuggesties, setToonSuggesties] = useState(!item); // Toon suggesties alleen bij nieuw item
  const [gewasZoekterm, setGewasZoekterm] = useState('');
  const [toonGewasDropdown, setToonGewasDropdown] = useState(false);
  const [locatieZoekterm, setLocatieZoekterm] = useState('');
  const [toonLocatieDropdown, setToonLocatieDropdown] = useState(false);
  const [locatie2Zoekterm, setLocatie2Zoekterm] = useState('');
  const [toonLocatie2Dropdown, setToonLocatie2Dropdown] = useState(false);
  const [locatie3Zoekterm, setLocatie3Zoekterm] = useState('');
  const [toonLocatie3Dropdown, setToonLocatie3Dropdown] = useState(false);

  // Form state - moet vroeg gedeclareerd worden voor useMemo dependencies
  const [formData, setFormData] = useState({
    gewas: item?.gewas || '',
    categorie: item?.categorie || 'Groenten' as OogstCategorie,
    hoeveelheidPp: item?.hoeveelheidPp || '',
    locatiePrimair: item?.locatiePrimair || '',
    locatieSecundair: item?.locatieSecundair || '',
    locatieTertiair: item?.locatieTertiair || '',
    oogstmethode: item?.oogstmethode || '',
    bijzonderheden: item?.bijzonderheden || '',
    status: item?.status || 'Beschikbaar' as OogstStatus,
    leegOogsten: item?.leegOogsten || false,
    keuzeGroep: item?.keuzeGroep || '',
    weekNummer: item?.weekNummer || weekNummer,
    jaar: item?.jaar || jaar
  });

  // Genereer oogst suggesties op basis van teeltplan
  const suggesties = useMemo(() => {
    if (!state.data.teeltplan || !state.data.gewassen) return [];
    return genereerOogstSuggestiesVoorMaand(state.data.teeltplan, state.data.gewassen);
  }, [state.data.teeltplan, state.data.gewassen]);

  // Alle unieke gewassen uit teeltplan (voor dropdown)
  const alleGewassen = useMemo(() => {
    const gewasSet = new Set<string>();
    state.data.teeltplan.forEach(item => {
      if (item.gewas) gewasSet.add(item.gewas);
    });
    return Array.from(gewasSet).sort();
  }, [state.data.teeltplan]);

  // Bedden waar het geselecteerde gewas voorkomt (uit teeltplan)
  const beddenVoorGewas = useMemo(() => {
    if (!formData.gewas) return [];
    const gewasLower = formData.gewas?.toLowerCase() || '';
    const bedSet = new Set<string>();
    state.data.teeltplan.forEach(item => {
      if (item.gewas && item.gewas?.toLowerCase() === gewasLower && item.bedId) {
        bedSet.add(item.bedId);
      }
    });
    return Array.from(bedSet).sort();
  }, [state.data.teeltplan, formData.gewas]);

  // Alle unieke bedden uit teeltplan (fallback als geen gewas geselecteerd)
  const alleBedden = useMemo(() => {
    const bedSet = new Set<string>();
    state.data.teeltplan.forEach(item => {
      if (item.bedId) bedSet.add(item.bedId);
    });
    return Array.from(bedSet).sort();
  }, [state.data.teeltplan]);

  // Gebruik bedden voor gewas als beschikbaar, anders alle bedden
  // Voeg "Oogststation" toe als vaste optie
  const beschikbareBedden = ['Oogststation', ...(beddenVoorGewas.length > 0 ? beddenVoorGewas : alleBedden)];

  // Filter gewassen op zoekterm
  const gefilterdeGewassen = useMemo(() => {
    if (!gewasZoekterm) return alleGewassen;
    return alleGewassen.filter(g =>
      g?.toLowerCase()?.includes(gewasZoekterm?.toLowerCase() || '')
    );
  }, [alleGewassen, gewasZoekterm]);

  // Filter bedden op zoekterm (gefilterd op gewas)
  const gefilterdeBedden = useMemo(() => {
    if (!locatieZoekterm) return beschikbareBedden;
    return beschikbareBedden.filter(b =>
      b?.toLowerCase()?.includes(locatieZoekterm?.toLowerCase() || '')
    );
  }, [beschikbareBedden, locatieZoekterm]);

  // Filter bedden voor secundaire locatie
  const gefilterdeBedden2 = useMemo(() => {
    if (!locatie2Zoekterm) return beschikbareBedden;
    return beschikbareBedden.filter(b =>
      b?.toLowerCase()?.includes(locatie2Zoekterm?.toLowerCase() || '')
    );
  }, [beschikbareBedden, locatie2Zoekterm]);

  // Filter bedden voor tertiaire locatie
  const gefilterdeBedden3 = useMemo(() => {
    if (!locatie3Zoekterm) return beschikbareBedden;
    return beschikbareBedden.filter(b =>
      b?.toLowerCase()?.includes(locatie3Zoekterm?.toLowerCase() || '')
    );
  }, [beschikbareBedden, locatie3Zoekterm]);

  const { maandNaam } = getHuidigeMaandPeriode();

  // Selecteer een suggestie en vul het formulier in
  const selecteerSuggestie = (suggestie: OogstSuggestie) => {
    setFormData({
      ...formData,
      gewas: suggestie.gewas,
      categorie: suggestie.categorie,
      locatiePrimair: suggestie.locaties[0] || '',
      locatieSecundair: suggestie.locaties[1] || '',
      locatieTertiair: suggestie.locaties[2] || '',
      oogstmethode: suggestie.oogstmethode,
      bijzonderheden: suggestie.bijzonderheden || ''
    });
    setToonSuggesties(false);
  };

  const [isSaving, setIsSaving] = useState(false);

  // State voor unsaved changes dialoog
  const [toonUnsavedChangesDialoog, setToonUnsavedChangesDialoog] = useState(false);

  // Foto state (moet voor useMemo staan)
  const [fotoUrl, setFotoUrl] = useState(item?.fotoUrl || '');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Detecteer of er onopgeslagen wijzigingen zijn
  const hasUnsavedChanges = useMemo(() => {
    const origGewas = item?.gewas || '';
    const origCategorie = item?.categorie || 'Groenten';
    const origHoeveelheidPp = item?.hoeveelheidPp || '';
    const origLocatiePrimair = item?.locatiePrimair || '';
    const origLocatieSecundair = item?.locatieSecundair || '';
    const origLocatieTertiair = item?.locatieTertiair || '';
    const origOogstmethode = item?.oogstmethode || '';
    const origBijzonderheden = item?.bijzonderheden || '';
    const origStatus = item?.status || 'Beschikbaar';
    const origLeegOogsten = item?.leegOogsten || false;
    const origKeuzeGroep = item?.keuzeGroep || '';
    const origFotoUrl = item?.fotoUrl || '';

    return (
      formData.gewas !== origGewas ||
      formData.categorie !== origCategorie ||
      formData.hoeveelheidPp !== origHoeveelheidPp ||
      formData.locatiePrimair !== origLocatiePrimair ||
      formData.locatieSecundair !== origLocatieSecundair ||
      formData.locatieTertiair !== origLocatieTertiair ||
      formData.oogstmethode !== origOogstmethode ||
      formData.bijzonderheden !== origBijzonderheden ||
      formData.status !== origStatus ||
      formData.leegOogsten !== origLeegOogsten ||
      formData.keuzeGroep !== origKeuzeGroep ||
      fotoUrl !== origFotoUrl ||
      selectedFile !== null
    );
  }, [formData, fotoUrl, selectedFile, item]);

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

  // Foto handlers
  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFotoError(null);

    if (!isGeldigeAfbeelding(file)) {
      setFotoError(taal === 'nl'
        ? 'Ongeldig bestandstype. Alleen JPG, PNG, WebP en GIF zijn toegestaan.'
        : 'Invalid file type. Only JPG, PNG, WebP and GIF are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFotoError(taal === 'nl'
        ? 'Bestand is te groot (max 10MB)'
        : 'File is too large (max 10MB)');
      return;
    }

    setSelectedFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleFotoVerwijderen = async () => {
    // Verwijder bestaande foto uit storage
    if (fotoUrl) {
      try {
        await verwijderFoto(fotoUrl);
      } catch (error) {
        console.warn('Kon foto niet verwijderen uit storage:', error);
      }
    }

    setFotoUrl('');
    setFotoPreview(null);
    setSelectedFile(null);
    setFotoError(null);
    if (fotoInputRef.current) {
      fotoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Genereer item ID voor nieuwe items (nodig voor foto upload)
      const itemId = item?.id || `oogst-${Date.now()}`;

      // Upload foto als er een nieuwe is geselecteerd
      let definitieveFotoUrl = fotoUrl;
      if (selectedFile) {
        setIsUploading(true);
        try {
          definitieveFotoUrl = await uploadFoto(selectedFile, 'oogstInstructies', itemId);
        } catch (uploadError) {
          console.error('Foto upload mislukt:', uploadError);
          setFotoError(taal === 'nl'
            ? 'Foto upload mislukt. Item wordt opgeslagen zonder foto.'
            : 'Photo upload failed. Item will be saved without photo.');
          definitieveFotoUrl = fotoUrl; // Behoud eventuele bestaande foto
        } finally {
          setIsUploading(false);
        }
      }

      // Verzamel teksten die vertaald moeten worden
      const tekstenOmTeVertalen = [
        formData.hoeveelheidPp || '',
        formData.oogstmethode || '',
        formData.bijzonderheden || ''
      ];

      // Vertaal naar Engels (in batch voor efficiëntie)
      const vertalingen = await vertaalBatch(tekstenOmTeVertalen);

      // Firebase accepteert geen undefined waarden, dus we bouwen het object op
      // met alleen de velden die een waarde hebben
      const nieuwItem: OogstItem = {
        id: itemId,
        gewas: formData.gewas,
        categorie: formData.categorie,
        hoeveelheidPp: formData.hoeveelheidPp,
        locatiePrimair: formData.locatiePrimair,
        oogstmethode: formData.oogstmethode,
        status: formData.status,
        leegOogsten: formData.leegOogsten,
        weekNummer: formData.weekNummer,
        jaar: formData.jaar,
        aangemaakt: item?.aangemaakt || nuISO(),
        aangemaaktDoor: item?.aangemaaktDoor || state.ui.gebruikersnaam || 'commissie'
      };

      // Voeg vertalingen toe als ze beschikbaar zijn
      if (vertalingen[0]) nieuwItem.hoeveelheidPp_en = vertalingen[0];
      if (vertalingen[1]) nieuwItem.oogstmethode_en = vertalingen[1];
      if (vertalingen[2]) nieuwItem.bijzonderheden_en = vertalingen[2];

      // Voeg optionele velden alleen toe als ze een waarde hebben
      if (formData.locatieSecundair) nieuwItem.locatieSecundair = formData.locatieSecundair;
      if (formData.locatieTertiair) nieuwItem.locatieTertiair = formData.locatieTertiair;
      if (formData.bijzonderheden) nieuwItem.bijzonderheden = formData.bijzonderheden;
      if (formData.keuzeGroep) nieuwItem.keuzeGroep = formData.keuzeGroep;
      if (definitieveFotoUrl) nieuwItem.fotoUrl = definitieveFotoUrl;

      onSave(nieuwItem);
    } catch (error) {
      console.error('Fout bij opslaan oogst item:', error);
      // Bij fout toch opslaan zonder vertalingen
      const nieuwItem: OogstItem = {
        id: item?.id || `oogst-${Date.now()}`,
        gewas: formData.gewas,
        categorie: formData.categorie,
        hoeveelheidPp: formData.hoeveelheidPp,
        locatiePrimair: formData.locatiePrimair,
        oogstmethode: formData.oogstmethode,
        status: formData.status,
        leegOogsten: formData.leegOogsten,
        weekNummer: formData.weekNummer,
        jaar: formData.jaar,
        aangemaakt: item?.aangemaakt || nuISO(),
        aangemaaktDoor: item?.aangemaaktDoor || state.ui.gebruikersnaam || 'commissie'
      };
      if (formData.locatieSecundair) nieuwItem.locatieSecundair = formData.locatieSecundair;
      if (formData.locatieTertiair) nieuwItem.locatieTertiair = formData.locatieTertiair;
      if (formData.bijzonderheden) nieuwItem.bijzonderheden = formData.bijzonderheden;
      if (formData.keuzeGroep) nieuwItem.keuzeGroep = formData.keuzeGroep;
      if (fotoUrl) nieuwItem.fotoUrl = fotoUrl;
      onSave(nieuwItem);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
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
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 my-4 box-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {item
              ? (taal === 'nl' ? 'Oogst item bewerken' : 'Edit harvest item')
              : (taal === 'nl' ? 'Nieuw oogst item' : 'New harvest item')
            }
          </h3>
          <button onClick={handleSluitenMetCheck} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Suggesties sectie - alleen bij nieuw item */}
        {!item && suggesties.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setToonSuggesties(!toonSuggesties)}
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">{taal === 'nl' ? 'Suggesties voor' : 'Suggestions for'} {maandNaam}</span>
                <span className="text-sm text-amber-600">({suggesties.length} {taal === 'nl' ? 'gewassen' : 'crops'})</span>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${toonSuggesties ? 'rotate-180' : ''}`} />
            </button>

            {toonSuggesties && (
              <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                {suggesties.map((suggestie, index) => {
                  const suggestieGewas = taal === 'en' ? vertaalGewas(suggestie.gewas) : suggestie.gewas;
                  const suggestieOogstmethode = suggestie.oogstmethode && taal === 'en'
                    ? (oogstmethodes[suggestie.oogstmethode] || suggestie.oogstmethode)
                    : suggestie.oogstmethode;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selecteerSuggestie(suggestie)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {suggestie.categorie === 'Kruiden' ? '🌿' : suggestie.categorie === 'Eetbare bloemen' ? '🌸' : '🥬'}
                          </span>
                          <span className="font-medium text-gray-800">{suggestieGewas}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formateerLocaties(suggestie.locaties)}
                        </span>
                      </div>
                      {suggestieOogstmethode && (
                        <p className="mt-1 text-sm text-gray-500 truncate pl-7">
                          {suggestieOogstmethode}
                        </p>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setToonSuggesties(false)}
                  className="w-full px-4 py-3 text-left text-tuin-600 hover:bg-tuin-50 font-medium"
                >
                  + {taal === 'nl' ? 'Ander gewas toevoegen...' : 'Add another crop...'}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gewas *
              </label>
              <input
                type="search"
                required
                value={formData.gewas}
                onChange={e => {
                  setFormData({ ...formData, gewas: e.target.value });
                  setGewasZoekterm(e.target.value);
                  setToonGewasDropdown(true);
                }}
                onFocus={() => setToonGewasDropdown(true)}
                onBlur={() => setTimeout(() => setToonGewasDropdown(false), 200)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
                placeholder="Zoek of kies gewas..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-1p-ignore
                data-lpignore="true"
              />
              {toonGewasDropdown && gefilterdeGewassen.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {gefilterdeGewassen.map(gewas => (
                    <button
                      key={gewas}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, gewas });
                        setToonGewasDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-tuin-50 text-sm"
                    >
                      {gewas}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {alleGewassen.length > 0
                  ? 'Kies uit lijst of typ handmatig'
                  : 'Typ een gewas (bijv. Sla, Tomaat)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categorie
              </label>
              <select
                value={formData.categorie}
                onChange={e => setFormData({ ...formData, categorie: e.target.value as OogstCategorie })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              >
                <option value="Groenten">🥬 Groenten</option>
                <option value="Kruiden">🌿 Kruiden</option>
                <option value="Eetbare bloemen">🌸 Eetbare bloemen</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hoeveelheid per persoon *
            </label>
            <input
              type="text"
              required
              value={formData.hoeveelheidPp}
              onChange={e => setFormData({ ...formData, hoeveelheidPp: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
              placeholder="Bijv. 6 bladeren, 1 krop, 200 gram"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primaire locatie *
            </label>
            <input
              type="search"
              required
              value={formData.locatiePrimair}
              onChange={e => {
                setFormData({ ...formData, locatiePrimair: e.target.value });
                setLocatieZoekterm(e.target.value);
                setToonLocatieDropdown(true);
              }}
              onFocus={() => setToonLocatieDropdown(true)}
              onBlur={() => setTimeout(() => setToonLocatieDropdown(false), 200)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
              placeholder="Zoek of kies bed..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-1p-ignore
              data-lpignore="true"
            />
            {toonLocatieDropdown && gefilterdeBedden.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {gefilterdeBedden.map(bed => (
                  <button
                    key={bed}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, locatiePrimair: bed });
                      setToonLocatieDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-tuin-50 text-sm"
                  >
                    {bed}
                  </button>
                ))}
              </div>
            )}
            {beddenVoorGewas.length > 0 ? (
              <p className="text-xs text-tuin-600 mt-1">
                {beddenVoorGewas.length} bed{beddenVoorGewas.length > 1 ? 'den' : ''} met {formData.gewas} (of typ handmatig)
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Typ een bed (bijv. A1, B2)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secundaire locatie
              </label>
              <input
                type="search"
                value={formData.locatieSecundair}
                onChange={e => {
                  setFormData({ ...formData, locatieSecundair: e.target.value });
                  setLocatie2Zoekterm(e.target.value);
                  setToonLocatie2Dropdown(true);
                }}
                onFocus={() => setToonLocatie2Dropdown(true)}
                onBlur={() => setTimeout(() => setToonLocatie2Dropdown(false), 200)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
                placeholder="Optioneel"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-1p-ignore
                data-lpignore="true"
              />
              {toonLocatie2Dropdown && gefilterdeBedden2.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {gefilterdeBedden2.map(bed => (
                    <button
                      key={bed}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, locatieSecundair: bed });
                        setToonLocatie2Dropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-tuin-50 text-sm"
                    >
                      {bed}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tertiaire locatie
              </label>
              <input
                type="search"
                value={formData.locatieTertiair}
                onChange={e => {
                  setFormData({ ...formData, locatieTertiair: e.target.value });
                  setLocatie3Zoekterm(e.target.value);
                  setToonLocatie3Dropdown(true);
                }}
                onFocus={() => setToonLocatie3Dropdown(true)}
                onBlur={() => setTimeout(() => setToonLocatie3Dropdown(false), 200)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 input-no-suggest"
                placeholder="Optioneel"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-1p-ignore
                data-lpignore="true"
              />
              {toonLocatie3Dropdown && gefilterdeBedden3.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {gefilterdeBedden3.map(bed => (
                    <button
                      key={bed}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, locatieTertiair: bed });
                        setToonLocatie3Dropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-tuin-50 text-sm"
                    >
                      {bed}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Oogstmethode
            </label>
            <input
              type="text"
              value={formData.oogstmethode}
              onChange={e => setFormData({ ...formData, oogstmethode: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              placeholder="Bijv. Onderste bladeren oogsten"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bijzonderheden
            </label>
            <textarea
              value={formData.bijzonderheden}
              onChange={e => setFormData({ ...formData, bijzonderheden: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              rows={2}
              placeholder="Extra informatie..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as OogstStatus })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              >
                <option value="Beschikbaar">Beschikbaar</option>
                <option value="Controleren">Controleren</option>
                <option value="Op">Op</option>
                <option value="Gereserveerd">Gereserveerd</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keuze-optie
              </label>
              <select
                value={formData.keuzeGroep}
                onChange={e => setFormData({ ...formData, keuzeGroep: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              >
                <option value="">Geen keuze (standaard)</option>
                <option value="keuze-1">Keuze 1</option>
                <option value="keuze-2">Keuze 2</option>
                <option value="keuze-3">Keuze 3</option>
                <option value="keuze-4">Keuze 4</option>
                <option value="keuze-5">Keuze 5</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Items in dezelfde keuzegroep: kies er 1
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week
              </label>
              <input
                type="number"
                min="1"
                max="53"
                value={formData.weekNummer}
                onChange={e => setFormData({ ...formData, weekNummer: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jaar
              </label>
              <input
                type="number"
                value={formData.jaar}
                onChange={e => setFormData({ ...formData, jaar: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="leegOogsten"
              checked={formData.leegOogsten}
              onChange={e => setFormData({ ...formData, leegOogsten: e.target.checked })}
              className="w-4 h-4 text-tuin-600 focus:ring-tuin-500 border-gray-300 rounded"
            />
            <label htmlFor="leegOogsten" className="text-sm text-gray-700">
              Mag/moet leeg geoogst worden
            </label>
          </div>

          {/* Foto upload sectie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Camera className="w-4 h-4 inline mr-1" />
              {taal === 'nl' ? 'Foto (optioneel)' : 'Photo (optional)'}
            </label>

            {/* Preview van bestaande of nieuwe foto */}
            {(fotoPreview || fotoUrl) && (
              <div className="mb-3 relative">
                <img
                  src={fotoPreview || fotoUrl}
                  alt={taal === 'nl' ? 'Foto preview' : 'Photo preview'}
                  className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleFotoVerwijderen}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Upload button */}
            {!fotoPreview && !fotoUrl && (
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

            {/* Hidden file input */}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFotoSelect}
              className="hidden"
            />

            {/* Error message */}
            {fotoError && (
              <p className="mt-2 text-sm text-red-500">{fotoError}</p>
            )}

            {/* Info tekst */}
            <p className="mt-2 text-xs text-gray-500">
              {taal === 'nl'
                ? 'Max. 800x800px, automatisch gecomprimeerd'
                : 'Max. 800x800px, automatically compressed'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSluitenMetCheck}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {taal === 'nl' ? 'Annuleren' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 disabled:opacity-50"
            >
              {isSaving
                ? (taal === 'nl' ? 'Vertalen...' : 'Translating...')
                : (item ? (taal === 'nl' ? 'Opslaan' : 'Save') : (taal === 'nl' ? 'Toevoegen' : 'Add'))}
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

// ============================================
// IMPORT MODAL
// ============================================

interface ImportModalProps {
  onClose: () => void;
  onImport: (csv: string) => void;
}

function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto overflow-x-hidden box-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">CSV Importeren</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Verwacht formaat: Week;Startdatum;Gewas;Categorie;Hoeveelheid_pp;Locatie_primair;Locatie_secundair;Locatie_tertiair;Oogstmethode;Bijzonderheden;Status;Leeg_oogsten
            </p>

            <input
              type="file"
              accept=".csv,.txt"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" />
              Kies bestand
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Of plak CSV data hier:
            </label>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500 font-mono text-sm"
              rows={10}
              placeholder="Week;Startdatum;Gewas;..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={() => onImport(csvText)}
              disabled={!csvText.trim()}
              className="flex-1 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Importeren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DUPLICEER MODAL
// ============================================

interface DupliceerModalProps {
  bronWeek: number;
  bronJaar: number;
  onClose: () => void;
  onDupliceer: (doelWeek: number, doelJaar: number) => void;
}

function DupliceerModal({ bronWeek, bronJaar, onClose, onDupliceer }: DupliceerModalProps) {
  const [doelWeek, setDoelWeek] = useState(bronWeek + 1 > 52 ? 1 : bronWeek + 1);
  const [doelJaar, setDoelJaar] = useState(bronWeek + 1 > 52 ? bronJaar + 1 : bronJaar);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto overflow-x-hidden box-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Week kopieren</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Kopieer alle items van week {bronWeek} ({bronJaar}) naar:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doel week
              </label>
              <input
                type="number"
                min="1"
                max="53"
                value={doelWeek}
                onChange={e => setDoelWeek(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doel jaar
              </label>
              <input
                type="number"
                value={doelJaar}
                onChange={e => setDoelJaar(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={() => onDupliceer(doelWeek, doelJaar)}
              className="flex-1 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700"
            >
              Kopieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// GEOOGST MODAL
// ============================================

interface GeoogstModalProps {
  item: OogstItem;
  gebruikersnaam: string;
  onClose: () => void;
  onBevestig: (item: OogstItem, naam: string) => void;
}

function GeoogstModal({ item, gebruikersnaam, onClose, onBevestig }: GeoogstModalProps) {
  const [naam, setNaam] = useState(gebruikersnaam);
  const { setGebruikersnaam } = useApp();
  const { taal } = useI18n();

  // Vertaal gewas
  const gewasNaam = taal === 'en' ? vertaalGewas(item.gewas) : item.gewas;

  const handleBevestig = () => {
    if (!naam.trim()) {
      return;
    }
    // Onthoud de naam voor de volgende keer
    setGebruikersnaam(naam.trim());
    onBevestig(item, naam.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto overflow-x-hidden box-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{taal === 'nl' ? 'Oogst registreren' : 'Register harvest'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{CATEGORIE_EMOJI[item.categorie]}</span>
              <div>
                <p className="font-semibold text-gray-800">{gewasNaam}</p>
                <p className="text-sm text-green-700">{item.hoeveelheidPp}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {taal === 'nl' ? 'Je naam *' : 'Your name *'}
            </label>
            <input
              type="text"
              required
              value={naam}
              onChange={e => setNaam(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 focus:border-tuin-500"
              placeholder={taal === 'nl' ? 'Vul je naam in' : 'Enter your name'}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {taal === 'nl' ? 'Annuleren' : 'Cancel'}
            </button>
            <button
              onClick={handleBevestig}
              disabled={!naam.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {taal === 'nl' ? 'Bevestigen' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// OOGSTERS OVERZICHT MODAL
// ============================================

interface OogstersOverviewModalProps {
  weekNummer: number;
  jaar: number;
  weekRegistraties: OogstRegistratie[];
  oogstlijst: OogstItem[];
  onClose: () => void;
}

function OogstersOverviewModal({
  weekNummer,
  jaar,
  weekRegistraties,
  oogstlijst,
  onClose
}: OogstersOverviewModalProps) {
  const { taal } = useI18n();

  // Groepeer registraties per gebruiker
  const oogstersData = useMemo(() => {
    const perGebruiker = new Map<string, { gewassen: string[]; count: number }>();

    weekRegistraties.forEach(reg => {
      const item = oogstlijst.find(i => i.id === reg.oogstItemId);
      if (!item) return;

      const gewasNaam = taal === 'en' ? vertaalGewas(item.gewas) : item.gewas;

      if (!perGebruiker.has(reg.gebruiker)) {
        perGebruiker.set(reg.gebruiker, { gewassen: [], count: 0 });
      }

      const userData = perGebruiker.get(reg.gebruiker)!;
      userData.count++;
      if (!userData.gewassen.includes(gewasNaam)) {
        userData.gewassen.push(gewasNaam);
      }
    });

    // Sorteer op aantal oogsten (meeste eerst)
    return Array.from(perGebruiker.entries())
      .map(([naam, data]) => ({ naam, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [weekRegistraties, oogstlijst, taal]);

  // Week datumbereik berekenen
  const getWeekDateRange = (week: number, year: number): string => {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
    const startDate = new Date(firstMonday);
    startDate.setDate(firstMonday.getDate() + (week - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const formatDate = (d: Date) => {
      return d.toLocaleDateString(taal === 'nl' ? 'nl-NL' : 'en-US', {
        day: 'numeric',
        month: 'long'
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const datumBereik = getWeekDateRange(weekNummer, jaar);
  const aantalPersonen = oogstersData.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto overflow-x-hidden box-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {taal === 'nl'
              ? `Oogsters Week ${weekNummer}`
              : `Harvesters Week ${weekNummer}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">{datumBereik}</p>

        {oogstersData.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">
              {taal === 'nl'
                ? 'Nog niemand heeft deze week geoogst'
                : 'No one has harvested this week yet'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {taal === 'nl'
                ? `${aantalPersonen} ${aantalPersonen === 1 ? 'persoon heeft' : 'personen hebben'} deze week geoogst:`
                : `${aantalPersonen} ${aantalPersonen === 1 ? 'person has' : 'people have'} harvested this week:`}
            </p>

            <div className="space-y-4">
              {oogstersData.map(oogster => (
                <div key={oogster.naam} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-tuin-600" />
                    <span className="font-medium text-gray-800">{oogster.naam}</span>
                    <span className="text-sm text-gray-500">({oogster.count}x)</span>
                  </div>
                  <ul className="ml-7 text-sm text-gray-600 space-y-1">
                    {oogster.gewassen.map(gewas => (
                      <li key={gewas}>• {gewas}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4 mt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {taal === 'nl' ? 'Sluiten' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
