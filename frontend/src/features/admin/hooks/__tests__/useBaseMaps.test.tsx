import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { BaseMapAdminApiResponse } from "../../api/basemapsApi";

vi.mock("../../api/basemapsApi", () => ({
  fetchAdminBaseMaps: vi.fn(),
}));

import { useAdminBaseMaps } from "../useBaseMaps";
import { fetchAdminBaseMaps } from "../../api/basemapsApi";

function makeBaseMap(overrides?: Partial<BaseMapAdminApiResponse>): BaseMapAdminApiResponse {
  return {
    id: "1",
    name: "Test Map",
    type: "raster",
    source_type: "upload",
    tile_url: "http://example.com/tiles/{z}/{x}/{y}.png",
    attribution: "Test Attribution",
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeBaseMaps(count: number): BaseMapAdminApiResponse[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Map ${i + 1}`,
    type: "raster",
    source_type: "upload",
    tile_url: `http://example.com/tiles/${i}/{z}/{x}/{y}.png`,
    attribution: `Attribution ${i + 1}`,
    created_at: "2024-01-01T00:00:00Z",
  }));
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe("useAdminBaseMaps", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts in loading state on mount", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
    });
    it("has undefined data before fetch resolves", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("has isError false on mount", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("has error null on mount", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("calls fetchAdminBaseMaps on mount", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(1));
    });
  });

  describe("success state", () => {
    it("returns base maps data on successful fetch", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue(makeBaseMaps(2));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });
    it("sets isLoading to false after success", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue(makeBaseMaps(1));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
    it("sets isError to false after success", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue(makeBaseMaps(1));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("sets error to null after success", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue(makeBaseMaps(1));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error).toBeNull());
    });
    it("handles empty array response", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toEqual([]));
    });
    it("handles single base map response", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap()]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });
    it("handles large dataset (50 base maps)", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue(makeBaseMaps(50));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(50));
    });
    it("preserves base map fields from response", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap({ name: "Custom Map" })]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe("Custom Map"));
    });
    it("calls fetchAdminBaseMaps exactly once on mount", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(1));
    });
    it("preserves source_type field", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap({ source_type: "url" })]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].sourceType).toBe("url"));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("500"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toBe("Network error"));
    });
    it("sets isLoading to false on error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
    it("keeps data undefined on error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });
    it("handles 500 server error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles network timeout error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("handles 401 unauthorized error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });
  });

  describe("refetch", () => {
    it("refetch re-calls fetchAdminBaseMaps", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(1));
      await result.current.refetch();
      expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(2);
    });
    it("refetch updates data", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValueOnce(makeBaseMaps(1));
      vi.mocked(fetchAdminBaseMaps).mockResolvedValueOnce(makeBaseMaps(5));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
      await result.current.refetch();
      await waitFor(() => expect(result.current.data).toHaveLength(5));
    });
    it("refetch can recover from error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValueOnce(new Error("fail"));
      vi.mocked(fetchAdminBaseMaps).mockResolvedValueOnce(makeBaseMaps(2));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      await result.current.refetch();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("cache behaviour", () => {
    it("does not re-fetch on re-render", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { rerender } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(1));
      rerender();
      expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(1);
    });
    it("multiple hook instances share cache", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue(makeBaseMaps(1));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      renderHook(() => useAdminBaseMaps(), { wrapper });
      await waitFor(() => expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(1));
      renderHook(() => useAdminBaseMaps(), { wrapper });
      expect(fetchAdminBaseMaps).toHaveBeenCalledTimes(1);
    });
  });

  describe("state transitions", () => {
    it("transitions from loading to success", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("transitions from loading to error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("edge cases", () => {
    it("handles base map with empty name", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap({ name: "" })]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe(""));
    });
    it("handles base map with special characters in name", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap({ name: "Map@#$%^&*()" })]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe("Map@#$%^&*()"));
    });
    it("handles base map with unicode name", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap({ name: "地图" })]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe("地图"));
    });
    it("handles base map with very long name", async () => {
      const longName = "a".repeat(500);
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap({ name: longName })]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe(longName));
    });
    it("handles duplicate base map ids", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap(), makeBaseMap()]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(2));
    });
    it("handles base map with empty attribution", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([makeBaseMap({ attribution: "" })]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].attribution).toBe(""));
    });
    it("handles different source_type values", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([
        makeBaseMap({ id: "1", source_type: "upload" }),
        makeBaseMap({ id: "2", source_type: "url" }),
      ]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].sourceType).toBe("upload"));
      expect(result.current.data?.[1].sourceType).toBe("url");
    });
    it("handles different type values", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([
        makeBaseMap({ id: "1", type: "raster" }),
        makeBaseMap({ id: "2", type: "vector" }),
      ]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].type).toBe("raster"));
      expect(result.current.data?.[1].type).toBe("vector");
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount", async () => {
      const neverResolves = new Promise<BaseMapAdminApiResponse[]>(() => {});
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { unmount } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns fetchStatus as fetching on mount", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe("fetching");
    });

    it("returns status as pending on mount", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("pending");
    });

    it("returns status as success after fetch resolves", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after fetch fails", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("exposes refetch function", () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(typeof result.current.refetch).toBe("function");
    });

    it("exposes isFetching flag", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.isFetching).toBe(true);
    });

    it("isFetching is false after success", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it("isFetching is false after error", async () => {
      vi.mocked(fetchAdminBaseMaps).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it("returns isFetched as false before fetch", () => {
      vi.mocked(fetchAdminBaseMaps).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      expect(result.current.isFetched).toBe(false);
    });

    it("returns isFetched as true after fetch", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetched).toBe(true));
    });

    it("returns isFetchedAfterMount as true after fetch", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true));
    });

    it("returns isLoadingError as false on success", async () => {
      vi.mocked(fetchAdminBaseMaps).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminBaseMaps(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingError).toBe(false));
    });
  });
});
