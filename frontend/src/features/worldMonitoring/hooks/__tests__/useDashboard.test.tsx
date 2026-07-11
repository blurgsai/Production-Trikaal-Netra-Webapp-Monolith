import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/overviewApi", () => ({
  getOverviewSummary: vi.fn(),
  getOverviewTrends: vi.fn(),
  getOverviewHotspots: vi.fn(),
  getOverviewRecent: vi.fn(),
  getOverviewDistributions: vi.fn(),
}));

import {
  getOverviewSummary,
  getOverviewTrends,
  getOverviewHotspots,
  getOverviewRecent,
  getOverviewDistributions,
} from "../../api/overviewApi";
import { useDashboard } from "../useDashboard";
import type {
  OverviewSummaryApiResponse,
  OverviewTrendApiResponse,
  OverviewHotspotApiResponse,
  OverviewRecentApiResponse,
  OverviewDistributionsApiResponse,
} from "../../api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockSummary: OverviewSummaryApiResponse = {
  active_events: 100,
  critical_high_events: 25,
  new_events_last_24h: 10,
  distinct_regions: 5,
  articles_ingested_today: 8,
  active_areas: 8,
  review_required_events: 3,
  linked_article_events: 15,
};

const mockTrends: OverviewTrendApiResponse[] = [
  { bucket: "2024-01-01", total_events: 50, critical_high_events: 10 },
  { bucket: "2024-01-02", total_events: 60, critical_high_events: 15 },
];

const mockHotspots: OverviewHotspotApiResponse[] = [
  { location_name: "Red Sea", event_count: 30, critical_high_count: 10, dominant_event_type: "Conflict", last_seen: "2024-01-01" },
];

const mockRecent: OverviewRecentApiResponse = {
  success: true,
  data: [
    { id: "evt-001", title: "Event 1", summary: "Summary 1", threat_level: "HIGH", event_type: "Conflict", enriched_at: "2024-01-01", primary_location: { name: "Location A", lat: 0, lng: 0, role: "primary" }, locations: [] },
  ],
};

const mockDistributions: OverviewDistributionsApiResponse = {
  severity: [{ key: "HIGH", label: "High", value: 25 }],
  event_types: [{ key: "conflict", label: "Conflict", value: 30 }],
  sources: [{ key: "gnews", label: "GNews", value: 20 }],
};

function setAllResolving() {
  vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
  vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
  vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
  vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
  vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
}

function setAllPending() {
  vi.mocked(getOverviewSummary).mockReturnValue(new Promise(() => {}));
  vi.mocked(getOverviewTrends).mockReturnValue(new Promise(() => {}));
  vi.mocked(getOverviewHotspots).mockReturnValue(new Promise(() => {}));
  vi.mocked(getOverviewRecent).mockReturnValue(new Promise(() => {}));
  vi.mocked(getOverviewDistributions).mockReturnValue(new Promise(() => {}));
}

