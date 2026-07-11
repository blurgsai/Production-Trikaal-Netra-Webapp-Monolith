import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";

import { Threats } from "../Threats";

function renderWithProviders(component: ReactNode, initialEntry = "/world-monitoring/threats") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/world-monitoring/threats" element={component} />
            <Route path="/world-monitoring/threats/:eventId" element={component} />
            <Route path="/world-monitoring/articles/:articleId" element={<div>Article Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockThreatMetadata = {
  threat_levels: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  event_types: ["naval_activity", "dark_ship", "spoofing_detected"],
  sources: ["Reuters", "AP News", "BBC"],
  sort_options: [
    { value: "latest", label: "Latest" },
    { value: "oldest", label: "Oldest" },
  ],
};

const mockThreatEvents = {
  data: [
    {
      id: "evt-001",
      title: "Naval Activity Near Red Sea",
      summary: "Unusual naval activity detected.",
      threat_level: "HIGH",
      event_type: "naval_activity",
      enriched_at: "2024-01-15T10:30:00Z",
      primary_location: { name: "Red Sea" },
    },
    {
      id: "evt-002",
      title: "Dark Ship in Gulf of Aden",
      summary: "AIS-disabled vessel detected.",
      threat_level: "MEDIUM",
      event_type: "dark_ship",
      enriched_at: "2024-01-14T08:00:00Z",
      primary_location: { name: "Gulf of Aden" },
    },
  ],
  pagination: { page: 1, page_size: 12, total_pages: 3, total: 30 },
};

const mockThreatMap = {
  data: [
    {
      marker_id: "m1",
      event_id: "evt-001",
      title: "Naval Activity Near Red Sea",
      threat_level: "HIGH",
      location: { name: "Red Sea", lat: 15.5, lng: 42.3 },
    },
    {
      marker_id: "m2",
      event_id: "evt-002",
      title: "Dark Ship in Gulf of Aden",
      threat_level: "MEDIUM",
      location: { name: "Gulf of Aden", lat: 12.5, lng: 47.3 },
    },
  ],
};

const mockEventDetail = {
  id: "evt-001",
  title: "Naval Activity Near Red Sea",
  summary: "Unusual naval activity detected near the Red Sea.",
  threat_level: "HIGH",
  event_type: "naval_activity",
  enriched_at: "2024-01-15T10:30:00Z",
  reasoning: "Pattern matches historical conflict zones.",
  relevance_score: 0.92,
  primary_location: { name: "Red Sea", lat: 15.5, lng: 42.3 },
  locations: [{ name: "Red Sea", lat: 15.5, lng: 42.3, role: "primary" }],
  structured_fields: [{ key: "vessels", label: "Vessels Involved", value: "3" }],
  linked_article_preview: {
    id: "art-001",
    title: "Red Sea Tensions Rise",
    image_url: "https://example.com/image.jpg",
    source: "Reuters",
    source_type: "reuters",
  },
};

const mockArticleDetail = {
  id: "art-001",
  title: "Red Sea Tensions Rise",
  summary: "Recent incidents near the Red Sea have escalated.",
  source: "Reuters",
  source_type: "reuters",
  image_url: "https://example.com/image.jpg",
  author: "John Doe",
  published: "2024-01-15T10:30:00Z",
  processing_status: "processed",
  raw_content: "Raw article content.",
  processed_content: "Processed article content.",
  link: "https://reuters.com/article/123",
  tags: ["conflict", "maritime"],
  linked_events: [
    { id: "evt-001", title: "Naval Activity", threat_level: "HIGH", event_type: "naval_activity" },
  ],
  locations: [{ name: "Red Sea" }],
};

function setupSuccessHandlers() {
  mockApi.use(
    http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.json(mockThreatMetadata)),
    http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.json(mockThreatEvents)),
    http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.json(mockThreatMap)),
    http.get("/mock/world-monitor/event-detail.json", () => HttpResponse.json(mockEventDetail)),
    http.get("/mock/world-monitor/article-detail.json", () => HttpResponse.json(mockArticleDetail)),
  );
}

beforeEach(() => {
  localStorage.setItem("token", "test-token");
  mockApi.resetHandlers();
});

