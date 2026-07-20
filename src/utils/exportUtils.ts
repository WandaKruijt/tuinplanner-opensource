/**
 * Export utilities voor TuinPlanner
 * Genereert CSV exports van taken, oogstlijst en oogstregistraties
 */

import { ref as dbRef, get } from 'firebase/database';
import { database } from '../config/firebase';
import type { Taak, OogstItem, OogstRegistratie } from '../types';

// ============================================
// CONSTANTS
// ============================================

export const MONTH_NAMES_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
];

export const MONTH_NAMES_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// ============================================
// CSV HELPER
// ============================================

function escapeCSVField(field: any): string {
  const str = field?.toString() ?? '';
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(headers: string[], rows: any[][]): string {
  const BOM = '\uFEFF';  // UTF-8 BOM voor Excel
  const headerLine = headers.map(escapeCSVField).join(',');
  const dataLines = rows.map(row => row.map(escapeCSVField).join(','));
  return BOM + [headerLine, ...dataLines].join('\n');
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];  // YYYY-MM-DD
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toTimeString().slice(0, 5);  // HH:MM
  } catch {
    return '';
  }
}

// ============================================
// DIRECT DOWNLOAD
// ============================================

/**
 * Download een CSV string direct naar de browser
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================
// FIREBASE DATA FETCHERS
// ============================================

async function fetchTaken(): Promise<Taak[]> {
  const takenRef = dbRef(database, 'taken');
  const snapshot = await get(takenRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.entries(data).map(([id, taak]) => ({
    id,
    ...(taak as Omit<Taak, 'id'>)
  }));
}

async function fetchOogstlijst(): Promise<OogstItem[]> {
  const oogstlijstRef = dbRef(database, 'oogstlijst');
  const snapshot = await get(oogstlijstRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.entries(data).map(([id, item]) => ({
    id,
    ...(item as Omit<OogstItem, 'id'>)
  }));
}

async function fetchOogstRegistraties(): Promise<OogstRegistratie[]> {
  const registratiesRef = dbRef(database, 'oogstRegistraties');
  const snapshot = await get(registratiesRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.entries(data).map(([id, reg]) => ({
    id,
    ...(reg as Omit<OogstRegistratie, 'id'>)
  }));
}

// ============================================
// EXPORT GENERATORS
// ============================================

export async function generateTasksExport(year: number, month: number): Promise<string> {
  const taken = await fetchTaken();

  const headers = [
    'taak_id', 'beschrijving', 'sectie', 'bed', 'type', 'prioriteit',
    'status', 'deadline', 'commentaar', 'is_automatisch', 'bron_gewas',
    'toegewezen_aan', 'toegewezen_op', 'afgerond_door', 'afgerond_op',
    'aangemaakt', 'gewijzigd'
  ];

  const rows: any[][] = [];

  taken.forEach(taak => {
    rows.push([
      taak.id,
      taak.beschrijving || '',
      taak.sectie || '',
      taak.bedId || '',
      taak.type || '',
      taak.prioriteit || '',
      taak.status || '',
      formatDate(taak.deadline),
      taak.commentaar || '',
      taak.isAutomatisch ? 'Ja' : 'Nee',
      taak.bronGewas || '',
      Array.isArray(taak.assignedTo) ? taak.assignedTo.join(', ') : (taak.assignedTo || ''),
      formatDate(taak.assignedAt),
      taak.afgerondDoor || '',
      formatDate(taak.afgerondOp),
      formatDate(taak.aangemaakt),
      formatDate(taak.gewijzigd)
    ]);
  });

  // Sorteer op sectie, bed, beschrijving
  rows.sort((a, b) => {
    if (a[2] !== b[2]) return (a[2] || '').localeCompare(b[2] || '');  // sectie
    if (a[3] !== b[3]) return (a[3] || '').localeCompare(b[3] || '');  // bed
    return (a[1] || '').localeCompare(b[1] || '');  // beschrijving
  });

  return generateCSV(headers, rows);
}

export async function generateHarvestListExport(year: number, month: number): Promise<string> {
  const oogstlijst = await fetchOogstlijst();

  const headers = [
    'id', 'gewas', 'categorie', 'hoeveelheid_pp', 'locatie_primair',
    'locatie_secundair', 'locatie_tertiair', 'oogstmethode', 'bijzonderheden',
    'status', 'leeg_oogsten', 'keuze_groep', 'week', 'jaar', 'aangemaakt', 'aangemaakt_door'
  ];

  const rows: any[][] = [];

  // Filter op jaar
  const filtered = oogstlijst.filter(item => item.jaar === year);

  filtered.forEach(item => {
    rows.push([
      item.id,
      item.gewas || '',
      item.categorie || '',
      item.hoeveelheidPp || '',
      item.locatiePrimair || '',
      item.locatieSecundair || '',
      item.locatieTertiair || '',
      item.oogstmethode || '',
      item.bijzonderheden || '',
      item.status || '',
      item.leegOogsten ? 'Ja' : 'Nee',
      item.keuzeGroep || '',
      item.weekNummer || '',
      item.jaar || '',
      formatDate(item.aangemaakt),
      item.aangemaaktDoor || ''
    ]);
  });

  // Sorteer op weeknummer, dan gewas
  rows.sort((a, b) => {
    const weekA = parseInt(a[12]) || 0;
    const weekB = parseInt(b[12]) || 0;
    if (weekA !== weekB) return weekA - weekB;
    return (a[1] || '').localeCompare(b[1] || '');  // gewas
  });

  return generateCSV(headers, rows);
}

export async function generateHarvestLogsExport(year: number, month: number): Promise<string> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  const registraties = await fetchOogstRegistraties();

  const headers = ['id', 'oogst_item_id', 'gebruiker', 'datum', 'tijd', 'hoeveelheid', 'verwijderd'];

  const rows: any[][] = [];

  registraties.forEach(reg => {
    // Skip soft-deleted registraties
    if (reg.deleted === true) return;

    // Filter op datum
    const timestamp = reg.timestamp ? new Date(reg.timestamp) : null;
    if (!timestamp) return;

    if (timestamp >= startDate && timestamp <= endDate) {
      rows.push([
        reg.id,
        reg.oogstItemId || '',
        reg.gebruiker || '',
        formatDate(reg.timestamp),
        formatTime(reg.timestamp),
        reg.hoeveelheid || '',
        reg.deleted ? 'Ja' : 'Nee'
      ]);
    }
  });

  // Sorteer op datum, dan gebruiker
  rows.sort((a, b) => {
    if (a[3] !== b[3]) return (a[3] || '').localeCompare(b[3] || '');  // datum
    return (a[2] || '').localeCompare(b[2] || '');  // gebruiker
  });

  return generateCSV(headers, rows);
}
