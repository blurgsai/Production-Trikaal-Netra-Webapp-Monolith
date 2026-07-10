// Domain types - YOUR types, YOUR naming
export type MessageRole = "user" | "assistant";

export interface Message {
  messageId: number;
  role: MessageRole;
  navigationLink: string | null;
  content: string;
}

export interface ChatSession {
  sessionId: string;
  title: string;
}

export interface CreateSessionResult {
  sessionId: string;
}

export interface StreamChunk {
  part: string;
  operation: string;
  value: string;
}
