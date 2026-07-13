import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { OverlayAdminApiResponse } from "../../api/overlaysApi";

vi.mock("../../api/overlaysApi", () => ({
  addUrlOverlay: vi.fn(),
}));

import { useAddUrlOverlay } from "../useAddUrlOverlay";
import { addUrlOverlay } from "../../api/overlaysApi";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe("useAddUrlOverlay", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts with isPending false", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });
    it("starts with isError false", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("starts with data undefined", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("starts with error null", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("exposes a mutate function", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });
    it("exposes a reset function", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.reset).toBe("function");
    });
    it("starts with isSuccess false", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });
    it("exposes mutateAsync function", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });
  });

  describe("success state", () => {
    it("calls addUrlOverlay with correct arguments", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "Test", type: "raster", source_type: "url", tile_url: "http://example.com", attribution: "Test", color: "#FF0000", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Test", tileUrl: "http://example.com/tiles", overlayType: "raster", attribution: "Test", color: "#FF0000", opacity: 0.8 });
      await waitFor(() => expect(addUrlOverlay).toHaveBeenCalledWith("Test", "http://example.com/tiles", "raster", "Test", "#FF0000", 0.8));
    });
    it("returns added overlay on success", async () => {
      const response = { id: "1", name: "Test", type: "raster", source_type: "url", tile_url: "http://example.com", attribution: "Test", color: "#FF0000", opacity: 1, created_at: "" };
      vi.mocked(addUrlOverlay).mockResolvedValue(response);
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Test", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data).toEqual(response));
    });
    it("sets isSuccess to true after add", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("sets isPending to false after success", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("sets isError to false after success", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("handles empty attribution", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(addUrlOverlay).toHaveBeenCalledWith("T", "http://example.com", "raster", "", "#FF0000", 1));
    });
    it("handles https URL", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "https://example.com", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "https://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(addUrlOverlay).toHaveBeenCalledWith("T", "https://example.com", "raster", "", "#FF0000", 1));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Add failed"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Invalid URL"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "bad", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toBe("Invalid URL"));
    });
    it("sets isPending to false on error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("handles 400 bad request error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Request failed with status code 400"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "bad", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("400"));
    });
    it("handles 500 server error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles network error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toBe("Network Error"));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("handles 401 unauthorized error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });
  });

  describe("cache invalidation", () => {
    it("invalidates overlays cache on success", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    });
    it("does not invalidate cache on error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("fail"));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears error after reset", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("clears data after reset", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data).toBeDefined());
      result.current.reset();
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });
    it("clears isSuccess after reset", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
  });

  describe("edge cases", () => {
    it("handles empty name", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(addUrlOverlay).toHaveBeenCalledWith("", "http://example.com", "raster", "", "#FF0000", 1));
    });
    it("handles special characters in name", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "O@#$", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "O@#$", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data?.name).toBe("O@#$"));
    });
    it("handles unicode name", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "覆盖", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "覆盖", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data?.name).toBe("覆盖"));
    });
    it("handles very long URL", async () => {
      const longUrl = "http://example.com/" + "a".repeat(1000);
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: longUrl, attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: longUrl, overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(addUrlOverlay).toHaveBeenCalledWith("T", longUrl, "raster", "", "#FF0000", 1));
    });
    it("handles sequential additions", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T1", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      result.current.mutate({ name: "T2", tileUrl: "http://example2.com", overlayType: "vector", attribution: "", color: "#00FF00", opacity: 0.5 });
      await waitFor(() => expect(addUrlOverlay).toHaveBeenCalledTimes(2));
    });
    it("handles very long name", async () => {
      const longName = "a".repeat(500);
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: longName, type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: longName, tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data?.name).toBe(longName));
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount during pending mutation", async () => {
      const neverResolves = new Promise<OverlayAdminApiResponse>(() => {});
      vi.mocked(addUrlOverlay).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns status as idle on mount", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });

    it("returns status as pending during mutation", async () => {
      let resolveMutation!: (v: OverlayAdminApiResponse) => void;
      vi.mocked(addUrlOverlay).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.status).toBe("pending"));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as success after mutation", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after failed mutation", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("returns isIdle as true on mount", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("returns isIdle as false during mutation", async () => {
      let resolveMutation!: (v: OverlayAdminApiResponse) => void;
      vi.mocked(addUrlOverlay).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
    });

    it("mutateAsync resolves with response", async () => {
      const mockResp = { id: "99", name: "async", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" };
      vi.mocked(addUrlOverlay).mockResolvedValue(mockResp);
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      const data = await result.current.mutateAsync({ name: "async", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      expect(data).toEqual(mockResp);
    });

    it("mutateAsync rejects on API failure", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("async fail"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 })).rejects.toThrow("async fail");
    });

    it("returns submittedAt timestamp after mutation", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.submittedAt).toBeGreaterThan(0));
    });

    it("returns isPaused as false on mount", () => {
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(result.current.isPaused).toBe(false);
    });

    it("handles 422 validation error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Request failed with status code 422"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("422"));
    });

    it("handles timeout error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });

    it("handles 401 unauthorized error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });

    it("does not call mutate on mount", () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      expect(addUrlOverlay).not.toHaveBeenCalled();
    });

    it("handles https URL", async () => {
      vi.mocked(addUrlOverlay).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "url", tile_url: "https://example.com", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "https://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(addUrlOverlay).toHaveBeenCalledWith("T", "https://example.com", "raster", "", "#FF0000", 1));
    });

    it("handles 409 conflict error", async () => {
      vi.mocked(addUrlOverlay).mockRejectedValue(new Error("Request failed with status code 409"));
      const { result } = renderHook(() => useAddUrlOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", tileUrl: "http://example.com", overlayType: "raster", attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("409"));
    });
  });
});
