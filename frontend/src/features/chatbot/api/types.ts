// Raw backend types - mirror backend exactly
export interface CreateSessionResponse {
  session_id: string;
}

export interface MessageResponse {
  message_id: number;
  role: "user" | "assistant";
  navigation_link: string | null;
  content: string;
}

export interface ChatSessionResponse {
  session_id: string;
  title: string;
}

export interface StreamChunk {
  p: string;
  o: string;
  v: string;
}
