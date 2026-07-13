import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { OverlayAdminApiResponse } from "../../api/overlaysApi";

vi.mock("../../api/overlaysApi", () => ({
  uploadOverlayFile: vi.fn(),
}));

import { useUploadOverlay } from "../useUploadOverlay";
import { uploadOverlayFile } from "../../api/overlaysApi";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

function makeFile(name = "overlay.geojson", size = 1024): File {
  return new File([new ArrayBuffer(size)], name, { type: "application/geo+json" });
}

describe("useUploadOverlay", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts with isPending false", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });
    it("starts with isError false", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("starts with data undefined", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("starts with error null", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("exposes a mutate function", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });
    it("exposes a reset function", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.reset).toBe("function");
    });
    it("starts with isSuccess false", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });
    it("exposes mutateAsync function", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });
  });

  describe("success state", () => {
    it("calls uploadOverlayFile with correct arguments", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "Test", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "#FF0000", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      const file = makeFile();
      result.current.mutate({ name: "Test Overlay", file, attribution: "Test", color: "#FF0000", opacity: 0.8 });
      await waitFor(() => expect(uploadOverlayFile).toHaveBeenCalledWith("Test Overlay", file, "Test", "#FF0000", 0.8));
    });
    it("returns uploaded overlay on success", async () => {
      const response = { id: "1", name: "Test", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "#FF0000", opacity: 1, created_at: "" };
      vi.mocked(uploadOverlayFile).mockResolvedValue(response);
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Test", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data).toEqual(response));
    });
    it("sets isSuccess to true after upload", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("sets isPending to false after success", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("handles opacity of 0", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 0, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 0 });
      await waitFor(() => expect(uploadOverlayFile).toHaveBeenCalledWith("T", expect.any(File), "", "#FF0000", 0));
    });
    it("handles opacity of 1", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(uploadOverlayFile).toHaveBeenCalledWith("T", expect.any(File), "", "#FF0000", 1));
    });
    it("handles large file upload", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "Large", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      const largeFile = makeFile("large.geojson", 10 * 1024 * 1024);
      result.current.mutate({ name: "Large", file: largeFile, attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("Upload failed"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("File too large"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toBe("File too large"));
    });
    it("sets isPending to false on error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("handles 413 payload too large error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("Request failed with status code 413"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("413"));
    });
    it("handles 500 server error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles network error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toBe("Network Error"));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("handles 401 unauthorized error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });
  });

  describe("cache invalidation", () => {
    it("invalidates overlays cache on success", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useUploadOverlay(), { wrapper });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    });
    it("does not invalidate cache on error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("fail"));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useUploadOverlay(), { wrapper });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears error after reset", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isError).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("clears data after reset", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data).toBeDefined());
      result.current.reset();
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });
    it("clears isSuccess after reset", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
  });

  describe("edge cases", () => {
    it("handles empty name", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(uploadOverlayFile).toHaveBeenCalledWith("", expect.any(File), "", "#FF0000", 1));
    });
    it("handles special characters in name", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "O@#$", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "O@#$", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data?.name).toBe("O@#$"));
    });
    it("handles unicode name", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "覆盖", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "覆盖", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data?.name).toBe("覆盖"));
    });
    it("handles different file types", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      const shpFile = new File([new ArrayBuffer(100)], "overlay.shp", { type: "application/octet-stream" });
      result.current.mutate({ name: "T", file: shpFile, attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(uploadOverlayFile).toHaveBeenCalledWith("T", shpFile, "", "#FF0000", 1));
    });
    it("handles sequential uploads", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T1", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      result.current.mutate({ name: "T2", file: makeFile(), attribution: "", color: "#00FF00", opacity: 0.5 });
      await waitFor(() => expect(uploadOverlayFile).toHaveBeenCalledTimes(2));
    });
    it("handles very long name", async () => {
      const longName = "a".repeat(500);
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: longName, type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: longName, file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.data?.name).toBe(longName));
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount during pending mutation", async () => {
      const neverResolves = new Promise<OverlayAdminApiResponse>(() => {});
      vi.mocked(uploadOverlayFile).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns status as idle on mount", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });

    it("returns status as pending during mutation", async () => {
      let resolveMutation!: (v: OverlayAdminApiResponse) => void;
      vi.mocked(uploadOverlayFile).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.status).toBe("pending"));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as success after mutation", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after failed mutation", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("returns isIdle as true on mount", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("returns isIdle as false during mutation", async () => {
      let resolveMutation!: (v: OverlayAdminApiResponse) => void;
      vi.mocked(uploadOverlayFile).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
    });

    it("mutateAsync resolves with response", async () => {
      const mockResp = { id: "99", name: "async", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" };
      vi.mocked(uploadOverlayFile).mockResolvedValue(mockResp);
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      const data = await result.current.mutateAsync({ name: "async", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      expect(data).toEqual(mockResp);
    });

    it("mutateAsync rejects on API failure", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("async fail"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 })).rejects.toThrow("async fail");
    });

    it("returns submittedAt timestamp after mutation", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.submittedAt).toBeGreaterThan(0));
    });

    it("returns isPaused as false on mount", () => {
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(result.current.isPaused).toBe(false);
    });

    it("handles 422 validation error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("Request failed with status code 422"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("422"));
    });

    it("handles timeout error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });

    it("handles 401 unauthorized error", async () => {
      vi.mocked(uploadOverlayFile).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });

    it("does not call mutate on mount", () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      expect(uploadOverlayFile).not.toHaveBeenCalled();
    });

    it("handles opacity 0", async () => {
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 0, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "", color: "#FF0000", opacity: 0 });
      await waitFor(() => expect(uploadOverlayFile).toHaveBeenCalledWith("T", expect.any(File), "", "#FF0000", 0));
    });

    it("handles large file upload", async () => {
      const largeFile = new File(new Array(1024).fill("x"), "large.tif", { type: "image/tiff" });
      vi.mocked(uploadOverlayFile).mockResolvedValue({ id: "1", name: "large", type: "raster", source_type: "upload", tile_url: "", attribution: "", color: "", opacity: 1, created_at: "" });
      const { result } = renderHook(() => useUploadOverlay(), { wrapper: createWrapper() });
      result.current.mutate({ name: "large", file: largeFile, attribution: "", color: "#FF0000", opacity: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
