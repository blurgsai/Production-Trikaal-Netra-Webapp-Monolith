import { useState, useCallback } from "react";
import {
  fetchMessages as fetchMessagesApi,
  streamMessage as streamMessageApi,
  sendChatMessage as sendChatMessageApi,
} from "../api/chatbotApi";
import {
  mapMessageResponse,
  mapStreamChunk,
  mapChatResponse,
} from "../model/mappers";
import type { Message, StreamChunk, ChatResult } from "../model/types";

export function useChatMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const rawMessages = await fetchMessagesApi(sessionId);
      const messages = rawMessages.map(mapMessageResponse);
      return messages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch messages";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendChatMessage = useCallback(
    async (sessionId: string, message: string): Promise<ChatResult> => {
      try {
        setIsLoading(true);
        setError(null);
        const rawResponse = await sendChatMessageApi({
          session_id: sessionId,
          message,
        });
        return mapChatResponse(rawResponse);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send chat message";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const streamMessage = useCallback(
    async (
      sessionId: string,
      message: string,
      onChunk: (chunk: StreamChunk) => void,
      onError: (error: Error) => void
    ): Promise<void> => {
      try {
        await streamMessageApi(
          sessionId,
          message,
          (rawChunk) => {
            const chunk = mapStreamChunk(rawChunk);
            onChunk(chunk);
          },
          onError
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Streaming failed";
        setError(errorMessage);
        onError(err as Error);
      }
    },
    []
  );

  return {
    isLoading,
    error,
    fetchMessages,
    sendChatMessage,
    streamMessage,
  };
}
