import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/overviewApi", () => ({
  getEventDetail: vi.fn(),
}));

import { getEventDetail } from "../../api/overviewApi";
import { useDashboardEventDetail } from "../useDashboardEventDetail";
import type {
  WorldMonitorEventDetailApiResponse,
  WorldMonitorLocationApiResponse,
  StructuredFieldApiResponse,
} from "../../api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockEventDetail: WorldMonitorEventDetailApiResponse = {
  id: "evt-001",
  title: "Maritime Conflict",
  summary: "A maritime conflict was detected near the Red Sea.",
  threat_level: "HIGH",
  event_type: "Conflict",
  enriched_at: "2024-01-15T10:30:00Z",
  reasoning: "Pattern matches historical conflict zones.",
  relevance_score: 0.92,
  primary_location: { name: "Red Sea", lat: 15.5, lng: 42.3, role: "primary" },
  locations: [{ name: "Red Sea", lat: 15.5, lng: 42.3, role: "primary" }],
  structured_fields: [{ key: "vessels", label: "Vessels Involved", value: "3" }],
  linked_article_preview: {
    id: "art-001",
    title: "Red Sea Tensions Rise",
    summary: "Recent incidents near the Red Sea.",
    image_url: "https://example.com/image.jpg",
    source: "GNews",
    source_type: "gnews",
    tags: [],
    locations: [],
  },
};

