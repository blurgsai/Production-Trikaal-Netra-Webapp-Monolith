import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";

import { Articles } from "../Articles";

const baseUrl = import.meta.env.VITE_BASE_URL || "http://localhost:5000";

function renderWithProviders(component: ReactNode, initialEntry = "/world-monitoring/articles") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/world-monitoring/articles" element={component} />
            <Route path="/world-monitoring/articles/:articleId" element={component} />
            <Route path="/world-monitoring/threats/:eventId" element={<div>Threats Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockArticleMetadata = {
  sources: ["Reuters", "AP News", "BBC"],
  processing_statuses: ["processed", "pending", "raw"],
};

const mockArticles = {
  data: [
    {
      id: "art-001",
      title: "Red Sea Tensions Rise as Naval Activity Increases",
      summary: "Recent incidents near the Red Sea have escalated tensions.",
      source: "Reuters",
      source_type: "reuters",
      image_url: "https://example.com/image1.jpg",
      processing_status: "processed",
      published: "2024-01-15T10:30:00Z",
      linked_event_count: 3,
      tags: ["conflict", "maritime"],
      author: "John Doe",
    },
    {
      id: "art-002",
      title: "Gulf of Aden Piracy Report Released",
      summary: "A comprehensive piracy report for the Gulf of Aden was published.",
      source: "AP News",
      source_type: "ap_news",
      image_url: "https://example.com/image2.jpg",
      processing_status: "pending",
      published: "2024-01-14T08:00:00Z",
      linked_event_count: 1,
      tags: ["piracy"],
      author: "Jane Smith",
    },
  ],
  pagination: { page: 1, page_size: 12, total_pages: 5, total: 50 },
};

const mockArticleDetail = {
  id: "art-001",
  title: "Red Sea Tensions Rise as Naval Activity Increases",
  summary: "Recent incidents near the Red Sea have escalated tensions.",
  source: "Reuters",
  source_type: "reuters",
  image_url: "https://example.com/image1.jpg",
  author: "John Doe",
  published: "2024-01-15T10:30:00Z",
  processing_status: "processed",
  raw_content: "Raw article content here.",
  processed_content: "Processed article content here.",
  link: "https://reuters.com/article/123",
  tags: ["conflict", "maritime"],
  linked_events: [
    { id: "evt-001", title: "Naval Activity Near Red Sea", summary: "Unusual naval activity.", threat_level: "HIGH", event_type: "naval_activity" },
  ],
  locations: [{ name: "Red Sea" }],
};

function setupSuccessHandlers() {
  mockApi.use(
    http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json(mockArticleMetadata)),
    http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json(mockArticles)),
    http.get(`${baseUrl}/world-monitor/articles/:articleId`, () => HttpResponse.json(mockArticleDetail)),
  );
}

beforeEach(() => {
  localStorage.setItem("token", "test-token");
  mockApi.resetHandlers();
});

