import { useState } from 'react';
import {
  MessageCircle,
  Plus,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Heart,
  X,
  Check,
  Eye,
  Send,
  MapPin,
  User,
  Clock,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { nuISO, formatDatumTijd } from '../utils/dateUtils';
import type { Signalering, SignaleringType, Sectie, SECTIES } from '../types';
import { TranslatedText } from './TranslatedText';
import { vertaalNaarEngels } from '../services/translationService';

const SECTIES_LIJST: (Sectie | '')[] = ['', 'A', 'B', 'C', 'D', 'E', 'Kas'];

export function Signaleringen() {
  const { state, isCommissie, saveSignalering, deleteSignalering, toonToast } = useApp();
  const { taal, t } = useI18n();
  const [toonFormulier, setToonFormulier] = useState(false);

  const signaleringen = state.data.signaleringen || [];

  // Sorteer: nieuw eerst, dan gezien, dan afgehandeld
  const gesorteerdeSignaleringen = [...signaleringen].sort((a, b) => {
    const statusOrder = { nieuw: 0, gezien: 1, afgehandeld: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.aangemaakt).getTime() - new Date(a.aangemaakt).getTime();
  });

  const nieuweCount = signaleringen.filter(s => s.status === 'nieuw').length;

  const handleMarkeerGezien = async (sig: Signalering) => {
    await saveSignalering({ ...sig, status: 'gezien' });
    toonToast('info', taal === 'nl' ? 'Gemarkeerd als gezien' : 'Marked as seen');
  };

  const handleReageer = async (sig: Signalering, reactie: string) => {
    // Vertaal de reactie
    const reactie_en = await vertaalNaarEngels(reactie);

    const updateData: Partial<Signalering> & { id: string } = {
      ...sig,
      status: 'afgehandeld',
      reactie,
      reactieDoor: state.ui.gebruikersnaam || (taal === 'nl' ? 'Commissie' : 'Committee'),
      reactieDatum: nuISO()
    };

    if (reactie_en) {
      updateData.reactie_en = reactie_en;
    }

    await saveSignalering(updateData as Signalering);
    toonToast('success', taal === 'nl' ? 'Reactie geplaatst' : 'Reply posted');
  };

  const handleVerwijder = async (sig: Signalering) => {
    const bevestig = window.confirm(
      taal === 'nl'
        ? `Weet je zeker dat je dit bericht van ${sig.afzender} wilt verwijderen?`
        : `Are you sure you want to delete this message from ${sig.afzender}?`
    );
    if (bevestig) {
      await deleteSignalering(sig.id);
      toonToast('success', taal === 'nl' ? 'Bericht verwijderd' : 'Message deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-tuin-800 flex items-center gap-2">
            <MessageCircle className="w-7 h-7" />
            {t.messages.title}
            {nieuweCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-sm rounded-full">
                {nieuweCount} {taal === 'nl' ? 'nieuw' : 'new'}
              </span>
            )}
          </h2>
          <p className="text-gray-500 mt-1">
            {isCommissie
              ? (taal === 'nl' ? 'Bekijk berichten van de community' : 'View messages from the community')
              : (taal === 'nl' ? 'Laat een bericht achter voor de tuincommissie' : 'Leave a message for the garden committee')}
          </p>
        </div>
        <button
          onClick={() => setToonFormulier(true)}
          className="flex items-center gap-2 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t.messages.newMessage}
        </button>
      </div>

      {/* Signaleringen lijst */}
      <div className="space-y-4">
        {gesorteerdeSignaleringen.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{taal === 'nl' ? 'Nog geen signaleringen' : 'No messages yet'}</p>
            <button
              onClick={() => setToonFormulier(true)}
              className="mt-3 text-tuin-600 hover:text-tuin-700 font-medium"
            >
              + {taal === 'nl' ? 'Plaats het eerste bericht' : 'Post the first message'}
            </button>
          </div>
        ) : (
          gesorteerdeSignaleringen.map(sig => (
            <SignaleringKaart
              key={sig.id}
              signalering={sig}
              isCommissie={isCommissie}
              onMarkeerGezien={() => handleMarkeerGezien(sig)}
              onReageer={(reactie) => handleReageer(sig, reactie)}
              onVerwijder={() => handleVerwijder(sig)}
            />
          ))
        )}
      </div>

      {/* Nieuw bericht formulier */}
      {toonFormulier && (
        <SignaleringFormulier
          onClose={() => setToonFormulier(false)}
          onSave={async (sig) => {
            await saveSignalering(sig);
            setToonFormulier(false);
            toonToast('success', taal === 'nl' ? 'Bericht verzonden!' : 'Message sent!');
          }}
        />
      )}
    </div>
  );
}

// Signalering kaart component
interface SignaleringKaartProps {
  signalering: Signalering;
  isCommissie: boolean;
  onMarkeerGezien: () => void;
  onReageer: (reactie: string) => void;
  onVerwijder: () => void;
}

function SignaleringKaart({ signalering, isCommissie, onMarkeerGezien, onReageer, onVerwijder }: SignaleringKaartProps) {
  const { taal, t } = useI18n();
  const [toonReactieVeld, setToonReactieVeld] = useState(false);
  const [reactie, setReactie] = useState('');

  // Type info met vertalingen
  const getTypeInfo = (type: SignaleringType) => {
    const types = {
      probleem: { label: t.messages.types.problem, icon: AlertTriangle, kleur: 'text-red-500 bg-red-50 border-red-200' },
      vraag: { label: t.messages.types.question, icon: HelpCircle, kleur: 'text-blue-500 bg-blue-50 border-blue-200' },
      suggestie: { label: t.messages.types.suggestion, icon: Lightbulb, kleur: 'text-amber-500 bg-amber-50 border-amber-200' },
      compliment: { label: t.messages.types.compliment, icon: Heart, kleur: 'text-pink-500 bg-pink-50 border-pink-200' },
    };
    return types[type] || types.probleem;
  };

  const typeInfo = getTypeInfo(signalering.type);
  const Icon = typeInfo.icon;

  const handleVerstuurReactie = () => {
    if (reactie.trim()) {
      onReageer(reactie.trim());
      setToonReactieVeld(false);
      setReactie('');
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${
      signalering.status === 'nieuw' ? 'border-l-red-500' :
      signalering.status === 'gezien' ? 'border-l-amber-500' :
      'border-l-green-500'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeInfo.kleur}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeInfo.kleur}`}>
                {typeInfo.label}
              </span>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <User className="w-3.5 h-3.5" />
                <span>{signalering.afzender}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDatumTijd(signalering.aangemaakt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {signalering.status === 'nieuw' && isCommissie && (
              <button
                onClick={onMarkeerGezien}
                className="p-1.5 text-gray-400 hover:text-amber-600 rounded"
                title={taal === 'nl' ? 'Markeer als gezien' : 'Mark as seen'}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {isCommissie && (
              <button
                onClick={onVerwijder}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                title={taal === 'nl' ? 'Verwijder bericht' : 'Delete message'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <span className={`text-xs px-2 py-1 rounded ${
              signalering.status === 'nieuw' ? 'bg-red-100 text-red-700' :
              signalering.status === 'gezien' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {signalering.status === 'nieuw' ? t.messages.statuses.new :
               signalering.status === 'gezien' ? t.messages.statuses.seen : t.messages.statuses.handled}
            </span>
          </div>
        </div>

        {/* Locatie */}
        {(signalering.sectie || signalering.bedId) && (
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>
              {signalering.sectie && `${taal === 'nl' ? 'Sectie' : 'Section'} ${signalering.sectie}`}
              {signalering.bedId && ` - ${taal === 'nl' ? 'Bed' : 'Bed'} ${signalering.bedId}`}
            </span>
          </div>
        )}

        {/* Bericht */}
        <p className="mt-3 text-gray-700">
          <TranslatedText nl={signalering.bericht} en={signalering.bericht_en} />
        </p>

        {/* Reactie van commissie */}
        {signalering.reactie && (
          <div className="mt-4 p-3 bg-tuin-50 rounded-lg border border-tuin-200">
            <div className="flex items-center gap-2 text-sm text-tuin-700 font-medium mb-1">
              <Check className="w-4 h-4" />
              {taal === 'nl' ? 'Reactie van' : 'Reply from'} {signalering.reactieDoor}
            </div>
            <p className="text-gray-700">
              <TranslatedText nl={signalering.reactie} en={signalering.reactie_en} />
            </p>
            {signalering.reactieDatum && (
              <p className="text-xs text-gray-500 mt-1">
                {formatDatumTijd(signalering.reactieDatum)}
              </p>
            )}
          </div>
        )}

        {/* Reageer knop (alleen voor commissie) */}
        {isCommissie && signalering.status !== 'afgehandeld' && (
          <div className="mt-4">
            {toonReactieVeld ? (
              <div className="space-y-2">
                <textarea
                  value={reactie}
                  onChange={e => setReactie(e.target.value)}
                  placeholder={taal === 'nl' ? 'Typ je reactie...' : 'Type your reply...'}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setToonReactieVeld(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleVerstuurReactie}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-tuin-600 text-white rounded hover:bg-tuin-700"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t.messages.send}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setToonReactieVeld(true)}
                className="text-sm text-tuin-600 hover:text-tuin-700 font-medium"
              >
                + {t.messages.reply}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Nieuw bericht formulier
interface SignaleringFormulierProps {
  onClose: () => void;
  onSave: (signalering: Signalering) => void;
}

function SignaleringFormulier({ onClose, onSave }: SignaleringFormulierProps) {
  const { state } = useApp();
  const { taal, t } = useI18n();

  const [formData, setFormData] = useState({
    type: 'probleem' as SignaleringType,
    bericht: '',
    sectie: '' as Sectie | '',
    bedId: '',
    afzender: state.ui.gebruikersnaam || ''
  });

  // Type opties met vertalingen
  const typeOpties: { type: SignaleringType; label: string; icon: typeof AlertTriangle; kleur: string }[] = [
    { type: 'probleem', label: t.messages.types.problem, icon: AlertTriangle, kleur: 'text-red-500 bg-red-50 border-red-200' },
    { type: 'vraag', label: t.messages.types.question, icon: HelpCircle, kleur: 'text-blue-500 bg-blue-50 border-blue-200' },
    { type: 'suggestie', label: t.messages.types.suggestion, icon: Lightbulb, kleur: 'text-amber-500 bg-amber-50 border-amber-200' },
    { type: 'compliment', label: t.messages.types.compliment, icon: Heart, kleur: 'text-pink-500 bg-pink-50 border-pink-200' },
  ];

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.afzender.trim()) {
      alert(taal === 'nl' ? 'Vul je naam in' : 'Please enter your name');
      return;
    }

    setIsSaving(true);

    try {
      // Vertaal het bericht
      const bericht_en = await vertaalNaarEngels(formData.bericht);

      const nieuweSig: Signalering = {
        id: `sig-${Date.now()}`,
        type: formData.type,
        bericht: formData.bericht,
        sectie: formData.sectie,
        bedId: formData.bedId,
        afzender: formData.afzender,
        aangemaakt: nuISO(),
        status: 'nieuw'
      };

      if (bericht_en) {
        nieuweSig.bericht_en = bericht_en;
      }

      onSave(nieuweSig);
    } catch (error) {
      console.error('Fout bij opslaan signalering:', error);
      // Bij fout toch opslaan zonder vertaling
      const nieuweSig: Signalering = {
        id: `sig-${Date.now()}`,
        type: formData.type,
        bericht: formData.bericht,
        sectie: formData.sectie,
        bedId: formData.bedId,
        afzender: formData.afzender,
        aangemaakt: nuISO(),
        status: 'nieuw'
      };
      onSave(nieuweSig);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t.messages.newMessage}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Naam */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.messages.yourName} *
            </label>
            <input
              type="text"
              required
              value={formData.afzender}
              onChange={e => setFormData({ ...formData, afzender: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 input-no-suggest"
              placeholder={taal === 'nl' ? 'Bijv. Jan' : 'E.g. John'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.messages.type}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {typeOpties.map(({ type, label, icon: Icon, kleur }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    formData.type === type
                      ? `${kleur} border-current`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Locatie (optioneel) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.messages.section} ({taal === 'nl' ? 'optioneel' : 'optional'})
              </label>
              <select
                value={formData.sectie}
                onChange={e => setFormData({ ...formData, sectie: e.target.value as Sectie | '' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500"
              >
                <option value="">{taal === 'nl' ? 'Geen specifieke' : 'No specific'}</option>
                {SECTIES_LIJST.filter(s => s).map(s => (
                  <option key={s} value={s}>{taal === 'nl' ? 'Sectie' : 'Section'} {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.messages.bed} ({taal === 'nl' ? 'optioneel' : 'optional'})
              </label>
              <input
                type="text"
                value={formData.bedId}
                onChange={e => setFormData({ ...formData, bedId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500 input-no-suggest"
                placeholder={taal === 'nl' ? 'Bijv. A1' : 'E.g. A1'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
          </div>

          {/* Bericht */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.messages.message} *
            </label>
            <textarea
              required
              value={formData.bericht}
              onChange={e => setFormData({ ...formData, bericht: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-tuin-500"
              rows={4}
              placeholder={taal === 'nl' ? 'Beschrijf wat je wilt melden...' : 'Describe what you want to report...'}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSaving
                ? (taal === 'nl' ? 'Vertalen...' : 'Translating...')
                : t.messages.send}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
