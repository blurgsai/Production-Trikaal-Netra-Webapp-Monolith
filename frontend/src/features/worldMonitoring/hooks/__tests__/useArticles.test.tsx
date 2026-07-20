import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/articlesApi", () => ({
  getArticles: vi.fn(),
  getArticleMetadata: vi.fn(),
}));

import { getArticles, getArticleMetadata } from "../../api/articlesApi";
import { useArticles } from "../useArticles";
import type { ArticleFilters } from "../../model/types";
import type {
  WorldMonitorArticleListApiResponse,
  WorldMonitorMetadataApiResponse,
} from "../../api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const defaultFilters: ArticleFilters = {
  search: "",
  source: "",
  processingStatus: "",
};

const mockMetadata: WorldMonitorMetadataApiResponse = {
  success: true,
  sources: ["GNews", "Reuters", "BBC"],
  source_types: [],
  processing_statuses: ["processed", "pending", "failed"],
  event_types: [],
  threat_levels: [],
  sort_options: [],
};

const mockArticlesResponse: WorldMonitorArticleListApiResponse = {
  success: true,
  data: [
    {
      id: "art-001",
      title: "Red Sea Tensions Rise",
      summary: "Recent incidents near the Red Sea have escalated.",
      source: "GNews",
      source_type: "gnews",
      image_url: "https://example.com/image1.jpg",
      processing_status: "processed",
      published: "2024-01-15T10:30:00Z",
      linked_event_count: 3,
      location_count: 1,
      tags: ["conflict", "maritime"],
      author: "John Doe",
    },
    {
      id: "art-002",
      title: "Gulf of Aden Piracy Report",
      summary: "Piracy incidents reported in the Gulf of Aden.",
      source: "Reuters",
      source_type: "reuters",
      image_url: "https://example.com/image2.jpg",
      processing_status: "pending",
      published: "2024-01-14T08:00:00Z",
      linked_event_count: 1,
      location_count: 1,
      tags: ["piracy"],
      author: "Jane Smith",
    },
  ],
  pagination: { page: 1, page_size: 10, total_pages: 5, total: 50 },
};

function setAllResolving() {
  vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
  vi.mocked(getArticles).mockResolvedValue(mockArticlesResponse);
}

function setAllPending() {
  vi.mocked(getArticleMetadata).mockReturnValue(new Promise(() => {}));
  vi.mocked(getArticles).mockReturnValue(new Promise(() => {}));
}