describe("Articles integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  describe("loading state", () => {
    it("I-01: shows CircularProgress while data is loading", () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => new Promise(() => {})),
        http.get(`${baseUrl}/world-monitor/articles`, () => new Promise(() => {})),
      );
      const { container } = renderWithProviders(<Articles />);
      expect(container.querySelector(".MuiCircularProgress-root")).toBeTruthy();
    });

    it("I-02: does not render article cards while loading", () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => new Promise(() => {})),
        http.get(`${baseUrl}/world-monitor/articles`, () => new Promise(() => {})),
      );
      renderWithProviders(<Articles />);
      expect(screen.queryByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeNull();
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("I-03: renders first article title from mapped data", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
    });

    it("I-04: renders second article title", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Gulf of Aden Piracy Report Released")).toBeInTheDocument());
    });

    it("I-05: renders article summary", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Recent incidents near the Red Sea have escalated tensions.")).toBeInTheDocument());
    });

    it("I-06: renders search input with placeholder", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByPlaceholderText("Search title, summary, source, author")).toBeInTheDocument());
    });

    it("I-07: renders source dropdown with All sources option", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByPlaceholderText("All sources")).toBeInTheDocument());
    });

    it("I-08: renders source options from metadata", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getAllByText("Reuters").length).toBeGreaterThan(0));
    });

    it("I-09: renders All statuses option in status dropdown", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByPlaceholderText("All statuses")).toBeInTheDocument());
    });

    it("I-10: does not show error alert on success", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
      expect(screen.queryByText("Failed to load source intelligence.")).toBeNull();
    });

    it("I-11: hides CircularProgress after data loads", async () => {
      setupSuccessHandlers();
      const { container } = renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
      expect(container.querySelector(".MuiCircularProgress-root")).toBeNull();
    });

    it("I-12: renders both article cards", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
      expect(screen.getByText("Gulf of Aden Piracy Report Released")).toBeInTheDocument();
    });

    it("I-13: renders article source from mapped data", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getAllByText("Reuters").length).toBeGreaterThan(0));
    });

    it("I-14: renders AP News as second article source", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getAllByText("AP News").length).toBeGreaterThan(0));
    });
  });

  // ── Error State ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("I-15: shows error alert when articles fetch fails", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json(mockArticleMetadata)),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.error()),
      );
      const { container } = renderWithProviders(<Articles />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
    });

    it("I-16: shows error alert when metadata fetch fails", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.error()),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json(mockArticles)),
      );
      const { container } = renderWithProviders(<Articles />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
    });

    it("I-17: hides CircularProgress on error", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.error()),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json(mockArticles)),
      );
      const { container } = renderWithProviders(<Articles />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
      expect(container.querySelector(".MuiCircularProgress-root")).toBeNull();
    });

    it("I-18: does not render article cards on error", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json(mockArticleMetadata)),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.error()),
      );
      renderWithProviders(<Articles />);
      await waitFor(() => {
        expect(screen.queryByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeNull();
      }, { timeout: 5000 });
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("I-19: handles empty articles list gracefully", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json(mockArticleMetadata)),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json({ data: [], pagination: { page: 1, page_size: 12, total_pages: 0, total: 0 } })),
      );
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.queryByText("Failed to load source intelligence.")).toBeNull());
    });

    it("I-20: handles empty metadata arrays gracefully", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json({ sources: [], processing_statuses: [] })),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json(mockArticles)),
      );
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
    });

    it("I-21: renders with article detail route param", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />, "/world-monitoring/articles/art-001");
      await waitFor(() => expect(screen.getAllByText("Red Sea Tensions Rise as Naval Activity Increases").length).toBeGreaterThan(0));
    });

    it("I-22: handles article without optional fields", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json(mockArticleMetadata)),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json({
          data: [{ id: "art-min", title: "Minimal Article" }],
          pagination: { page: 1, page_size: 12, total_pages: 1, total: 1 },
        })),
      );
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Minimal Article")).toBeInTheDocument());
    });

    it("I-23: handles zero total pages in pagination", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json(mockArticleMetadata)),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json({ data: [], pagination: { page: 1, page_size: 12, total_pages: 0, total: 0 } })),
      );
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.queryByText("Failed to load source intelligence.")).toBeNull());
    });

    it("I-24: handles large total in pagination", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/filters/metadata`, () => HttpResponse.json(mockArticleMetadata)),
        http.get(`${baseUrl}/world-monitor/articles`, () => HttpResponse.json({
          data: mockArticles.data,
          pagination: { page: 1, page_size: 12, total_pages: 100, total: 1200 },
        })),
      );
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
    });
  });

  // ── Network Calls ──────────────────────────────────────────────────────

  describe("network calls", () => {
    it("I-25: fetches metadata on mount", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
      expect(screen.getAllByText("Reuters").length).toBeGreaterThan(0);
    });

    it("I-26: fetches articles on mount", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("Red Sea Tensions Rise as Naval Activity Increases")).toBeInTheDocument());
      expect(screen.getByText("Gulf of Aden Piracy Report Released")).toBeInTheDocument();
    });
  });

  // ── Mapper Integration ─────────────────────────────────────────────────

  describe("mapper integration", () => {
    it("I-27: displays mapped article source from API source field", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getAllByText("Reuters").length).toBeGreaterThan(0));
    });

    it("I-28: displays mapped article author", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("By John Doe")).toBeInTheDocument());
    });

    it("I-29: displays mapped article tags", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("# conflict")).toBeInTheDocument());
    });

    it("I-30: displays second article tags", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Articles />);
      await waitFor(() => expect(screen.getByText("# piracy")).toBeInTheDocument());
    });
  });
});
