/**
 * gewasUtils.ts
 * Helper functies voor gewasdata en zoeken
 */

import type { VerrijktGewas } from '../types';

// ============================================
// LOCALISATIE HELPERS
// ============================================

/**
 * Haalt het gelokaliseerde veld op basis van taal.
 * Als de EN versie niet bestaat, valt terug op NL.
 *
 * @param obj - Object met het veld (of undefined)
 * @param field - Veldnaam (zonder _en suffix)
 * @param lang - Taalcode ('nl' of 'en')
 * @returns De waarde in de juiste taal, of undefined
 */
export function getLocalizedField<T = string>(
  obj: Record<string, unknown> | undefined,
  field: string,
  lang: string
): T | undefined {
  if (!obj) return undefined;

  if (lang === 'en') {
    const enValue = obj[`${field}_en`] as T | undefined;
    if (enValue !== undefined && enValue !== null && enValue !== '') {
      return enValue;
    }
  }
  return obj[field] as T | undefined;
}

/**
 * Haalt gelokaliseerde array veld op.
 * Specifiek voor arrays zoals veelgemaakte_fouten, praktische_tips.
 *
 * @param obj - Object met het veld
 * @param field - Veldnaam (zonder _en suffix)
 * @param lang - Taalcode ('nl' of 'en')
 * @returns De array in de juiste taal, of lege array
 */
export function getLocalizedArray(
  obj: Record<string, unknown> | undefined,
  field: string,
  lang: string
): string[] {
  if (!obj) return [];

  if (lang === 'en') {
    const enValue = obj[`${field}_en`] as string[] | undefined;
    if (enValue && Array.isArray(enValue) && enValue.length > 0) {
      return enValue;
    }
  }
  const nlValue = obj[field] as string[] | undefined;
  return nlValue && Array.isArray(nlValue) ? nlValue : [];
}

/**
 * Helper om vertaling te krijgen met fallback.
 * Handige shortcut voor directe NL/EN waarden.
 *
 * @param nl - Nederlandse waarde
 * @param en - Engelse waarde (optioneel)
 * @param lang - Taalcode ('nl' of 'en')
 * @returns De waarde in de juiste taal
 */
export function getVertaling(
  nl: string | undefined,
  en: string | undefined,
  lang: string
): string | undefined {
  if (lang === 'en' && en) {
    return en;
  }
  return nl;
}

/**
 * Zoekt een gewas op basis van een zoekterm.
 * Zoekt in naam en zoekNamen array voor flexibele matching.
 *
 * @param gewassen - Array van verrijkte gewassen uit Firebase
 * @param zoekterm - De zoekterm (gewas naam, variant, synoniem)
 * @returns Het gevonden gewas of undefined
 */
export function findGewas(
  gewassen: VerrijktGewas[],
  zoekterm: string
): VerrijktGewas | undefined {
  if (!zoekterm || !gewassen?.length) return undefined;

  const zoekLower = (zoekterm || '').toLowerCase().trim();

  // 1. Exacte match op naam
  const exactMatch = gewassen.find(
    g => (g.naam || '').toLowerCase() === zoekLower
  );
  if (exactMatch) return exactMatch;

  // 2. Exacte match in zoekNamen array
  const zoekNamenMatch = gewassen.find(
    g => g.zoekNamen?.some(z => (z || '').toLowerCase() === zoekLower)
  );
  if (zoekNamenMatch) return zoekNamenMatch;

  // 3. Partial match op naam (begint met)
  const startMatch = gewassen.find(
    g => (g.naam || '').toLowerCase().startsWith(zoekLower)
  );
  if (startMatch) return startMatch;

  // 4. Partial match in zoekNamen (begint met)
  const startZoekMatch = gewassen.find(
    g => g.zoekNamen?.some(z => (z || '').toLowerCase().startsWith(zoekLower))
  );
  if (startZoekMatch) return startZoekMatch;

  // 5. Bevat match op naam
  const containsMatch = gewassen.find(
    g => (g.naam || '').toLowerCase().includes(zoekLower)
  );
  if (containsMatch) return containsMatch;

  // 6. Bevat match in zoekNamen
  const containsZoekMatch = gewassen.find(
    g => g.zoekNamen?.some(z => (z || '').toLowerCase().includes(zoekLower))
  );
  if (containsZoekMatch) return containsZoekMatch;

  return undefined;
}

