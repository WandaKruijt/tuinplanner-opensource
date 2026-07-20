/**
 * TranslatedText Component
 * Toont tekst in de juiste taal met fallback indicator
 */

import { useI18n } from '../i18n';

interface TranslatedTextProps {
  /** Nederlandse tekst */
  nl: string;
  /** Engelse tekst (optioneel) */
  en?: string;
  /** CSS class voor de tekst */
  className?: string;
  /** Of de fallback indicator getoond moet worden */
  showFallbackIndicator?: boolean;
}

/**
 * Component dat tekst toont in de huidige taal
 * Als Engels gevraagd maar niet beschikbaar, toont NL met indicator
 */
export function TranslatedText({
  nl,
  en,
  className = '',
  showFallbackIndicator = true
}: TranslatedTextProps) {
  const { taal } = useI18n();

  // Geen tekst? Return niks
  if (!nl && !en) {
    return null;
  }

  // Nederlands gevraagd of geen Engelse tekst beschikbaar
  if (taal === 'nl' || !en) {
    const isFallback = taal === 'en' && !en && nl;

    if (isFallback && showFallbackIndicator) {
      return (
        <span className={className}>
          <span className="italic">{nl}</span>
          <span className="text-xs text-gray-400 ml-1">(NL)</span>
        </span>
      );
    }

    return <span className={className}>{nl}</span>;
  }

  // Engels beschikbaar
  return <span className={className}>{en}</span>;
}

/**
 * Hook variant voor gebruik in code
 */
export function useTranslatedText(nl: string, en?: string): {
  tekst: string;
  isFallback: boolean;
} {
  const { taal } = useI18n();

  if (taal === 'nl') {
    return { tekst: nl, isFallback: false };
  }

  if (en) {
    return { tekst: en, isFallback: false };
  }

  return { tekst: nl, isFallback: !!nl };
}
