/**
 * Translation Service - DeepL API integration via Vercel Serverless Function
 * Vertaalt teksten van Nederlands naar Engels bij opslaan
 *
 * NOTE: We use a serverless function to avoid CORS issues with direct DeepL API calls
 */

// API endpoint - uses Vercel serverless function
const TRANSLATE_API_URL = '/api/translate';

/**
 * Check of we in development of production mode zijn
 */
function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Haal de DeepL API key op (alleen voor check of het geconfigureerd is)
 * In productie via Vercel environment variable
 */
function getDeepLApiKey(): string | null {
  // Vite gebruikt import.meta.env voor environment variables
  const key = import.meta.env.VITE_DEEPL_API_KEY;
  return key || null;
}

/**
 * Vertaal een tekst van Nederlands naar Engels
 * @param tekst De Nederlandse tekst om te vertalen
 * @returns De Engelse vertaling, of lege string bij fout
 */
export async function vertaalNaarEngels(tekst: string): Promise<string> {
  // Skip lege teksten
  if (!tekst || tekst.trim() === '') {
    return '';
  }

  // In development zonder API key, skip vertaling
  if (isDevelopment() && !getDeepLApiKey()) {
    console.log('Translation: Geen DeepL API key geconfigureerd (development mode)');
    return '';
  }

  try {
    const response = await fetch(TRANSLATE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [tekst]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Translation API error:', response.status, errorData);
      return '';
    }

    const data = await response.json();

    if (data.translations && data.translations.length > 0) {
      return data.translations[0].text;
    }

    return '';
  } catch (error) {
    console.error('Translation error:', error);
    return '';
  }
}

/**
 * Vertaal meerdere teksten in één API call (efficiënter)
 * @param teksten Array van Nederlandse teksten
 * @returns Array van Engelse vertalingen (zelfde volgorde)
 */
export async function vertaalBatch(teksten: string[]): Promise<string[]> {
  // Filter lege teksten maar onthoud posities
  const nietLegeTeksten = teksten.map((t, i) => ({ tekst: t, index: i }))
    .filter(item => item.tekst && item.tekst.trim() !== '');

  if (nietLegeTeksten.length === 0) {
    return teksten.map(() => '');
  }

  // In development zonder API key, skip vertaling
  if (isDevelopment() && !getDeepLApiKey()) {
    console.log('Translation: Geen DeepL API key geconfigureerd (development mode)');
    return teksten.map(() => '');
  }

  try {
    const response = await fetch(TRANSLATE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: teksten
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Translation batch API error:', response.status, errorData);
      return teksten.map(() => '');
    }

    const data = await response.json();

    // Bouw resultaat array op met vertalingen op juiste posities
    const resultaat = teksten.map(() => '');

    if (data.translations) {
      data.translations.forEach((translation: { text: string }, i: number) => {
        if (translation && translation.text) {
          resultaat[i] = translation.text;
        }
      });
    }

    return resultaat;
  } catch (error) {
    console.error('Translation batch error:', error);
    return teksten.map(() => '');
  }
}

/**
 * Check of DeepL API beschikbaar is
 * In production is dit altijd true (de serverless function handelt de check af)
 * In development checken we de env var
 */
export function isTranslationAvailable(): boolean {
  // In production, altijd beschikbaar (server-side check)
  if (!isDevelopment()) {
    return true;
  }
  // In development, check env var
  return getDeepLApiKey() !== null;
}

/**
 * Helper: vertaal een object met specifieke velden
 * @param obj Het object met Nederlandse teksten
 * @param velden Array van veldnamen om te vertalen
 * @returns Object met toegevoegde _en velden
 */
export async function vertaalObjectVelden<T extends Record<string, unknown>>(
  obj: T,
  velden: (keyof T)[]
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = { ...obj };

  for (const veld of velden) {
    const waarde = obj[veld];
    if (typeof waarde === 'string' && waarde.trim() !== '') {
      const vertaling = await vertaalNaarEngels(waarde);
      if (vertaling) {
        result[`${String(veld)}_en`] = vertaling;
      }
    }
  }

  return result;
}

/**
 * Helper: haal de juiste tekst op basis van taal
 * @param obj Object met mogelijk _en velden
 * @param veld Het veldnaam
 * @param taal De huidige taal ('nl' of 'en')
 * @returns Object met tekst en of het een fallback is
 */
export function getTekstVoorTaal<T extends Record<string, unknown>>(
  obj: T,
  veld: keyof T,
  taal: 'nl' | 'en'
): { tekst: string; isFallback: boolean } {
  const nlTekst = (obj[veld] as string) || '';

  if (taal === 'nl') {
    return { tekst: nlTekst, isFallback: false };
  }

  // Engels gevraagd - check of _en veld bestaat
  const enVeld = `${String(veld)}_en`;
  const enTekst = (obj[enVeld as keyof T] as string) || '';

  if (enTekst) {
    return { tekst: enTekst, isFallback: false };
  }

  // Fallback naar NL
  return { tekst: nlTekst, isFallback: nlTekst !== '' };
}
