import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatSession } from "../useChatSession";
import * as chatbotApi from "../../api/chatbotApi";
import * as mappers from "../../model/mappers";
import type {
  CreateSessionResponse,
  ChatSessionResponse,
} from "../../api/types";
import type { ChatSession } from "../../model/types";

vi.mock("../../api/chatbotApi", () => ({
  createSession: vi.fn(),
  fetchChatHistory: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapCreateSessionResponse: vi.fn((raw: CreateSessionResponse) => ({
    sessionId: raw.session_id,
    title: raw.title,
    summary: raw.summary,
    userId: raw.user_id,
    createdAt: raw.created_at,
  })),
  mapChatSessionResponse: vi.fn((raw: ChatSessionResponse) => ({
    sessionId: raw.session_id,
    title: raw.title,
    summary: raw.summary,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
  })),
}));

const mockCreateSessionResponse: CreateSessionResponse = {
  session_id: "sess-123",
  title: "Test Session",
  summary: null,
  user_id: "user-1",
  created_at: "2026-07-21T07:45:00.000Z",
};

const mockChatHistory: ChatSessionResponse[] = [
  { session_id: "sess-1", title: "First Chat", summary: null, updated_at: "2026-07-21T07:45:00.000Z", created_at: "2026-07-21T07:45:00.000Z" },
  { session_id: "sess-2", title: "Second Chat", summary: null, updated_at: "2026-07-21T07:45:00.000Z", created_at: "2026-07-21T07:45:00.000Z" },
];

