/**
 * Image compression and processing utilities
 */

export interface CompressieOpties {
  maxBreedte?: number;
  maxHoogte?: number;
  kwaliteit?: number;
  formaat?: 'image/jpeg' | 'image/webp';
}

const STANDAARD_OPTIES: Required<CompressieOpties> = {
  maxBreedte: 800,
  maxHoogte: 800,
  kwaliteit: 0.7,
  formaat: 'image/jpeg'
};

/**
 * Comprimeert een afbeelding naar een kleinere formaat
 * - Schaalt naar max 800x800px met behoud van aspect ratio
 * - Comprimeert naar 70% JPEG kwaliteit
 * - Typisch resultaat: 50-150KB voor telefoon foto's
 */
export async function comprimeerAfbeelding(
  file: File,
  opties: CompressieOpties = {}
): Promise<Blob> {
  const { maxBreedte, maxHoogte, kwaliteit, formaat } = {
    ...STANDAARD_OPTIES,
    ...opties
  };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context niet beschikbaar'));
      return;
    }

    img.onload = () => {
      // Bereken nieuwe dimensies met behoud van aspect ratio
      let { width, height } = img;

      if (width > maxBreedte) {
        height = Math.round((height * maxBreedte) / width);
        width = maxBreedte;
      }

      if (height > maxHoogte) {
        width = Math.round((width * maxHoogte) / height);
        height = maxHoogte;
      }

      canvas.width = width;
      canvas.height = height;

      // Teken afbeelding op canvas met smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Converteer naar blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Kon afbeelding niet comprimeren'));
          }
        },
        formaat,
        kwaliteit
      );
    };

    img.onerror = () => {
      reject(new Error('Kon afbeelding niet laden'));
    };

    // Laad afbeelding van file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Valideert of een file een geldige afbeelding is
 */
export function isGeldigeAfbeelding(file: File): boolean {
  const geldigeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return geldigeTypes.includes(file.type);
}

/**
 * Formatteert bestandsgrootte naar leesbare string
 */
export function formateerBestandsgrootte(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Genereert een unieke bestandsnaam voor upload
 */
export function genereerFotoNaam(prefix: string, id: string): string {
  const timestamp = Date.now();
  return `${prefix}/${id}/${timestamp}.jpg`;
}