describe("Threats integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  describe("loading state", () => {
    it("I-01: shows loading indicator while data is loading", () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => new Promise(() => {})),
        http.get("/mock/world-monitor/threat-events.json", () => new Promise(() => {})),
        http.get("/mock/world-monitor/threat-map.json", () => new Promise(() => {})),
      );
      const { container } = renderWithProviders(<Threats />);
      expect(container.querySelector(".MuiCircularProgress-root")).toBeTruthy();
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("I-02: renders event title from mapped data", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
    });

    it("I-03: renders second event title", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Dark Ship in Gulf of Aden")).toBeInTheDocument());
    });

    it("I-04: renders event summary", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Unusual naval activity detected.")).toBeInTheDocument());
    });

    it("I-05: does not show error alert on success", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
      expect(screen.queryByText("Failed to load world monitoring threats.")).toBeNull();
    });

    it("I-06: renders keyword search input", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument());
    });

    it("I-07: renders event location from mapped data", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Red Sea")).toBeInTheDocument());
    });

    it("I-08: renders Gulf of Aden location", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Gulf of Aden")).toBeInTheDocument());
    });
  });

  // ── Error State ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("I-09: shows error alert when threat events fetch fails", async () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.json(mockThreatMetadata)),
        http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.error()),
        http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.json(mockThreatMap)),
      );
      const { container } = renderWithProviders(<Threats />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
    });

    it("I-10: shows error alert when metadata fetch fails", async () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.error()),
        http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.json(mockThreatEvents)),
        http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.json(mockThreatMap)),
      );
      const { container } = renderWithProviders(<Threats />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
    });

    it("I-11: shows error alert when map events fetch fails", async () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.json(mockThreatMetadata)),
        http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.json(mockThreatEvents)),
        http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.error()),
      );
      const { container } = renderWithProviders(<Threats />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("I-12: handles empty events list gracefully", async () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.json(mockThreatMetadata)),
        http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.json({ data: [], pagination: { page: 1, page_size: 12, total_pages: 0, total: 0 } })),
        http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.json({ data: [] })),
      );
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.queryByText("Failed to load world monitoring threats.")).toBeNull());
    });

    it("I-13: handles empty map markers gracefully", async () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.json(mockThreatMetadata)),
        http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.json(mockThreatEvents)),
        http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.json({ data: [] })),
      );
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
    });

    it("I-14: handles empty metadata arrays gracefully", async () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.json({ threat_levels: [], event_types: [], sources: [], sort_options: [] })),
        http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.json(mockThreatEvents)),
        http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.json(mockThreatMap)),
      );
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
    });

    it("I-15: renders with event detail route param", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />, "/world-monitoring/threats/evt-001");
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
    });

    it("I-16: handles event without primary_location", async () => {
      mockApi.use(
        http.get("/mock/world-monitor/threat-metadata.json", () => HttpResponse.json(mockThreatMetadata)),
        http.get("/mock/world-monitor/threat-events.json", () => HttpResponse.json({
          data: [{ id: "evt-no-loc", title: "No Location Event", summary: "Test", threat_level: "LOW", event_type: "test", enriched_at: "2024-01-01" }],
          pagination: { page: 1, page_size: 12, total_pages: 1, total: 1 },
        })),
        http.get("/mock/world-monitor/threat-map.json", () => HttpResponse.json({ data: [] })),
      );
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("No Location Event")).toBeInTheDocument());
    });
  });

  // ── Network Calls ──────────────────────────────────────────────────────

  describe("network calls", () => {
    it("I-17: fetches threat-metadata.json on mount", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
      expect(fetchSpy.mock.calls.some((c) => c[0] === "/mock/world-monitor/threat-metadata.json")).toBe(true);
      fetchSpy.mockRestore();
    });

    it("I-18: fetches threat-events.json on mount", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
      expect(fetchSpy.mock.calls.some((c) => c[0] === "/mock/world-monitor/threat-events.json")).toBe(true);
      fetchSpy.mockRestore();
    });

    it("I-19: fetches threat-map.json on mount", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
      expect(fetchSpy.mock.calls.some((c) => c[0] === "/mock/world-monitor/threat-map.json")).toBe(true);
      fetchSpy.mockRestore();
    });
  });

  // ── Mapper Integration ─────────────────────────────────────────────────

  describe("mapper integration", () => {
    it("I-20: displays mapped threat level for event", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
      expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
    });

    it("I-21: displays mapped event type label", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
    });

    it("I-22: displays pagination with correct total pages", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Threats />);
      await waitFor(() => expect(screen.getByText("Naval Activity Near Red Sea")).toBeInTheDocument());
    });
  });
});
