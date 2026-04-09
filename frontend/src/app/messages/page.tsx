"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MessageSquare, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/context/ChatContext";
import { useSSE } from "@/hooks/useSSE";
import { getChatThreads, type ChatThread } from "@/services/api";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), { ssr: false });

export default function MessagesPage() {
  const { token, isAuthenticated } = useAuth();
  const { openChat } = useChat();
  const { notifications } = useSSE(isAuthenticated ? token : null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadThreads = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getChatThreads(token);
      setThreads(res.threads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת השיחות נכשלה");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  // Refresh on incoming message SSE
  useEffect(() => {
    if (notifications.some((n) => n.event === "new_message")) {
      void loadThreads();
    }
  }, [notifications, loadThreads]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    return isToday
      ? d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen text-white" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-14">
        <div className="mb-6 flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight">הודעות</h1>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="mb-3 h-12 w-12 text-white/20" />
            <p className="text-sm text-white/40">אין שיחות פעילות עדיין.</p>
            <p className="mt-1 text-xs text-white/25">אשר בקשת חלתורה כדי להתחיל שיחה.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.partnerId.toString()}
                type="button"
                onClick={() => openChat(thread.partnerId.toString(), thread.partnerName)}
                className="group w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-right transition hover:border-blue-400/30 hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-semibold text-blue-300">
                    {thread.partnerName.slice(0, 1)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {thread.partnerName}
                        {thread.unread > 0 && (
                          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                            {thread.unread > 9 ? "9+" : thread.unread}
                          </span>
                        )}
                      </p>
                      <span className="shrink-0 text-xs text-white/30">{formatTime(thread.lastAt)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/40">{thread.lastMessage}</p>
                  </div>

                  <ChevronLeft className="h-4 w-4 shrink-0 text-white/20 transition group-hover:text-white/50" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
