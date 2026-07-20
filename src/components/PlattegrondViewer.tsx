import { X, Download, Map as MapIcon, FileText } from 'lucide-react';
import { useI18n } from '../i18n';

interface PlattegrondViewerProps {
  imageUrl: string;
  title: string;
  onSluiten: () => void;
  downloadNaam?: string;
}

function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

export function PlattegrondViewer({ imageUrl, title, onSluiten, downloadNaam }: PlattegrondViewerProps) {
  const { taal } = useI18n();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = downloadNaam || `${title}.pdf`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {isPdf(imageUrl) ? <FileText className="w-6 h-6" /> : <MapIcon className="w-6 h-6" />}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onSluiten}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isPdf(imageUrl) ? (
        /* PDF viewer via iframe - browser's built-in PDF viewer handles zoom */
        <iframe
          src={imageUrl}
          title={title}
          className="w-[90vw] h-[85vh] mt-16 rounded-lg bg-white"
          style={{ border: 'none' }}
        />
      ) : (
        /* Image viewer (fallback voor eventuele PNG's) */
        <div className="w-full h-full flex items-center justify-center mt-16">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-[90vw] max-h-[80vh] object-contain select-none"
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div class="bg-white/10 border-2 border-dashed border-white/30 rounded-xl p-12 text-center">
                  <p class="text-white/70 text-lg mb-2">${taal === 'nl' ? 'Bestand nog niet beschikbaar' : 'File not yet available'}</p>
                  <p class="text-white/50 text-sm">${imageUrl}</p>
                </div>
              `;
            }}
          />
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center">
        {isPdf(imageUrl)
          ? (taal === 'nl'
              ? 'Gebruik de PDF-viewer knoppen om te zoomen'
              : 'Use the PDF viewer controls to zoom')
          : (taal === 'nl'
              ? 'Scroll om te zoomen \u2022 Sleep om te verplaatsen'
              : 'Scroll to zoom \u2022 Drag to move')}
      </div>
    </div>
  );
}