describe("useDashboardEventDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns isLoading=true when eventId is provided and fetch is pending", () => {
      vi.mocked(getEventDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoading).toBe(true);
    });

    it("returns isLoading=false when eventId is undefined (query disabled)", () => {
      vi.mocked(getEventDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDashboardEventDetail(undefined), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoading).toBe(false);
    });

    it("returns data as undefined initially", () => {
      vi.mocked(getEventDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      expect(result.current.data).toBeUndefined();
    });

    it("returns isError=false initially", () => {
      vi.mocked(getEventDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      expect(result.current.isError).toBe(false);
    });

    it("returns isFetched=false initially", () => {
      vi.mocked(getEventDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      expect(result.current.isFetched).toBe(false);
    });

    it("does not call getEventDetail when eventId is undefined", () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail(undefined), {
        wrapper: createWrapper(),
      });
      expect(getEventDetail).not.toHaveBeenCalled();
    });

    it("does not call getEventDetail when eventId is empty string", () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail(""), {
        wrapper: createWrapper(),
      });
      expect(getEventDetail).not.toHaveBeenCalled();
    });

    it("does not call getEventDetail when eventId is null", () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail(null as unknown as undefined), {
        wrapper: createWrapper(),
      });
      expect(getEventDetail).not.toHaveBeenCalled();
    });

    it("calls getEventDetail when eventId is provided", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getEventDetail).toHaveBeenCalledWith("evt-001"));
    });

    it("returns fetchStatus as fetching when eventId is provided", () => {
      vi.mocked(getEventDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe("fetching");
    });

    it("returns fetchStatus as idle when eventId is undefined", () => {
      vi.mocked(getEventDetail).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDashboardEventDetail(undefined), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("returns isLoading=false on success", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("returns isError=false on success", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("maps id correctly", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.id).toBe("evt-001"));
    });

    it("maps title correctly", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.title).toBe("Maritime Conflict"));
    });

    it("maps summary correctly", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.summary).toContain("maritime conflict"));
    });

    it("maps threatLevel from threat_level", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.threatLevel).toBe("HIGH"));
    });

    it("maps eventType from event_type", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.eventType).toBe("Conflict"));
    });

    it("maps enrichedAt from enriched_at", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.enrichedAt).toBe("2024-01-15T10:30:00Z"));
    });

    it("maps reasoning correctly", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.reasoning).toContain("Pattern matches"));
    });

    it("maps relevanceScore from relevance_score", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.relevanceScore).toBe(0.92));
    });

    it("maps primaryLocation from primary_location", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.primaryLocation?.name).toBe("Red Sea"));
    });

    it("maps primaryLocation lat", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.primaryLocation?.lat).toBe(15.5));
    });

    it("maps primaryLocation lng", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.primaryLocation?.lng).toBe(42.3));
    });

    it("maps locations array", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.locations).toHaveLength(1));
    });

    it("maps structuredFields array", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.structuredFields).toHaveLength(1));
    });

    it("maps structuredFields key", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.structuredFields?.[0].key).toBe("vessels"));
    });

    it("maps linkedArticlePreview id", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview?.id).toBe("art-001"));
    });

    it("maps linkedArticlePreview imageUrl from image_url", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview?.imageUrl).toBe("https://example.com/image.jpg"));
    });

    it("maps linkedArticlePreview sourceType from source_type", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview?.sourceType).toBe("gnews"));
    });

    it("maps linkedArticlePreview processedContent from processed_content", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        linked_article_preview: {
          ...mockEventDetail.linked_article_preview!,
          processed_content: "Processed text",
        } as any,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview?.processedContent).toBe("Processed text"));
    });

    it("maps linkedArticlePreview rawContent from raw_content", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        linked_article_preview: {
          ...mockEventDetail.linked_article_preview!,
          raw_content: "Raw text",
        } as any,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview?.rawContent).toBe("Raw text"));
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("returns isError=true on API rejection", async () => {
      vi.mocked(getEventDetail).mockRejectedValue(new Error("404 Not Found"));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns error message from rejected promise", async () => {
      vi.mocked(getEventDetail).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.error?.message).toBe("Network error"));
    });

    it("returns data as undefined on error", async () => {
      vi.mocked(getEventDetail).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("returns isLoading=false on error", async () => {
      vi.mocked(getEventDetail).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles event detail without primary_location", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        primary_location: undefined,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.primaryLocation).toBeUndefined());
    });

    it("handles event detail without locations array", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        locations: undefined as unknown as WorldMonitorLocationApiResponse[],
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.locations).toBeUndefined());
    });

    it("handles event detail without structured_fields", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        structured_fields: undefined as unknown as StructuredFieldApiResponse[],
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.structuredFields).toBeUndefined());
    });

    it("handles event detail without linked_article_preview", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        linked_article_preview: undefined,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview).toBeUndefined());
    });

    it("handles event detail without reasoning", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        reasoning: undefined,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.reasoning).toBeUndefined());
    });

    it("handles event detail without relevance_score", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        relevance_score: undefined,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.relevanceScore).toBeUndefined());
    });

    it("handles event detail without enriched_at", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        enriched_at: undefined,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.enrichedAt).toBeUndefined());
    });

    it("handles event detail with empty locations array", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        locations: [],
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.locations).toEqual([]));
    });

    it("handles event detail with empty structured_fields array", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        structured_fields: [],
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.structuredFields).toEqual([]));
    });

    it("handles multiple structured_fields", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        structured_fields: [
          { key: "vessels", label: "Vessels", value: "3" },
          { key: "casualties", label: "Casualties", value: "0" },
          { key: "region", label: "Region", value: "Red Sea" },
        ],
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.structuredFields).toHaveLength(3));
    });

    it("handles multiple locations", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        locations: [
          { name: "Red Sea", lat: 15.5, lng: 42.3, role: "primary" },
          { name: "Gulf of Aden", lat: 12.5, lng: 47.3, role: "secondary" },
        ],
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(result.current.data?.locations).toHaveLength(2);
        expect(result.current.data?.locations?.[1].name).toBe("Gulf of Aden");
      });
    });

    it("handles relevance_score of 0", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        relevance_score: 0,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.relevanceScore).toBe(0));
    });

    it("handles relevance_score of 1.0", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        relevance_score: 1.0,
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.relevanceScore).toBe(1.0));
    });

    it("handles linked_article_preview with tags", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        linked_article_preview: {
          ...mockEventDetail.linked_article_preview!,
          tags: ["conflict", "maritime"],
        },
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview?.tags).toEqual(["conflict", "maritime"]));
    });

    it("handles linked_article_preview with locations", async () => {
      vi.mocked(getEventDetail).mockResolvedValue({
        ...mockEventDetail,
        linked_article_preview: {
          ...mockEventDetail.linked_article_preview!,
          locations: [{ name: "Red Sea", lat: 0, lng: 0, role: "primary" }],
        },
      });
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data?.linkedArticlePreview?.locations).toHaveLength(1));
    });
  });

  // ── Enabled behavior ───────────────────────────────────────────────────

  describe("enabled behavior", () => {
    it("enables query when eventId is a valid string", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getEventDetail).toHaveBeenCalledTimes(1));
    });

    it("disables query when eventId is undefined", () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail(undefined), {
        wrapper: createWrapper(),
      });
      expect(getEventDetail).not.toHaveBeenCalled();
    });

    it("disables query when eventId is empty string", () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail(""), {
        wrapper: createWrapper(),
      });
      expect(getEventDetail).not.toHaveBeenCalled();
    });

    it("calls getEventDetail with the provided eventId", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      renderHook(() => useDashboardEventDetail("evt-999"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getEventDetail).toHaveBeenCalledWith("evt-999"));
    });

    it("returns status as pending when disabled", () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail(undefined), {
        wrapper: createWrapper(),
      });
      expect(result.current.status).toBe("pending");
    });
  });

  // ── Cache and refetch ──────────────────────────────────────────────────

  describe("cache and refetch", () => {
    it("does not refetch on re-render with same eventId", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { rerender } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getEventDetail).toHaveBeenCalledTimes(1));
      rerender();
      expect(getEventDetail).toHaveBeenCalledTimes(1);
    });

    it("provides refetch function", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(typeof result.current.refetch).toBe("function"));
    });

    it("refetch re-calls getEventDetail", async () => {
      vi.mocked(getEventDetail).mockResolvedValue(mockEventDetail);
      const { result } = renderHook(() => useDashboardEventDetail("evt-001"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(getEventDetail).toHaveBeenCalledTimes(1));
      await result.current.refetch();
      expect(getEventDetail).toHaveBeenCalledTimes(2);
    });
  });
});
