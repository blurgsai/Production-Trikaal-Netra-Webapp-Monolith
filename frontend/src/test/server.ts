import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const chatbotBaseUrl =
  import.meta.env.VITE_CHATBOT_BASE_URL || "http://localhost:8000";

export const CHATBOT_BASE_URL = chatbotBaseUrl;

export const mockApi = setupServer(
  // Chatbot: Health check
  http.get(`${chatbotBaseUrl}/health`, () => {
    return HttpResponse.json({
      status: "ok",
      llm_client_connected: true,
    });
  }),

  // Chatbot: Create session
  http.post(`${chatbotBaseUrl}/sessions`, () => {
    return HttpResponse.json({
      session_id: "test-session-id",
      title: "Test Session",
      summary: null,
      user_id: "test-user-id",
      created_at: "2026-07-21T07:45:00.000Z",
    });
  }),

  // Chatbot: Fetch chat history
  http.get(`${chatbotBaseUrl}/sessions`, () => {
    return HttpResponse.json([
      {
        session_id: "session-1",
        title: "Test Conversation 1",
        summary: null,
        updated_at: "2026-07-21T07:45:00.000Z",
        created_at: "2026-07-21T07:45:00.000Z",
      },
      {
        session_id: "session-2",
        title: "Test Conversation 2",
        summary: null,
        updated_at: "2026-07-21T07:45:00.000Z",
        created_at: "2026-07-21T07:45:00.000Z",
      },
    ]);
  }),

  // Chatbot: Fetch messages for a session
  http.get(`${chatbotBaseUrl}/sessions/:sessionId/messages`, () => {
    return HttpResponse.json([
      {
        message_id: "msg-1",
        session_id: "test-session-id",
        role: "user",
        content: "Hello AI",
        created_at: "2026-07-21T07:45:10.000Z",
        navigation_link: null,
      },
      {
        message_id: "msg-2",
        session_id: "test-session-id",
        role: "assistant",
        content: "Hi! How can I help you?",
        created_at: "2026-07-21T07:45:15.000Z",
        navigation_link: "/map",
      },
    ]);
  }),

  // Chatbot: Blocking chat response
  http.post(`${chatbotBaseUrl}/chat`, () => {
    return HttpResponse.json({
      message: "The capital of France is Paris.",
      provider: "ollama",
      session_id: "test-session-id",
      message_id: "msg-chat-1",
    });
  }),

  // Chatbot: Stream message response
  http.post(`${chatbotBaseUrl}/stream`, () => {
    const encoder = new TextEncoder();
    const chunks = [
      `data: ${JSON.stringify({
        p: "/messsage/content",
        o: "append",
        v: "Hello",
      })}`,
      `data: ${JSON.stringify({
        p: "/messsage/content",
        o: "append",
        v: " from AI",
      })}`,
      "data: [DONE]",
    ];
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => {
          controller.enqueue(encoder.encode(chunk + "\n"));
        });
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { "Content-Type": "text/plain" },
    });
  }),

  // Chatbot: Add session documents
  http.post(`${chatbotBaseUrl}/add-session-documents`, () => {
    return HttpResponse.json({
      status: "ok",
      message: "Document added successfully",
    });
  }),

  // Chatbot: Add global documents
  http.post(`${chatbotBaseUrl}/add-global-documents`, () => {
    return HttpResponse.json({
      status: "ok",
      message: "Document added successfully",
    });
  }),

  // Chatbot: Enable document
  http.get(`${chatbotBaseUrl}/enable-file`, () => {
    return HttpResponse.json({
      status: "ok",
      message: "Document status toggled successfully",
    });
  }),

  // Chatbot: Disable document
  http.get(`${chatbotBaseUrl}/disable-file`, () => {
    return HttpResponse.json({
      status: "ok",
      message: "Document status toggled successfully",
    });
  }),
);
