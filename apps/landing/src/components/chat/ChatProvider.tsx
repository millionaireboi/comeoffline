"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ChatMessage {
  role: string;
  text: string;
}

interface ChatContextType {
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatContext = createContext<ChatContextType>({
  chatOpen: false,
  openChat: () => {},
  closeChat: () => {},
  messages: [],
  setMessages: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  return (
    <ChatContext.Provider value={{ chatOpen, openChat, closeChat, messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
