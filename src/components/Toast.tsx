import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ToastBericht } from '../types';

const iconen = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const kleuren = {
  success: 'bg-tuin-100 border-tuin-500 text-tuin-800',
  error: 'bg-red-100 border-red-500 text-red-800',
  info: 'bg-blue-100 border-blue-500 text-blue-800',
  warning: 'bg-amber-100 border-amber-500 text-amber-800',
};

interface ToastItemProps {
  toast: ToastBericht;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const Icoon = iconen[toast.type];

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg border-l-4 shadow-lg ${kleuren[toast.type]} animate-slide-in`}
      role="alert"
    >
      <Icoon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.bericht}</p>
      <button
        onClick={onClose}
        className="p-1 hover:bg-black/10 rounded-full transition-colors"
        aria-label="Sluiten"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { state, dispatch } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4">
      {state.ui.toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => dispatch({ type: 'VERBERG_TOAST', payload: toast.id })}
        />
      ))}
    </div>
  );
}
