import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const chatbotBaseUrl =
  import.meta.env.VITE_CHATBOT_BASE_URL || "http://localhost:8000";

export const CHATBOT_BASE_URL = chatbotBaseUrl;

export const mockApi = setupServer(
  // Playback: Fetch attributes
  http.get("/mock/playback/attributes.json", () => {
    return HttpResponse.json({
      attributes: [
        { key: "vessel_type", path: "vessel.vessel_type" },
        { key: "flag", path: "vessel.flag" },
        { key: "speed", path: "vessel.speed" },
        { key: "heading", path: "vessel.heading" },
        { key: "destination", path: "vessel.destination" },
        { key: "status", path: "vessel.status" },
      ],
    });
  }),

  // Playback: Fetch chunk data (dynamic based on granularity + chunk offset)
  http.get("/mock/playback/:granularity-:chunk.json", ({ params }) => {
    const { granularity, chunk } = params;
    const chunkOffset = Number(chunk);
    const baseTs = new Date("2024-12-04T16:00:00Z").getTime();

    const secondsPerChunk: Record<string, number> = {
      minute: 60,
      hour: 3600,
      day: 86400,
      week: 604800,
    };
    const chunkSec = secondsPerChunk[granularity as string] || 60;

    const pointsPerChunk = 5;
    const intervalSec = Math.floor(chunkSec / pointsPerChunk);

    const timestamps: string[] = [];
    for (let p = 0; p < pointsPerChunk; p++) {
      const ts = new Date(baseTs + (chunkOffset * chunkSec + p * intervalSec) * 1000);
      timestamps.push(ts.toISOString().slice(0, 19) + "Z");
    }

    const vessels: Record<string, Array<{ ts: string; lat: number; lon: number; heading: number }>> = {};
    for (let i = 1; i <= 3; i++) {
      const vid = `V${String(i).padStart(4, "0")}`;
      vessels[vid] = timestamps.map((ts, p) => ({
        ts,
        lat: 15 + i * 0.1 + chunkOffset * 0.01 + p * 0.001,
        lon: 65 + i * 0.2 + chunkOffset * 0.01 + p * 0.001,
        heading: 45 + i * 10 + chunkOffset,
      }));
    }

    return HttpResponse.json({
      chunk_offset: chunkOffset,
      chunk_start: new Date(baseTs + chunkOffset * chunkSec * 1000).toISOString().slice(0, 19) + "Z",
      chunk_end: new Date(baseTs + (chunkOffset + 1) * chunkSec * 1000).toISOString().slice(0, 19) + "Z",
      timestamps,
      vessels,
    });
  }),

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
