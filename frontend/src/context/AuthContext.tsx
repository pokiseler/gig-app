"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, login, register, type AuthUser } from "@/services/api";

const TOKEN_KEY = "gigapp_token";

const getStoredToken = () =>
  typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (payload: { name: string; email: string; password: string; role?: "provider" | "consumer" }) => Promise<void>;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialise from localStorage after mount (client only).
  useEffect(() => {
    const stored = getStoredToken();
    queueMicrotask(() => {
      if (stored) {
        setToken(stored);
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Verify token against API exactly once when the token changes.
  useEffect(() => {
    if (!token) return;

    getMe(token)
      .then((response) => setUser(response.user))
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const signUp = useCallback(async (payload: {
    name: string;
    email: string;
    password: string;
    role?: "provider" | "consumer";
  }) => {
    const response = await register(payload);
    window.localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const signIn = useCallback(async (payload: { email: string; password: string }) => {
    const response = await login(payload);
    window.localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getMe(token);
      setUser(response.user);
    } catch {
      // token is invalid — sign out
      signOut();
    }
  }, [token, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, isAuthenticated: Boolean(token && user), signUp, signIn, signOut, refreshUser }),
    [token, user, loading, signUp, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
