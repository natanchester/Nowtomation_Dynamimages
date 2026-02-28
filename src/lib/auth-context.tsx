import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkSession, login as apiLogin, logout as apiLogout } from './api';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiToken: string;
  setApiToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('api_token') || '');

  useEffect(() => {
    checkSession()
      .then(setIsLoggedIn)
      .catch(() => setIsLoggedIn(false))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('api_token', apiToken);
  }, [apiToken]);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, login, logout, apiToken, setApiToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
