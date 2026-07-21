// Domain types - YOUR types, YOUR naming
export type MessageRole = "user" | "assistant";

export interface Message {
  messageId: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  navigationLink: string | null;
}

export interface ChatSession {
  sessionId: string;
  title: string;
  summary: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CreateSessionResult {
  sessionId: string;
  title: string;
  summary: string | null;
  userId: string;
  createdAt: string;
}

export interface ChatResult {
  message: string;
  provider: string;
  sessionId: string;
  messageId: string;
}

export interface HealthStatus {
  status: string;
  llmClientConnected: boolean;
}

export interface DocumentResult {
  status: string;
  message: string;
}

export type DocumentType = "session" | "global";

export interface StreamChunk {
  part: string;
  operation: string;
  value: string;
}
