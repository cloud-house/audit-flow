import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('accessToken'),
    isLoading: true,
  });

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((user: User) => setState({ user, token, isLoading: false }))
      .catch(() => {
        localStorage.removeItem('accessToken');
        setState({ user: null, token: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Invalid credentials');
    }
    const { accessToken, user } = await res.json();
    localStorage.setItem('accessToken', accessToken);
    setState({ user, token: accessToken, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${state.token}` },
    }).catch(() => {});
    localStorage.removeItem('accessToken');
    setState({ user: null, token: null, isLoading: false });
  }, [state.token]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.user && !!state.token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Inject the JWT token into every fetch call */
export function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('accessToken');
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}
