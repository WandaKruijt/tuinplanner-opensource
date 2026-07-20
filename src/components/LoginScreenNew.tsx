/**
 * LoginScreen - Twee-laags login voor TuinPlanner
 * 
 * Default: Community login (alleen wachtwoord)
 * Via klein icoontje: Admin login (email + wachtwoord)
 */

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GARDEN_NAME, COMMUNITY_EMAIL } from '../config/appConfig';

export default function LoginScreen() {
  const { loginCommunity, loginAdmin, error, loading } = useAuth();
  
  // Community login state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Admin login state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  // Local error state
  const [localError, setLocalError] = useState('');

  // ============================================
  // HANDLERS
  // ============================================

  const handleCommunityLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    if (!password.trim()) {
      setLocalError('Vul het wachtwoord in');
      return;
    }
    
    const success = await loginCommunity(password);
    
    if (!success) {
      setPassword(''); // Clear password on failure
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setLocalError('Vul email en wachtwoord in');
      return;
    }
    
    const success = await loginAdmin(adminEmail, adminPassword);
    
    if (!success) {
      setAdminPassword(''); // Clear password on failure
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-gray-800">TuinPlanner</h1>
          <p className="text-gray-500 mt-2">{GARDEN_NAME}</p>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {displayError}
          </div>
        )}

        {/* Community Login (Default) */}
        {!showAdminLogin ? (
          <form onSubmit={handleCommunityLogin} autoComplete="on">
            {/* Verborgen email veld voor password manager */}
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={COMMUNITY_EMAIL}
              readOnly
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            
            <div className="mb-6">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Wachtwoord
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Voer het gedeelde wachtwoord in"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Vraag het wachtwoord aan een commissielid
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Even geduld...' : 'Inloggen'}
            </button>
          </form>
        ) : (
          /* Admin Login */
          <form onSubmit={handleAdminLogin} autoComplete="on">
            <div className="mb-4">
              <label 
                htmlFor="adminEmail" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Admin Email
              </label>
              <input
                id="adminEmail"
                name="email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label 
                htmlFor="adminPassword" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Admin Wachtwoord
              </label>
              <div className="relative">
                <input
                  id="adminPassword"
                  name="password"
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                >
                  {showAdminPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Even geduld...' : 'Admin Inloggen'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAdminLogin(false);
                setLocalError('');
              }}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Terug naar community login
            </button>
          </form>
        )}

        {/* Admin Login Toggle (subtle) */}
        {!showAdminLogin && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setShowAdminLogin(true);
                setLocalError('');
              }}
              className="text-gray-400 hover:text-gray-600 text-xs flex items-center justify-center gap-1 mx-auto"
              title="Admin login"
            >
              <span>⚙️</span>
              <span>Beheerder</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
