import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/threatsApi", () => ({
  getThreatMetadata: vi.fn(),
  getThreatEvents: vi.fn(),
  getThreatMapEvents: vi.fn(),
}));

import {
  getThreatMetadata,
  getThreatEvents,
  getThreatMapEvents,
} from "../../api/threatsApi";
import { useThreats } from "../useThreats";
import type { ThreatFilters } from "../../model/types";
import type {
  WorldMonitorMetadataApiResponse,
  WorldMonitorEventListApiResponse,
  WorldMonitorMapApiResponse,
} from "../../api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const defaultFilters: ThreatFilters = {
  keyword: "",
  eventTypes: [],
  threatLevels: [],
  sources: [],
  sort: "newest",
};

const mockMetadata: WorldMonitorMetadataApiResponse = {
  success: true,
  threat_levels: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  event_types: ["Conflict", "Piracy", "Sanctions"],
  sources: ["GNews", "Reuters"],
  source_types: [],
  processing_statuses: ["processed", "pending", "failed"],
  sort_options: [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
  ],
};

const mockEventsResponse: WorldMonitorEventListApiResponse = {
  success: true,
  data: [
    {
      id: "evt-001",
      title: "Red Sea Conflict",
      summary: "Maritime conflict detected near Red Sea.",
      threat_level: "HIGH",
      event_type: "Conflict",
      enriched_at: "2024-01-15T10:30:00Z",
      primary_location: { name: "Red Sea", lat: 0, lng: 0, role: "primary" },
      locations: [],
    },
    {
      id: "evt-002",
      title: "Gulf of Aden Piracy",
      summary: "Piracy incident reported.",
      threat_level: "MEDIUM",
      event_type: "Piracy",
      enriched_at: "2024-01-14T08:00:00Z",
      locations: [],
    },
  ],
  pagination: { page: 1, page_size: 10, total_pages: 3, total: 25 },
};

const mockMapResponse: WorldMonitorMapApiResponse = {
  success: true,
  data: [
    {
      marker_id: "m1",
      event_id: "evt-001",
      title: "Red Sea Conflict",
      threat_level: "HIGH",
      event_type: "Conflict",
      location: { name: "Red Sea", lat: 15.5, lng: 42.3, role: "primary" },
    },
  ],
  total_events: 25,
  total_markers: 1,
};

function setAllResolving() {
  vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
  vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
  vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
}

function setAllPending() {
  vi.mocked(getThreatMetadata).mockReturnValue(new Promise(() => {}));
  vi.mocked(getThreatEvents).mockReturnValue(new Promise(() => {}));
  vi.mocked(getThreatMapEvents).mockReturnValue(new Promise(() => {}));
}

