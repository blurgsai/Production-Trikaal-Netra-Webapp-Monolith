import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { OverlayAdminApiResponse } from "../../api/overlaysApi";

vi.mock("../../api/overlaysApi", () => ({
  fetchAdminOverlays: vi.fn(),
}));

import { useAdminOverlays } from "../useOverlays";
import { fetchAdminOverlays } from "../../api/overlaysApi";

function makeOverlay(overrides?: Partial<OverlayAdminApiResponse>): OverlayAdminApiResponse {
  return {
    id: "1",
    name: "Test Overlay",
    type: "raster",
    source_type: "upload",
    tile_url: "http://example.com/tiles/{z}/{x}/{y}.png",
    attribution: "Test",
    color: "#FF0000",
    opacity: 1.0,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeOverlays(count: number): OverlayAdminApiResponse[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Overlay ${i + 1}`,
    type: "raster",
    source_type: "upload",
    tile_url: `http://example.com/tiles/${i}/{z}/{x}/{y}.png`,
    attribution: `Attr ${i + 1}`,
    color: "#FF0000",
    opacity: 0.8,
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

describe("useAdminOverlays", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts in loading state on mount", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
    });
    it("has undefined data before fetch resolves", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("has isError false on mount", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("has error null on mount", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("calls fetchAdminOverlays on mount", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchAdminOverlays).toHaveBeenCalledTimes(1));
    });
  });

  describe("success state", () => {
    it("returns overlays data on successful fetch", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue(makeOverlays(2));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });
    it("sets isLoading to false after success", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue(makeOverlays(1));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
    it("sets isError to false after success", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue(makeOverlays(1));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("sets error to null after success", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue(makeOverlays(1));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error).toBeNull());
    });
    it("handles empty array response", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toEqual([]));
    });
    it("handles single overlay response", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay()]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });
    it("handles large dataset (50 overlays)", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue(makeOverlays(50));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(50));
    });
    it("preserves overlay fields from response", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay({ name: "Custom Overlay" })]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe("Custom Overlay"));
    });
    it("preserves color field", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay({ color: "#00FF00" })]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].color).toBe("#00FF00"));
    });
    it("preserves opacity field", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay({ opacity: 0.5 })]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].opacity).toBe(0.5));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("500"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toBe("Network error"));
    });
    it("sets isLoading to false on error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
    it("keeps data undefined on error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });
    it("handles 500 server error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles network timeout error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("handles 401 unauthorized error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });
  });

  describe("refetch", () => {
    it("refetch re-calls fetchAdminOverlays", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchAdminOverlays).toHaveBeenCalledTimes(1));
      await result.current.refetch();
      expect(fetchAdminOverlays).toHaveBeenCalledTimes(2);
    });
    it("refetch updates data", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValueOnce(makeOverlays(1));
      vi.mocked(fetchAdminOverlays).mockResolvedValueOnce(makeOverlays(5));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
      await result.current.refetch();
      await waitFor(() => expect(result.current.data).toHaveLength(5));
    });
    it("refetch can recover from error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValueOnce(new Error("fail"));
      vi.mocked(fetchAdminOverlays).mockResolvedValueOnce(makeOverlays(2));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      await result.current.refetch();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("cache behaviour", () => {
    it("does not re-fetch on re-render", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { rerender } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchAdminOverlays).toHaveBeenCalledTimes(1));
      rerender();
      expect(fetchAdminOverlays).toHaveBeenCalledTimes(1);
    });
    it("multiple hook instances share cache", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue(makeOverlays(1));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      renderHook(() => useAdminOverlays(), { wrapper });
      await waitFor(() => expect(fetchAdminOverlays).toHaveBeenCalledTimes(1));
      renderHook(() => useAdminOverlays(), { wrapper });
      expect(fetchAdminOverlays).toHaveBeenCalledTimes(1);
    });
  });

  describe("state transitions", () => {
    it("transitions from loading to success", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("transitions from loading to error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("edge cases", () => {
    it("handles overlay with empty name", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay({ name: "" })]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe(""));
    });
    it("handles overlay with special characters in name", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay({ name: "Overlay@#$%" })]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe("Overlay@#$%"));
    });
    it("handles overlay with unicode name", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay({ name: "覆盖层" })]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe("覆盖层"));
    });
    it("handles overlay with very long name", async () => {
      const longName = "a".repeat(500);
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay({ name: longName })]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].name).toBe(longName));
    });
    it("handles duplicate overlay ids", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([makeOverlay(), makeOverlay()]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(2));
    });
    it("handles different opacity values", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([
        makeOverlay({ id: "1", opacity: 0 }),
        makeOverlay({ id: "2", opacity: 1 }),
        makeOverlay({ id: "3", opacity: 0.5 }),
      ]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].opacity).toBe(0));
      expect(result.current.data?.[1].opacity).toBe(1);
      expect(result.current.data?.[2].opacity).toBe(0.5);
    });
    it("handles different source_type values", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([
        makeOverlay({ id: "1", source_type: "upload" }),
        makeOverlay({ id: "2", source_type: "url" }),
      ]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].source_type).toBe("upload"));
      expect(result.current.data?.[1].source_type).toBe("url");
    });
    it("handles different color values", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([
        makeOverlay({ id: "1", color: "#FF0000" }),
        makeOverlay({ id: "2", color: "#00FF00" }),
      ]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].color).toBe("#FF0000"));
      expect(result.current.data?.[1].color).toBe("#00FF00");
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount", async () => {
      const neverResolves = new Promise<OverlayAdminApiResponse[]>(() => {});
      vi.mocked(fetchAdminOverlays).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { unmount } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns fetchStatus as fetching on mount", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe("fetching");
    });

    it("returns status as pending on mount", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("pending");
    });

    it("returns status as success after fetch resolves", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after fetch fails", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("exposes refetch function", () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(typeof result.current.refetch).toBe("function");
    });

    it("exposes isFetching flag", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.isFetching).toBe(true);
    });

    it("isFetching is false after success", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it("isFetching is false after error", async () => {
      vi.mocked(fetchAdminOverlays).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it("returns isFetched as false before fetch", () => {
      vi.mocked(fetchAdminOverlays).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      expect(result.current.isFetched).toBe(false);
    });

    it("returns isFetched as true after fetch", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetched).toBe(true));
    });

    it("returns isFetchedAfterMount as true after fetch", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true));
    });

    it("returns isLoadingError as false on success", async () => {
      vi.mocked(fetchAdminOverlays).mockResolvedValue([]);
      const { result } = renderHook(() => useAdminOverlays(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingError).toBe(false));
    });
  });
});
