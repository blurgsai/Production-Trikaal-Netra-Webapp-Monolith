import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const chatbotBaseUrl =
  import.meta.env.VITE_CHATBOT_BASE_URL || "http://localhost:8000";

export const CHATBOT_BASE_URL = chatbotBaseUrl;

export const mockApi = setupServer(
  // Chatbot: Create session
  http.post(`${chatbotBaseUrl}/sessions`, () => {
    return HttpResponse.json({ session_id: "test-session-id" });
  }),

  // Chatbot: Fetch chat history
  http.get(`${chatbotBaseUrl}/sessions`, () => {
    return HttpResponse.json([
      { session_id: "session-1", title: "Test Conversation 1" },
      { session_id: "session-2", title: "Test Conversation 2" },
    ]);
  }),

  // Chatbot: Fetch messages for a session
  http.get(`${chatbotBaseUrl}/sessions/:sessionId/messages`, () => {
    return HttpResponse.json([
      {
        message_id: 1,
        role: "user",
        navigation_link: null,
        content: "Hello AI",
      },
      {
        message_id: 2,
        role: "assistant",
        navigation_link: "/map",
        content: "Hi! How can I help you?",
      },
    ]);
  }),

  // Chatbot: Stream message response
  http.post(`${chatbotBaseUrl}/stream`, () => {
    const encoder = new TextEncoder();
    const chunks = [
      JSON.stringify({
        p: "/messsage/content",
        o: "append",
        v: "Hello",
      }),
      JSON.stringify({
        p: "/messsage/content",
        o: "append",
        v: " from AI",
      }),
      "[DONE]",
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
);
