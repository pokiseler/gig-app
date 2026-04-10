"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSSE, type SSENotification } from "@/hooks/useSSE";

interface SSEContextValue {
  notifications: SSENotification[];
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

/**
 * Provides a single shared SSE connection for the entire app.
 * Must be nested inside AuthProvider.
 * Replaces per-component useSSE() calls that would each open a new
 * EventSource and cause the server to close the previous one.
 */
export function SSEProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const sse = useSSE(isAuthenticated ? token : null);

  return <SSEContext.Provider value={sse}>{children}</SSEContext.Provider>;
}

export function useSSEContext() {
  const ctx = useContext(SSEContext);
  if (!ctx) throw new Error("useSSEContext must be used within SSEProvider");
  return ctx;
}
