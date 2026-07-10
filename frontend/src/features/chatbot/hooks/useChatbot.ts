import { useContext } from "react";
import { ChatbotContext } from "./ChatbotContext";

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within ChatbotProvider");
  }
  return context;
};
