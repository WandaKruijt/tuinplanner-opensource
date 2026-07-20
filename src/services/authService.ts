/**
 * Firebase Anonymous Authentication Service
 * Logt gebruikers automatisch anoniem in voor database toegang
 * Gebruiker merkt hier niets van - gebeurt onder de motorkap
 */

import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import app from '../config/firebase';

const auth = getAuth(app);

/**
 * Initialiseer anonieme authenticatie
 * Wacht tot gebruiker is ingelogd (of al was ingelogd)
 */
export const initAuth = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    // Luister naar auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Auth: Gebruiker geauthenticeerd:', user.uid);
        unsubscribe(); // Stop met luisteren na succesvolle auth
        resolve(user);
      }
    });

    // Start anonieme login
    signInAnonymously(auth)
      .then((result) => {
        console.log('Auth: Anoniem ingelogd:', result.user.uid);
        // resolve gebeurt via onAuthStateChanged
      })
      .catch((error) => {
        console.error('Auth: Fout bij anonieme login:', error);
        unsubscribe();
        reject(error);
      });
  });
};

/**
 * Haal huidige gebruiker op (kan null zijn)
 */
export const getCurrentUser = (): User | null => auth.currentUser;

/**
 * Check of gebruiker is ingelogd
 */
export const isAuthenticated = (): boolean => auth.currentUser !== null;
