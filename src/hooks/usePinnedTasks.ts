import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tuinplanner_pinned_taken';
const EVENT_NAME = 'tuinplanner-pinned-changed';

function leesUitStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function schrijfNaarStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // localStorage niet beschikbaar — geen probleem, gewoon negeren
  }
}

export function usePinnedTasks() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => leesUitStorage());

  useEffect(() => {
    const handler = () => setPinnedIds(leesUitStorage());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const isPinned = useCallback((taakId: string) => pinnedIds.includes(taakId), [pinnedIds]);

  const pinTaak = useCallback((taakId: string) => {
    const huidig = leesUitStorage();
    if (huidig.includes(taakId)) return;
    schrijfNaarStorage([taakId, ...huidig]);
  }, []);

  const unpinTaak = useCallback((taakId: string) => {
    const huidig = leesUitStorage();
    if (!huidig.includes(taakId)) return;
    schrijfNaarStorage(huidig.filter(id => id !== taakId));
  }, []);

  const togglePin = useCallback((taakId: string) => {
    const huidig = leesUitStorage();
    if (huidig.includes(taakId)) {
      schrijfNaarStorage(huidig.filter(id => id !== taakId));
    } else {
      schrijfNaarStorage([taakId, ...huidig]);
    }
  }, []);

  return { pinnedIds, isPinned, pinTaak, unpinTaak, togglePin };
}
