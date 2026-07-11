import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/articlesApi", () => ({
  getArticleDetail: vi.fn(),
}));

import { getArticleDetail } from "../../api/articlesApi";
import { useArticleDetail } from "../useArticleDetail";
import type { WorldMonitorArticleDetailApiResponse, WorldMonitorEventListItemApiResponse, WorldMonitorLocationApiResponse } from "../../api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockArticleDetail: WorldMonitorArticleDetailApiResponse = {
  id: "art-001",
  title: "Red Sea Tensions Rise",
  summary: "Recent incidents near the Red Sea have escalated.",
  source: "GNews",
  source_type: "gnews",
  image_url: "https://example.com/image.jpg",
  author: "John Doe",
  published: "2024-01-15T10:30:00Z",
  processing_status: "processed",
  raw_content: "Raw article content here.",
  processed_content: "Processed article content here.",
  link: "https://gnews.com/article/123",
  tags: ["conflict", "maritime", "Red Sea"],
  linked_event_count: 2,
  location_count: 2,
  linked_events: [
    { id: "evt-001", title: "Red Sea Conflict", summary: "Maritime conflict detected.", threat_level: "HIGH", event_type: "Conflict", locations: [] },
    { id: "evt-002", title: "Naval Incident", summary: "Naval incident reported.", threat_level: "MEDIUM", event_type: "Piracy", locations: [] },
  ],
  locations: [{ name: "Red Sea", lat: 0, lng: 0, role: "primary" }, { name: "Gulf of Aden", lat: 0, lng: 0, role: "secondary" }],
};

