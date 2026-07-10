import { useState, ReactNode } from "react";
import { ChatbotContext } from "./ChatbotContext";
import type { ChatbotContextValue } from "./ChatbotContext";
import type { Message } from "../model/types";

interface ChatbotProviderProps {
  children: ReactNode;
}

export const ChatbotProvider = ({ children }: ChatbotProviderProps) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const openChatbot = () => setIsChatbotOpen(true);
  const closeChatbot = () => setIsChatbotOpen(false);
  const toggleChatbot = () => setIsChatbotOpen((prev) => !prev);

  const value: ChatbotContextValue = {
    isChatbotOpen,
    setIsChatbotOpen,
    openChatbot,
    closeChatbot,
    toggleChatbot,
    messages,
    setMessages,
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
};
