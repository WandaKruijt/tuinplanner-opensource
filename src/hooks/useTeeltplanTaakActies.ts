import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { nuISO } from '../utils/dateUtils';
import type { Taak } from '../types';

export function useTeeltplanTaakActies() {
  const { dispatch, toonToast, saveTaak } = useApp();
  const { taal } = useI18n();

  const handlePubliceer = async (takenLijst: Taak[]) => {
    for (const taak of takenLijst) {
      const bijgewerkt: Taak = { ...taak, communityZichtbaar: true, gewijzigd: nuISO() };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
    }
    toonToast('success', taal === 'nl'
      ? `${takenLijst.length} ${takenLijst.length === 1 ? 'taak' : 'taken'} gepubliceerd`
      : `${takenLijst.length} ${takenLijst.length === 1 ? 'task' : 'tasks'} published`);
  };

  const handleDepubliceer = async (takenLijst: Taak[]) => {
    for (const taak of takenLijst) {
      const bijgewerkt: Taak = { ...taak, communityZichtbaar: false, gewijzigd: nuISO() };
      dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
      await saveTaak(bijgewerkt);
    }
    toonToast('info', taal === 'nl'
      ? `${takenLijst.length} ${takenLijst.length === 1 ? 'taak' : 'taken'} gedepubliceerd`
      : `${takenLijst.length} ${takenLijst.length === 1 ? 'task' : 'tasks'} unpublished`);
  };

  const handleVerschuifWeek = async (taak: Taak, richting: -1 | 1) => {
    if (taak.scheduledWeek === undefined || taak.windowStart === undefined || taak.windowEnd === undefined) return;
    const nieuweWeek = taak.scheduledWeek + richting;
    if (nieuweWeek < taak.windowStart || nieuweWeek > taak.windowEnd) return;

    const jaar = taak.jaar || new Date(taak.deadline).getFullYear();
    const bijgewerkt: Taak = {
      ...taak,
      scheduledWeek: nieuweWeek,
      deadline: (() => {
        const jan4 = new Date(jaar, 0, 4);
        const dayOfWeek = jan4.getDay() || 7;
        const maandag = new Date(jan4);
        maandag.setDate(jan4.getDate() - dayOfWeek + 1 + (nieuweWeek - 1) * 7);
        const vrijdag = new Date(maandag);
        vrijdag.setDate(maandag.getDate() + 4);
        return vrijdag.toISOString().split('T')[0];
      })(),
      gewijzigd: nuISO()
    };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('info', taal === 'nl'
      ? `Taak verschoven naar week ${nieuweWeek}`
      : `Task moved to week ${nieuweWeek}`);
  };

  const handleTaakHeropenen = async (taak: Taak) => {
    const bijgewerkt: Taak = {
      ...taak,
      status: 'Open',
      afgerondDoor: undefined,
      afgerondOp: undefined,
      gewijzigd: nuISO()
    };
    dispatch({ type: 'UPDATE_TAAK', payload: bijgewerkt });
    await saveTaak(bijgewerkt);
    toonToast('success', taal === 'nl' ? 'Taak heropend' : 'Task reopened');
  };

  return { handlePubliceer, handleDepubliceer, handleVerschuifWeek, handleTaakHeropenen };
}
