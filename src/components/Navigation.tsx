import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Settings,
  Sprout,
  Apple,
  MessageCircle,
  Unlock,
  Lock,
  Globe,
  BookOpen,
  HelpCircle,
  LogOut,
  Shield,
  ClipboardList,
  Map as MapIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import type { NavigatieTab } from '../types';

interface NavItemProps {
  tab: NavigatieTab;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ label, icon, isActive, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left
        transition-all duration-200 font-medium relative
        ${isActive
          ? 'bg-tuin-600 text-white shadow-md'
          : 'text-tuin-800 hover:bg-tuin-100'
        }
      `}
    >
      <span className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="hidden md:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="hidden md:flex ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

export function Navigation() {
  const { state, dispatch, isCommissie, wisselNaarCommissie, wisselNaarCommunity } = useApp();
  const { logout, isAdmin, user } = useAuth();
  const { taal, setTaal, t } = useI18n();
  const [toonPinModal, setToonPinModal] = useState(false);

  // Nieuwe signaleringen tellen
  const nieuweSignaleringen = (state.data.signaleringen || []).filter(s => s.status === 'nieuw').length;

  // Navigatie items - sommige alleen voor commissie
  // Community members zien alleen: weekoverzicht, oogstlijst, signaleringen, handleiding
  const navigatieItems: { tab: NavigatieTab; label: string; icon: React.ReactNode; badge?: number; commissieOnly?: boolean }[] = [
    { tab: 'dashboard', label: t.nav.dashboard, icon: <LayoutDashboard className="w-5 h-5" />, commissieOnly: true },
    { tab: 'weekoverzicht', label: t.nav.thisWeek, icon: <Calendar className="w-5 h-5" /> },
    { tab: 'taken', label: t.nav.allTasks, icon: <ListTodo className="w-5 h-5" />, commissieOnly: true },
    { tab: 'teeltplantaken', label: t.nav.cultivationTasks, icon: <ClipboardList className="w-5 h-5" />, commissieOnly: true },
    { tab: 'oogstlijst', label: t.nav.harvestList, icon: <Apple className="w-5 h-5" /> },
    { tab: 'gewassen', label: taal === 'nl' ? 'Gewassen' : 'Crops', icon: <Sprout className="w-5 h-5" /> },
    { tab: 'instructies', label: t.nav.instructions, icon: <BookOpen className="w-5 h-5" /> },
    { tab: 'plattegronden', label: taal === 'nl' ? 'Plattegronden' : 'Garden Maps', icon: <MapIcon className="w-5 h-5" /> },
    { tab: 'signaleringen', label: t.nav.messages, icon: <MessageCircle className="w-5 h-5" />, badge: nieuweSignaleringen },
    { tab: 'handleiding', label: taal === 'nl' ? 'Handleiding' : 'Help', icon: <HelpCircle className="w-5 h-5" /> },
    { tab: 'beheer', label: taal === 'nl' ? 'Beheer' : 'Settings', icon: <Settings className="w-5 h-5" />, commissieOnly: true },
  ];

  // Filter items based on rol
  const zichtbareItems = navigatieItems.filter(item => !item.commissieOnly || isCommissie);

  // Uitlog handler
  const handleLogout = async () => {
    const bevestig = window.confirm(
      taal === 'nl' 
        ? 'Weet je zeker dat je wilt uitloggen?' 
        : 'Are you sure you want to log out?'
    );
    if (bevestig) {
      await logout();
    }
  };

  return (
    <nav className="bg-white shadow-lg border-r border-tuin-200 w-16 md:w-64 flex-shrink-0 fixed top-0 left-0 h-[100dvh] overflow-y-auto z-40 flex flex-col">
      <div className="p-4 flex-1">
        {/* Titel zonder logo icoon */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-tuin-800">TuinPlanner</h1>
            <p className="text-xs text-tuin-600">{t.nav.taskManagement}</p>
          </div>
        </div>

        {/* Admin indicator - alleen tonen als admin is ingelogd */}
        {isAdmin && (
          <div className="mb-4 px-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800">
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
            </div>
          </div>
        )}

        {/* Taalschakelaar */}
        <div className="mb-4 px-2">
          <button
            onClick={() => setTaal(taal === 'nl' ? 'en' : 'nl')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden md:inline">{taal === 'nl' ? 'Nederlands' : 'English'}</span>
            <span className="md:hidden">{taal.toUpperCase()}</span>
          </button>
        </div>

        {/* Rol indicator (commissie/community modus) */}
        <div className="mb-4 px-2">
          <button
            onClick={() => isCommissie ? wisselNaarCommunity() : setToonPinModal(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCommissie
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isCommissie ? (
              <>
                <Lock className="w-4 h-4" />
                <span className="hidden md:inline">{t.roles.committeeMode}</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span className="hidden md:inline">{t.roles.community}</span>
              </>
            )}
          </button>
        </div>

        {/* Navigatie items */}
        <div className="space-y-2">
          {zichtbareItems.map(item => (
            <NavItem
              key={item.tab}
              tab={item.tab}
              label={item.label}
              icon={item.icon}
              isActive={state.ui.huidigeTab === item.tab}
              onClick={() => dispatch({ type: 'SET_TAB', payload: item.tab })}
              badge={item.badge}
            />
          ))}
        </div>
      </div>

      {/* Onderste sectie met stats en uitloggen */}
      <div className="p-4 border-t border-gray-200">
        {/* Statistieken */}
        <div className="hidden md:block mb-4 p-3 bg-tuin-50 rounded-lg">
          <p className="text-xs text-tuin-600 mb-1">{t.common.dataStatus}</p>
          <p className="text-sm font-medium text-tuin-800">
            {state.data.bedden.length} {t.dashboard.beds.toLowerCase()}
          </p>
          <p className="text-sm font-medium text-tuin-800">
            {state.data.taken.filter(taak => taak.status !== 'Afgerond').length} {t.common.openTasks}
          </p>
        </div>

        {/* Uitlog knop */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">
            {taal === 'nl' ? 'Uitloggen' : 'Log out'}
          </span>
        </button>

        {/* Kleine tekst met ingelogde user (alleen op desktop) */}
        {user?.email && (
          <p className="hidden md:block text-xs text-gray-400 mt-2 px-3 truncate">
            {user.email}
          </p>
        )}
      </div>

      {/* PIN Modal */}
      {toonPinModal && (
        <PinModal
          onClose={() => setToonPinModal(false)}
          onSubmit={(pin) => {
            if (wisselNaarCommissie(pin)) {
              setToonPinModal(false);
            }
          }}
        />
      )}
    </nav>
  );
}

// PIN Modal component
interface PinModalProps {
  onClose: () => void;
  onSubmit: (pin: string) => void;
}

function PinModal({ onClose, onSubmit }: PinModalProps) {
  const [pin, setPin] = useState('');
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(pin);
  };

  // Use portal to render modal outside of nav's stacking context
  // Extra styles to ensure visibility on mobile browsers
  return createPortal(
    <div
      id="pin-modal-overlay"
      className="bg-black/50 flex items-center justify-center p-4"
      style={{
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)'
      }}
      onClick={(e) => {
        // Sluit modal als je buiten de content klikt
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 mx-4"
        style={{ position: 'relative', zIndex: 100000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{t.roles.committeeMode}</h3>
            <p className="text-sm text-gray-500">{t.roles.enterPin}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN"
            className="w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg focus:ring-2 focus:ring-tuin-500 mb-4"
            autoFocus
            maxLength={6}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t.roles.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-tuin-600 text-white rounded-lg hover:bg-tuin-700"
            >
              {t.roles.login}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
