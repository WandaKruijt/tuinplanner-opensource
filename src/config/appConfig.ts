/**
 * Centrale app-configuratie via environment variables.
 *
 * Elke vereniging vult deze waarden in via .env (lokaal) of via de
 * environment variables van de hostingomgeving (bijv. Vercel).
 * Zie .env.example en SETUP.md voor uitleg.
 */

/** Naam van de tuin, getoond op het loginscherm en in de handleiding */
export const GARDEN_NAME: string =
  import.meta.env.VITE_GARDEN_NAME || 'Gemeenschapstuin';

/**
 * E-mailadressen met adminrechten (kommagescheiden in de env-variabele).
 * Let op: pas ook firebase-rules.template.json aan met hetzelfde adres,
 * anders heeft de admin in de app wel de knoppen maar niet de schrijfrechten.
 */
export const ADMIN_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter((e: string) => e.length > 0);

/** E-mailadres van het gedeelde community-account */
export const COMMUNITY_EMAIL: string =
  import.meta.env.VITE_COMMUNITY_EMAIL || 'community@example.com';

/**
 * Demomodus: de app draait dan zonder Firebase, met voorbeelddata
 * in het geheugen. Wijzigingen verdwijnen bij herladen van de pagina.
 */
export const DEMO_MODE: boolean = import.meta.env.VITE_DEMO_MODE === 'true';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