const mockMappedHistory: ChatSession[] = [
  { sessionId: "sess-1", title: "First Chat", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" },
  { sessionId: "sess-2", title: "Second Chat", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatSession", () => {
  // ── Initial State ───────────────────────────────────────────────────────

  describe("initial state", () => {
    it("chatHistory is empty array on initial render", () => {
      const { result } = renderHook(() => useChatSession());
      expect(result.current.chatHistory).toEqual([]);
    });

    it("isLoading is false on initial render", () => {
      const { result } = renderHook(() => useChatSession());
      expect(result.current.isLoading).toBe(false);
    });

    it("error is null on initial render", () => {
      const { result } = renderHook(() => useChatSession());
      expect(result.current.error).toBeNull();
    });

    it("createSession is a function", () => {
      const { result } = renderHook(() => useChatSession());
      expect(typeof result.current.createSession).toBe("function");
    });

    it("fetchChatHistory is a function", () => {
      const { result } = renderHook(() => useChatSession());
      expect(typeof result.current.fetchChatHistory).toBe("function");
    });

    it("setChatHistory is a function", () => {
      const { result } = renderHook(() => useChatSession());
      expect(typeof result.current.setChatHistory).toBe("function");
    });

    it("return object has exactly the expected keys", () => {
      const { result } = renderHook(() => useChatSession());
      expect(Object.keys(result.current).sort()).toEqual([
        "chatHistory", "createSession", "error", "fetchChatHistory", "isLoading", "setChatHistory",
      ]);
    });
  });

  // ── createSession — Success ─────────────────────────────────────────────

  describe("createSession success", () => {
    it("returns sessionId on success", async () => {
      vi.mocked(chatbotApi.createSession).mockResolvedValue(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      let sessionId: string | undefined;
      await act(async () => {
        sessionId = await result.current.createSession();
      });
      expect(sessionId).toBe("sess-123");
    });

    it("calls createSessionApi with no arguments when called without params", async () => {
      vi.mocked(chatbotApi.createSession).mockResolvedValue(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.createSession();
      });
      expect(chatbotApi.createSession).toHaveBeenCalledWith(undefined);
    });

    it("calls mapCreateSessionResponse with raw response", async () => {
      vi.mocked(chatbotApi.createSession).mockResolvedValue(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.createSession();
      });
      expect(mappers.mapCreateSessionResponse).toHaveBeenCalledWith(mockCreateSessionResponse);
    });

    it("refreshes chat history after creating session", async () => {
      vi.mocked(chatbotApi.createSession).mockResolvedValue(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.createSession();
      });
      expect(chatbotApi.fetchChatHistory).toHaveBeenCalledTimes(1);
    });

    it("updates chatHistory after createSession refreshes history", async () => {
      vi.mocked(chatbotApi.createSession).mockResolvedValue(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.createSession();
      });
      expect(result.current.chatHistory).toEqual(mockMappedHistory);
    });

    it("sets isLoading to true during createSession then false on success", async () => {
      let resolveCreate!: (v: CreateSessionResponse) => void;
      vi.mocked(chatbotApi.createSession).mockImplementationOnce(
        () => new Promise((r) => { resolveCreate = r; })
      );
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      let pending: Promise<string>;
      act(() => { pending = result.current.createSession(); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { resolveCreate(mockCreateSessionResponse); await pending; });
      expect(result.current.isLoading).toBe(false);
    });

    it("clears error on successful createSession after a previous error", async () => {
      vi.mocked(chatbotApi.createSession)
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("fail");
      await act(async () => {
        await result.current.createSession();
      });
      expect(result.current.error).toBeNull();
    });
  });

  // ── createSession — Error ───────────────────────────────────────────────

  describe("createSession error", () => {
    it("sets error message when createSessionApi rejects with Error", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(new Error("Server error"));
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Server error");
    });

    it("rethrows the original error", async () => {
      const err = new Error("Create failed");
      vi.mocked(chatbotApi.createSession).mockRejectedValue(err);
      const { result } = renderHook(() => useChatSession());
      await expect(
        act(async () => { await result.current.createSession(); })
      ).rejects.toThrow("Create failed");
    });

    it("sets generic error when rejection is not an Error instance", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue("string error");
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to create session");
    });

    it("sets generic error when rejection is null", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(null);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to create session");
    });

    it("sets generic error when rejection is undefined", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(undefined);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to create session");
    });

    it("sets generic error when rejection is a number", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(500);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to create session");
    });

    it("sets generic error when rejection is a plain object", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue({ status: 500 });
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to create session");
    });

    it("sets isLoading to false after error", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.isLoading).toBe(false);
    });

    it("does not call fetchChatHistory when createSession fails", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(chatbotApi.fetchChatHistory).not.toHaveBeenCalled();
    });

    it("does not call mapCreateSessionResponse on error", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(mappers.mapCreateSessionResponse).not.toHaveBeenCalled();
    });
  });

  // ── fetchChatHistory — Success ──────────────────────────────────────────

  describe("fetchChatHistory success", () => {
    it("sets chatHistory to mapped history on success", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory).toEqual(mockMappedHistory);
    });

    it("calls fetchChatHistoryApi with no arguments", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(chatbotApi.fetchChatHistory).toHaveBeenCalledWith();
    });

    it("calls mapChatSessionResponse for each raw session", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(mappers.mapChatSessionResponse).toHaveBeenCalledTimes(2);
    });

    it("sets isLoading to true during fetch then false on success", async () => {
      let resolveFn!: (v: ChatSessionResponse[]) => void;
      vi.mocked(chatbotApi.fetchChatHistory).mockImplementationOnce(
        () => new Promise((r) => { resolveFn = r; })
      );
      const { result } = renderHook(() => useChatSession());
      let pending: Promise<void>;
      act(() => { pending = result.current.fetchChatHistory(); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { resolveFn(mockChatHistory); await pending; });
      expect(result.current.isLoading).toBe(false);
    });

    it("clears error on successful fetch after a previous error", async () => {
      vi.mocked(chatbotApi.fetchChatHistory)
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("fail");
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.error).toBeNull();
    });

    it("sets chatHistory to empty array when API returns empty array", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue([]);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory).toEqual([]);
    });

    it("does not call mapChatSessionResponse when API returns empty array", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue([]);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(mappers.mapChatSessionResponse).not.toHaveBeenCalled();
    });

    it("handles single session in history", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue([mockChatHistory[0]]);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory).toHaveLength(1);
      expect(result.current.chatHistory[0]).toEqual(mockMappedHistory[0]);
    });

    it("returns domain type field names (not raw API names)", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory[0]).toHaveProperty("sessionId");
      expect(result.current.chatHistory[0]).toHaveProperty("title");
      expect(result.current.chatHistory[0]).not.toHaveProperty("session_id");
    });
  });

  // ── fetchChatHistory — Error ────────────────────────────────────────────

  describe("fetchChatHistory error", () => {
    it("sets error message when fetchChatHistoryApi rejects with Error", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue(new Error("Network"));
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Network");
    });

    it("rethrows the original error", async () => {
      const err = new Error("History fetch failed");
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue(err);
      const { result } = renderHook(() => useChatSession());
      await expect(
        act(async () => { await result.current.fetchChatHistory(); })
      ).rejects.toThrow("History fetch failed");
    });

    it("sets generic error when rejection is not an Error instance", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue("string error");
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch chat history");
    });

    it("sets generic error when rejection is null", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue(null);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch chat history");
    });

    it("sets generic error when rejection is undefined", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue(undefined);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch chat history");
    });

    it("sets generic error when rejection is a number", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue(500);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch chat history");
    });

    it("sets generic error when rejection is a plain object", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue({ status: 500 });
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch chat history");
    });

    it("sets isLoading to false after error", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(result.current.isLoading).toBe(false);
    });

    it("does not call mapChatSessionResponse on error", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.fetchChatHistory(); } catch { /* expected */ }
      });
      expect(mappers.mapChatSessionResponse).not.toHaveBeenCalled();
    });
  });

  // ── fetchChatHistory — Edge Cases ───────────────────────────────────────

  describe("fetchChatHistory edge cases", () => {
    it("handles large dataset (10000 sessions)", async () => {
      const largeRaw: ChatSessionResponse[] = Array.from({ length: 10000 }, (_, i) => ({
        session_id: `sess-${i}`,
        title: `Chat ${i}`,
        summary: null,
        updated_at: "2026-07-21T07:45:00.000Z",
        created_at: "2026-07-21T07:45:00.000Z",
      }));
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(largeRaw);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory).toHaveLength(10000);
      expect(mappers.mapChatSessionResponse).toHaveBeenCalledTimes(10000);
    });

    it("handles sessions with empty string titles", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue([
        { session_id: "s1", title: "", summary: null, updated_at: "2026-07-21T07:45:00.000Z", created_at: "2026-07-21T07:45:00.000Z" },
      ]);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory[0].title).toBe("");
    });

    it("handles sessions with special characters in title", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue([
        { session_id: "s1", title: "Chat!@#$%^&*()", summary: null, updated_at: "2026-07-21T07:45:00.000Z", created_at: "2026-07-21T07:45:00.000Z" },
      ]);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory[0].title).toBe("Chat!@#$%^&*()");
    });

    it("handles sessions with unicode characters in title", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue([
        { session_id: "s1", title: "チャット", summary: null, updated_at: "2026-07-21T07:45:00.000Z", created_at: "2026-07-21T07:45:00.000Z" },
      ]);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory[0].title).toBe("チャット");
    });

    it("handles duplicate session_ids from API", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue([
        { session_id: "dup", title: "First", summary: null, updated_at: "2026-07-21T07:45:00.000Z", created_at: "2026-07-21T07:45:00.000Z" },
        { session_id: "dup", title: "Second", summary: null, updated_at: "2026-07-21T07:45:00.000Z", created_at: "2026-07-21T07:45:00.000Z" },
      ]);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.fetchChatHistory();
      });
      expect(result.current.chatHistory).toHaveLength(2);
      expect(result.current.chatHistory[0].sessionId).toBe("dup");
      expect(result.current.chatHistory[1].sessionId).toBe("dup");
    });
  });

  // ── setChatHistory ──────────────────────────────────────────────────────

  describe("setChatHistory", () => {
    it("sets chatHistory to a new value", () => {
      const { result } = renderHook(() => useChatSession());
      const newHistory: ChatSession[] = [
        { sessionId: "new-1", title: "New Chat", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" },
      ];
      act(() => {
        result.current.setChatHistory(newHistory);
      });
      expect(result.current.chatHistory).toEqual(newHistory);
    });

    it("replaces chatHistory with empty array", () => {
      const { result } = renderHook(() => useChatSession());
      act(() => {
        result.current.setChatHistory([{ sessionId: "s1", title: "Test", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" }]);
      });
      act(() => {
        result.current.setChatHistory([]);
      });
      expect(result.current.chatHistory).toEqual([]);
    });

    it("overwrites previous chatHistory on second call", () => {
      const { result } = renderHook(() => useChatSession());
      act(() => {
        result.current.setChatHistory([{ sessionId: "s1", title: "First", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" }]);
      });
      act(() => {
        result.current.setChatHistory([{ sessionId: "s2", title: "Second", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" }]);
      });
      expect(result.current.chatHistory).toHaveLength(1);
      expect(result.current.chatHistory[0].sessionId).toBe("s2");
    });

    it("accepts a functional updater", () => {
      const { result } = renderHook(() => useChatSession());
      act(() => {
        result.current.setChatHistory([{ sessionId: "s1", title: "First", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" }]);
      });
      act(() => {
        result.current.setChatHistory((prev) => [
          ...prev,
          { sessionId: "s2", title: "Second", summary: null, updatedAt: "2026-07-21T07:45:00.000Z", createdAt: "2026-07-21T07:45:00.000Z" },
        ]);
      });
      expect(result.current.chatHistory).toHaveLength(2);
    });
  });

  // ── State Transitions ───────────────────────────────────────────────────

  describe("state transitions", () => {
    it("createSession transitions from idle to loading to success", async () => {
      vi.mocked(chatbotApi.createSession).mockResolvedValue(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      expect(result.current.isLoading).toBe(false);
      let pending: Promise<string>;
      act(() => { pending = result.current.createSession(); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { await pending; });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("createSession transitions from idle to loading to error", async () => {
      vi.mocked(chatbotApi.createSession).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatSession());
      expect(result.current.isLoading).toBe(false);
      let pending!: Promise<string>;
      act(() => { pending = result.current.createSession().catch(() => ""); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { await pending; });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("fail");
    });

    it("fetchChatHistory transitions from idle to loading to success", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      expect(result.current.isLoading).toBe(false);
      let pending: Promise<void>;
      act(() => { pending = result.current.fetchChatHistory(); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { await pending; });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("can create session after a previous error", async () => {
      vi.mocked(chatbotApi.createSession)
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        try { await result.current.createSession(); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("fail");
      await act(async () => {
        await result.current.createSession();
      });
      expect(result.current.error).toBeNull();
      expect(result.current.chatHistory).toEqual(mockMappedHistory);
    });
  });

  // ── Callback Stability ──────────────────────────────────────────────────

  describe("callback stability", () => {
    it("createSession identity is stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useChatSession());
      const ref1 = result.current.createSession;
      rerender();
      expect(result.current.createSession).toBe(ref1);
    });

    it("fetchChatHistory identity is stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useChatSession());
      const ref1 = result.current.fetchChatHistory;
      rerender();
      expect(result.current.fetchChatHistory).toBe(ref1);
    });
  });

  // ── Cleanup on Unmount ──────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("does not throw after unmount during createSession", async () => {
      const neverResolves = new Promise<CreateSessionResponse>(() => {});
      vi.mocked(chatbotApi.createSession).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useChatSession());
      act(() => { result.current.createSession(); });
      unmount();
      await new Promise(r => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(
        expect.stringContaining("unmounted component")
      );
      spy.mockRestore();
    });

    it("does not throw after unmount during fetchChatHistory", async () => {
      const neverResolves = new Promise<ChatSessionResponse[]>(() => {});
      vi.mocked(chatbotApi.fetchChatHistory).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useChatSession());
      act(() => { result.current.fetchChatHistory(); });
      unmount();
      await new Promise(r => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(
        expect.stringContaining("unmounted component")
      );
      spy.mockRestore();
    });
  });

  // ── Rapid State Updates ─────────────────────────────────────────────────

  describe("rapid state updates", () => {
    it("handles rapid consecutive fetchChatHistory calls", async () => {
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await Promise.all([
          result.current.fetchChatHistory(),
          result.current.fetchChatHistory(),
          result.current.fetchChatHistory(),
        ]);
      });
      expect(chatbotApi.fetchChatHistory).toHaveBeenCalledTimes(3);
      expect(result.current.isLoading).toBe(false);
    });

    it("handles createSession then immediate fetchChatHistory", async () => {
      vi.mocked(chatbotApi.createSession).mockResolvedValue(mockCreateSessionResponse);
      vi.mocked(chatbotApi.fetchChatHistory).mockResolvedValue(mockChatHistory);
      const { result } = renderHook(() => useChatSession());
      await act(async () => {
        await result.current.createSession();
        await result.current.fetchChatHistory();
      });
      expect(chatbotApi.createSession).toHaveBeenCalledTimes(1);
      expect(chatbotApi.fetchChatHistory).toHaveBeenCalledTimes(2);
    });
  });
});
