"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface ChatTarget {
  partnerId: string;
  partnerName: string;
}

interface ChatContextValue {
  chatTarget: ChatTarget | null;
  openChat: (partnerId: string, partnerName: string) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  const openChat = useCallback((partnerId: string, partnerName: string) => {
    setChatTarget({ partnerId, partnerName });
  }, []);

  const closeChat = useCallback(() => {
    setChatTarget(null);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({ chatTarget, openChat, closeChat }),
    [chatTarget, openChat, closeChat],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
