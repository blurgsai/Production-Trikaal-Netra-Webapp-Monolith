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

import { Dashboard } from "../Dashboard";

const baseUrl = import.meta.env.VITE_BASE_URL || "http://localhost:5000";

function renderWithProviders(component: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        <MemoryRouter initialEntries={["/world-monitoring/dashboard"]}>
          <Routes>
            <Route path="/world-monitoring/dashboard" element={component} />
            <Route path="/world-monitoring/articles/:articleId" element={<div>Article Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockSummary = {
  active_events: 1247,
  critical_high_events: 89,
  new_events_last_24h: 34,
  active_areas: 23,
  linked_article_events: 412,
};

const mockTrends = [
  { bucket: "2024-01-01", total_events: 50, critical_high_events: 10 },
  { bucket: "2024-01-02", total_events: 60, critical_high_events: 15 },
];

const mockHotspots = [
  { location_name: "Red Sea", event_count: 30, critical_high_count: 10, dominant_event_type: "naval_activity", last_seen: "2024-01-15" },
  { location_name: "Gulf of Aden", event_count: 15, critical_high_count: 5, dominant_event_type: "dark_ship", last_seen: "2024-01-14" },
];

const mockRecent = {
  data: [
    {
      id: "evt-001",
      title: "Naval Activity Detected Near Red Sea",
      summary: "Unusual naval activity was detected.",
      threat_level: "HIGH",
      event_type: "naval_activity",
      enriched_at: "2024-01-15T10:30:00Z",
      primary_location: { name: "Red Sea" },
      linked_article_preview: { source: "Reuters" },
    },
    {
      id: "evt-002",
      title: "Dark Ship Spotted in Gulf of Aden",
      summary: "A vessel with AIS disabled was detected.",
      threat_level: "MEDIUM",
      event_type: "dark_ship",
      enriched_at: "2024-01-14T08:00:00Z",
      primary_location: { name: "Gulf of Aden" },
    },
  ],
};

const mockDistributions = {
  severity: [
    { key: "LOW", value: 100 },
    { key: "MEDIUM", value: 50 },
    { key: "HIGH", value: 25 },
    { key: "CRITICAL", value: 10 },
  ],
  event_types: [
    { key: "naval_activity", label: "Naval Activity", value: 30 },
    { key: "dark_ship", label: "Dark Ship", value: 15 },
  ],
  sources: [{ key: "reuters", value: 20 }],
};

beforeEach(() => {
  localStorage.setItem("token", "test-token");
  mockApi.resetHandlers();
});

describe("Dashboard integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  describe("loading state", () => {
    it("I-01: shows CircularProgress while data is loading", () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => new Promise(() => {})),
      );
      const { container } = renderWithProviders(<Dashboard />);
      expect(container.querySelector(".MuiCircularProgress-root")).toBeTruthy();
    });

    it("I-02: does not render metric cards while loading", () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => new Promise(() => {})),
      );
      const { container } = renderWithProviders(<Dashboard />);
      expect(container.querySelector("[data-testid='metric-card']")).toBeNull();
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  describe("success state", () => {
    function setupSuccessHandlers() {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
    }

    it("I-03: renders Total Events metric from summary", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
      expect(screen.getByText("1247")).toBeInTheDocument();
    });

    it("I-04: renders Critical / High Events metric", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Critical / High Events")).toBeInTheDocument());
      expect(screen.getByText("89")).toBeInTheDocument();
    });

    it("I-05: renders New Events (24h) metric", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("New Events (24h)")).toBeInTheDocument());
      expect(screen.getByText("34")).toBeInTheDocument();
    });

    it("I-06: renders Active Areas metric", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Active Areas")).toBeInTheDocument());
      expect(screen.getByText("23")).toBeInTheDocument();
    });

    it("I-07: renders Linked Article Events metric", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Linked Article Events")).toBeInTheDocument());
      expect(screen.getByText("412")).toBeInTheDocument();
    });

    it("I-08: renders all 5 metric cards", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
      expect(screen.getByText("Critical / High Events")).toBeInTheDocument();
      expect(screen.getByText("New Events (24h)")).toBeInTheDocument();
      expect(screen.getByText("Active Areas")).toBeInTheDocument();
      expect(screen.getByText("Linked Article Events")).toBeInTheDocument();
    });

    it("I-09: renders recent event title from mapped data", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Naval Activity Detected Near Red Sea")).toBeInTheDocument());
    });

    it("I-10: renders second recent event title", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Dark Ship Spotted in Gulf of Aden")).toBeInTheDocument());
    });

    it("I-11: renders hotspot location name", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Red Sea").length).toBeGreaterThan(0));
    });

    it("I-12: renders second hotspot location name", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Gulf of Aden").length).toBeGreaterThan(0));
    });

    it("I-13: hides CircularProgress after data loads", async () => {
      setupSuccessHandlers();
      const { container } = renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
      expect(container.querySelector(".MuiCircularProgress-root")).toBeNull();
    });

    it("I-14: does not show error alert on success", async () => {
      setupSuccessHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
      expect(screen.queryByText("Failed to load overview intelligence.")).toBeNull();
    });
  });

  // ── Error State ────────────────────────────────────────────────────────

  describe("error state", () => {
    function setupErrorHandlers() {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.error()),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
    }

    it("I-15: shows error alert when summary fetch fails", async () => {
      setupErrorHandlers();
      const { container } = renderWithProviders(<Dashboard />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
    });

    it("I-16: hides CircularProgress on error", async () => {
      setupErrorHandlers();
      const { container } = renderWithProviders(<Dashboard />);
      await waitFor(() => {
        const alert = container.querySelector(".MuiAlert-root");
        expect(alert).toBeTruthy();
      }, { timeout: 5000 });
      expect(container.querySelector(".MuiCircularProgress-root")).toBeNull();
    });

    it("I-17: does not render metric cards on error", async () => {
      setupErrorHandlers();
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.queryByText("Total Events")).toBeNull();
      }, { timeout: 5000 });
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("I-18: renders metric cards with 0 when summary has zero values", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json({
          active_events: 0, critical_high_events: 0, new_events_last_24h: 0, active_areas: 0, linked_article_events: 0,
        })),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json([])),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json([])),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json({ data: [] })),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json({ severity: [], event_types: [], sources: [] })),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0), { timeout: 3000 });
      expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    });

    it("I-19: handles empty recent events gracefully", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json({ data: [] })),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
      expect(screen.queryByText("Naval Activity Detected Near Red Sea")).toBeNull();
    });

    it("I-20: handles empty hotspots gracefully", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json([])),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
    });

    it("I-21: handles empty trends gracefully", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json([])),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
    });

    it("I-22: handles empty distributions gracefully", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json({ severity: [], event_types: [], sources: [] })),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
    });

    it("I-23: renders recent event with linked article source", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Naval Activity Detected Near Red Sea")).toBeInTheDocument());
      expect(screen.getByText("Reuters")).toBeInTheDocument();
    });

    it("I-24: uses distinct_regions when active_areas is missing", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json({
          active_events: 100, critical_high_events: 10, new_events_last_24h: 5, distinct_regions: 18, linked_article_events: 20,
        })),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("Active Areas")).toBeInTheDocument());
      expect(screen.getByText("18")).toBeInTheDocument();
    });
  });

  // ── Network Calls ──────────────────────────────────────────────────────

  describe("network calls", () => {
    it("I-25: fetches summary on mount", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
      expect(screen.getByText("1247")).toBeInTheDocument();
    });

    it("I-26: fetches all 5 endpoints on mount", async () => {
      mockApi.use(
        http.get(`${baseUrl}/world-monitor/overview/summary`, () => HttpResponse.json(mockSummary)),
        http.get(`${baseUrl}/world-monitor/overview/trends`, () => HttpResponse.json(mockTrends)),
        http.get(`${baseUrl}/world-monitor/overview/hotspots`, () => HttpResponse.json(mockHotspots)),
        http.get(`${baseUrl}/world-monitor/overview/recent`, () => HttpResponse.json(mockRecent)),
        http.get(`${baseUrl}/world-monitor/overview/distributions`, () => HttpResponse.json(mockDistributions)),
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getAllByText("Total Events").length).toBeGreaterThan(0));
      expect(screen.getByText("Critical / High Events")).toBeInTheDocument();
      expect(screen.getByText("New Events (24h)")).toBeInTheDocument();
      expect(screen.getByText("Active Areas")).toBeInTheDocument();
      expect(screen.getByText("Linked Article Events")).toBeInTheDocument();
    });
  });
});
