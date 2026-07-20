/**
 * Demomodus-vervanging van 'firebase/auth'.
 *
 * Bezoekers van de demo worden automatisch ingelogd als admin, zodat ze
 * meteen alles kunnen zien. Uitloggen en opnieuw inloggen werkt ook:
 * elk wachtwoord is goed. Wie inlogt met het community-account ziet de
 * app in de community-rol.
 */

import { ADMIN_EMAILS } from '../config/appConfig';

export interface User {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
}

type AuthListener = (user: User | null) => void;

const DEMO_ADMIN: User = {
  uid: 'demo-admin',
  email: ADMIN_EMAILS[0] || 'demo-admin@example.com',
  isAnonymous: false,
};

let currentUser: User | null = DEMO_ADMIN;
const listeners = new Set<AuthListener>();

function notify(): void {
  listeners.forEach((l) => l(currentUser));
}

export function getAuth(_app?: unknown): { currentUser: User | null } {
  return {
    get currentUser() {
      return currentUser;
    },
  };
}

export function onAuthStateChanged(
  _auth: unknown,
  callback: AuthListener
): () => void {
  listeners.add(callback);
  // Async eerste aanroep, net als echte Firebase
  setTimeout(() => callback(currentUser), 0);
  return () => listeners.delete(callback);
}

export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  _password: string
): Promise<{ user: User }> {
  currentUser = {
    uid: `demo-${email}`,
    email: email.toLowerCase(),
    isAnonymous: false,
  };
  notify();
  return { user: currentUser };
}

export async function signInAnonymously(_auth: unknown): Promise<{ user: User }> {
  currentUser = { uid: 'demo-anoniem', email: null, isAnonymous: true };
  notify();
  return { user: currentUser };
}

export async function signOut(_auth: unknown): Promise<void> {
  currentUser = null;
  notify();
}