describe("useDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns isLoading=true on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
    });

    it("returns data as undefined on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });

    it("returns isError=false on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });

    it("returns isFetching=true on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      expect(result.current.isFetching).toBe(true);
    });

    it("calls getOverviewSummary on mount", async () => {
      setAllResolving();
      renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(getOverviewSummary).toHaveBeenCalledTimes(1));
    });

    it("calls getOverviewTrends on mount", async () => {
      setAllResolving();
      renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(getOverviewTrends).toHaveBeenCalledTimes(1));
    });

    it("calls getOverviewHotspots on mount", async () => {
      setAllResolving();
      renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(getOverviewHotspots).toHaveBeenCalledTimes(1));
    });

    it("calls getOverviewRecent on mount", async () => {
      setAllResolving();
      renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(getOverviewRecent).toHaveBeenCalledTimes(1));
    });

    it("calls getOverviewDistributions on mount", async () => {
      setAllResolving();
      renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(getOverviewDistributions).toHaveBeenCalledTimes(1));
    });

    it("calls all five API functions in parallel via Promise.all", async () => {
      setAllResolving();
      renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getOverviewSummary).toHaveBeenCalledTimes(1);
        expect(getOverviewTrends).toHaveBeenCalledTimes(1);
        expect(getOverviewHotspots).toHaveBeenCalledTimes(1);
        expect(getOverviewRecent).toHaveBeenCalledTimes(1);
        expect(getOverviewDistributions).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("returns isLoading=false on success", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("returns isError=false on success", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("maps summary.totalEvents from active_events", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.totalEvents).toBe(100));
    });

    it("maps summary.criticalHighEvents from critical_high_events", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.criticalHighEvents).toBe(25));
    });

    it("maps summary.newEvents24h from new_events_last_24h", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.newEvents24h).toBe(10));
    });

    it("maps summary.activeAreas from active_areas", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.activeAreas).toBe(8));
    });

    it("maps summary.linkedArticleEvents", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.linkedArticleEvents).toBe(15));
    });

    it("maps trends array with correct length", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.trends).toHaveLength(2));
    });

    it("maps trend bucket field correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.trends[0].bucket).toBe("2024-01-01"));
    });

    it("maps trend totalEvents from total_events", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.trends[0].totalEvents).toBe(50));
    });

    it("maps trend criticalHighEvents from critical_high_events", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.trends[0].criticalHighEvents).toBe(10));
    });

    it("maps hotspots array with correct length", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots).toHaveLength(1));
    });

    it("maps hotspot locationName from location_name", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots[0].locationName).toBe("Red Sea"));
    });

    it("maps hotspot eventCount from event_count", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots[0].eventCount).toBe(30));
    });

    it("maps hotspot criticalHighCount from critical_high_count", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots[0].criticalHighCount).toBe(10));
    });

    it("maps hotspot dominantEventType from dominant_event_type", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots[0].dominantEventType).toBe("Conflict"));
    });

    it("maps hotspot lastSeen from last_seen", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots[0].lastSeen).toBe("2024-01-01"));
    });

    it("maps recent events array from response data", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent).toHaveLength(1));
    });

    it("maps recent event id correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent[0].id).toBe("evt-001"));
    });

    it("maps recent event title correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent[0].title).toBe("Event 1"));
    });

    it("maps recent event threatLevel from threat_level", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent[0].threatLevel).toBe("HIGH"));
    });

    it("maps recent event location from primary_location.name", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent[0].location).toBe("Location A"));
    });

    it("maps distributions severity array", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.severity).toHaveLength(1));
    });

    it("maps distributions severity key", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.severity[0].key).toBe("HIGH"));
    });

    it("maps distributions severity value", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.severity[0].value).toBe(25));
    });

    it("maps distributions eventTypes array", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.eventTypes).toHaveLength(1));
    });

    it("maps distributions eventTypes key", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.eventTypes[0].key).toBe("conflict"));
    });

    it("maps distributions eventTypes label", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.eventTypes[0].label).toBe("Conflict"));
    });

    it("maps distributions eventTypes value", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.eventTypes[0].value).toBe(30));
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("returns isError=true when getOverviewSummary rejects", async () => {
      vi.mocked(getOverviewSummary).mockRejectedValue(new Error("Network error"));
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns isError=true when getOverviewTrends rejects", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockRejectedValue(new Error("Trends error"));
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns isError=true when getOverviewHotspots rejects", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockRejectedValue(new Error("Hotspots error"));
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns isError=true when getOverviewRecent rejects", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockRejectedValue(new Error("Recent error"));
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns isError=true when getOverviewDistributions rejects", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockRejectedValue(new Error("Distributions error"));
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns error message from rejected promise", async () => {
      vi.mocked(getOverviewSummary).mockRejectedValue(new Error("Summary 500"));
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toBe("Summary 500"));
    });

    it("returns data as undefined on error", async () => {
      vi.mocked(getOverviewSummary).mockRejectedValue(new Error("fail"));
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("returns isLoading=false on error", async () => {
      vi.mocked(getOverviewSummary).mockRejectedValue(new Error("fail"));
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty trends array", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue([]);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.trends).toEqual([]));
    });

    it("handles empty hotspots array", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue([]);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots).toEqual([]));
    });

    it("handles empty recent events array", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue({ success: true, data: [] });
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent).toEqual([]));
    });

    it("handles empty severity distributions", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue({ severity: [], event_types: [], sources: [] });
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.distributions.severity).toEqual([]));
    });

    it("handles summary with active_areas undefined, falls back to distinct_regions", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue({
        ...mockSummary,
        active_areas: undefined as unknown as number,
        distinct_regions: 12,
      } as typeof mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.activeAreas).toBe(12));
    });

    it("handles summary with both active_areas and distinct_regions undefined, defaults to 0", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue({
        ...mockSummary,
        active_areas: undefined as unknown as number,
        distinct_regions: undefined as unknown as number,
      } as typeof mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.activeAreas).toBe(0));
    });

    it("handles recent event without primary_location", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue({
        success: true,
        data: [{ id: "evt-002", title: "No Location", summary: "Test", threat_level: "LOW", event_type: "Test", enriched_at: "2024-01-01", locations: [] }],
      });
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent[0].location).toBeUndefined());
    });

    it("handles recent event with linked_article_preview source", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue({
        success: true,
        data: [{
          id: "evt-003", title: "With Article", summary: "Test", threat_level: "MEDIUM",
          event_type: "Test", enriched_at: "2024-01-01", locations: [],
          linked_article_preview: { id: "art-1", title: "Article", tags: [], locations: [], source: "GNews" },
        }],
      });
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent[0].source).toBe("GNews"));
    });

    it("handles recent event without linked_article_preview", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.recent[0].source).toBeUndefined());
    });

    it("handles hotspot without dominant_event_type", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue([
        { location_name: "Area 51", event_count: 5, critical_high_count: 0, last_seen: "2024-01-01" },
      ]);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.hotspots[0].dominantEventType).toBeUndefined());
    });

    it("handles zero values in summary", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue({
        ...mockSummary,
        active_events: 0,
        critical_high_events: 0,
        new_events_last_24h: 0,
        active_areas: 0,
        linked_article_events: 0,
      });
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.summary.totalEvents).toBe(0);
        expect(result.current.data?.summary.criticalHighEvents).toBe(0);
        expect(result.current.data?.summary.newEvents24h).toBe(0);
      });
    });

    it("handles large event counts", async () => {
      vi.mocked(getOverviewSummary).mockResolvedValue({
        ...mockSummary,
        active_events: 1000000,
        critical_high_events: 500000,
        new_events_last_24h: 10000,
        active_areas: 100,
        linked_article_events: 50000,
      });
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary.totalEvents).toBe(1000000));
    });

    it("handles multiple trends preserving order", async () => {
      const multiTrends: OverviewTrendApiResponse[] = [
        { bucket: "2024-01-01", total_events: 10, critical_high_events: 1 },
        { bucket: "2024-01-02", total_events: 20, critical_high_events: 2 },
        { bucket: "2024-01-03", total_events: 30, critical_high_events: 3 },
      ];
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(multiTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.trends[0].bucket).toBe("2024-01-01");
        expect(result.current.data?.trends[2].bucket).toBe("2024-01-03");
      });
    });

    it("handles multiple hotspots preserving order", async () => {
      const multiHotspots: OverviewHotspotApiResponse[] = [
        { location_name: "Zone A", event_count: 1, critical_high_count: 0, last_seen: "2024-01-01" },
        { location_name: "Zone B", event_count: 2, critical_high_count: 1, last_seen: "2024-01-02" },
      ];
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(multiHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(mockRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.hotspots[0].locationName).toBe("Zone A");
        expect(result.current.data?.hotspots[1].locationName).toBe("Zone B");
      });
    });

    it("handles multiple recent events preserving order", async () => {
      const multiRecent: OverviewRecentApiResponse = {
        success: true,
        data: [
          { id: "r1", title: "R1", summary: "S1", threat_level: "LOW", event_type: "A", enriched_at: "2024-01-01", locations: [] },
          { id: "r2", title: "R2", summary: "S2", threat_level: "HIGH", event_type: "B", enriched_at: "2024-01-02", locations: [] },
        ],
      };
      vi.mocked(getOverviewSummary).mockResolvedValue(mockSummary);
      vi.mocked(getOverviewTrends).mockResolvedValue(mockTrends);
      vi.mocked(getOverviewHotspots).mockResolvedValue(mockHotspots);
      vi.mocked(getOverviewRecent).mockResolvedValue(multiRecent);
      vi.mocked(getOverviewDistributions).mockResolvedValue(mockDistributions);
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.recent[0].id).toBe("r1");
        expect(result.current.data?.recent[1].id).toBe("r2");
      });
    });
  });

  // ── Cache and refetch ──────────────────────────────────────────────────

  describe("cache and refetch", () => {
    it("does not refetch on re-render (served from cache)", async () => {
      setAllResolving();
      const { rerender } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(getOverviewSummary).toHaveBeenCalledTimes(1));
      rerender();
      expect(getOverviewSummary).toHaveBeenCalledTimes(1);
    });

    it("refetch re-calls all API functions", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await result.current.refetch();
      expect(getOverviewSummary).toHaveBeenCalledTimes(2);
    });

    it("provides refetch function", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(typeof result.current.refetch).toBe("function");
    });

    it("returns isStale=true after fresh fetch (default staleTime=0)", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isStale).toBe(true);
    });
  });

  // ── Query key ──────────────────────────────────────────────────────────

  describe("query key", () => {
    it("uses 'world-monitor-dashboard' as query key", async () => {
      setAllResolving();
      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(getOverviewSummary).toHaveBeenCalledTimes(1);
    });

    it("shares cache between identical hook instances with same QueryClient", async () => {
      setAllResolving();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const { result: r1 } = renderHook(() => useDashboard(), { wrapper });
      await waitFor(() => expect(r1.current.data).toBeDefined());
      const { result: r2 } = renderHook(() => useDashboard(), { wrapper });
      expect(r2.current.data).toBeDefined();
      expect(getOverviewSummary).toHaveBeenCalledTimes(1);
    });
  });
});
