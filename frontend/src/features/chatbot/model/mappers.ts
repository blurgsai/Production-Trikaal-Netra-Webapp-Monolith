// Anti-corruption layer - translator between raw backend types and domain types
import type {
  CreateSessionResponse,
  MessageResponse,
  ChatSessionResponse,
  ChatResponse,
  HealthCheckResponse,
  DocumentResponse,
  StreamChunk as RawStreamChunk,
} from "../api/types";
import type {
  CreateSessionResult,
  Message,
  ChatSession,
  ChatResult,
  HealthStatus,
  DocumentResult,
  StreamChunk,
} from "./types";

export function mapCreateSessionResponse(raw: CreateSessionResponse): CreateSessionResult {
  return {
    sessionId: raw.session_id,
    title: raw.title,
    summary: raw.summary,
    userId: raw.user_id,
    createdAt: raw.created_at,
  };
}

export function mapMessageResponse(raw: MessageResponse): Message {
  return {
    messageId: raw.message_id,
    sessionId: raw.session_id,
    role: raw.role,
    content: raw.content,
    createdAt: raw.created_at,
    navigationLink: raw.navigation_link,
  };
}

export function mapChatSessionResponse(raw: ChatSessionResponse): ChatSession {
  return {
    sessionId: raw.session_id,
    title: raw.title,
    summary: raw.summary,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
  };
}

export function mapChatResponse(raw: ChatResponse): ChatResult {
  return {
    message: raw.message,
    provider: raw.provider,
    sessionId: raw.session_id,
    messageId: raw.message_id,
  };
}

export function mapHealthCheckResponse(raw: HealthCheckResponse): HealthStatus {
  return {
    status: raw.status,
    llmClientConnected: raw.llm_client_connected,
  };
}

export function mapDocumentResponse(raw: DocumentResponse): DocumentResult {
  return {
    status: raw.status,
    message: raw.message,
  };
}

export function mapStreamChunk(raw: RawStreamChunk): StreamChunk {
  return {
    part: raw.p,
    operation: raw.o,
    value: raw.v,
  };
}