describe("useArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns isLoading=true on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      expect(result.current.isLoading).toBe(true);
    });

    it("returns data as undefined on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      expect(result.current.data).toBeUndefined();
    });

    it("returns isError=false on first render", () => {
      setAllPending();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), {
        wrapper: createWrapper(),
      });
      expect(result.current.isError).toBe(false);
    });

    it("calls getArticleMetadata on mount", async () => {
      setAllResolving();
      renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticleMetadata).toHaveBeenCalledTimes(1));
    });

    it("calls getArticles on mount", async () => {
      setAllResolving();
      renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(1));
    });

    it("calls both API functions in parallel via Promise.all", async () => {
      setAllResolving();
      renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getArticleMetadata).toHaveBeenCalledTimes(1);
        expect(getArticles).toHaveBeenCalledTimes(1);
      });
    });

    it("passes filters, page, and pageSize to getArticles", async () => {
      setAllResolving();
      renderHook(() => useArticles(defaultFilters, 2, 20), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticles).toHaveBeenCalledWith(defaultFilters, 2, 20));
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("returns isLoading=false on success", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("returns isError=false on success", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("maps metadata sources", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.metadata.sources).toEqual(["GNews", "Reuters", "BBC"]));
    });

    it("maps metadata processingStatuses from processing_statuses", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.metadata.processingStatuses).toEqual(["processed", "pending", "failed"]));
    });

    it("maps articles array with correct length", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles).toHaveLength(2));
    });

    it("maps article id correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].id).toBe("art-001"));
    });

    it("maps article title correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].title).toBe("Red Sea Tensions Rise"));
    });

    it("maps article summary correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].summary).toContain("Red Sea"));
    });

    it("maps article source correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].source).toBe("GNews"));
    });

    it("maps article sourceType from source_type", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].sourceType).toBe("gnews"));
    });

    it("maps article imageUrl from image_url", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].imageUrl).toBe("https://example.com/image1.jpg"));
    });

    it("maps article processingStatus from processing_status", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].processingStatus).toBe("processed"));
    });

    it("maps article published correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].published).toBe("2024-01-15T10:30:00Z"));
    });

    it("maps article linkedEventCount from linked_event_count", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].linkedEventCount).toBe(3));
    });

    it("maps article tags correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].tags).toEqual(["conflict", "maritime"]));
    });

    it("maps article author correctly", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].author).toBe("John Doe"));
    });

    it("maps pagination page", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.pagination.page).toBe(1));
    });

    it("maps pagination pageSize from page_size", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.pagination.pageSize).toBe(10));
    });

    it("maps pagination totalPages from total_pages", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.pagination.totalPages).toBe(5));
    });

    it("maps pagination total", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.pagination.total).toBe(50));
    });

    it("preserves article order from API response", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.articles[0].id).toBe("art-001");
        expect(result.current.data?.articles[1].id).toBe("art-002");
      });
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("returns isError=true when getArticleMetadata rejects", async () => {
      vi.mocked(getArticleMetadata).mockRejectedValue(new Error("Metadata error"));
      vi.mocked(getArticles).mockResolvedValue(mockArticlesResponse);
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns isError=true when getArticles rejects", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockRejectedValue(new Error("Articles error"));
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns error message from rejected promise", async () => {
      vi.mocked(getArticleMetadata).mockRejectedValue(new Error("500 Server Error"));
      vi.mocked(getArticles).mockResolvedValue(mockArticlesResponse);
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toBe("500 Server Error"));
    });

    it("returns data as undefined on error", async () => {
      vi.mocked(getArticleMetadata).mockRejectedValue(new Error("fail"));
      vi.mocked(getArticles).mockResolvedValue(mockArticlesResponse);
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("returns isLoading=false on error", async () => {
      vi.mocked(getArticleMetadata).mockRejectedValue(new Error("fail"));
      vi.mocked(getArticles).mockResolvedValue(mockArticlesResponse);
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty articles array", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({ success: true, data: [], pagination: { page: 1, page_size: 10, total_pages: 0, total: 0 } });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles).toEqual([]));
    });

    it("handles empty metadata arrays", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue({ success: true, sources: [], source_types: [], processing_statuses: [], event_types: [], threat_levels: [], sort_options: [] });
      vi.mocked(getArticles).mockResolvedValue(mockArticlesResponse);
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.metadata.sources).toEqual([]);
        expect(result.current.data?.metadata.processingStatuses).toEqual([]);
      });
    });

    it("handles article without optional fields", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [{ id: "art-min", title: "Minimal Article" }],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 1 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.articles[0].summary).toBeUndefined();
        expect(result.current.data?.articles[0].source).toBeUndefined();
        expect(result.current.data?.articles[0].imageUrl).toBeUndefined();
      });
    });

    it("handles article with missing linked_event_count, defaults to 0", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [{ id: "art-no-count", title: "No Count" }],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 1 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].linkedEventCount).toBe(0));
    });

    it("handles article with missing tags, defaults to empty array", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [{ id: "art-no-tags", title: "No Tags" }],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 1 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].tags).toEqual([]));
    });

    it("handles zero total in pagination", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({ success: true, data: [], pagination: { page: 1, page_size: 10, total_pages: 0, total: 0 } });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.pagination.total).toBe(0);
        expect(result.current.data?.pagination.totalPages).toBe(0);
      });
    });

    it("handles large page number", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [],
        pagination: { page: 100, page_size: 10, total_pages: 100, total: 1000 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 100, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.pagination.page).toBe(100));
    });

    it("handles article with empty tags array", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [{ id: "art-empty-tags", title: "Empty Tags", tags: [] }],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 1 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].tags).toEqual([]));
    });

    it("handles article with many tags", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [{ id: "art-many-tags", title: "Many Tags", tags: ["a", "b", "c", "d", "e", "f", "g", "h"] }],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 1 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].tags).toHaveLength(8));
    });

    it("handles article with null image_url", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [{ id: "art-null-img", title: "Null Image", image_url: null as unknown as undefined }],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 1 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.articles[0].imageUrl).toBeNull());
    });

    it("handles multiple articles preserving order", async () => {
      vi.mocked(getArticleMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getArticles).mockResolvedValue({
        success: true,
        data: [
          { id: "a1", title: "A1" },
          { id: "a2", title: "A2" },
          { id: "a3", title: "A3" },
        ],
        pagination: { page: 1, page_size: 10, total_pages: 1, total: 3 },
      });
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.data?.articles[0].id).toBe("a1");
        expect(result.current.data?.articles[2].id).toBe("a3");
      });
    });
  });

  // ── Filter changes ─────────────────────────────────────────────────────

  describe("filter changes", () => {
    it("refetches when filters change", async () => {
      setAllResolving();
      const { rerender } = renderHook(
        ({ filters }) => useArticles(filters, 1, 10),
        { wrapper: createWrapper(), initialProps: { filters: defaultFilters } },
      );
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(1));
      const newFilters: ArticleFilters = { ...defaultFilters, search: "piracy" };
      rerender({ filters: newFilters });
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(2));
    });

    it("refetches when page changes", async () => {
      setAllResolving();
      const { rerender } = renderHook(
        ({ page }) => useArticles(defaultFilters, page, 10),
        { wrapper: createWrapper(), initialProps: { page: 1 } },
      );
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(1));
      rerender({ page: 2 });
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(2));
    });

    it("refetches when pageSize changes", async () => {
      setAllResolving();
      const { rerender } = renderHook(
        ({ pageSize }) => useArticles(defaultFilters, 1, pageSize),
        { wrapper: createWrapper(), initialProps: { pageSize: 10 } },
      );
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(1));
      rerender({ pageSize: 20 });
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(2));
    });

    it("does not refetch when filters are the same object", async () => {
      setAllResolving();
      const { rerender } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(1));
      rerender();
      expect(getArticles).toHaveBeenCalledTimes(1);
    });
  });

  // ── Cache and refetch ──────────────────────────────────────────────────

  describe("cache and refetch", () => {
    it("provides refetch function", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(typeof result.current.refetch).toBe("function"));
    });

    it("refetch re-calls both API functions", async () => {
      setAllResolving();
      const { result } = renderHook(() => useArticles(defaultFilters, 1, 10), { wrapper: createWrapper() });
      await waitFor(() => expect(getArticles).toHaveBeenCalledTimes(1));
      await result.current.refetch();
      expect(getArticleMetadata).toHaveBeenCalledTimes(2);
      expect(getArticles).toHaveBeenCalledTimes(2);
    });
  });
});
