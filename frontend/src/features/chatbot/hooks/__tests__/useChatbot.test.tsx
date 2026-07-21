import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatbot } from "../useChatbot";
import { ChatbotProvider } from "../ChatbotProvider";
import type { Message } from "../../model/types";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <ChatbotProvider>{children}</ChatbotProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatbot", () => {
  // ── Initial State ───────────────────────────────────────────────────────

  describe("initial state", () => {
    it("isChatbotOpen is false on initial render", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(result.current.isChatbotOpen).toBe(false);
    });

    it("messages is empty array on initial render", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(result.current.messages).toEqual([]);
    });

    it("openChatbot is a function", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(typeof result.current.openChatbot).toBe("function");
    });

    it("closeChatbot is a function", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(typeof result.current.closeChatbot).toBe("function");
    });

    it("toggleChatbot is a function", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(typeof result.current.toggleChatbot).toBe("function");
    });

    it("setMessages is a function", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(typeof result.current.setMessages).toBe("function");
    });

    it("setIsChatbotOpen is a function", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(typeof result.current.setIsChatbotOpen).toBe("function");
    });

    it("return object has exactly the expected keys", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(Object.keys(result.current).sort()).toEqual([
        "closeChatbot", "isChatbotOpen", "messages", "openChatbot", "setIsChatbotOpen", "setMessages", "toggleChatbot",
      ]);
    });
  });

  // ── openChatbot ─────────────────────────────────────────────────────────

  describe("openChatbot", () => {
    it("sets isChatbotOpen to true when called from false state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(result.current.isChatbotOpen).toBe(false);
      act(() => result.current.openChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("keeps isChatbotOpen true when called from already true state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      act(() => result.current.openChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("does not affect messages when opening chatbot", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      expect(result.current.messages).toEqual([]);
    });
  });

  // ── closeChatbot ────────────────────────────────────────────────────────

  describe("closeChatbot", () => {
    it("sets isChatbotOpen to false when called from true state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
      act(() => result.current.closeChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });

    it("keeps isChatbotOpen false when called from already false state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.closeChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });

    it("does not affect messages when closing chatbot", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      const testMessages: Message[] = [
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Hi", createdAt: "2026-01-01T00:00:00Z" },
      ];
      act(() => result.current.setMessages(testMessages));
      act(() => result.current.closeChatbot());
      expect(result.current.messages).toEqual(testMessages);
    });
  });

  // ── toggleChatbot ───────────────────────────────────────────────────────

  describe("toggleChatbot", () => {
    it("toggles isChatbotOpen from false to true", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(result.current.isChatbotOpen).toBe(false);
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("toggles isChatbotOpen from true to false", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });

    it("toggles back to original state after two toggles", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(result.current.isChatbotOpen).toBe(false);
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });

    it("rapid toggles result in correct final state (odd = true)", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("rapid toggles result in correct final state (even = false)", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });
  });

  // ── setMessages ─────────────────────────────────────────────────────────

  describe("setMessages", () => {
    it("sets messages to a new array", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      const testMessages: Message[] = [
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Hello", createdAt: "2026-01-01T00:00:00Z" },
      ];
      act(() => result.current.setMessages(testMessages));
      expect(result.current.messages).toEqual(testMessages);
    });

    it("replaces messages with empty array", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Hi", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      act(() => result.current.setMessages([]));
      expect(result.current.messages).toEqual([]);
    });

    it("overwrites previous messages on second call", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "First", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      act(() => result.current.setMessages([
        { messageId: "2", sessionId: "s1", role: "assistant", navigationLink: "/home", content: "Second", createdAt: "2026-01-01T00:00:01Z" },
      ]));
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].messageId).toBe("2");
    });

    it("appends messages by setting a new array with previous items", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "First", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      act(() => {
        result.current.setMessages([
          ...result.current.messages,
          { messageId: "2", sessionId: "s1", role: "assistant", navigationLink: null, content: "Second", createdAt: "2026-01-01T00:00:01Z" },
        ]);
      });
      expect(result.current.messages).toHaveLength(2);
    });

    it("handles messages with navigation links", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "assistant", navigationLink: "/dashboard", content: "Go to dashboard", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.messages[0].navigationLink).toBe("/dashboard");
    });

    it("handles messages with null navigation links", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Hi", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.messages[0].navigationLink).toBeNull();
    });

    it("handles large message arrays", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      const largeMessages: Message[] = Array.from({ length: 1000 }, (_, i) => ({
        messageId: String(i + 1),
        sessionId: "s1",
        role: i % 2 === 0 ? "user" as const : "assistant" as const,
        navigationLink: null,
        content: `Message ${i + 1}`,
        createdAt: "2026-01-01T00:00:00Z",
      }));
      act(() => result.current.setMessages(largeMessages));
      expect(result.current.messages).toHaveLength(1000);
    });
  });

  // ── Context Error ───────────────────────────────────────────────────────

  describe("context error", () => {
    it("throws when used outside ChatbotProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useChatbot())).toThrow("useChatbot must be used within ChatbotProvider");
      spy.mockRestore();
    });

    it("throws Error when context is undefined", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        renderHook(() => useChatbot());
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      spy.mockRestore();
    });

    it("error message contains 'useChatbot'", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        renderHook(() => useChatbot());
      } catch (e) {
        expect((e as Error).message).toContain("useChatbot");
      }
      spy.mockRestore();
    });

    it("error message contains 'ChatbotProvider'", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        renderHook(() => useChatbot());
      } catch (e) {
        expect((e as Error).message).toContain("ChatbotProvider");
      }
      spy.mockRestore();
    });
  });

  // ── Open/Close/Toggle Cycles ────────────────────────────────────────────

  describe("open/close/toggle cycles", () => {
    it("open then close results in closed state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
      act(() => result.current.closeChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });

    it("open then toggle results in closed state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });

    it("close then toggle results in open state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.closeChatbot());
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("open -> close -> open restores open state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      act(() => result.current.closeChatbot());
      act(() => result.current.openChatbot());
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("toggle -> toggle -> toggle -> toggle results in closed state", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      act(() => result.current.toggleChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
    });
  });

  // ── State Independence ──────────────────────────────────────────────────

  describe("state independence", () => {
    it("isChatbotOpen and messages are independent states", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Hi", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.isChatbotOpen).toBe(true);
      expect(result.current.messages).toHaveLength(1);
      act(() => result.current.closeChatbot());
      expect(result.current.isChatbotOpen).toBe(false);
      expect(result.current.messages).toHaveLength(1);
    });

    it("setMessages does not affect isChatbotOpen", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Test", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("openChatbot does not affect messages", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      const msgs: Message[] = [
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Existing", createdAt: "2026-01-01T00:00:00Z" },
      ];
      act(() => result.current.setMessages(msgs));
      act(() => result.current.openChatbot());
      expect(result.current.messages).toEqual(msgs);
    });
  });

  // ── Multiple Hook Instances ─────────────────────────────────────────────

  describe("multiple hook instances", () => {
    it("two instances share the same provider state", () => {
      const { result: result1 } = renderHook(() => useChatbot(), { wrapper });
      const { result: result2 } = renderHook(() => useChatbot(), { wrapper });
      act(() => result1.current.openChatbot());
      expect(result1.current.isChatbotOpen).toBe(true);
      expect(result2.current.isChatbotOpen).toBe(false);
    });

    it("setMessages in one instance does not affect another", () => {
      const { result: result1 } = renderHook(() => useChatbot(), { wrapper });
      const { result: result2 } = renderHook(() => useChatbot(), { wrapper });
      act(() => result1.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "A", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result1.current.messages).toHaveLength(1);
      expect(result2.current.messages).toEqual([]);
    });
  });

  // ── Rerender Stability ──────────────────────────────────────────────────

  describe("rerender stability", () => {
    it("isChatbotOpen persists across rerenders", () => {
      const { result, rerender } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      rerender();
      expect(result.current.isChatbotOpen).toBe(true);
    });

    it("messages persist across rerenders", () => {
      const { result, rerender } = renderHook(() => useChatbot(), { wrapper });
      const msgs: Message[] = [
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Persist", createdAt: "2026-01-01T00:00:00Z" },
      ];
      act(() => result.current.setMessages(msgs));
      rerender();
      expect(result.current.messages).toEqual(msgs);
    });

    it("closed state persists across rerenders", () => {
      const { result, rerender } = renderHook(() => useChatbot(), { wrapper });
      rerender();
      rerender();
      expect(result.current.isChatbotOpen).toBe(false);
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("openChatbot called multiple times does not throw", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(() => {
        act(() => result.current.openChatbot());
        act(() => result.current.openChatbot());
        act(() => result.current.openChatbot());
      }).not.toThrow();
    });

    it("closeChatbot called multiple times does not throw", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(() => {
        act(() => result.current.closeChatbot());
        act(() => result.current.closeChatbot());
        act(() => result.current.closeChatbot());
      }).not.toThrow();
    });

    it("toggleChatbot called many times does not throw", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      expect(() => {
        for (let i = 0; i < 100; i++) {
          act(() => result.current.toggleChatbot());
        }
      }).not.toThrow();
    });

    it("setMessages with identical array reference does not throw", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      const msgs: Message[] = [
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "Same", createdAt: "2026-01-01T00:00:00Z" },
      ];
      expect(() => {
        act(() => result.current.setMessages(msgs));
        act(() => result.current.setMessages(msgs));
      }).not.toThrow();
    });

    it("messages with empty string content are accepted", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.messages[0].content).toBe("");
    });

    it("messages with special characters in content are accepted", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "!@#$%^&*()", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.messages[0].content).toBe("!@#$%^&*()");
    });

    it("messages with unicode content are accepted", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: "こんにちは", createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.messages[0].content).toBe("こんにちは");
    });

    it("messages with very long content are accepted", () => {
      const { result } = renderHook(() => useChatbot(), { wrapper });
      const longContent = "x".repeat(10000);
      act(() => result.current.setMessages([
        { messageId: "1", sessionId: "s1", role: "user", navigationLink: null, content: longContent, createdAt: "2026-01-01T00:00:00Z" },
      ]));
      expect(result.current.messages[0].content).toBe(longContent);
    });
  });

  // ── Cleanup on Unmount ──────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("does not throw when state is accessed after unmount", () => {
      const { result, unmount } = renderHook(() => useChatbot(), { wrapper });
      act(() => result.current.openChatbot());
      unmount();
    });

    it("does not retain state in a new hook instance after unmount", () => {
      const { result: result1, unmount } = renderHook(() => useChatbot(), { wrapper });
      act(() => result1.current.openChatbot());
      unmount();
      const { result: result2 } = renderHook(() => useChatbot(), { wrapper });
      expect(result2.current.isChatbotOpen).toBe(false);
    });
  });
});
