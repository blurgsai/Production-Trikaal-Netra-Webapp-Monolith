import { createContext } from "react";
import type { Message } from "../model/types";

interface ChatbotContextValue {
  isChatbotOpen: boolean;
  setIsChatbotOpen: (open: boolean) => void;
  openChatbot: () => void;
  closeChatbot: () => void;
  toggleChatbot: () => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
}

export const ChatbotContext = createContext<ChatbotContextValue | undefined>(
  undefined
);

export type { ChatbotContextValue };
