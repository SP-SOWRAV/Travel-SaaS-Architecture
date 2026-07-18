'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin } from './api-client';

export interface AuthUser {
  userId: string;
  tenantId: string | null;
  role: string;
}

interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const TOKEN_STORAGE_KEY = 'ota_access_token';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Decoded client-side for display only — the API is always the source of truth for
// verification (JwtAuthGuard, T12); no security decision is ever made from this.
function decodeUser(token: string): AuthUser | null {
  try {
    const payloadSegment = token.split('.')[1];
    const json = JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/')));
    return { userId: json.userId, tenantId: json.tenantId ?? null, role: json.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setAccessToken(window.localStorage.getItem(TOKEN_STORAGE_KEY));
    setIsInitializing(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken: token } = await apiLogin(email, password);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setAccessToken(token);
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAccessToken(null);
  };

  const user = useMemo(() => (accessToken ? decodeUser(accessToken) : null), [accessToken]);

  const value: AuthContextValue = {
    accessToken,
    user,
    isAuthenticated: !!accessToken,
    isInitializing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
