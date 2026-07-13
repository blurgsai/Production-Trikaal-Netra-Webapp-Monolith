import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { BaseMapAdminApiResponse } from "../../api/basemapsApi";

vi.mock("../../api/basemapsApi", () => ({
  uploadBaseMapFile: vi.fn(),
}));

import { useUploadBaseMap } from "../useUploadBaseMap";
import { uploadBaseMapFile } from "../../api/basemapsApi";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

function makeFile(name = "test.png", size = 1024): File {
  return new File([new ArrayBuffer(size)], name, { type: "image/png" });
}

describe("useUploadBaseMap", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts with isPending false", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });
    it("starts with isError false", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("starts with data undefined", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("starts with error null", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("exposes a mutate function", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });
    it("exposes a reset function", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(typeof result.current.reset).toBe("function");
    });
    it("starts with isSuccess false", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });
    it("exposes mutateAsync function", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });
  });

  describe("success state", () => {
    it("calls uploadBaseMapFile with name, file, and attribution", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "Test", type: "raster", source_type: "upload", tile_url: "http://example.com", attribution: "Test", created_at: "2024-01-01" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      const file = makeFile();
      result.current.mutate({ name: "Test Map", file, attribution: "Test Attr" });
      await waitFor(() => expect(uploadBaseMapFile).toHaveBeenCalledWith("Test Map", file, "Test Attr"));
    });
    it("returns uploaded base map on success", async () => {
      const response = { id: "1", name: "Test", type: "raster", source_type: "upload", tile_url: "http://example.com", attribution: "Test", created_at: "2024-01-01" };
      vi.mocked(uploadBaseMapFile).mockResolvedValue(response);
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Test Map", file: makeFile(), attribution: "Test" });
      await waitFor(() => expect(result.current.data).toEqual(response));
    });
    it("sets isSuccess to true after upload", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("sets isPending to false after success", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("sets isError to false after success", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("handles large file upload", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "Large", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      const largeFile = makeFile("large.tif", 10 * 1024 * 1024);
      result.current.mutate({ name: "Large", file: largeFile, attribution: "Test" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("handles empty attribution", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(uploadBaseMapFile).toHaveBeenCalledWith("T", expect.any(File), ""));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("Upload failed"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("File too large"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toBe("File too large"));
    });
    it("sets isPending to false on error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("handles 413 payload too large error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("Request failed with status code 413"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("413"));
    });
    it("handles 500 server error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles network error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toBe("Network Error"));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("handles 401 unauthorized error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });
  });

  describe("cache invalidation", () => {
    it("invalidates basemaps cache on success", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    });
    it("does not invalidate cache on error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("fail"));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears error after reset", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isError).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("clears data after reset", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.data).toBeDefined());
      result.current.reset();
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });
    it("clears isSuccess after reset", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
  });

  describe("edge cases", () => {
    it("handles empty name", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "", file: makeFile(), attribution: "" });
      await waitFor(() => expect(uploadBaseMapFile).toHaveBeenCalledWith("", expect.any(File), ""));
    });
    it("handles special characters in name", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "Map@#$", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "Map@#$", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.data?.name).toBe("Map@#$"));
    });
    it("handles unicode name", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "地图", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "地图", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.data?.name).toBe("地图"));
    });
    it("handles different file types", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      const tifFile = new File([new ArrayBuffer(100)], "map.tif", { type: "image/tiff" });
      result.current.mutate({ name: "T", file: tifFile, attribution: "" });
      await waitFor(() => expect(uploadBaseMapFile).toHaveBeenCalledWith("T", tifFile, ""));
    });
    it("handles sequential uploads", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T1", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      result.current.mutate({ name: "T2", file: makeFile(), attribution: "" });
      await waitFor(() => expect(uploadBaseMapFile).toHaveBeenCalledTimes(2));
    });
    it("handles very long name", async () => {
      const longName = "a".repeat(500);
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: longName, type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: longName, file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.data?.name).toBe(longName));
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount during pending mutation", async () => {
      const neverResolves = new Promise<BaseMapAdminApiResponse>(() => {});
      vi.mocked(uploadBaseMapFile).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns status as idle on mount", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });

    it("returns status as pending during mutation", async () => {
      let resolveMutation!: (v: BaseMapAdminApiResponse) => void;
      vi.mocked(uploadBaseMapFile).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.status).toBe("pending"));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as success after mutation", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after failed mutation", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("returns isIdle as true on mount", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("returns isIdle as false during mutation", async () => {
      let resolveMutation!: (v: BaseMapAdminApiResponse) => void;
      vi.mocked(uploadBaseMapFile).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      resolveMutation({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
    });

    it("mutateAsync resolves with response", async () => {
      const mockResp = { id: "99", name: "async", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" };
      vi.mocked(uploadBaseMapFile).mockResolvedValue(mockResp);
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      const data = await result.current.mutateAsync({ name: "async", file: makeFile(), attribution: "" });
      expect(data).toEqual(mockResp);
    });

    it("mutateAsync rejects on API failure", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("async fail"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync({ name: "T", file: makeFile(), attribution: "" })).rejects.toThrow("async fail");
    });

    it("returns submittedAt timestamp after mutation", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.submittedAt).toBeGreaterThan(0));
    });

    it("returns isPaused as false on mount", () => {
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(result.current.isPaused).toBe(false);
    });

    it("handles 422 validation error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("Request failed with status code 422"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("422"));
    });

    it("handles timeout error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });

    it("handles 401 unauthorized error", async () => {
      vi.mocked(uploadBaseMapFile).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });

    it("does not call mutate on mount", () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      expect(uploadBaseMapFile).not.toHaveBeenCalled();
    });

    it("handles large file upload", async () => {
      const largeFile = new File(new Array(1024).fill("x"), "large.tif", { type: "image/tiff" });
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "large", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "large", file: largeFile, attribution: "" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("handles empty attribution string", async () => {
      vi.mocked(uploadBaseMapFile).mockResolvedValue({ id: "1", name: "T", type: "raster", source_type: "upload", tile_url: "", attribution: "", created_at: "" });
      const { result } = renderHook(() => useUploadBaseMap(), { wrapper: createWrapper() });
      result.current.mutate({ name: "T", file: makeFile(), attribution: "" });
      await waitFor(() => expect(uploadBaseMapFile).toHaveBeenCalledWith("T", expect.any(File), ""));
    });
  });
});
