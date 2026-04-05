"use client";

import { useEffect, useRef, useState } from "react";

export interface SSENotification {
  id: string;
  event: string;
  message: string;
  timestamp: number;
}

// Derive the SSE base from the same env variable used by the rest of the app.
// Strip a trailing /api suffix so we get the bare server URL.
const SSE_BASE: string = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api")
  .replace(/\/api\/?$/, "");

export function useSSE(token: string | null) {
  const [notifications, setNotifications] = useState<SSENotification[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    const es = new EventSource(`${SSE_BASE}/api/events?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    const handleEvent = (event: MessageEvent, name: string) => {
      try {
        const data = JSON.parse(event.data);
        queueMicrotask(() =>
          setNotifications((prev) => [
            {
              id: `${name}-${Date.now()}`,
              event: name,
              message: data.message ?? name,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 19), // keep at most 20
          ])
        );
      } catch {
        // ignore malformed events
      }
    };

    es.addEventListener("new_review", (e) => handleEvent(e as MessageEvent, "new_review"));
    es.addEventListener("new_gig",    (e) => handleEvent(e as MessageEvent, "new_gig"));
    es.addEventListener("gig_request", (e) => handleEvent(e as MessageEvent, "gig_request"));
    es.addEventListener("gig_request_accepted", (e) => handleEvent(e as MessageEvent, "gig_request_accepted"));
    es.addEventListener("gig_request_denied", (e) => handleEvent(e as MessageEvent, "gig_request_denied"));

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [token]);

  const dismiss = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const dismissAll = () => setNotifications([]);

  return { notifications, dismiss, dismissAll };
}
