"use client";

import { useEffect, useRef, useState } from "react";

export interface SSENotification {
  id: string;
  event: string;
  message: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// Derive the SSE base from the same env variable used by the rest of the app.
// Strip a trailing /api suffix so we get the bare server URL.
const SSE_BASE: string = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api")
  .replace(/\/api\/?$/, "");

const RECONNECT_INIT_MS = 2_000;
const RECONNECT_MAX_MS  = 30_000;

export function useSSE(token: string | null) {
  const [notifications, setNotifications] = useState<SSENotification[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let retryDelay = RECONNECT_INIT_MS;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let reconnecting = false;

    const handleEvent = (event: MessageEvent, name: string) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        queueMicrotask(() =>
          setNotifications((prev) => [
            {
              id: `${name}-${Date.now()}`,
              event: name,
              message: typeof data.message === "string" ? data.message : name,
              timestamp: Date.now(),
              data,
            },
            ...prev.slice(0, 19), // keep at most 20
          ])
        );
      } catch {
        // ignore malformed events
      }
    };

    const clearRetryTimer = () => {
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const closeCurrentConnection = () => {
      es?.close();
      es = null;
      esRef.current = null;
    };

    const scheduleReconnect = (delay: number) => {
      if (cancelled) return;
      clearRetryTimer();
      reconnecting = true;
      retryTimer = setTimeout(() => {
        reconnecting = false;
        connect();
      }, delay);
    };

    function connect() {
      if (cancelled) return;
      if (reconnecting) return;

      closeCurrentConnection();
      es = new EventSource(`${SSE_BASE}/api/events?token=${encodeURIComponent(token!)}`);
      esRef.current = es;

      es.onopen = () => {
        // Connection (re-)established — reset backoff.
        retryDelay = RECONNECT_INIT_MS;
        reconnecting = false;
      };

      es.onerror = () => {
        if (cancelled) return;
        closeCurrentConnection();
        // Exponential backoff before reconnecting.
        const delay = retryDelay;
        retryDelay = Math.min(delay * 2, RECONNECT_MAX_MS);
        scheduleReconnect(delay);
      };

      es.addEventListener("new_review",           (e) => handleEvent(e as MessageEvent, "new_review"));
      es.addEventListener("new_gig",              (e) => handleEvent(e as MessageEvent, "new_gig"));
      es.addEventListener("gig_request",          (e) => handleEvent(e as MessageEvent, "gig_request"));
      es.addEventListener("gig_request_accepted", (e) => handleEvent(e as MessageEvent, "gig_request_accepted"));
      es.addEventListener("gig_request_denied",   (e) => handleEvent(e as MessageEvent, "gig_request_denied"));
      es.addEventListener("new_message",          (e) => handleEvent(e as MessageEvent, "new_message"));
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      retryDelay = RECONNECT_INIT_MS;
      reconnecting = false;
      clearRetryTimer();
      connect();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    connect();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearRetryTimer();
      closeCurrentConnection();
    };
  }, [token]);

  const dismiss = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const dismissAll = () => setNotifications([]);

  return { notifications, dismiss, dismissAll };
}
