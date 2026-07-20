/**
 * ExportsTile - Component voor handmatige exports vanuit Dashboard
 * Alleen zichtbaar in commissie modus
 */

import { useState } from 'react';
import { Download, FileText, Loader2, ChevronDown, ChevronUp, FolderDown } from 'lucide-react';
import {
  MONTH_NAMES_NL,
  generateTasksExport,
  generateHarvestListExport,
  generateHarvestLogsExport,
  downloadCSV
} from '../utils/exportUtils';
import { useI18n } from '../i18n';

interface ExportsTileProps {
  isCommissie: boolean;
}

export function ExportsTile({ isCommissie }: ExportsTileProps) {
  const { taal } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  if (!isCommissie) return null;

  const monthName = MONTH_NAMES_NL[selectedMonth];

  // Genereer maand opties (huidige maand + 11 maanden terug)
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      label: `${MONTH_NAMES_NL[date.getMonth()]} ${date.getFullYear()}`
    });
  }

  const handleDownload = async (type: 'taken' | 'oogstlijst' | 'registraties' | 'all') => {
    setIsGenerating(type);
    setError(null);

    try {
      if (type === 'all') {
        const [tasksCSV, harvestCSV, logsCSV] = await Promise.all([
          generateTasksExport(selectedYear, selectedMonth),
          generateHarvestListExport(selectedYear, selectedMonth),
          generateHarvestLogsExport(selectedYear, selectedMonth)
        ]);

        downloadCSV(tasksCSV, `taken-${monthName}-${selectedYear}.csv`);
        setTimeout(() => {
          downloadCSV(harvestCSV, `oogstlijst-${monthName}-${selectedYear}.csv`);
        }, 500);
        setTimeout(() => {
          downloadCSV(logsCSV, `registraties-${monthName}-${selectedYear}.csv`);
        }, 1000);

      } else if (type === 'taken') {
        const csv = await generateTasksExport(selectedYear, selectedMonth);
        downloadCSV(csv, `taken-${monthName}-${selectedYear}.csv`);

      } else if (type === 'oogstlijst') {
        const csv = await generateHarvestListExport(selectedYear, selectedMonth);
        downloadCSV(csv, `oogstlijst-${monthName}-${selectedYear}.csv`);

      } else if (type === 'registraties') {
        const csv = await generateHarvestLogsExport(selectedYear, selectedMonth);
        downloadCSV(csv, `registraties-${monthName}-${selectedYear}.csv`);
      }

    } catch (err) {
      console.error('Error generating export:', err);
      setError(taal === 'nl'
        ? 'Er ging iets mis bij het genereren van de export.'
        : 'Something went wrong while generating the export.');
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FolderDown className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-700">0</div>
            <div className="text-sm text-blue-600">Exports</div>
          </div>
        </div>
        <div className="text-blue-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-blue-200">

          {/* Maand selectie */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {taal === 'nl' ? 'Selecteer maand:' : 'Select month:'}
            </label>
            <select
              value={`${selectedMonth}-${selectedYear}`}
              onChange={(e) => {
                const [m, y] = e.target.value.split('-');
                setSelectedMonth(parseInt(m));
                setSelectedYear(parseInt(y));
              }}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {monthOptions.map((opt) => (
                <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Individuele download knoppen */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleDownload('taken')}
              disabled={isGenerating !== null}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              {isGenerating === 'taken' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-gray-600" />
              )}
              {taal === 'nl' ? 'Taken' : 'Tasks'}
            </button>

            <button
              onClick={() => handleDownload('oogstlijst')}
              disabled={isGenerating !== null}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              {isGenerating === 'oogstlijst' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-green-600" />
              )}
              {taal === 'nl' ? 'Oogstlijst' : 'Harvest list'}
            </button>

            <button
              onClick={() => handleDownload('registraties')}
              disabled={isGenerating !== null}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              {isGenerating === 'registraties' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-orange-600" />
              )}
              {taal === 'nl' ? 'Registraties' : 'Registrations'}
            </button>
          </div>

          {/* Alles downloaden */}
          <button
            onClick={() => handleDownload('all')}
            disabled={isGenerating !== null}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm w-full sm:w-auto justify-center"
          >
            {isGenerating === 'all' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {taal === 'nl' ? 'Bezig...' : 'Working...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {taal === 'nl' ? 'Alle exports downloaden' : 'Download all exports'}
              </>
            )}
          </button>

          {error && (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExportsTile;
