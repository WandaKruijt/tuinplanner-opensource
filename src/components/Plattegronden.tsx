import { useState } from 'react';
import { Download, Map as MapIcon, FileText } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Sectie } from '../types';
import { SECTIES } from '../types';
import { PlattegrondViewer } from './PlattegrondViewer';

type PlattegrondKeuze = Sectie | 'overzicht';

const PLATTEGROND_URLS: Record<PlattegrondKeuze, string> = {
  'overzicht': '/images/plattegronden/Oogst bedden plattegrond.pdf',
  'A': '/images/plattegronden/Planning 2026 (print A).pdf',
  'B': '/images/plattegronden/Planning 2026 (print B).pdf',
  'C': '/images/plattegronden/Planning 2026 (print C).pdf',
  'D': '/images/plattegronden/Planning 2026 (print D).pdf',
  'E': '/images/plattegronden/Planning 2026 (print E) .pdf',
  'Kas': '',
};

const THUMBNAIL_URLS: Record<PlattegrondKeuze, string> = {
  'overzicht': '/images/plattegronden/Oogst bedden plattegrond.png',
  'A': '/images/plattegronden/Planning 2026 (print A).png',
  'B': '/images/plattegronden/Planning 2026 (print B).png',
  'C': '/images/plattegronden/Planning 2026 (print C).png',
  'D': '/images/plattegronden/Planning 2026 (print D).png',
  'E': '/images/plattegronden/Planning 2026 (print E) .png',
  'Kas': '',
};

const DOWNLOAD_PDF_URL = '/images/plattegronden/Oogst bedden plattegrond.pdf';

function getLabel(keuze: PlattegrondKeuze, taal: 'nl' | 'en'): string {
  if (keuze === 'overzicht') return taal === 'nl' ? 'Tuinoverzicht' : 'Garden Overview';
  if (keuze === 'Kas') return taal === 'nl' ? 'Kas' : 'Greenhouse';
  return `${taal === 'nl' ? 'Sectie' : 'Section'} ${keuze}`;
}

function PlattegrondThumbnail({ label, thumbnailUrl, onClick }: { label: string; thumbnailUrl: string; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
    >
      <h3 className="font-medium text-gray-800 mb-2">{label}</h3>
      <div className="w-full h-32 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
        {thumbnailUrl && !imgError ? (
          <img
            src={thumbnailUrl}
            alt={label}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
            <FileText className="w-8 h-8" />
            <span className="text-xs">PDF</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Plattegronden() {
  const { taal } = useI18n();
  const [geselecteerd, setGeselecteerd] = useState<PlattegrondKeuze | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-tuin-800 flex items-center gap-2">
          <MapIcon className="w-7 h-7" />
          {taal === 'nl' ? 'Plattegronden' : 'Garden Maps'}
        </h2>
        <a
          href={DOWNLOAD_PDF_URL}
          download="plattegronden-tuin.pdf"
          className="flex items-center gap-2 px-4 py-2 bg-tuin-600 text-white rounded-lg font-medium hover:bg-tuin-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          {taal === 'nl' ? 'Download PDF' : 'Download PDF'}
        </a>
      </div>

      <p className="text-gray-600">
        {taal === 'nl'
          ? 'Bekijk de plattegronden van de tuin en de individuele secties. Klik op een kaart om te openen, of download de PDF om uit te printen.'
          : 'View the garden maps and individual section layouts. Click a map to open, or download the PDF to print.'}
      </p>

      {/* Overzichtskaart */}
      <div
        onClick={() => setGeselecteerd('overzicht')}
        className="cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
      >
        <h3 className="font-semibold text-tuin-800 mb-3 flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-tuin-600" />
          {taal === 'nl' ? 'Tuinoverzicht' : 'Garden Overview'}
        </h3>
        <div className="w-full h-48 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
          <img
            src={THUMBNAIL_URLS['overzicht']}
            alt={taal === 'nl' ? 'Tuinoverzicht' : 'Garden Overview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `<div class="flex flex-col items-center justify-center gap-3 text-gray-400 h-full"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg><span class="text-sm">${taal === 'nl' ? 'Klik om te openen' : 'Click to open'}</span></div>`;
            }}
          />
        </div>
      </div>

      {/* Sectie grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SECTIES.filter(sectie => PLATTEGROND_URLS[sectie] !== '').map(sectie => (
          <PlattegrondThumbnail
            key={sectie}
            label={getLabel(sectie, taal)}
            thumbnailUrl={THUMBNAIL_URLS[sectie]}
            onClick={() => setGeselecteerd(sectie)}
          />
        ))}
      </div>

      {/* Viewer modal */}
      {geselecteerd && PLATTEGROND_URLS[geselecteerd] && (
        <PlattegrondViewer
          imageUrl={PLATTEGROND_URLS[geselecteerd]}
          title={getLabel(geselecteerd, taal)}
          onSluiten={() => setGeselecteerd(null)}
          downloadNaam={`plattegrond-${geselecteerd === 'overzicht' ? 'overzicht' : `sectie-${geselecteerd.toLowerCase()}`}.pdf`}
        />
      )}
    </div>
  );
}
