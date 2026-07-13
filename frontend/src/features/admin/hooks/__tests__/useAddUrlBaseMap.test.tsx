import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { BaseMapAdminApiResponse } from "../../api/basemapsApi";

vi.mock("../../api/basemapsApi", () => ({
  addUrlBaseMap: vi.fn(),
}));

import { useAddUrlBaseMap } from "../useAddUrlBaseMap";
import { addUrlBaseMap } from "../../api/basemapsApi";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe("useAddUrlBaseMap", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts with isPending false", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });
    it("starts with isError false", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("starts with data undefined", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("starts with error null", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("exposes a mutate function", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });
    it("exposes a reset function", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(typeof result.current.reset).toBe("function");
    });
    it("starts with isSuccess false", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });
    it("exposes mutateAsync function", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });
  });

  describe("success state", () => {
    it("calls addUrlBaseMap with name, tileUrl, and attribution", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "Test", type: "raster", source_type: "url", tile_url: "http://example.com", attribution: "Test", created_at: "2024-01-01" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Test Map", tileUrl: "http://example.com/tiles", attribution: "Test Attr" });
      await waitFor(() => expect(addUrlBaseMap).toHaveBeenCalledWith("Test Map", "http://example.com/tiles", "Test Attr"));
    });
    it("returns added base map on success", async () => {
      const response = { id: "1", name: "Test", type: "raster", source_type: "url", tile_url: "http://example.com", attribution: "Test", created_at: "2024-01-01" };
      vi.mocked(addUrlBaseMap).mockResolvedValue(response);
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Test", tileUrl: "http://example.com", attribution: "Test" });
      await waitFor(() => expect(result.current.data).toEqual(response));
    });
    it("sets isSuccess to true after add", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("sets isPending to false after success", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("sets isError to false after success", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("handles empty attribution", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(addUrlBaseMap).toHaveBeenCalledWith("T", "http://example.com", ""));
    });
    it("handles https URL", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "https://example.com", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "https://example.com", attribution: "" });
      await waitFor(() => expect(addUrlBaseMap).toHaveBeenCalledWith("T", "https://example.com", ""));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Add failed"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Invalid URL"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "bad-url", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toBe("Invalid URL"));
    });
    it("sets isPending to false on error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("handles 400 bad request error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Request failed with status code 400"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "bad", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("400"));
    });
    it("handles 500 server error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles network error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toBe("Network Error"));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("handles 401 unauthorized error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });
  });

  describe("cache invalidation", () => {
    it("invalidates basemaps cache on success", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    });
    it("does not invalidate cache on error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("fail"));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears error after reset", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("clears data after reset", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.data).toBeDefined());
      result.current.reset();
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });
    it("clears isSuccess after reset", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
  });

  describe("edge cases", () => {
    it("handles empty name", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(addUrlBaseMap).toHaveBeenCalledWith("", "http://example.com", ""));
    });
    it("handles special characters in name", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "Map@#$", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Map@#$", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.data?.name).toBe("Map@#$"));
    });
    it("handles unicode name", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "地图", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "地图", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.data?.name).toBe("地图"));
    });
    it("handles very long URL", async () => {
      const longUrl = "http://example.com/" + "a".repeat(1000);
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: longUrl, attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: longUrl, attribution: "" });
      await waitFor(() => expect(addUrlBaseMap).toHaveBeenCalledWith("T", longUrl, ""));
    });
    it("handles sequential additions", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T1", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      result.current.mutate({ name: "T2", tileUrl: "http://example2.com", attribution: "" });
      await waitFor(() => expect(addUrlBaseMap).toHaveBeenCalledTimes(2));
    });
    it("handles very long name", async () => {
      const longName = "a".repeat(500);
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: longName, type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: longName, tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.data?.name).toBe(longName));
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount during pending mutation", async () => {
      const neverResolves = new Promise<BaseMapAdminApiResponse>(() => {});
      vi.mocked(addUrlBaseMap).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns status as idle on mount", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });

    it("returns status as pending during mutation", async () => {
      let resolveMutation!: (v: BaseMapAdminApiResponse) => void;
      vi.mocked(addUrlBaseMap).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.status).toBe("pending"));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as success after mutation", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after failed mutation", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("returns isIdle as true on mount", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("returns isIdle as false during mutation", async () => {
      let resolveMutation!: (v: BaseMapAdminApiResponse) => void;
      vi.mocked(addUrlBaseMap).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
    });

    it("mutateAsync resolves with response", async () => {
      const mockResp = { id: "99", name: "async", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" };
      vi.mocked(addUrlBaseMap).mockResolvedValue(mockResp);
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      const data = await result.current.mutateAsync({ name: "async", tileUrl: "http://example.com", attribution: "" });
      expect(data).toEqual(mockResp);
    });

    it("mutateAsync rejects on API failure", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("async fail"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync({ name: "T", tileUrl: "http://example.com", attribution: "" })).rejects.toThrow("async fail");
    });

    it("returns submittedAt timestamp after mutation", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.submittedAt).toBeGreaterThan(0));
    });

    it("returns isPaused as false on mount", () => {
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isPaused).toBe(false);
    });

    it("handles 422 validation error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Request failed with status code 422"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("422"));
    });

    it("handles timeout error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });

    it("handles 401 unauthorized error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });

    it("does not call mutate on mount", () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", created_at: "" });
      renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      expect(addUrlBaseMap).not.toHaveBeenCalled();
    });

    it("handles https URL", async () => {
      vi.mocked(addUrlBaseMap).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "https://example.com", attribution: "", created_at: "" });
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "https://example.com", attribution: "" });
      await waitFor(() => expect(addUrlBaseMap).toHaveBeenCalledWith("T", "https://example.com", ""));
    });

    it("handles 409 conflict error", async () => {
      vi.mocked(addUrlBaseMap).mockRejectedValue(new Error("Request failed with status code 409"));
      const { result } = renderHook(() => useAddUrlBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("409"));
    });
  });
});
