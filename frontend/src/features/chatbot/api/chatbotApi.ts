import axios from "axios";
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  MessageResponse,
  ChatSessionResponse,
  ChatRequest,
  ChatResponse,
  HealthCheckResponse,
  DocumentResponse,
  AddSessionDocumentsRequest,
  AddGlobalDocumentsRequest,
  EnableDisableDocumentRequest,
  StreamChunk,
} from "./types";

const chatbotBaseUrl = import.meta.env.VITE_CHATBOT_BASE_URL;

const getAuthToken = () => `Bearer ${localStorage.getItem("token")}`;

const authHeaders = () => ({ Authorization: getAuthToken() });

// ── Health Check ───────────────────────────────────────────────────────

export async function healthCheck(): Promise<HealthCheckResponse> {
  const { data } = await axios.get<HealthCheckResponse>(
    `${chatbotBaseUrl}/health`
  );
  return data;
}

// ── Session Management ─────────────────────────────────────────────────

export async function createSession(
  params?: CreateSessionRequest
): Promise<CreateSessionResponse> {
  const { data } = await axios.post<CreateSessionResponse>(
    `${chatbotBaseUrl}/sessions`,
    params ?? {},
    {
      headers: authHeaders(),
    }
  );
  return data;
}

export async function fetchChatHistory(): Promise<ChatSessionResponse[]> {
  const { data } = await axios.get<ChatSessionResponse[]>(
    `${chatbotBaseUrl}/sessions`,
    {
      headers: authHeaders(),
    }
  );
  return data;
}

export async function fetchMessages(
  sessionId: string
): Promise<MessageResponse[]> {
  const { data } = await axios.get<MessageResponse[]>(
    `${chatbotBaseUrl}/sessions/${sessionId}/messages`,
    {
      headers: authHeaders(),
    }
  );
  return data || [];
}

// ── Chat & Streaming ───────────────────────────────────────────────────

export async function sendChatMessage(
  params: ChatRequest
): Promise<ChatResponse> {
  const { data } = await axios.post<ChatResponse>(
    `${chatbotBaseUrl}/chat`,
    params,
    {
      headers: authHeaders(),
    }
  );
  return data;
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

        // Strip SSE "data: " prefix
        const payload = dataStr.startsWith("data: ")
          ? dataStr.slice(6).trim()
          : dataStr;

        if (payload === "[DONE]") {
          return;
        }

        try {
          const parsed: StreamChunk = JSON.parse(payload);
          onChunk(parsed);
        } catch (err) {
          console.error("Parse error:", err, dataStr);
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
}

// ── Document & RAG Management ──────────────────────────────────────────

export async function addSessionDocuments(
  params: AddSessionDocumentsRequest
): Promise<DocumentResponse> {
  const { data } = await axios.post<DocumentResponse>(
    `${chatbotBaseUrl}/add-session-documents`,
    params,
    {
      headers: authHeaders(),
    }
  );
  return data;
}

export async function addGlobalDocuments(
  params: AddGlobalDocumentsRequest
): Promise<DocumentResponse> {
  const { data } = await axios.post<DocumentResponse>(
    `${chatbotBaseUrl}/add-global-documents`,
    params,
    {
      headers: authHeaders(),
    }
  );
  return data;
}

export async function enableDocument(
  params: EnableDisableDocumentRequest
): Promise<DocumentResponse> {
  const { data } = await axios.get<DocumentResponse>(
    `${chatbotBaseUrl}/enable-file`,
    {
      params,
      headers: authHeaders(),
    }
  );
  return data;
}

export async function disableDocument(
  params: EnableDisableDocumentRequest
): Promise<DocumentResponse> {
  const { data } = await axios.get<DocumentResponse>(
    `${chatbotBaseUrl}/disable-file`,
    {
      params,
      headers: authHeaders(),
    }
  );
  return data;
}
