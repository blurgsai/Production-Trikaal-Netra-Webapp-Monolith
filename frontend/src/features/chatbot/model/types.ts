export type MessageRole = "user" | "assistant";

export interface Message {
  message_id: number;
  role: MessageRole;
  navigationLink: string | null;
  content: string;
}

export interface ChatSession {
  session_id: string;
  title: string;
}

export interface CreateSessionResponse {
  session_id: string;
}

export interface StreamChunk {
  p: string;
  o: string;
  v: string;
}
