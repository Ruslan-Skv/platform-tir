'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface ChatSupportOpenContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openChat: () => void;
}

const ChatSupportOpenContext = createContext<ChatSupportOpenContextValue | null>(null);

export function ChatSupportOpenProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openChat = useCallback(() => setOpen(true), []);

  return (
    <ChatSupportOpenContext.Provider value={{ open, setOpen, openChat }}>
      {children}
    </ChatSupportOpenContext.Provider>
  );
}

export function useChatSupportOpen(): ChatSupportOpenContextValue | null {
  return useContext(ChatSupportOpenContext);
}
