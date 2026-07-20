/**
 * AuthContext - Twee-laags authenticatie voor TuinPlanner
 *
 * Community: gedeeld login (VITE_COMMUNITY_EMAIL)
 * Admin: persoonlijke logins (VITE_ADMIN_EMAILS)
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import app from '../config/firebase';
import { COMMUNITY_EMAIL, isAdminEmail } from '../config/appConfig';

const auth = getAuth(app);

// ============================================
// TYPES
// ============================================

interface AuthUser {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  
  // Login functies
  loginCommunity: (password: string) => Promise<boolean>;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Helpers
  isAdmin: boolean;
  isAuthenticated: boolean;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Luister naar auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const isAdmin = isAdminEmail(firebaseUser.email);
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          isAdmin,
          isAuthenticated: true
        });
        
        console.log('Auth: Ingelogd als', firebaseUser.email, isAdmin ? '(admin)' : '(community)');
      } else {
        setUser(null);
        console.log('Auth: Niet ingelogd');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================
  // LOGIN FUNCTIES
  // ============================================

  /**
   * Community login - alleen wachtwoord nodig
   */
  const loginCommunity = async (password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, COMMUNITY_EMAIL, password);
      return true;
    } catch (err: any) {
      console.error('Community login error:', err);
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Onjuist wachtwoord');
      } else if (err.code === 'auth/user-not-found') {
        setError('Community account niet gevonden. Neem contact op met de beheerder.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Te veel pogingen. Probeer het later opnieuw.');
      } else {
        setError('Inloggen mislukt. Probeer het opnieuw.');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Admin login - email + wachtwoord
   */
  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Controleer of het echt een admin is
      if (!isAdminEmail(result.user.email)) {
        // Niet een admin - log uit en geef fout
        await signOut(auth);
        setError('Dit account heeft geen admin rechten');
        return false;
      }
      
      return true;
    } catch (err: any) {
      console.error('Admin login error:', err);
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Onjuiste email of wachtwoord');
      } else if (err.code === 'auth/user-not-found') {
        setError('Account niet gevonden');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Te veel pogingen. Probeer het later opnieuw.');
      } else {
        setError('Inloggen mislukt. Probeer het opnieuw.');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Uitloggen
   */
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      // Clear eventuele lokale state
      localStorage.removeItem('tuinplanner_rol');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    user,
    loading,
    error,
    loginCommunity,
    loginAdmin,
    logout,
    isAdmin: user?.isAdmin ?? false,
    isAuthenticated: user?.isAuthenticated ?? false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth moet binnen een AuthProvider gebruikt worden');
  }
  return context;
}

// ============================================
// HULP COMPONENTEN
// ============================================

/**
 * Wrapper die alleen content toont als gebruiker is ingelogd
 */
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Laden...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}

/**
 * Wrapper die alleen content toont voor admins
 */
interface RequireAdminProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAdmin({ children, fallback }: RequireAdminProps) {
  const { isAdmin, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  if (!isAdmin) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}
