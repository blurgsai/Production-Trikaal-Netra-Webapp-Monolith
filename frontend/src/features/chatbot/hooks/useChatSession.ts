import { useState, useCallback } from "react";
import {
  createSession as createSessionApi,
  fetchChatHistory as fetchChatHistoryApi,
} from "../api/chatbotApi";
import {
  mapCreateSessionResponse,
  mapChatSessionResponse,
} from "../model/mappers";
import type { ChatSession } from "../model/types";

export function useChatSession() {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const rawResponse = await createSessionApi();
      const result = mapCreateSessionResponse(rawResponse);
      
      // Refresh history after creating session
      await fetchChatHistory();
      
      return result.sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create session";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchChatHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const rawHistory = await fetchChatHistoryApi();
      const history = rawHistory.map(mapChatSessionResponse);
      setChatHistory(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch chat history";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    chatHistory,
    setChatHistory,
    isLoading,
    error,
    createSession,
    fetchChatHistory,
  };
}
