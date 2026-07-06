// Anti-corruption layer - translator between raw backend types and domain types
import type {
  CreateSessionResponse,
  MessageResponse,
  ChatSessionResponse,
  StreamChunk as RawStreamChunk,
} from "../api/types";
import type {
  CreateSessionResult,
  Message,
  ChatSession,
  StreamChunk,
} from "./types";

export function mapCreateSessionResponse(raw: CreateSessionResponse): CreateSessionResult {
  return {
    sessionId: raw.session_id,
  };
}

export function mapMessageResponse(raw: MessageResponse): Message {
  return {
    messageId: raw.message_id,
    role: raw.role,
    navigationLink: raw.navigation_link,
    content: raw.content,
  };
}

export function mapChatSessionResponse(raw: ChatSessionResponse): ChatSession {
  return {
    sessionId: raw.session_id,
    title: raw.title,
  };
}

export function mapStreamChunk(raw: RawStreamChunk): StreamChunk {
  return {
    part: raw.p,
    operation: raw.o,
    value: raw.v,
  };
}