describe("useArticleDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns isLoading=true when articleId is provided and fetch is pending", () => {
      vi.mocked(getArticleDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
    });

    it("returns isLoading=false when articleId is undefined (query disabled)", () => {
      vi.mocked(getArticleDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useArticleDetail(undefined), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(false);
    });

    it("returns data as undefined initially", () => {
      vi.mocked(getArticleDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });

    it("returns isError=false initially", () => {
      vi.mocked(getArticleDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });

    it("does not call getArticleDetail when articleId is undefined", () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      renderHook(() => useArticleDetail(undefined), { wrapper: createWrapper() });
      expect(getArticleDetail).not.toHaveBeenCalled();
    });

    it("does not call getArticleDetail when articleId is empty string", () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      renderHook(() => useArticleDetail(""), { wrapper: createWrapper() });
      expect(getArticleDetail).not.toHaveBeenCalled();
    });

    it("calls getArticleDetail when articleId is provided", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticleDetail).toHaveBeenCalledWith("art-001"));
    });

    it("returns fetchStatus as fetching when articleId is provided", () => {
      vi.mocked(getArticleDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe("fetching");
    });

    it("returns fetchStatus as idle when articleId is undefined", () => {
      vi.mocked(getArticleDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useArticleDetail(undefined), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("returns isLoading=false on success", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("returns isError=false on success", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("maps id correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.id).toBe("art-001"));
    });

    it("maps title correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.title).toBe("Red Sea Tensions Rise"));
    });

    it("maps summary correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary).toContain("Red Sea"));
    });

    it("maps source correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.source).toBe("GNews"));
    });

    it("maps sourceType from source_type", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.sourceType).toBe("gnews"));
    });

    it("maps imageUrl from image_url", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.imageUrl).toBe("https://example.com/image.jpg"));
    });

    it("maps author correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.author).toBe("John Doe"));
    });

    it("maps published correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.published).toBe("2024-01-15T10:30:00Z"));
    });

    it("maps processingStatus from processing_status", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.processingStatus).toBe("processed"));
    });

    it("maps rawContent from raw_content", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.rawContent).toBe("Raw article content here."));
    });

    it("maps processedContent from processed_content", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.processedContent).toBe("Processed article content here."));
    });

    it("maps link correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.link).toBe("https://gnews.com/article/123"));
    });

    it("maps tags correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.tags).toEqual(["conflict", "maritime", "Red Sea"]));
    });

    it("maps linkedEvents array with correct length", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents).toHaveLength(2));
    });

    it("maps linkedEvent id correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents[0].id).toBe("evt-001"));
    });

    it("maps linkedEvent title correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents[0].title).toBe("Red Sea Conflict"));
    });

    it("maps linkedEvent threatLevel from threat_level", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents[0].threatLevel).toBe("HIGH"));
    });

    it("maps linkedEvent eventType from event_type", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents[0].eventType).toBe("Conflict"));
    });

    it("maps locations array with correct length", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.locations).toHaveLength(2));
    });

    it("maps location name correctly", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.locations[0].name).toBe("Red Sea"));
    });

    it("preserves linkedEvents order", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.linkedEvents[0].id).toBe("evt-001");
        expect(result.current.data?.linkedEvents[1].id).toBe("evt-002");
      });
    });

    it("preserves locations order", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.locations[0].name).toBe("Red Sea");
        expect(result.current.data?.locations[1].name).toBe("Gulf of Aden");
      });
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("returns isError=true on API rejection", async () => {
      vi.mocked(getArticleDetail).mockRejectedValue(new Error("404 Not Found"));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns error message from rejected promise", async () => {
      vi.mocked(getArticleDetail).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toBe("Network error"));
    });

    it("returns data as undefined on error", async () => {
      vi.mocked(getArticleDetail).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("returns isLoading=false on error", async () => {
      vi.mocked(getArticleDetail).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles article detail without linked_events, defaults to empty array", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, linked_events: undefined as unknown as WorldMonitorEventListItemApiResponse[] });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents).toEqual([]));
    });

    it("handles article detail without locations, defaults to empty array", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, locations: undefined as unknown as WorldMonitorLocationApiResponse[] });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.locations).toEqual([]));
    });

    it("handles article detail without tags, defaults to empty array", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, tags: undefined as unknown as string[] });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.tags).toEqual([]));
    });

    it("handles empty linked_events array", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, linked_events: [] });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents).toEqual([]));
    });

    it("handles empty locations array", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, locations: [] });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.locations).toEqual([]));
    });

    it("handles empty tags array", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, tags: [] });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.tags).toEqual([]));
    });

    it("handles article detail without summary", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, summary: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.summary).toBeUndefined());
    });

    it("handles article detail without source", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, source: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.source).toBeUndefined());
    });

    it("handles article detail without image_url", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, image_url: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.imageUrl).toBeUndefined());
    });

    it("handles article detail without author", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, author: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.author).toBeUndefined());
    });

    it("handles article detail without published", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, published: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.published).toBeUndefined());
    });

    it("handles article detail without processing_status", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, processing_status: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.processingStatus).toBeUndefined());
    });

    it("handles article detail without raw_content", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, raw_content: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.rawContent).toBeUndefined());
    });

    it("handles article detail without processed_content", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, processed_content: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.processedContent).toBeUndefined());
    });

    it("handles article detail without link", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({ ...mockArticleDetail, link: undefined });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.link).toBeUndefined());
    });

    it("handles linked_event without summary", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({
        ...mockArticleDetail,
        linked_events: [{ id: "evt-003", title: "No Summary", threat_level: "LOW", event_type: "Test", locations: [] } as any],
      });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.linkedEvents[0].summary).toBeUndefined());
    });

    it("handles multiple linked_events preserving order", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({
        ...mockArticleDetail,
        linked_events: [
          { id: "e1", title: "E1", threat_level: "LOW", event_type: "A", locations: [] } as any,
          { id: "e2", title: "E2", threat_level: "HIGH", event_type: "B", locations: [] } as any,
          { id: "e3", title: "E3", threat_level: "CRITICAL", event_type: "C", locations: [] } as any,
        ],
      });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.linkedEvents[0].id).toBe("e1");
        expect(result.current.data?.linkedEvents[2].id).toBe("e3");
      });
    });

    it("handles multiple locations preserving order", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({
        ...mockArticleDetail,
        locations: [{ name: "L1", lat: 0, lng: 0, role: "primary" }, { name: "L2", lat: 0, lng: 0, role: "secondary" }, { name: "L3", lat: 0, lng: 0, role: "secondary" }],
      });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.locations[0].name).toBe("L1");
        expect(result.current.data?.locations[2].name).toBe("L3");
      });
    });

    it("handles many tags", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue({
        ...mockArticleDetail,
        tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
      });
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.tags).toHaveLength(10));
    });
  });

  // ── Enabled behavior ───────────────────────────────────────────────────

  describe("enabled behavior", () => {
    it("enables query when articleId is a valid string", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticleDetail).toHaveBeenCalledTimes(1));
    });

    it("disables query when articleId is undefined", () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      renderHook(() => useArticleDetail(undefined), { wrapper: createWrapper() });
      expect(getArticleDetail).not.toHaveBeenCalled();
    });

    it("disables query when articleId is empty string", () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      renderHook(() => useArticleDetail(""), { wrapper: createWrapper() });
      expect(getArticleDetail).not.toHaveBeenCalled();
    });

    it("calls getArticleDetail with the provided articleId", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      renderHook(() => useArticleDetail("art-999"), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticleDetail).toHaveBeenCalledWith("art-999"));
    });
  });

  // ── Cache and refetch ──────────────────────────────────────────────────

  describe("cache and refetch", () => {
    it("does not refetch on re-render with same articleId", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { rerender } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticleDetail).toHaveBeenCalledTimes(1));
      rerender();
      expect(getArticleDetail).toHaveBeenCalledTimes(1);
    });

    it("provides refetch function", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(typeof result.current.refetch).toBe("function"));
    });

    it("refetch re-calls getArticleDetail", async () => {
      vi.mocked(getArticleDetail).mockResolvedValue(mockArticleDetail);
      const { result } = renderHook(() => useArticleDetail("art-001"), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticleDetail).toHaveBeenCalledTimes(1));
      await result.current.refetch();
      expect(getArticleDetail).toHaveBeenCalledTimes(2);
    });
  });
});
