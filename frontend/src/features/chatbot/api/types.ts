// Raw backend types - mirror Omnisense API exactly

// ── Request types ──────────────────────────────────────────────────────

export interface CreateSessionRequest {
  title?: string;
  summary?: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
}

export interface AddSessionDocumentsRequest {
  file_path: string;
  session_id: string;
}

export interface AddGlobalDocumentsRequest {
  file_path: string;
  file_name: string;
  description: string;
  session_id?: string;
}

export interface EnableDisableDocumentRequest {
  document_id: string;
  document_type: "session" | "global";
}

// ── Response types ─────────────────────────────────────────────────────

export interface HealthCheckResponse {
  status: string;
  llm_client_connected: boolean;
}

export interface CreateSessionResponse {
  session_id: string;
  title: string;
  summary: string | null;
  user_id: string;
  created_at: string;
}

export interface ChatSessionResponse {
  session_id: string;
  title: string;
  summary: string | null;
  updated_at: string;
  created_at: string;
}

export interface MessageResponse {
  message_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  navigation_link: string | null;
}

export interface ChatResponse {
  message: string;
  provider: string;
  session_id: string;
  message_id: string;
}

export interface DocumentResponse {
  status: string;
  message: string;
}

export interface StreamChunk {
  p: string;
  o: string;
  v: string;
}
