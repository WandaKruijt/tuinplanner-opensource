/**
 * GewasDetailPage.tsx
 * Toont gedetailleerde informatie over een gewas uit de verrijkte Firebase data
 */

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Sun,
  Leaf,
  Bug,
  Package,
  Sprout,
  ExternalLink,
  Heart,
  HeartOff,
  RefreshCw,
  Lightbulb,
  UtensilsCrossed,
  Calendar
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useGewassenlijst } from '../context/AppContext';
import type { VerrijktGewas } from '../types';
import { TEELTGROEP_EMOJI, TEELTGROEP_EN } from '../types';
import { formatMoeilijkheid, getMoeilijkheidKleur, getLocalizedField, getLocalizedArray, getVertaling } from '../utils/gewasUtils';

// ============================================
// ACCORDION COMPONENT
// ============================================

interface AccordionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, icon, children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-tuin-600">{icon}</span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPACT QUICK STAT CARD
// ============================================

interface QuickStatProps {
  emoji: string;
  label: string;
  value?: string;
  colorClass?: string;
}

function QuickStat({ emoji, label, value, colorClass = 'bg-tuin-50' }: QuickStatProps) {
  if (!value) return null;

  // Helper om korte versie van tekst te krijgen (max 15 karakters)
  const getKort = (tekst?: string): string => {
    if (!tekst) return '-';
    // Neem tekst voor het streepje, komma of punt
    const kort = tekst.split(' - ')[0].split(',')[0].split('.')[0].trim();
    return kort.length > 15 ? kort.slice(0, 14) + '…' : kort;
  };

  return (
    <div className={`${colorClass} rounded-xl p-3 text-center shadow-sm`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-sm mt-1 text-gray-800">{getKort(value)}</div>
    </div>
  );
}

// ============================================
// TAG LIST
// ============================================

interface TagListProps {
  items?: (string | { naam?: string; name?: string; [key: string]: unknown })[];
  colorClass?: string;
}

function TagList({ items, colorClass = 'bg-tuin-100 text-tuin-700' }: TagListProps) {
  if (!items || items.length === 0) return <span className="text-gray-400 text-sm">-</span>;

  // Helper om de weergavetekst uit een item te halen
  const getDisplayText = (item: string | { naam?: string; name?: string; [key: string]: unknown }): string => {
    if (typeof item === 'string') {
      return item;
    }
    // Als het een object is, probeer naam/name te vinden
    if (item && typeof item === 'object') {
      return item.naam || item.name || '';
    }
    return '';
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => {
        const text = getDisplayText(item);
        if (!text) return null;
        return (
          <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {text}
          </span>
        );
      })}
    </div>
  );
}

// ============================================
// INFO ROW
// ============================================

interface InfoRowProps {
  label: string;
  value?: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  if (!value) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-medium text-gray-800 text-sm sm:text-right">{value}</span>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface GewasDetailPageProps {
  gewas: VerrijktGewas;
  onBack: () => void;
}

