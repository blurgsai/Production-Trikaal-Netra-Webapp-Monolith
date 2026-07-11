import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { http, HttpResponse } from "msw";
import { defenseTheme } from "@/shared/theme";
import ChatHistoryPanel from "../ChatHistoryPanel";
import { useChatSession } from "../../hooks/useChatSession";
import { mockApi, CHATBOT_BASE_URL } from "@/test/server";

function renderWithProviders(component: React.ReactNode) {
  return render(
    <ThemeProvider theme={defenseTheme}>
      <CssBaseline />
      {component}
    </ThemeProvider>
  );
}

function renderHistoryPanel(
  overrides?: Partial<React.ComponentProps<typeof ChatHistoryPanel>>
) {
  const defaultProps: React.ComponentProps<typeof ChatHistoryPanel> = {
    sessionId: null,
    setSessionId: vi.fn(),
    open: true,
    chatHistory: [],
    fetchChatHistory: vi.fn(),
    createNewSession: vi.fn(),
  };
  const props = { ...defaultProps, ...overrides };
  return renderWithProviders(<ChatHistoryPanel {...props} />);
}

beforeEach(() => {
  localStorage.setItem("token", "test-token");
});

describe("ChatHistoryPanel integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  describe("loading state", () => {
    it("I-01: fetches chat history on mount when open", async () => {
      const fetchChatHistory = vi.fn();
      renderHistoryPanel({ fetchChatHistory });

      expect(fetchChatHistory).toHaveBeenCalled();
    });

    it("I-02: does not fetch when not open", () => {
      const fetchChatHistory = vi.fn();
      renderHistoryPanel({ open: false, fetchChatHistory });

      expect(fetchChatHistory).not.toHaveBeenCalled();
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("I-03: renders mapped session titles in DOM", () => {
      renderHistoryPanel({
        chatHistory: [
          { sessionId: "s1", title: "Session Alpha" },
          { sessionId: "s2", title: "Session Beta" },
        ],
      });

      expect(screen.getByText("Session Alpha")).toBeInTheDocument();
      expect(screen.getByText("Session Beta")).toBeInTheDocument();
    });

    it("I-04: shows conversation count from mapped data", () => {
      renderHistoryPanel({
        chatHistory: [
          { sessionId: "s1", title: "Session Alpha" },
          { sessionId: "s2", title: "Session Beta" },
        ],
      });

      expect(screen.getByText("2 conversations")).toBeInTheDocument();
    });

    it("I-05: displays domain field names, not raw API field names", () => {
      renderHistoryPanel({
        chatHistory: [{ sessionId: "s1", title: "My Chat" }],
      });

      expect(screen.queryByText("session_id")).not.toBeInTheDocument();
      expect(screen.queryByText("title")).not.toBeInTheDocument();
    });
  });

  // ── Empty State ────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("I-06: shows 0 conversations when history is empty", () => {
      renderHistoryPanel({ chatHistory: [] });

      expect(screen.getByText("0 conversations")).toBeInTheDocument();
    });

    it("I-07: still shows New chat button when history is empty", () => {
      renderHistoryPanel({ chatHistory: [] });

      expect(screen.getByText("New chat")).toBeInTheDocument();
    });
  });

  // ── New Chat Button ────────────────────────────────────────────────────

  describe("new chat button", () => {
    it("I-08: clicking New chat calls createNewSession", async () => {
      const createNewSession = vi.fn();
      renderHistoryPanel({ createNewSession });

      const newChatItem = screen.getByText("New chat");
      await userEvent.click(newChatItem);

      expect(createNewSession).toHaveBeenCalledTimes(1);
    });
  });

  // ── Session Selection ──────────────────────────────────────────────────

  describe("session selection", () => {
    it("I-09: clicking a session calls setSessionId with correct id", async () => {
      const setSessionId = vi.fn();
      renderHistoryPanel({
        setSessionId,
        chatHistory: [
          { sessionId: "session-abc", title: "Test Chat" },
        ],
      });

      const sessionItem = screen.getByText("Test Chat");
      await userEvent.click(sessionItem);

      expect(setSessionId).toHaveBeenCalledWith("session-abc");
    });

    it("I-10: highlights currently selected session", () => {
      renderHistoryPanel({
        sessionId: "s2",
        chatHistory: [
          { sessionId: "s1", title: "Session 1" },
          { sessionId: "s2", title: "Session 2" },
        ],
      });

      const selected = screen.getByText("Session 2").closest("li");
      expect(selected).toHaveStyle({
        backgroundColor: expect.stringContaining("rgba"),
      });
    });
  });

  // ── Full Integration with useChatSession Hook ──────────────────────────

  describe("full integration with useChatSession", () => {
    it("I-11: renders sessions fetched from real API via hook", async () => {
      function TestWrapper() {
        const { chatHistory, fetchChatHistory } = useChatSession();
        return (
          <ChatHistoryPanel
            sessionId={null}
            setSessionId={vi.fn()}
            open={true}
            chatHistory={chatHistory}
            fetchChatHistory={fetchChatHistory}
            createNewSession={vi.fn()}
          />
        );
      }

      renderWithProviders(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByText("Test Conversation 1")).toBeInTheDocument();
      });
      expect(screen.getByText("Test Conversation 2")).toBeInTheDocument();
      expect(screen.getByText("2 conversations")).toBeInTheDocument();
    });

    it("I-12: New chat click triggers real createSession API call", async () => {
      let createCalled = false;
      mockApi.use(
        http.post(`${CHATBOT_BASE_URL}/sessions`, () => {
          createCalled = true;
          return HttpResponse.json({ session_id: "new-real-session" });
        })
      );

      function TestWrapper() {
        const { chatHistory, fetchChatHistory, createSession } =
          useChatSession();
        const createNewSession = async () => {
          await createSession();
        };
        return (
          <ChatHistoryPanel
            sessionId={null}
            setSessionId={vi.fn()}
            open={true}
            chatHistory={chatHistory}
            fetchChatHistory={fetchChatHistory}
            createNewSession={createNewSession}
          />
        );
      }

      renderWithProviders(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByText("Test Conversation 1")).toBeInTheDocument();
      });

      const newChatItem = screen.getByText("New chat");
      await userEvent.click(newChatItem);

      await waitFor(() => {
        expect(createCalled).toBe(true);
      });
    });
  });

  // ── Error State ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("I-13: does not crash when fetchChatHistory throws", async () => {
      const fetchChatHistory = vi.fn().mockRejectedValue(new Error("Network"));
      renderHistoryPanel({ fetchChatHistory });

      expect(screen.getByText("Chat History")).toBeInTheDocument();
      expect(screen.getByText("0 conversations")).toBeInTheDocument();
    });
  });

  // ── Closed State ───────────────────────────────────────────────────────

  describe("closed state", () => {
    it("I-14: returns null when not open", () => {
      renderHistoryPanel({ open: false });

      expect(screen.queryByText("Chat History")).not.toBeInTheDocument();
    });
  });
});
