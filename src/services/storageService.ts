/**
 * Firebase Storage Service
 * Handles photo uploads and deletions for tasks and harvest instructions
 */

import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../config/firebase';
import { comprimeerAfbeelding, isGeldigeAfbeelding, genereerFotoNaam } from '../utils/imageUtils';

export type FotoType = 'taken' | 'oogstInstructies' | 'instructies';

/**
 * Upload een foto naar Firebase Storage met automatische compressie
 * @param file - De te uploaden afbeelding
 * @param type - 'taken' of 'oogstInstructies'
 * @param id - ID van de taak of instructie
 * @returns Download URL van de geüploade foto
 */
export async function uploadFoto(
  file: File,
  type: FotoType,
  id: string
): Promise<string> {
  // Valideer bestandstype
  if (!isGeldigeAfbeelding(file)) {
    throw new Error('Ongeldig bestandstype. Alleen JPG, PNG, WebP en GIF zijn toegestaan.');
  }

  // Comprimeer de afbeelding
  const gecomprimeerd = await comprimeerAfbeelding(file);

  // Genereer pad in storage
  const pad = genereerFotoNaam(`fotos/${type}`, id);
  const storageRef = ref(storage, pad);

  // Upload naar Firebase Storage
  await uploadBytes(storageRef, gecomprimeerd, {
    contentType: 'image/jpeg',
  });

  // Haal download URL op
  const downloadUrl = await getDownloadURL(storageRef);

  return downloadUrl;
}

/**
 * Upload meerdere foto's naar Firebase Storage
 * @param files - Array van te uploaden afbeeldingen
 * @param type - 'taken' of 'oogstInstructies'
 * @param id - ID van de taak of instructie
 * @returns Array van download URLs
 */
export async function uploadMultipleFotos(
  files: File[],
  type: FotoType,
  id: string
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadFoto(file, type, id);
    urls.push(url);
  }
  return urls;
}

/**
 * Verwijdert een foto uit Firebase Storage op basis van URL
 * @param fotoUrl - De download URL van de foto
 */
export async function verwijderFoto(fotoUrl: string): Promise<void> {
  if (!fotoUrl) return;

  try {
    // Extract het pad uit de URL
    // Firebase Storage URLs bevatten het pad geëncoded
    const storageRef = ref(storage, extractPadUitUrl(fotoUrl));
    await deleteObject(storageRef);
  } catch (error) {
    // Negeer errors als de foto al verwijderd is
    console.warn('Kon foto niet verwijderen:', error);
  }
}

/**
 * Verwijdert alle foto's van een specifieke taak of instructie
 * @param type - 'taken' of 'oogstInstructies'
 * @param id - ID van de taak of instructie
 */
export async function verwijderAlleFotos(type: FotoType, id: string): Promise<void> {
  try {
    const folderRef = ref(storage, `fotos/${type}/${id}`);
    const result = await listAll(folderRef);

    // Verwijder alle bestanden in de folder
    const deletePromises = result.items.map((itemRef) => deleteObject(itemRef));
    await Promise.all(deletePromises);
  } catch (error) {
    // Negeer errors als de folder niet bestaat
    console.warn('Kon foto folder niet opruimen:', error);
  }
}

/**
 * Extract het storage pad uit een Firebase download URL
 */
function extractPadUitUrl(url: string): string {
  // Firebase Storage URLs hebben het formaat:
  // https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?token=...
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
  } catch {
    // Als URL parsing faalt, probeer directe extractie
  }

  // Fallback: zoek naar 'fotos/' in de URL
  const fotosIndex = url.indexOf('fotos%2F');
  if (fotosIndex !== -1) {
    const endIndex = url.indexOf('?', fotosIndex);
    const encodedPath = endIndex !== -1
      ? url.substring(fotosIndex, endIndex)
      : url.substring(fotosIndex);
    return decodeURIComponent(encodedPath);
  }

  throw new Error('Kon pad niet extraheren uit URL');
}
