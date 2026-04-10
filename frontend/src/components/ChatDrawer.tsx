"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/context/ChatContext";
import { useSSEContext } from "@/context/SSEContext";
import {
  getChatThread,
  sendChatMessage,
  type ChatMessage,
} from "@/services/api";

export function ChatDrawer() {
  const { chatTarget, openChat, closeChat } = useChat();
  const { user, token, isAuthenticated } = useAuth();
  const { notifications } = useSSEContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seenNotifIds = useRef<Set<string>>(new Set());

  // Load thread when chatTarget changes
  const loadThread = useCallback(async () => {
    if (!token || !chatTarget) return;
    setLoadError("");
    try {
      const res = await getChatThread(token, chatTarget.partnerId);
      setMessages(res.messages);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "טעינת השיחה נכשלה");
    }
  }, [token, chatTarget]);

  useEffect(() => {
    if (chatTarget) {
      void loadThread();
      setInput("");
    } else {
      setMessages([]);
    }
  }, [chatTarget, loadThread]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Live: reload when a new_message SSE arrives from our chat partner.
  // Auto-open the drawer if it is closed or open with a different person.
  useEffect(() => {
    for (const n of notifications) {
      if (n.event !== "new_message") continue;
      if (seenNotifIds.current.has(n.id)) continue;
      seenNotifIds.current.add(n.id);

      const senderId = typeof n.data.senderId === "string" ? n.data.senderId : null;
      const senderName = typeof n.data.senderName === "string" ? n.data.senderName : "משתמש";

      if (!senderId) continue;

      // Auto-open (or switch to) the sender's chat
      if (!chatTarget || chatTarget.partnerId !== senderId) {
        openChat(senderId, senderName);
      } else {
        // Already open with this person — just reload the thread
        void loadThread();
      }
    }
  }, [notifications, chatTarget, openChat, loadThread]);

  // Focus input when drawer opens
  useEffect(() => {
    if (chatTarget) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [chatTarget]);

  const handleSend = async () => {
    if (!token || !chatTarget || !input.trim()) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await sendChatMessage(token, chatTarget.partnerId, content);
      setMessages((prev) => [...prev, res.message]);
    } catch {
      setInput(content); // restore on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!chatTarget) return null;

  return (
    <>
      {/* Backdrop - subtle on desktop */}
      <div
        className="fixed inset-0 z-[60] bg-black/20 sm:bg-transparent"
        onClick={closeChat}
        aria-hidden
      />

      {/* Drawer */}
      <div
        className="fixed bottom-4 left-4 z-[70] flex h-[420px] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl sm:left-auto sm:right-4 sm:h-[520px] sm:w-[380px]"
        style={{ maxHeight: "calc(100vh - 96px)" }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-l from-blue-900/80 to-slate-900/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{chatTarget.partnerName}</p>
              <p className="text-xs text-white/40">שיחה פרטית</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeChat}
            className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-900/95 px-4 py-3 backdrop-blur-xl">
          {loadError && (
            <p className="text-center text-xs text-red-400">{loadError}</p>
          )}
          {messages.length === 0 && !loadError && (
            <p className="mt-8 text-center text-xs text-white/30">
              שלח הודעה ראשונה ל-{chatTarget.partnerName}
            </p>
          )}
          {messages.map((msg) => {
            const senderId =
              typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
            const isOwn = senderId === user?._id;
            const senderName =
              typeof msg.senderId === "object" ? msg.senderId.name : undefined;
            return (
              <div
                key={msg._id}
                className={`flex ${isOwn ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? "rounded-tr-sm bg-blue-600/80 text-white"
                      : "rounded-tl-sm bg-white/10 text-white"
                  }`}
                >
                  {!isOwn && senderName && (
                    <p className="mb-0.5 text-xs font-medium text-blue-300">{senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className="mt-1 text-right text-[10px] text-white/30">
                    {new Date(msg.createdAt).toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 border-t border-white/10 bg-slate-900/95 px-3 py-3 backdrop-blur-xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="הקלד הודעה... (Enter לשליחה)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none"
            style={{ maxHeight: "80px" }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
