import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse, delay } from "msw";
import { defenseTheme } from "@/shared/theme";
import { ChatbotProvider } from "@/features/chatbot";
import ChatBot from "../ChatBot";
import { mockApi, CHATBOT_BASE_URL } from "@/test/server";

function renderWithProviders(component: React.ReactNode) {
  return render(
    <ThemeProvider theme={defenseTheme}>
      <CssBaseline />
      <MemoryRouter>
        <ChatbotProvider>{component}</ChatbotProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  localStorage.setItem("token", "test-token");
});

describe("ChatBot integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  describe("loading state", () => {
    it("I-01: shows loading spinner while fetching messages", async () => {
      mockApi.use(
        http.get(
          `${CHATBOT_BASE_URL}/sessions/:sessionId/messages`,
          async () => {
            await delay(5000);
            return HttpResponse.json([]);
          }
        )
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Loading conversation...")).toBeInTheDocument();
      });
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("I-02: renders messages with mapped domain field names on success", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });
      expect(screen.getByText("Hi! How can I help you?")).toBeInTheDocument();
    });

    it("I-03: displays mapped content (not raw API field names)", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      expect(screen.queryByText("message_id")).not.toBeInTheDocument();
      expect(screen.queryByText("navigation_link")).not.toBeInTheDocument();
    });

    it("I-10: navigation link button appears for messages with navigationLink", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "/map" })).toBeInTheDocument();
      });
    });

    it("I-12: creates new session on open via POST /sessions", async () => {
      let sessionCreated = false;
      mockApi.use(
        http.post(`${CHATBOT_BASE_URL}/sessions`, () => {
          sessionCreated = true;
          return HttpResponse.json({ session_id: "new-session-123" });
        })
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(sessionCreated).toBe(true);
      });
    });
  });

  // ── Error State ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("I-04: renders error state on API failure", async () => {
      mockApi.use(
        http.get(
          `${CHATBOT_BASE_URL}/sessions/:sessionId/messages`,
          () => HttpResponse.json({ message: "Server Error" }, { status: 500 })
        )
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
      expect(
        screen.getByText("Failed to load messages. Please try again.")
      ).toBeInTheDocument();
    });

    it("I-14: retry button refetches messages after error", async () => {
      let fetchCount = 0;
      mockApi.use(
        http.get(
          `${CHATBOT_BASE_URL}/sessions/:sessionId/messages`,
          () => {
            fetchCount++;
            if (fetchCount === 1) {
              return HttpResponse.json({ message: "Error" }, { status: 500 });
            }
            return HttpResponse.json([
              {
                message_id: 1,
                role: "user",
                navigation_link: null,
                content: "Hello after retry",
              },
            ]);
          }
        )
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      await userEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText("Hello after retry")).toBeInTheDocument();
      });
      expect(fetchCount).toBe(2);
    });
  });

  // ── Empty State ────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("I-05: shows empty state when API returns no messages", async () => {
      mockApi.use(
        http.get(
          `${CHATBOT_BASE_URL}/sessions/:sessionId/messages`,
          () => HttpResponse.json([])
        )
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Start a new conversation")).toBeInTheDocument();
      });
      expect(screen.getByText("How can I help you today?")).toBeInTheDocument();
    });
  });

  // ── Input & Send ───────────────────────────────────────────────────────

  describe("input and send", () => {
    it("I-06: send button is disabled when input is empty", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).toBeDisabled();
    });

    it("I-07: typing updates input field", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Type a message…");
      await userEvent.type(input, "Test message");

      expect(input).toHaveValue("Test message");
    });

    it("I-08: sending message calls stream API with correct body", async () => {
      let capturedBody: { session_id: string; message: string } | null = null;
      mockApi.use(
        http.post(`${CHATBOT_BASE_URL}/stream`, async ({ request }) => {
          const body = await request.json();
          capturedBody = body as { session_id: string; message: string };
          return HttpResponse.json([]);
        })
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Type a message…");
      await userEvent.type(input, "What is the weather?");

      const sendBtn = screen.getByRole("button", { name: /send/i });
      await userEvent.click(sendBtn);

      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      });
      expect(capturedBody!.message).toBe("What is the weather?");
      expect(capturedBody!.session_id).toBe("test-session-id");
    });

    it("I-09: streaming response appears in chat with all chunks appended", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Type a message…");
      await userEvent.type(input, "Hello AI");

      const sendBtn = screen.getByRole("button", { name: /send/i });
      await userEvent.click(sendBtn);

      // Both chunks should be appended into a single assistant message
      await waitFor(() => {
        expect(screen.getByText("Hello from AI")).toBeInTheDocument();
      });
    });
  });

  // ── Close Button ───────────────────────────────────────────────────────

  describe("close button", () => {
    it("I-11: close button calls onClose callback", async () => {
      const onClose = vi.fn();
      renderWithProviders(<ChatBot open={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const closeIcon = screen.getByTestId("CloseIcon");
      await userEvent.click(closeIcon);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Streaming Error ────────────────────────────────────────────────────

  describe("streaming error", () => {
    it("I-13: error during streaming shows error message in chat", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.use(
        http.post(
          `${CHATBOT_BASE_URL}/stream`,
          () => HttpResponse.json({ message: "Stream Error" }, { status: 500 })
        )
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Type a message…");
      await userEvent.type(input, "Hello");

      const sendBtn = screen.getByRole("button", { name: /send/i });
      await userEvent.click(sendBtn);

      // Error message should be shown to the user as an assistant message
      await waitFor(() => {
        expect(screen.getByText("Error fetching response")).toBeInTheDocument();
      });

      errorSpy.mockRestore();
    });
  });

  // ── Fullscreen Toggle ──────────────────────────────────────────────────

  describe("fullscreen toggle", () => {
    it("I-15: fullscreen toggle shows history panel", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const fullscreenIcon = screen.getByTestId("FullscreenIcon");
      await userEvent.click(fullscreenIcon);

      await waitFor(() => {
        expect(screen.getByText("Chat History")).toBeInTheDocument();
      });
    });
  });

  // ── Cross-Layer: ChatBot + ChatHistoryPanel ────────────────────────────

  describe("cross-layer integration", () => {
    it("I-16: fullscreen mode shows chat history with mapped session titles", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const fullscreenIcon = screen.getByTestId("FullscreenIcon");
      await userEvent.click(fullscreenIcon);

      await waitFor(() => {
        expect(screen.getByText("Test Conversation 1")).toBeInTheDocument();
      });
      expect(screen.getByText("Test Conversation 2")).toBeInTheDocument();
      expect(screen.getByText("2 conversations")).toBeInTheDocument();
    });

    it("I-17: new chat button in history panel creates a new session", async () => {
      let createCount = 0;
      mockApi.use(
        http.post(`${CHATBOT_BASE_URL}/sessions`, () => {
          createCount++;
          return HttpResponse.json({
            session_id: `new-session-${createCount}`,
          });
        })
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const fullscreenIcon = screen.getByTestId("FullscreenIcon");
      await userEvent.click(fullscreenIcon);

      await waitFor(() => {
        expect(screen.getByText("Chat History")).toBeInTheDocument();
      });

      const newChatItem = screen.getByText("New chat");
      await userEvent.click(newChatItem);

      await waitFor(() => {
        expect(createCount).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("E-01: handles API returning null body gracefully", async () => {
      mockApi.use(
        http.get(
          `${CHATBOT_BASE_URL}/sessions/:sessionId/messages`,
          () => HttpResponse.json(null)
        )
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(
          screen.getByText("Start a new conversation")
        ).toBeInTheDocument();
      });
    });

    it("E-02: handles 401 unauthorized error", async () => {
      mockApi.use(
        http.get(
          `${CHATBOT_BASE_URL}/sessions/:sessionId/messages`,
          () =>
            HttpResponse.json({ message: "Token expired" }, { status: 401 })
        )
      );

      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
    });

    it("E-03: send button enables after typing and disables after send", async () => {
      renderWithProviders(<ChatBot open={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });

      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).toBeDisabled();

      const input = screen.getByPlaceholderText("Type a message…");
      await userEvent.type(input, "Hi");

      expect(sendBtn).toBeEnabled();

      await userEvent.click(sendBtn);

      await waitFor(() => {
        expect(sendBtn).toBeDisabled();
      });
    });

    it("E-04: does not crash when unmounting during fetch", async () => {
      mockApi.use(
        http.get(
          `${CHATBOT_BASE_URL}/sessions/:sessionId/messages`,
          async () => {
            await delay(5000);
            return HttpResponse.json([]);
          }
        )
      );

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { unmount } = renderWithProviders(
        <ChatBot open={true} onClose={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText("Loading conversation...")).toBeInTheDocument();
      });

      unmount();

      await new Promise((r) => setTimeout(r, 100));

      expect(spy).not.toHaveBeenCalledWith(
        expect.stringContaining("unmounted component")
      );
      spy.mockRestore();
    });
  });
});
