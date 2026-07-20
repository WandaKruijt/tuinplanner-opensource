import type { Taak } from '../types';

/**
 * Maximaal aantal foto's per taak
 */
export const MAX_FOTOS_PER_TAAK = 10;

/**
 * Haal alle foto URLs op voor een taak.
 * Normaliseert fotoUrls[] en legacy fotoUrl naar één array.
 */
export function getTaakFotos(taak: Taak | null | undefined): string[] {
  if (!taak) return [];
  if (taak.fotoUrls && taak.fotoUrls.length > 0) {
    return taak.fotoUrls;
  }
  if (taak.fotoUrl) {
    return [taak.fotoUrl];
  }
  return [];
}
