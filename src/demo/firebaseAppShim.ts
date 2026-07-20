/**
 * Demomodus-vervanging van 'firebase/app'.
 * Wordt via een Vite-alias ingezet bij `vite --mode demo`.
 */

export interface DemoApp {
  name: string;
}

export function initializeApp(_config: unknown): DemoApp {
  console.info('[DEMO] Firebase is uitgeschakeld; de app draait op voorbeelddata.');
  return { name: 'demo' };
}
