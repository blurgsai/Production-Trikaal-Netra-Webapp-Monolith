import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatMessages } from "../useChatMessages";
import * as chatbotApi from "../../api/chatbotApi";
import * as mappers from "../../model/mappers";
import type { MessageResponse, StreamChunk as RawStreamChunk } from "../../api/types";
import type { Message, StreamChunk } from "../../model/types";

vi.mock("../../api/chatbotApi", () => ({
  fetchMessages: vi.fn(),
  streamMessage: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapMessageResponse: vi.fn((raw: MessageResponse) => ({
    messageId: raw.message_id,
    role: raw.role,
    navigationLink: raw.navigation_link,
    content: raw.content,
  })),
  mapStreamChunk: vi.fn((raw: RawStreamChunk) => ({
    part: raw.p,
    operation: raw.o,
    value: raw.v,
  })),
}));

const mockRawMessages: MessageResponse[] = [
  { message_id: 1, role: "user", navigation_link: null, content: "Hello" },
  { message_id: 2, role: "assistant", navigation_link: "/dashboard", content: "Hi there" },
];

const mockMappedMessages: Message[] = [
  { messageId: 1, role: "user", navigationLink: null, content: "Hello" },
  { messageId: 2, role: "assistant", navigationLink: "/dashboard", content: "Hi there" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatMessages", () => {
  // ── Initial State ───────────────────────────────────────────────────────

  describe("initial state", () => {
    it("isLoading is false on initial render", () => {
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.isLoading).toBe(false);
    });

    it("error is null on initial render", () => {
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.error).toBeNull();
    });

    it("fetchMessages is a function", () => {
      const { result } = renderHook(() => useChatMessages());
      expect(typeof result.current.fetchMessages).toBe("function");
    });

    it("streamMessage is a function", () => {
      const { result } = renderHook(() => useChatMessages());
      expect(typeof result.current.streamMessage).toBe("function");
    });

    it("return object has exactly the expected keys", () => {
      const { result } = renderHook(() => useChatMessages());
      expect(Object.keys(result.current).sort()).toEqual([
        "error", "fetchMessages", "isLoading", "streamMessage",
      ]);
    });
  });

  // ── fetchMessages — Success ─────────────────────────────────────────────

  describe("fetchMessages success", () => {
    it("returns mapped messages on success", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("session-1");
      });
      expect(messages).toEqual(mockMappedMessages);
    });

    it("calls fetchMessagesApi with the correct sessionId", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages("my-session");
      });
      expect(chatbotApi.fetchMessages).toHaveBeenCalledWith("my-session");
    });

    it("calls mapMessageResponse for each raw message", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages("s1");
      });
      expect(mappers.mapMessageResponse).toHaveBeenCalledTimes(2);
    });

    it("sets isLoading to true during fetch then false on success", async () => {
      let resolveFn!: (v: MessageResponse[]) => void;
      vi.mocked(chatbotApi.fetchMessages).mockImplementationOnce(
        () => new Promise((r) => { resolveFn = r; })
      );
      const { result } = renderHook(() => useChatMessages());
      let pending: Promise<Message[]>;
      act(() => { pending = result.current.fetchMessages("s1"); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { resolveFn(mockRawMessages); await pending; });
      expect(result.current.isLoading).toBe(false);
    });

    it("clears error on successful fetch after a previous error", async () => {
      vi.mocked(chatbotApi.fetchMessages)
        .mockRejectedValueOnce(new Error("Network"))
        .mockResolvedValueOnce(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Network");
      await act(async () => {
        await result.current.fetchMessages("s1");
      });
      expect(result.current.error).toBeNull();
    });

    it("returns empty array when API returns empty array", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([]);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("s1");
      });
      expect(messages).toEqual([]);
    });

    it("does not call mapMessageResponse when API returns empty array", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([]);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages("s1");
      });
      expect(mappers.mapMessageResponse).not.toHaveBeenCalled();
    });

    it("returns single mapped message when API returns one item", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([mockRawMessages[0]]);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("s1");
      });
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(mockMappedMessages[0]);
    });

    it("returns data with domain type field names (not raw API names)", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("s1");
      });
      expect(messages[0]).toHaveProperty("messageId");
      expect(messages[0]).toHaveProperty("navigationLink");
      expect(messages[0]).not.toHaveProperty("message_id");
      expect(messages[0]).not.toHaveProperty("navigation_link");
    });
  });

  // ── fetchMessages — Error ───────────────────────────────────────────────

  describe("fetchMessages error", () => {
    it("sets error message when fetchMessagesApi rejects with Error", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(new Error("500"));
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("500");
    });

    it("rethrows the original error", async () => {
      const err = new Error("Network failure");
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(err);
      const { result } = renderHook(() => useChatMessages());
      await expect(
        act(async () => { await result.current.fetchMessages("s1"); })
      ).rejects.toThrow("Network failure");
    });

    it("sets error to generic message when rejection is not an Error instance", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue("string error");
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch messages");
    });

    it("sets error to generic message when rejection is null", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(null);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch messages");
    });

    it("sets error to generic message when rejection is undefined", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch messages");
    });

    it("sets error to generic message when rejection is a number", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(500);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch messages");
    });

    it("sets error to generic message when rejection is a plain object", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue({ status: 500 });
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Failed to fetch messages");
    });

    it("sets isLoading to false after error", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.isLoading).toBe(false);
    });

    it("does not call mapMessageResponse on error", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(mappers.mapMessageResponse).not.toHaveBeenCalled();
    });
  });

  // ── fetchMessages — Edge Cases ──────────────────────────────────────────

  describe("fetchMessages edge cases", () => {
    it("handles empty string sessionId", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([]);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages("");
      });
      expect(chatbotApi.fetchMessages).toHaveBeenCalledWith("");
    });

    it("handles very long sessionId", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([]);
      const longId = "s".repeat(10000);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages(longId);
      });
      expect(chatbotApi.fetchMessages).toHaveBeenCalledWith(longId);
    });

    it("handles sessionId with special characters", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([]);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages("session!@#$%^&*()");
      });
      expect(chatbotApi.fetchMessages).toHaveBeenCalledWith("session!@#$%^&*()");
    });

    it("handles sessionId with unicode characters", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([]);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages("セッション-1");
      });
      expect(chatbotApi.fetchMessages).toHaveBeenCalledWith("セッション-1");
    });

    it("handles large dataset (10000 messages)", async () => {
      const largeRaw: MessageResponse[] = Array.from({ length: 10000 }, (_, i) => ({
        message_id: i + 1,
        role: "user" as const,
        navigation_link: null,
        content: `Message ${i + 1}`,
      }));
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(largeRaw);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("s1");
      });
      expect(messages).toHaveLength(10000);
      expect(mappers.mapMessageResponse).toHaveBeenCalledTimes(10000);
    });

    it("handles messages with null navigation_link", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([
        { message_id: 1, role: "user", navigation_link: null, content: "Hi" },
      ]);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("s1");
      });
      expect(messages[0].navigationLink).toBeNull();
    });

    it("handles messages with non-null navigation_link", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([
        { message_id: 1, role: "assistant", navigation_link: "/reports", content: "See reports" },
      ]);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("s1");
      });
      expect(messages[0].navigationLink).toBe("/reports");
    });

    it("handles duplicate message_ids from API", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue([
        { message_id: 1, role: "user", navigation_link: null, content: "First" },
        { message_id: 1, role: "assistant", navigation_link: null, content: "Second" },
      ]);
      const { result } = renderHook(() => useChatMessages());
      let messages: Message[] = [];
      await act(async () => {
        messages = await result.current.fetchMessages("s1");
      });
      expect(messages).toHaveLength(2);
      expect(messages[0].messageId).toBe(1);
      expect(messages[1].messageId).toBe(1);
    });
  });

  // ── fetchMessages — State Transitions ───────────────────────────────────

  describe("fetchMessages state transitions", () => {
    it("transitions from idle to loading to success", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.isLoading).toBe(false);
      let pending: Promise<Message[]>;
      act(() => { pending = result.current.fetchMessages("s1"); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { await pending; });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("transitions from idle to loading to error", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatMessages());
      expect(result.current.isLoading).toBe(false);
      let pending!: Promise<Message[]>;
      act(() => { pending = result.current.fetchMessages("s1").catch(() => [] as Message[]); });
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      await act(async () => { await pending; });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("fail");
    });

    it("can fetch successfully after a previous error", async () => {
      vi.mocked(chatbotApi.fetchMessages)
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.fetchMessages("s1"); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("fail");
      await act(async () => {
        await result.current.fetchMessages("s1");
      });
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── streamMessage — Success ─────────────────────────────────────────────

  describe("streamMessage success", () => {
    it("calls streamMessageApi with correct arguments", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      const onChunk = vi.fn();
      const onError = vi.fn();
      await act(async () => {
        await result.current.streamMessage("s1", "Hello", onChunk, onError);
      });
      expect(chatbotApi.streamMessage).toHaveBeenCalledWith("s1", "Hello", expect.any(Function), onError);
    });

    it("invokes onChunk with mapped chunk data", async () => {
      const rawChunk: RawStreamChunk = { p: "content", o: "append", v: "Hello" };
      const mappedChunk: StreamChunk = { part: "content", operation: "append", value: "Hello" };
      vi.mocked(chatbotApi.streamMessage).mockImplementation(
        async (_sid, _msg, onChunkApi, _onError) => {
          onChunkApi(rawChunk);
        }
      );
      const { result } = renderHook(() => useChatMessages());
      const onChunk = vi.fn();
      await act(async () => {
        await result.current.streamMessage("s1", "Hello", onChunk, vi.fn());
      });
      expect(onChunk).toHaveBeenCalledWith(mappedChunk);
    });

    it("calls mapStreamChunk for each raw chunk received", async () => {
      const rawChunk1: RawStreamChunk = { p: "content", o: "append", v: "A" };
      const rawChunk2: RawStreamChunk = { p: "content", o: "append", v: "B" };
      vi.mocked(chatbotApi.streamMessage).mockImplementation(
        async (_sid, _msg, onChunkApi, _onError) => {
          onChunkApi(rawChunk1);
          onChunkApi(rawChunk2);
        }
      );
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn());
      });
      expect(mappers.mapStreamChunk).toHaveBeenCalledTimes(2);
    });

    it("does not call onError on successful stream", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      const onError = vi.fn();
      await act(async () => {
        await result.current.streamMessage("s1", "Hello", vi.fn(), onError);
      });
      expect(onError).not.toHaveBeenCalled();
    });

    it("does not set error on successful stream", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.streamMessage("s1", "Hello", vi.fn(), vi.fn());
      });
      expect(result.current.error).toBeNull();
    });

    it("handles multiple chunks in sequence", async () => {
      const chunks: RawStreamChunk[] = [
        { p: "content", o: "append", v: "H" },
        { p: "content", o: "append", v: "e" },
        { p: "content", o: "append", v: "l" },
        { p: "content", o: "append", v: "l" },
        { p: "content", o: "append", v: "o" },
      ];
      vi.mocked(chatbotApi.streamMessage).mockImplementation(
        async (_sid, _msg, onChunkApi, _onError) => {
          chunks.forEach(onChunkApi);
        }
      );
      const { result } = renderHook(() => useChatMessages());
      const onChunk = vi.fn();
      await act(async () => {
        await result.current.streamMessage("s1", "Hi", onChunk, vi.fn());
      });
      expect(onChunk).toHaveBeenCalledTimes(5);
    });
  });

  // ── streamMessage — Error ───────────────────────────────────────────────

  describe("streamMessage error", () => {
    it("sets error message when streamMessageApi throws", async () => {
      vi.mocked(chatbotApi.streamMessage).mockRejectedValue(new Error("Stream failed"));
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn()); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Stream failed");
    });

    it("calls onError when streamMessageApi throws", async () => {
      const err = new Error("Stream failed");
      vi.mocked(chatbotApi.streamMessage).mockRejectedValue(err);
      const { result } = renderHook(() => useChatMessages());
      const onError = vi.fn();
      await act(async () => {
        try { await result.current.streamMessage("s1", "Hi", vi.fn(), onError); } catch { /* expected */ }
      });
      expect(onError).toHaveBeenCalledWith(err);
    });

    it("sets generic error when rejection is not an Error instance", async () => {
      vi.mocked(chatbotApi.streamMessage).mockRejectedValue("string error");
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn()); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Streaming failed");
    });

    it("sets generic error when rejection is null", async () => {
      vi.mocked(chatbotApi.streamMessage).mockRejectedValue(null);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn()); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Streaming failed");
    });

    it("sets generic error when rejection is undefined", async () => {
      vi.mocked(chatbotApi.streamMessage).mockRejectedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn()); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Streaming failed");
    });

    it("sets generic error when rejection is a number", async () => {
      vi.mocked(chatbotApi.streamMessage).mockRejectedValue(500);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        try { await result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn()); } catch { /* expected */ }
      });
      expect(result.current.error).toBe("Streaming failed");
    });

    it("does not call onChunk on error", async () => {
      vi.mocked(chatbotApi.streamMessage).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useChatMessages());
      const onChunk = vi.fn();
      await act(async () => {
        try { await result.current.streamMessage("s1", "Hi", onChunk, vi.fn()); } catch { /* expected */ }
      });
      expect(onChunk).not.toHaveBeenCalled();
    });
  });

  // ── streamMessage — Edge Cases ──────────────────────────────────────────

  describe("streamMessage edge cases", () => {
    it("handles empty string message", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.streamMessage("s1", "", vi.fn(), vi.fn());
      });
      expect(chatbotApi.streamMessage).toHaveBeenCalledWith("s1", "", expect.any(Function), expect.any(Function));
    });

    it("handles very long message", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const longMsg = "x".repeat(10000);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.streamMessage("s1", longMsg, vi.fn(), vi.fn());
      });
      expect(chatbotApi.streamMessage).toHaveBeenCalledWith("s1", longMsg, expect.any(Function), expect.any(Function));
    });

    it("handles message with special characters", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.streamMessage("s1", "Hello!@#$%^&*()", vi.fn(), vi.fn());
      });
      expect(chatbotApi.streamMessage).toHaveBeenCalledWith("s1", "Hello!@#$%^&*()", expect.any(Function), expect.any(Function));
    });

    it("handles message with unicode characters", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.streamMessage("s1", "こんにちは", vi.fn(), vi.fn());
      });
      expect(chatbotApi.streamMessage).toHaveBeenCalledWith("s1", "こんにちは", expect.any(Function), expect.any(Function));
    });

    it("handles empty string sessionId", async () => {
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.streamMessage("", "Hi", vi.fn(), vi.fn());
      });
      expect(chatbotApi.streamMessage).toHaveBeenCalledWith("", "Hi", expect.any(Function), expect.any(Function));
    });
  });

  // ── Callback Stability ──────────────────────────────────────────────────

  describe("callback stability", () => {
    it("fetchMessages identity is stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useChatMessages());
      const ref1 = result.current.fetchMessages;
      rerender();
      expect(result.current.fetchMessages).toBe(ref1);
    });

    it("streamMessage identity is stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useChatMessages());
      const ref1 = result.current.streamMessage;
      rerender();
      expect(result.current.streamMessage).toBe(ref1);
    });
  });

  // ── Cleanup on Unmount ──────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("does not update state after unmount during fetchMessages", async () => {
      const neverResolves = new Promise<MessageResponse[]>(() => {});
      vi.mocked(chatbotApi.fetchMessages).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { unmount } = renderHook(() => useChatMessages());
      unmount();
      await new Promise(r => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(
        expect.stringContaining("unmounted component")
      );
      spy.mockRestore();
    });

    it("does not update state after unmount during streamMessage", async () => {
      const neverResolves = new Promise<void>(() => {});
      vi.mocked(chatbotApi.streamMessage).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useChatMessages());
      act(() => { result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn()); });
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
    it("handles rapid consecutive fetchMessages calls", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(mockRawMessages);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await Promise.all([
          result.current.fetchMessages("s1"),
          result.current.fetchMessages("s2"),
          result.current.fetchMessages("s3"),
        ]);
      });
      expect(chatbotApi.fetchMessages).toHaveBeenCalledTimes(3);
      expect(result.current.isLoading).toBe(false);
    });

    it("handles fetch then immediate stream", async () => {
      vi.mocked(chatbotApi.fetchMessages).mockResolvedValue(mockRawMessages);
      vi.mocked(chatbotApi.streamMessage).mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatMessages());
      await act(async () => {
        await result.current.fetchMessages("s1");
        await result.current.streamMessage("s1", "Hi", vi.fn(), vi.fn());
      });
      expect(chatbotApi.fetchMessages).toHaveBeenCalledTimes(1);
      expect(chatbotApi.streamMessage).toHaveBeenCalledTimes(1);
    });
  });
});
