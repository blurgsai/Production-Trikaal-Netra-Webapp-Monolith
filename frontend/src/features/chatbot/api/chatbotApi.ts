import axios from "axios";
import type {
  CreateSessionResponse,
  MessageResponse,
  ChatSessionResponse,
  StreamChunk as RawStreamChunk,
} from "./types";
import {
  mapCreateSessionResponse,
  mapMessageResponse,
  mapChatSessionResponse,
  mapStreamChunk,
} from "../model/mappers";
import type {
  Message,
  ChatSession,
  StreamChunk,
} from "../model/types";

const chatbotBaseUrl = import.meta.env.VITE_CHATBOT_BASE_URL;

const getAuthToken = () => `Bearer ${localStorage.getItem("token")}`;

export async function createSession(): Promise<string> {
  const { data } = await axios.post<CreateSessionResponse>(
    `${chatbotBaseUrl}/sessions`,
    {},
    {
      headers: { Authorization: getAuthToken() },
    }
  );
  const result = mapCreateSessionResponse(data);
  return result.sessionId;
}

export async function fetchMessages(sessionId: string): Promise<Message[]> {
  const { data } = await axios.get<MessageResponse[]>(
    `${chatbotBaseUrl}/sessions/${sessionId}/messages`,
    {
      headers: { Authorization: getAuthToken() },
    }
  );
  return (data || []).map(mapMessageResponse);
}

export async function fetchChatHistory(): Promise<ChatSession[]> {
  const { data } = await axios.get<ChatSessionResponse[]>(
    `${chatbotBaseUrl}/sessions`,
    {
      headers: { Authorization: getAuthToken() },
    }
  );
  return data.map(mapChatSessionResponse);
}

export async function streamMessage(
  sessionId: string,
  message: string,
  onChunk: (chunk: StreamChunk) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${chatbotBaseUrl}/stream`, {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        message: message,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthToken(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is null");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const dataStr = line.trim();
        if (!dataStr) continue;

        if (dataStr === "[DONE]") {
          return;
        }

        try {
          const parsed: RawStreamChunk = JSON.parse(dataStr);
          onChunk(mapStreamChunk(parsed));
        } catch (err) {
          console.error("Parse error:", err, dataStr);
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
}