export function GewasDetailPage({ gewas, onBack }: GewasDetailPageProps) {
  const { taal } = useI18n();
  const gewassenlijst = useGewassenlijst();

  // Varianten uit de gewassenlijst die bij dit gewas horen
  const tuinVarianten = useMemo(() => {
    if (!gewassenlijst || gewassenlijst.length === 0) return [];
    const gewasNaam = gewas.naam?.toLowerCase().trim();
    if (!gewasNaam) return [];
    return gewassenlijst.filter(gl =>
      gl.gewas.toLowerCase().trim() === gewasNaam
    );
  }, [gewassenlijst, gewas.naam]);

  const teeltgroepEmoji = TEELTGROEP_EMOJI[gewas.teeltgroep] || '🌱';

  // Gebruik teelt_moeilijkheid (plat) of moeilijkheidsgraad (genest)
  const moeilijkheidWaarde = gewas.teelt_moeilijkheid || gewas.moeilijkheidsgraad;
  const moeilijkheid = formatMoeilijkheid(moeilijkheidWaarde);
  const moeilijkheidKleur = getMoeilijkheidKleur(moeilijkheidWaarde);

  // Helper om vertaalde waarde te krijgen (wrapper voor util functie)
  const t = (nl?: string, en?: string) => getVertaling(nl, en, taal) || '';

  // Helper voor gelokaliseerde velden uit objecten
  const getField = <T = string>(obj: Record<string, unknown> | undefined, field: string): T | undefined => {
    return getLocalizedField<T>(obj, field, taal);
  };

  // Helper voor gelokaliseerde arrays
  const getArray = (obj: Record<string, unknown> | undefined, field: string): string[] => {
    return getLocalizedArray(obj, field, taal);
  };

  // Smaak & bereiding - combineer geneste en platte velden met taalondersteuning
  const smaakProfiel = taal === 'en'
    ? (gewas.smaak_en_bereiding?.smaak_en || gewas.smaak_profiel_en || gewas.smaak_en_bereiding?.smaak || gewas.smaak_profiel)
    : (gewas.smaak_en_bereiding?.smaak || gewas.smaak_profiel);
  const bereidingsTips = taal === 'en'
    ? (gewas.bereidingstips_en || gewas.bereidingstips)
    : gewas.bereidingstips;
  const eetbareDelen = gewas.smaak_en_bereiding?.eetbare_delen;
  const bereidingswijzen = gewas.smaak_en_bereiding?.bereidingswijzen;
  const voedingswaarde = taal === 'en'
    ? (gewas.smaak_en_bereiding?.voedingswaarde_en || gewas.smaak_en_bereiding?.voedingswaarde)
    : gewas.smaak_en_bereiding?.voedingswaarde;

  // Tips voor beginners - combineer geneste en platte velden met taalondersteuning
  const veelgemaakteFouten = taal === 'en'
    ? (gewas.tips_voor_beginners?.veelgemaakte_fouten_en || gewas.veelgemaakte_fouten_en || gewas.tips_voor_beginners?.veelgemaakte_fouten || gewas.veelgemaakte_fouten)
    : (gewas.tips_voor_beginners?.veelgemaakte_fouten || gewas.veelgemaakte_fouten);
  const praktischeTips = taal === 'en'
    ? (gewas.tips_voor_beginners?.praktische_tips_en || gewas.praktische_tips_en || gewas.tips_voor_beginners?.praktische_tips || gewas.praktische_tips)
    : (gewas.tips_voor_beginners?.praktische_tips || gewas.praktische_tips);

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Header met terug knop */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-tuin-600 hover:text-tuin-700 font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {taal === 'nl' ? 'Terug naar overzicht' : 'Back to overview'}
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{teeltgroepEmoji}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {taal === 'en' && gewas.naam_en ? gewas.naam_en : (gewas.naam || (taal === 'nl' ? 'Onbekend' : 'Unknown'))}
                </h1>
                {gewas.teeltgroep && (
                  <span className="inline-block mt-1 px-3 py-1 bg-tuin-100 text-tuin-700 rounded-full text-xs font-medium">
                    {taal === 'en' ? (TEELTGROEP_EN[gewas.teeltgroep] || gewas.teeltgroep) : gewas.teeltgroep}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Moeilijkheidsgraad met bolletjes */}
          {moeilijkheidWaarde && (
            <div className="text-right flex-shrink-0 ml-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                {taal === 'nl' ? 'Moeilijkheid' : 'Difficulty'}
              </span>
              <p className={`text-lg font-mono ${moeilijkheidKleur}`}>
                {moeilijkheid}
              </p>
              <span className="text-xs text-gray-500 capitalize">
                {moeilijkheidWaarde.split(' - ')[0]}
              </span>
            </div>
          )}
        </div>

        {/* Beschrijving */}
        {gewas.beschrijving && (
          <p className="mt-4 text-gray-600 leading-relaxed">
            {t(gewas.beschrijving, gewas.beschrijving_en)}
          </p>
        )}

        {/* Smaak & Bereiding - ondersteunt zowel geneste als platte velden */}
        {(smaakProfiel || bereidingsTips || eetbareDelen?.length || bereidingswijzen?.length) && (
          <div className="mt-4 pt-4 border-t border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 pb-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🍽️</span>
              <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                {taal === 'nl' ? 'Smaak & Bereiding' : 'Taste & Preparation'}
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              {smaakProfiel && (
                <p className="text-gray-700">
                  <span className="font-medium text-amber-700">{taal === 'nl' ? 'Smaak: ' : 'Taste: '}</span>
                  {smaakProfiel}
                </p>
              )}
              {bereidingsTips && (
                <p className="text-gray-700">
                  <span className="font-medium text-amber-700">{taal === 'nl' ? 'Bereiding: ' : 'Preparation: '}</span>
                  {bereidingsTips}
                </p>
              )}
              {eetbareDelen && eetbareDelen.length > 0 && (
                <p className="text-gray-700">
                  <span className="font-medium text-amber-700">{taal === 'nl' ? 'Eetbare delen: ' : 'Edible parts: '}</span>
                  {eetbareDelen.join(', ')}
                </p>
              )}
              {bereidingswijzen && bereidingswijzen.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {bereidingswijzen.map((wijze, i) => (
                    <span key={i} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                      {wijze}
                    </span>
                  ))}
                </div>
              )}
              {voedingswaarde && (
                <p className="text-gray-700 mt-2">
                  <span className="font-medium text-amber-700">{taal === 'nl' ? 'Voedingswaarde: ' : 'Nutritional value: '}</span>
                  {voedingswaarde}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Grid - compact met emoji's */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat
          emoji="🌡️"
          label={taal === 'nl' ? 'Vorst' : 'Frost'}
          value={gewas.vorst_en_seizoen?.vorstgevoelig
            ? (taal === 'nl' ? 'Vorstgevoelig' : 'Frost sensitive')
            : (taal === 'nl' ? 'Vorstbestendig' : 'Frost hardy')}
          colorClass={gewas.vorst_en_seizoen?.vorstgevoelig ? 'bg-amber-100' : 'bg-green-100'}
        />
        <QuickStat
          emoji="☀️"
          label={taal === 'nl' ? 'Standplaats' : 'Location'}
          value={t(
            gewas.groeiomstandigheden?.standplaats,
            gewas.groeiomstandigheden?.standplaats_en
          )}
          colorClass="bg-yellow-100"
        />
        <QuickStat
          emoji="💧"
          label="Water"
          value={t(
            gewas.groeiomstandigheden?.water_behoefte || gewas.groeiomstandigheden?.water,
            gewas.groeiomstandigheden?.water_behoefte_en || gewas.groeiomstandigheden?.water_en
          )}
          colorClass="bg-blue-100"
        />
        <QuickStat
          emoji="🥗"
          label={taal === 'nl' ? 'Voeding' : 'Nutrients'}
          value={t(
            gewas.groeiomstandigheden?.voeding,
            gewas.groeiomstandigheden?.voeding_en
          )}
          colorClass="bg-green-100"
        />
      </div>

      {/* Accordions */}
      <div className="space-y-3">
        {/* Groeiomstandigheden - volledige teksten */}
        {gewas.groeiomstandigheden && (
          <Accordion
            title={taal === 'nl' ? 'Groeiomstandigheden' : 'Growing Conditions'}
            icon={<Sun className="w-5 h-5" />}
            defaultOpen
          >
            <div className="space-y-4">
              {/* Standplaats */}
              {gewas.groeiomstandigheden.standplaats && (
                <div>
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>☀️</span> {taal === 'nl' ? 'Standplaats' : 'Location'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t(gewas.groeiomstandigheden.standplaats, gewas.groeiomstandigheden.standplaats_en)}
                  </p>
                </div>
              )}

              {/* Grondsoort */}
              {(gewas.groeiomstandigheden.grondsoort || gewas.groeiomstandigheden.bodem) && (
                <div>
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>🪨</span> {taal === 'nl' ? 'Grondsoort' : 'Soil type'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t(
                      gewas.groeiomstandigheden.grondsoort || gewas.groeiomstandigheden.bodem,
                      gewas.groeiomstandigheden.grondsoort_en || gewas.groeiomstandigheden.bodem_en
                    )}
                  </p>
                </div>
              )}

              {/* pH voorkeur */}
              {gewas.groeiomstandigheden.pH && (
                <div>
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>⚗️</span> pH {taal === 'nl' ? 'voorkeur' : 'preference'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{gewas.groeiomstandigheden.pH}</p>
                </div>
              )}

              {/* Waterbehoefte */}
              {(gewas.groeiomstandigheden.water_behoefte || gewas.groeiomstandigheden.water) && (
                <div>
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>💧</span> {taal === 'nl' ? 'Waterbehoefte' : 'Water needs'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t(
                      gewas.groeiomstandigheden.water_behoefte || gewas.groeiomstandigheden.water,
                      gewas.groeiomstandigheden.water_behoefte_en || gewas.groeiomstandigheden.water_en
                    )}
                  </p>
                </div>
              )}

              {/* Voeding */}
              {gewas.groeiomstandigheden.voeding && (
                <div>
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>🥗</span> {taal === 'nl' ? 'Voeding' : 'Nutrients'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t(gewas.groeiomstandigheden.voeding, gewas.groeiomstandigheden.voeding_en)}
                  </p>
                </div>
              )}

              {/* Temperatuur */}
              {gewas.groeiomstandigheden.temperatuur && (
                <div>
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>🌡️</span> {taal === 'nl' ? 'Temperatuur' : 'Temperature'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t(gewas.groeiomstandigheden.temperatuur, gewas.groeiomstandigheden.temperatuur_en)}
                  </p>
                </div>
              )}
            </div>
          </Accordion>
        )}

        {/* Zaaien en Kiemen */}
        {gewas.zaaien_en_kiemen && (
          <Accordion
            title={taal === 'nl' ? 'Zaaien & Kiemen' : 'Sowing & Germination'}
            icon={<Sprout className="w-5 h-5" />}
          >
            <div className="space-y-1">
              <InfoRow
                label={taal === 'nl' ? 'Zaaiperiode' : 'Sowing period'}
                value={t(
                  gewas.zaaien_en_kiemen.zaaiperiode,
                  gewas.zaaien_en_kiemen.zaaiperiode_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Zaaimethode' : 'Sowing method'}
                value={t(
                  gewas.zaaien_en_kiemen.zaaimethode,
                  gewas.zaaien_en_kiemen.zaaimethode_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Zaaiafstand' : 'Sowing distance'}
                value={gewas.zaaien_en_kiemen.zaaiafstand}
              />
              <InfoRow
                label={taal === 'nl' ? 'Zaaidiepte' : 'Sowing depth'}
                value={gewas.zaaien_en_kiemen.zaai_diepte}
              />
              <InfoRow
                label={taal === 'nl' ? 'Kiemtemperatuur' : 'Germination temp'}
                value={gewas.zaaien_en_kiemen.kiemtemperatuur || (
                  gewas.zaaien_en_kiemen.kiemtemperatuur_min !== undefined && gewas.zaaien_en_kiemen.kiemtemperatuur_optimaal !== undefined
                    ? `${gewas.zaaien_en_kiemen.kiemtemperatuur_min}°C - ${gewas.zaaien_en_kiemen.kiemtemperatuur_optimaal}°C`
                    : undefined
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Kiemduur' : 'Germination time'}
                value={t(
                  gewas.zaaien_en_kiemen.kiemduur,
                  gewas.zaaien_en_kiemen.kiemduur_en
                )}
              />
              {gewas.zaaien_en_kiemen.koudekiemer !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Koudekiemer' : 'Cold germinator'}
                  value={gewas.zaaien_en_kiemen.koudekiemer ? '✅ Ja' : '❌ Nee'}
                />
              )}
              {gewas.zaaien_en_kiemen.lichtkiem !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Lichtkiem' : 'Light germinator'}
                  value={gewas.zaaien_en_kiemen.lichtkiem ? '✅ Ja' : '❌ Nee'}
                />
              )}
              {gewas.zaaien_en_kiemen.voorzaaien_nodig !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Voorzaaien nodig' : 'Pre-sowing needed'}
                  value={gewas.zaaien_en_kiemen.voorzaaien_nodig ? '✅ Ja' : '❌ Nee'}
                />
              )}
              <InfoRow
                label={taal === 'nl' ? 'Voorzaaien tips' : 'Pre-sowing tips'}
                value={t(
                  gewas.zaaien_en_kiemen.voorzaaien_tips,
                  gewas.zaaien_en_kiemen.voorzaaien_tips_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Zaaiadvies' : 'Sowing advice'}
                value={t(
                  gewas.zaaien_en_kiemen.zaaiadvies,
                  gewas.zaaien_en_kiemen.zaaiadvies_en
                )}
              />
            </div>
          </Accordion>
        )}

        {/* Vorst en Seizoen */}
        {gewas.vorst_en_seizoen && (
          <Accordion
            title={taal === 'nl' ? 'Vorst & Seizoen' : 'Frost & Season'}
            icon={<Thermometer className="w-5 h-5" />}
          >
            <div className="space-y-1">
              {gewas.vorst_en_seizoen.vorstgevoelig !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Vorstgevoelig' : 'Frost sensitive'}
                  value={gewas.vorst_en_seizoen.vorstgevoelig ? '✅ Ja' : '❌ Nee'}
                />
              )}
              <InfoRow
                label={taal === 'nl' ? 'Vorstgevoeligheid' : 'Frost sensitivity'}
                value={t(
                  gewas.vorst_en_seizoen.vorstgevoeligheid,
                  gewas.vorst_en_seizoen.vorstgevoeligheid_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Vorst tolerantie' : 'Frost tolerance'}
                value={t(
                  gewas.vorst_en_seizoen.vorst_tolerantie,
                  gewas.vorst_en_seizoen.vorst_tolerantie_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Minimum temperatuur' : 'Min temperature'}
                value={gewas.vorst_en_seizoen.minimumtemperatuur}
              />
              <InfoRow
                label={taal === 'nl' ? 'Optimale temperatuur' : 'Optimal temp'}
                value={gewas.vorst_en_seizoen.optimale_temperatuur}
              />
              <InfoRow
                label={taal === 'nl' ? 'Teeltduur' : 'Growing time'}
                value={t(
                  gewas.vorst_en_seizoen.teeltduur,
                  gewas.vorst_en_seizoen.teeltduur_en
                )}
              />
              {gewas.vorst_en_seizoen.oogsten_voor_vorst !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Oogsten voor vorst' : 'Harvest before frost'}
                  value={gewas.vorst_en_seizoen.oogsten_voor_vorst ? '✅ Ja' : '❌ Nee'}
                />
              )}
              {gewas.vorst_en_seizoen.vorst_verbetert_smaak !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Vorst verbetert smaak' : 'Frost improves taste'}
                  value={gewas.vorst_en_seizoen.vorst_verbetert_smaak ? '✅ Ja' : '❌ Nee'}
                />
              )}
              {gewas.vorst_en_seizoen.overwinterbaar !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Overwinterbaar' : 'Can overwinter'}
                  value={gewas.vorst_en_seizoen.overwinterbaar ? '✅ Ja' : '❌ Nee'}
                />
              )}
              <InfoRow
                label={taal === 'nl' ? 'Seizoen tips' : 'Season tips'}
                value={t(
                  gewas.vorst_en_seizoen.seizoen_tips,
                  gewas.vorst_en_seizoen.seizoen_tips_en
                )}
              />
            </div>
          </Accordion>
        )}

        {/* Permacultuur */}
        {gewas.permacultuur && (
          <Accordion
            title={taal === 'nl' ? 'Permacultuur' : 'Permaculture'}
            icon={<RefreshCw className="w-5 h-5" />}
          >
            <div className="space-y-4">
              {/* Goede buren */}
              {gewas.permacultuur.goede_buren && gewas.permacultuur.goede_buren.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                      {taal === 'nl' ? 'Goede buren' : 'Good companions'}
                    </h4>
                  </div>
                  <TagList
                    items={taal === 'en' && gewas.permacultuur.goede_buren_en?.length
                      ? gewas.permacultuur.goede_buren_en
                      : gewas.permacultuur.goede_buren}
                    colorClass="bg-green-100 text-green-700"
                  />
                </div>
              )}

              {/* Slechte buren */}
              {gewas.permacultuur.slechte_buren && gewas.permacultuur.slechte_buren.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HeartOff className="w-4 h-4 text-red-600" />
                    <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
                      {taal === 'nl' ? 'Vermijd naast' : 'Avoid near'}
                    </h4>
                  </div>
                  <TagList
                    items={taal === 'en' && gewas.permacultuur.slechte_buren_en?.length
                      ? gewas.permacultuur.slechte_buren_en
                      : gewas.permacultuur.slechte_buren}
                    colorClass="bg-red-100 text-red-700"
                  />
                </div>
              )}

              {/* Goede voorteelt */}
              {gewas.permacultuur.goede_voorteelt && gewas.permacultuur.goede_voorteelt.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    {taal === 'nl' ? 'Goede voorteelt' : 'Good preceding crops'}
                  </h4>
                  <TagList
                    items={taal === 'en' && gewas.permacultuur.goede_voorteelt_en?.length
                      ? gewas.permacultuur.goede_voorteelt_en
                      : gewas.permacultuur.goede_voorteelt}
                    colorClass="bg-tuin-100 text-tuin-700"
                  />
                </div>
              )}

              {/* Goede nateelt */}
              {gewas.permacultuur.goede_nateelt && gewas.permacultuur.goede_nateelt.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    {taal === 'nl' ? 'Goede nateelt' : 'Good following crops'}
                  </h4>
                  <TagList
                    items={taal === 'en' && gewas.permacultuur.goede_nateelt_en?.length
                      ? gewas.permacultuur.goede_nateelt_en
                      : gewas.permacultuur.goede_nateelt}
                    colorClass="bg-tuin-100 text-tuin-700"
                  />
                </div>
              )}

              {/* Gewasrotatie info */}
              {(gewas.permacultuur.gewasrotatie_groep || gewas.permacultuur.gewasrotatie_jaren || gewas.permacultuur.gewasrotatie) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    {taal === 'nl' ? 'Vruchtwisseling' : 'Crop rotation'}
                  </h4>
                  <div className="space-y-1 text-sm">
                    {gewas.permacultuur.gewasrotatie_groep && (
                      <p className="text-gray-700">
                        <span className="font-medium">{taal === 'nl' ? 'Groep: ' : 'Group: '}</span>
                        {t(gewas.permacultuur.gewasrotatie_groep, gewas.permacultuur.gewasrotatie_groep_en)}
                      </p>
                    )}
                    {gewas.permacultuur.gewasrotatie_jaren && (
                      <p className="text-gray-700">
                        <span className="font-medium">{taal === 'nl' ? 'Wachttijd: ' : 'Wait time: '}</span>
                        {t(gewas.permacultuur.gewasrotatie_jaren, gewas.permacultuur.gewasrotatie_jaren_en)}
                      </p>
                    )}
                    {gewas.permacultuur.gewasrotatie && (
                      <p className="text-gray-700 mt-1">
                        {t(
                          gewas.permacultuur.gewasrotatie,
                          gewas.permacultuur.gewasrotatie_en
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Functies in de tuin */}
              {gewas.permacultuur.functies_in_tuin && gewas.permacultuur.functies_in_tuin.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    {taal === 'nl' ? 'Functies in de tuin' : 'Garden functions'}
                  </h4>
                  <TagList
                    items={taal === 'en' && gewas.permacultuur.functies_in_tuin_en?.length
                      ? gewas.permacultuur.functies_in_tuin_en
                      : gewas.permacultuur.functies_in_tuin}
                    colorClass="bg-amber-100 text-amber-700"
                  />
                </div>
              )}

              {/* Oude functies veld (fallback) */}
              {!gewas.permacultuur.functies_in_tuin && gewas.permacultuur.functies && gewas.permacultuur.functies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    {taal === 'nl' ? 'Functies in de tuin' : 'Garden functions'}
                  </h4>
                  <TagList
                    items={taal === 'en' && gewas.permacultuur.functies_en?.length
                      ? gewas.permacultuur.functies_en
                      : gewas.permacultuur.functies}
                    colorClass="bg-amber-100 text-amber-700"
                  />
                </div>
              )}

              {/* Gevoeligheden */}
              {gewas.permacultuur.gevoeligheden && gewas.permacultuur.gevoeligheden.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-orange-600 mb-2">
                    {taal === 'nl' ? 'Let op' : 'Watch out'}
                  </h4>
                  <TagList
                    items={taal === 'en' && gewas.permacultuur.gevoeligheden_en?.length
                      ? gewas.permacultuur.gevoeligheden_en
                      : gewas.permacultuur.gevoeligheden}
                    colorClass="bg-orange-100 text-orange-700"
                  />
                </div>
              )}
            </div>
          </Accordion>
        )}

        {/* Ziektes en Plagen */}
        {gewas.ziektes_en_plagen && (
          <Accordion
            title={taal === 'nl' ? 'Ziektes & Plagen' : 'Diseases & Pests'}
            icon={<Bug className="w-5 h-5" />}
          >
            <div className="space-y-4">
              {gewas.ziektes_en_plagen.veelvoorkomend && gewas.ziektes_en_plagen.veelvoorkomend.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    {taal === 'nl' ? 'Veelvoorkomend' : 'Common issues'}
                  </h4>
                  <TagList
                    items={gewas.ziektes_en_plagen.veelvoorkomend}
                    colorClass="bg-red-100 text-red-700"
                  />
                </div>
              )}

              {/* Symptomen */}
              {gewas.ziektes_en_plagen.symptomen && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">
                    {taal === 'nl' ? 'Symptomen' : 'Symptoms'}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {t(
                      gewas.ziektes_en_plagen.symptomen,
                      gewas.ziektes_en_plagen.symptomen_en
                    )}
                  </p>
                </div>
              )}

              {gewas.ziektes_en_plagen.preventie && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">
                    {taal === 'nl' ? 'Preventie' : 'Prevention'}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {t(
                      gewas.ziektes_en_plagen.preventie,
                      gewas.ziektes_en_plagen.preventie_en
                    )}
                  </p>
                </div>
              )}

              {gewas.ziektes_en_plagen.bestrijding && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">
                    {taal === 'nl' ? 'Bestrijding' : 'Treatment'}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {t(
                      gewas.ziektes_en_plagen.bestrijding,
                      gewas.ziektes_en_plagen.bestrijding_en
                    )}
                  </p>
                </div>
              )}

              {/* Biologische bestrijding */}
              {gewas.ziektes_en_plagen.bestrijding_biologisch && (
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-green-700 mb-1">
                    {taal === 'nl' ? 'Biologische bestrijding' : 'Biological control'}
                  </h4>
                  <p className="text-sm text-green-800">
                    {t(
                      gewas.ziektes_en_plagen.bestrijding_biologisch,
                      gewas.ziektes_en_plagen.bestrijding_biologisch_en
                    )}
                  </p>
                </div>
              )}

              {/* Resistentie tips */}
              {gewas.ziektes_en_plagen.resistentie_tips && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-700 mb-1">
                    {taal === 'nl' ? 'Resistentie tips' : 'Resistance tips'}
                  </h4>
                  <p className="text-sm text-blue-800">
                    {t(
                      gewas.ziektes_en_plagen.resistentie_tips,
                      gewas.ziektes_en_plagen.resistentie_tips_en
                    )}
                  </p>
                </div>
              )}
            </div>
          </Accordion>
        )}

        {/* Oogst en Bewaren */}
        {gewas.oogst_en_bewaren && (
          <Accordion
            title={taal === 'nl' ? 'Oogst & Bewaren' : 'Harvest & Storage'}
            icon={<Package className="w-5 h-5" />}
          >
            <div className="space-y-1">
              <InfoRow
                label={taal === 'nl' ? 'Oogstperiode' : 'Harvest period'}
                value={t(
                  gewas.oogst_en_bewaren.oogstperiode,
                  gewas.oogst_en_bewaren.oogstperiode_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Oogst indicatie' : 'Harvest indication'}
                value={t(
                  gewas.oogst_en_bewaren.oogst_indicatie,
                  gewas.oogst_en_bewaren.oogst_indicatie_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Oogstmethode' : 'Harvest method'}
                value={t(
                  gewas.oogst_en_bewaren.oogstmethode,
                  gewas.oogst_en_bewaren.oogstmethode_en
                )}
              />
              {gewas.oogst_en_bewaren.dooroogsten_mogelijk !== undefined && (
                <InfoRow
                  label={taal === 'nl' ? 'Dooroogsten mogelijk' : 'Continuous harvest'}
                  value={gewas.oogst_en_bewaren.dooroogsten_mogelijk ? '✅ Ja' : '❌ Nee'}
                />
              )}
              <InfoRow
                label={taal === 'nl' ? 'Houdbaarheid vers' : 'Fresh shelf life'}
                value={t(
                  gewas.oogst_en_bewaren.houdbaarheid_vers,
                  gewas.oogst_en_bewaren.houdbaarheid_vers_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Bewaartijd' : 'Storage time'}
                value={t(
                  gewas.oogst_en_bewaren.bewaartijd,
                  gewas.oogst_en_bewaren.bewaartijd_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Bewaarwijze' : 'Storage method'}
                value={t(
                  gewas.oogst_en_bewaren.bewaarwijze,
                  gewas.oogst_en_bewaren.bewaarwijze_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Bewaarmethode' : 'Storage technique'}
                value={t(
                  gewas.oogst_en_bewaren.bewaar_methode,
                  gewas.oogst_en_bewaren.bewaar_methode_en
                )}
              />
              <InfoRow
                label={taal === 'nl' ? 'Conserveren' : 'Preserving'}
                value={t(
                  gewas.oogst_en_bewaren.conserveren,
                  gewas.oogst_en_bewaren.conserveren_en
                )}
              />
            </div>
          </Accordion>
        )}

        {/* Zaad en Vermeerdering */}
        {gewas.zaad_en_vermeerdering && (
          <Accordion
            title={taal === 'nl' ? 'Zaad & Vermeerdering' : 'Seeds & Propagation'}
            icon={<Sprout className="w-5 h-5" />}
          >
            <div className="space-y-4">
              {/* Zaad info */}
              <div className="space-y-1">
                {gewas.zaad_en_vermeerdering.zaad_winnen_mogelijk !== undefined && (
                  <InfoRow
                    label={taal === 'nl' ? 'Zaad winnen mogelijk' : 'Seed saving possible'}
                    value={gewas.zaad_en_vermeerdering.zaad_winnen_mogelijk ? '✅ Ja' : '❌ Nee'}
                  />
                )}
                <InfoRow
                  label={taal === 'nl' ? 'Moeilijkheid' : 'Difficulty'}
                  value={t(
                    gewas.zaad_en_vermeerdering.zaad_winnen_moeilijkheid,
                    gewas.zaad_en_vermeerdering.zaad_winnen_moeilijkheid_en
                  )}
                />
                <InfoRow
                  label={taal === 'nl' ? 'Zaadwinning' : 'Seed saving'}
                  value={t(
                    gewas.zaad_en_vermeerdering.zaadwinning,
                    gewas.zaad_en_vermeerdering.zaadwinning_en
                  )}
                />
                <InfoRow
                  label={taal === 'nl' ? 'Zaad winnen tips' : 'Seed saving tips'}
                  value={t(
                    gewas.zaad_en_vermeerdering.zaad_winnen_tips,
                    gewas.zaad_en_vermeerdering.zaad_winnen_tips_en
                  )}
                />
                {gewas.zaad_en_vermeerdering.zelfbestuivend !== undefined && (
                  <InfoRow
                    label={taal === 'nl' ? 'Zelfbestuivend' : 'Self-pollinating'}
                    value={gewas.zaad_en_vermeerdering.zelfbestuivend ? '✅ Ja' : '❌ Nee'}
                  />
                )}
                <InfoRow
                  label={taal === 'nl' ? 'Kruisbestuiving risico' : 'Cross-pollination risk'}
                  value={t(
                    gewas.zaad_en_vermeerdering.kruisbestuiving_risico,
                    gewas.zaad_en_vermeerdering.kruisbestuiving_risico_en
                  )}
                />
                <InfoRow
                  label={taal === 'nl' ? 'Kiemkracht' : 'Germination rate'}
                  value={t(
                    gewas.zaad_en_vermeerdering.kiemkracht,
                    gewas.zaad_en_vermeerdering.kiemkracht_en
                  )}
                />
              </div>

              {/* Andere vermeerdering */}
              {gewas.zaad_en_vermeerdering.andere_vermeerdering && (
                <div className="bg-tuin-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-tuin-700 mb-1">
                    {taal === 'nl' ? 'Andere vermeerdering' : 'Other propagation'}
                  </h4>
                  <p className="text-sm text-tuin-800">
                    {t(
                      gewas.zaad_en_vermeerdering.andere_vermeerdering,
                      gewas.zaad_en_vermeerdering.andere_vermeerdering_en
                    )}
                  </p>
                </div>
              )}
            </div>
          </Accordion>
        )}

        {/* Varianten met Teeltkalender */}
        {gewas.varianten && gewas.varianten.length > 0 && (
          <Accordion
            title={taal === 'nl' ? 'Varianten & Teeltkalender' : 'Varieties & Calendar'}
            icon={<Calendar className="w-5 h-5" />}
          >
            <div className="space-y-4">
              {gewas.varianten.map((variant, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-gray-800">{variant.naam || (taal === 'nl' ? 'Onbekend' : 'Unknown')}</h4>
                  {variant.beschrijving && (
                    <p className="text-sm text-gray-600 mt-1">
                      {t(variant.beschrijving, variant.beschrijving_en)}
                    </p>
                  )}

                  {/* Teeltkalender voor variant */}
                  {(variant.voorzaaien_start || variant.zaaien_start || variant.planten_start || variant.oogst_start) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {taal === 'nl' ? 'Teeltkalender' : 'Growing Calendar'}
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(variant.voorzaaien_start || variant.voorzaaien_eind) && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            <span className="text-gray-600">
                              {taal === 'nl' ? 'Voorzaaien: ' : 'Pre-sow: '}
                              {variant.voorzaaien_start || '?'} - {variant.voorzaaien_eind || '?'}
                            </span>
                          </div>
                        )}
                        {(variant.zaaien_start || variant.zaaien_eind) && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            <span className="text-gray-600">
                              {taal === 'nl' ? 'Zaaien: ' : 'Sow: '}
                              {variant.zaaien_start || '?'} - {variant.zaaien_eind || '?'}
                            </span>
                          </div>
                        )}
                        {(variant.planten_start || variant.planten_eind) && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-tuin-400"></span>
                            <span className="text-gray-600">
                              {taal === 'nl' ? 'Planten: ' : 'Plant: '}
                              {variant.planten_start || '?'} - {variant.planten_eind || '?'}
                            </span>
                          </div>
                        )}
                        {(variant.oogst_start || variant.oogst_eind) && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            <span className="text-gray-600">
                              {taal === 'nl' ? 'Oogst: ' : 'Harvest: '}
                              {variant.oogst_start || '?'} - {variant.oogst_eind || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Accordion>
        )}

        {/* Tips voor Beginners - ondersteunt zowel geneste als platte velden */}
        {(veelgemaakteFouten?.length || praktischeTips?.length) && (
          <Accordion
            title={taal === 'nl' ? 'Tips voor Beginners' : 'Tips for Beginners'}
            icon={<Lightbulb className="w-5 h-5" />}
          >
            <div className="space-y-6">
              {/* Veelgemaakte fouten */}
              {veelgemaakteFouten && veelgemaakteFouten.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                    <span>❌</span> {taal === 'nl' ? 'Veelgemaakte fouten' : 'Common mistakes'}
                  </h4>
                  <ul className="space-y-3">
                    {veelgemaakteFouten.map((fout, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 bg-red-50 p-3 rounded-lg border-l-4 border-red-400"
                      >
                        <span className="text-red-500 mt-0.5">⚠️</span>
                        <span className="text-sm text-gray-700">{fout}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Praktische tips */}
              {praktischeTips && praktischeTips.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                    <span>✅</span> {taal === 'nl' ? 'Praktische tips' : 'Practical tips'}
                  </h4>
                  <ul className="space-y-3">
                    {praktischeTips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border-l-4 border-green-400"
                      >
                        <span className="text-green-500 mt-0.5">💡</span>
                        <span className="text-sm text-gray-700">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Accordion>
        )}
      </div>

      {/* Varianten in onze tuin (uit gewassenlijst) */}
      {tuinVarianten.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <Sprout className="w-4 h-4" />
            {taal === 'nl' ? 'Varianten in onze tuin' : 'Varieties in our garden'}
          </h3>
          <ul className="space-y-2">
            {tuinVarianten.map((variant) => (
              <li key={variant.id} className="text-sm flex items-center gap-2">
                <span className="text-gray-800">{variant.variant || variant.gewasSoort}</span>
                {variant.link && (
                  <a
                    href={variant.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tuin-600 hover:text-tuin-700 text-xs flex items-center gap-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{new URL(variant.link).hostname.replace('www.', '')}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bronnen */}
      {gewas.bronnen && gewas.bronnen.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span>📚</span>
            {taal === 'nl' ? 'Bronnen' : 'Sources'}
          </h3>
          <ul className="space-y-2">
            {gewas.bronnen.map((bron, i) => (
              <li key={i} className="text-sm">
                <a
                  href={bron.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tuin-600 hover:text-tuin-700 hover:underline font-medium flex items-center gap-1"
                >
                  {bron.naam || 'Bron'}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {bron.samenvatting && (
                  <p className="text-gray-500 text-xs mt-0.5">
                    {t(bron.samenvatting, bron.samenvatting_en)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata footer */}
      {gewas.verrijkt_op && (
        <p className="text-center text-xs text-gray-400">
          {taal === 'nl' ? 'Laatst bijgewerkt' : 'Last updated'}:{' '}
          {new Date(gewas.verrijkt_op).toLocaleDateString(taal === 'nl' ? 'nl-NL' : 'en-US')}
        </p>
      )}
    </div>
  );
}

export default GewasDetailPage;