/**
 * Zoekt alle gewassen die matchen met een zoekterm
 * Prioriteit: naam match > zoekNamen match > Engelse naam match > teeltgroep match
 *
 * @param gewassen - Array van verrijkte gewassen
 * @param zoekterm - De zoekterm
 * @param maxResults - Maximum aantal resultaten (default 10)
 * @returns Array van matchende gewassen, gesorteerd op relevantie
 */
export function searchGewassen(
  gewassen: VerrijktGewas[],
  zoekterm: string,
  maxResults: number = 10
): VerrijktGewas[] {
  if (!zoekterm || !gewassen?.length) return gewassen?.slice(0, maxResults) || [];

  const zoekLower = (zoekterm || '').toLowerCase().trim();

  // Minimaal 2 karakters voor zoeken
  if (zoekLower.length < 2) return [];

  // Score gewassen op relevantie
  const scored = gewassen.map(gewas => {
    let score = 0;
    const naamLower = (gewas.naam || '').toLowerCase();
    const naamEnLower = (gewas.naam_en || '').toLowerCase();

    // Nederlandse naam matches (hoogste prioriteit)
    if (naamLower === zoekLower) score += 1000;           // Exacte match
    else if (naamLower.startsWith(zoekLower)) score += 800; // Begint met
    else if (naamLower.includes(zoekLower)) score += 600;   // Bevat

    // Engelse naam matches
    if (naamEnLower === zoekLower) score += 900;
    else if (naamEnLower.startsWith(zoekLower)) score += 700;
    else if (naamEnLower.includes(zoekLower)) score += 500;

    // Check zoekNamen (synoniemen, varianten)
    if (gewas.zoekNamen) {
      for (const zoekNaam of gewas.zoekNamen) {
        const znLower = (zoekNaam || '').toLowerCase();
        if (znLower === zoekLower) score += 850;
        else if (znLower.startsWith(zoekLower)) score += 650;
        else if (znLower.includes(zoekLower)) score += 450;
      }
    }

    // Check teeltgroep (laagste prioriteit - alleen als fallback)
    const teeltgroepLower = (gewas.teeltgroep || '').toLowerCase();
    if (teeltgroepLower === zoekLower) score += 100;
    else if (teeltgroepLower.startsWith(zoekLower)) score += 80;
    else if (teeltgroepLower.includes(zoekLower)) score += 50;

    return { gewas, score };
  });

  // Filter en sorteer op score (hoogste eerst)
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => {
      // Primair: sorteer op score
      if (b.score !== a.score) return b.score - a.score;
      // Secundair: alfabetisch op naam bij gelijke score
      return (a.gewas.naam || '').localeCompare(b.gewas.naam || '');
    })
    .slice(0, maxResults)
    .map(s => s.gewas);
}

/**
 * Formatteert de moeilijkheidsgraad als visuele indicator
 *
 * @param graad - De moeilijkheidsgraad (bijv. "Gemiddeld - normale zorg")
 * @returns String met gevulde/lege cirkels
 */
export function formatMoeilijkheid(graad?: string): string {
  if (!graad) return '○○○';

  // Pak het eerste woord (voor de dash of spatie met dash)
  const level = graad.toLowerCase().split(' - ')[0].split(' ')[0].trim();

  const dots: Record<string, string> = {
    'makkelijk': '●○○',
    'easy': '●○○',
    'beginner': '●○○',
    'gemiddeld': '●●○',
    'medium': '●●○',
    'gevorderd': '●●●',
    'moeilijk': '●●●',
    'difficult': '●●●',
    'expert': '●●●',
  };

  return dots[level] || '●●○';
}

/**
 * Bepaalt de kleur voor de moeilijkheidsgraad
 * Alle niveaus krijgen dezelfde groene kleur - het aantal bolletjes zegt genoeg
 */
export function getMoeilijkheidKleur(graad?: string): string {
  if (!graad) return 'text-gray-400';
  return 'text-green-600';
}

/**
 * Haalt unieke teeltgroepen op uit gewassen lijst
 */
export function getUniekeTeeltgroepen(gewassen: VerrijktGewas[]): string[] {
  if (!gewassen?.length) return [];
  const groepen = new Set(gewassen.map(g => g.teeltgroep).filter(Boolean));
  return Array.from(groepen).sort();
}

/**
 * Filtert gewassen op teeltgroep
 */
export function filterOpTeeltgroep(
  gewassen: VerrijktGewas[],
  teeltgroep: string
): VerrijktGewas[] {
  if (!teeltgroep || teeltgroep === 'Alle') {
    return gewassen || [];
  }
  return gewassen?.filter(g => g.teeltgroep === teeltgroep) || [];
}