describe("useThreats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns isLoading=true on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoading).toBe(true);
    });

    it("returns data as undefined on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      expect(result.current.data).toBeUndefined();
    });

    it("returns isError=false on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      expect(result.current.isError).toBe(false);
    });

    it("calls getThreatMetadata on mount", async () => {
      setAllResolving();
      renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getThreatMetadata).toHaveBeenCalledTimes(1));
    });

    it("calls getThreatEvents on mount", async () => {
      setAllResolving();
      renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(1));
    });

    it("calls getThreatMapEvents on mount", async () => {
      setAllResolving();
      renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getThreatMapEvents).toHaveBeenCalledTimes(1));
    });

    it("calls all three API functions in parallel via Promise.all", async () => {
      setAllResolving();
      renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(getThreatMetadata).toHaveBeenCalledTimes(1);
        expect(getThreatEvents).toHaveBeenCalledTimes(1);
        expect(getThreatMapEvents).toHaveBeenCalledTimes(1);
      });
    });

    it("passes filters, page, and pageSize to getThreatEvents", async () => {
      setAllResolving();
      renderHook(() => useThreats(defaultFilters, 2, 20), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledWith(defaultFilters, 2, 20));
    });

    it("passes filters to getThreatMapEvents", async () => {
      setAllResolving();
      renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getThreatMapEvents).toHaveBeenCalledWith(defaultFilters));
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("returns isLoading=false on success", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("returns isError=false on success", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("maps metadata threatLevels from threat_levels", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.metadata.threatLevels).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]));
    });

    it("maps metadata eventTypes from event_types", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.metadata.eventTypes).toEqual(["Conflict", "Piracy", "Sanctions"]));
    });

    it("maps metadata sources", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.metadata.sources).toEqual(["GNews", "Reuters"]));
    });

    it("maps metadata sortOptions from sort_options", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.metadata.sortOptions).toHaveLength(2));
    });

    it("maps metadata sortOptions value", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.metadata.sortOptions[0].value).toBe("newest"));
    });

    it("maps metadata sortOptions label", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.metadata.sortOptions[0].label).toBe("Newest"));
    });

    it("maps events array with correct length", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events).toHaveLength(2));
    });

    it("maps event id correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events[0].id).toBe("evt-001"));
    });

    it("maps event title correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events[0].title).toBe("Red Sea Conflict"));
    });

    it("maps event threatLevel from threat_level", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events[0].threatLevel).toBe("HIGH"));
    });

    it("maps event eventType from event_type", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events[0].eventType).toBe("Conflict"));
    });

    it("maps event enrichedAt from enriched_at", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events[0].enrichedAt).toBe("2024-01-15T10:30:00Z"));
    });

    it("maps event location from primary_location.name", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events[0].location).toBe("Red Sea"));
    });

    it("maps event location as undefined when primary_location is missing", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events[1].location).toBeUndefined());
    });

    it("maps mapMarkers array with correct length", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers).toHaveLength(1));
    });

    it("maps mapMarker markerId from marker_id", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers[0].markerId).toBe("m1"));
    });

    it("maps mapMarker eventId from event_id", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers[0].eventId).toBe("evt-001"));
    });

    it("maps mapMarker threatLevel from threat_level", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers[0].threatLevel).toBe("HIGH"));
    });

    it("maps mapMarker location name", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers[0].location.name).toBe("Red Sea"));
    });

    it("maps mapMarker location lat", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers[0].location.lat).toBe(15.5));
    });

    it("maps mapMarker location lng", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers[0].location.lng).toBe(42.3));
    });

    it("maps pagination page", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.pagination.page).toBe(1));
    });

    it("maps pagination pageSize from page_size", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.pagination.pageSize).toBe(10));
    });

    it("maps pagination totalPages from total_pages", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.pagination.totalPages).toBe(3));
    });

    it("maps pagination total", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.pagination.total).toBe(25));
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("returns isError=true when getThreatMetadata rejects", async () => {
      vi.mocked(getThreatMetadata).mockRejectedValue(new Error("Metadata error"));
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns isError=true when getThreatEvents rejects", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockRejectedValue(new Error("Events error"));
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns isError=true when getThreatMapEvents rejects", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockRejectedValue(new Error("Map error"));
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns error message from rejected promise", async () => {
      vi.mocked(getThreatMetadata).mockRejectedValue(new Error("500 Server Error"));
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.error?.message).toBe("500 Server Error"));
    });

    it("returns data as undefined on error", async () => {
      vi.mocked(getThreatMetadata).mockRejectedValue(new Error("fail"));
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("returns isLoading=false on error", async () => {
      vi.mocked(getThreatMetadata).mockRejectedValue(new Error("fail"));
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty events array", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue({ success: true, data: [], pagination: { page: 1, page_size: 10, total_pages: 0, total: 0 } });
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events).toEqual([]));
    });

    it("handles empty map markers array", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue({ success: true, data: [], total_events: 0, total_markers: 0 });
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.mapMarkers).toEqual([]));
    });

    it("handles empty metadata arrays", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue({
        success: true, threat_levels: [], event_types: [], sources: [], source_types: [], processing_statuses: [], sort_options: [],
      });
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(result.current.data?.metadata.threatLevels).toEqual([]);
        expect(result.current.data?.metadata.eventTypes).toEqual([]);
      });
    });

    it("handles zero total in pagination", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue({ success: true, data: [], pagination: { page: 1, page_size: 10, total_pages: 0, total: 0 } });
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(result.current.data?.pagination.total).toBe(0);
        expect(result.current.data?.pagination.totalPages).toBe(0);
      });
    });

    it("handles large page number", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue({
        success: true,
        data: [],
        pagination: { page: 100, page_size: 10, total_pages: 100, total: 1000 },
      });
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 100, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.pagination.page).toBe(100));
    });

    it("handles events with all threat levels", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue({
        success: true,
        data: [
          { id: "e1", title: "Low", summary: "S", threat_level: "LOW", event_type: "Test", enriched_at: "2024-01-01", locations: [] },
          { id: "e2", title: "Med", summary: "S", threat_level: "MEDIUM", event_type: "Test", enriched_at: "2024-01-01", locations: [] },
          { id: "e3", title: "High", summary: "S", threat_level: "HIGH", event_type: "Test", enriched_at: "2024-01-01", locations: [] },
          { id: "e4", title: "Crit", summary: "S", threat_level: "CRITICAL", event_type: "Test", enriched_at: "2024-01-01", locations: [] },
        ],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 4 },
      });
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.events).toHaveLength(4));
    });

    it("preserves event order from API response", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue(mockMapResponse);
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(result.current.data?.events[0].id).toBe("evt-001");
        expect(result.current.data?.events[1].id).toBe("evt-002");
      });
    });

    it("handles multiple map markers preserving order", async () => {
      vi.mocked(getThreatMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getThreatEvents).mockResolvedValue(mockEventsResponse);
      vi.mocked(getThreatMapEvents).mockResolvedValue({
        success: true,
        data: [
          { marker_id: "m1", event_id: "e1", title: "T1", threat_level: "LOW", event_type: "Test", location: { name: "L1", lat: 1, lng: 1, role: "primary" } },
          { marker_id: "m2", event_id: "e2", title: "T2", threat_level: "HIGH", event_type: "Test", location: { name: "L2", lat: 2, lng: 2, role: "primary" } },
          { marker_id: "m3", event_id: "e3", title: "T3", threat_level: "CRITICAL", event_type: "Test", location: { name: "L3", lat: 3, lng: 3, role: "primary" } },
        ],
        total_events: 3,
        total_markers: 3,
      });
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(result.current.data?.mapMarkers[0].markerId).toBe("m1");
        expect(result.current.data?.mapMarkers[2].markerId).toBe("m3");
      });
    });
  });

  // ── Filter changes ─────────────────────────────────────────────────────

  describe("filter changes", () => {
    it("refetches when filters change", async () => {
      setAllResolving();
      const { rerender } = renderHook(
        ({ filters }) => useThreats(filters, 1, 10),
        {
          wrapper: createWrapper(),
          initialProps: { filters: defaultFilters },
        },
      );
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(1));
      const newFilters: ThreatFilters = { ...defaultFilters, keyword: "piracy" };
      rerender({ filters: newFilters });
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(2));
    });

    it("refetches when page changes", async () => {
      setAllResolving();
      const { rerender } = renderHook(
        ({ page }) => useThreats(defaultFilters, page, 10),
        {
          wrapper: createWrapper(),
          initialProps: { page: 1 },
        },
      );
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(1));
      rerender({ page: 2 });
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(2));
    });

    it("refetches when pageSize changes", async () => {
      setAllResolving();
      const { rerender } = renderHook(
        ({ pageSize }) => useThreats(defaultFilters, 1, pageSize),
        {
          wrapper: createWrapper(),
          initialProps: { pageSize: 10 },
        },
      );
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(1));
      rerender({ pageSize: 20 });
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(2));
    });

    it("does not refetch when filters are the same object", async () => {
      setAllResolving();
      const { rerender } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(1));
      rerender();
      expect(getThreatEvents).toHaveBeenCalledTimes(1);
    });
  });

  // ── Cache and refetch ──────────────────────────────────────────────────

  describe("cache and refetch", () => {
    it("provides refetch function", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(typeof result.current.refetch).toBe("function"));
    });

    it("refetch re-calls all three API functions", async () => {
      setAllResolving();
      const { result } = renderHook(() => useThreats(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getThreatEvents).toHaveBeenCalledTimes(1));
      await result.current.refetch();
      expect(getThreatMetadata).toHaveBeenCalledTimes(2);
      expect(getThreatEvents).toHaveBeenCalledTimes(2);
      expect(getThreatMapEvents).toHaveBeenCalledTimes(2);
    });
  });
});
