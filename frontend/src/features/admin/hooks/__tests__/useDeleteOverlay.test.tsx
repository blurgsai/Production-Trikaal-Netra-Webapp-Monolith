import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/overlaysApi", () => ({
  deleteOverlay: vi.fn(),
}));

import { useDeleteOverlay } from "../useDeleteOverlay";
import { deleteOverlay } from "../../api/overlaysApi";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe("useDeleteOverlay", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts with isPending false", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });
    it("starts with isError false", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("starts with data undefined", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("starts with error null", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("exposes a mutate function", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });
    it("exposes a reset function", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.reset).toBe("function");
    });
    it("starts with isSuccess false", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });
    it("exposes mutateAsync function", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });
  });

  describe("success state", () => {
    it("calls deleteOverlay with overlayId", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledWith("ov-123", expect.anything()));
    });
    it("sets isSuccess to true after delete", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("sets isPending to false after success", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("sets isError to false after success", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("sets error to null after success", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.error).toBeNull());
    });
    it("data is undefined after successful delete", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeUndefined();
    });
    it("handles UUID-like overlayId", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      result.current.mutate(uuid);
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledWith(uuid, expect.anything()));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Delete failed"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Forbidden"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.error?.message).toBe("Forbidden"));
    });
    it("sets isPending to false on error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("handles 404 not found error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Request failed with status code 404"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("999");
      await waitFor(() => expect(result.current.error?.message).toContain("404"));
    });
    it("handles 403 forbidden error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Request failed with status code 403"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.error?.message).toContain("403"));
    });
    it("handles 500 server error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles network error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.error?.message).toBe("Network Error"));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("cache invalidation", () => {
    it("invalidates overlays cache on success", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper });
      result.current.mutate("ov-123");
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    });
    it("does not invalidate cache on error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("fail"));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears error after reset", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isError).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("clears isSuccess after reset", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
    it("clears error message after reset", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      await waitFor(() => expect(result.current.error?.message).toBe("fail"));
      result.current.reset();
      await waitFor(() => expect(result.current.error).toBeNull());
    });
  });

  describe("edge cases", () => {
    it("handles empty overlayId", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("");
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledWith("", expect.anything()));
    });
    it("handles very long overlayId", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      const longId = "x".repeat(500);
      result.current.mutate(longId);
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledWith(longId, expect.anything()));
    });
    it("handles special characters in overlayId", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov@#$%");
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledWith("ov@#$%", expect.anything()));
    });
    it("handles unicode in overlayId", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("覆盖");
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledWith("覆盖", expect.anything()));
    });
    it("handles sequential delete mutations", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      result.current.mutate("2");
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledTimes(2));
    });
    it("handles rapid sequential mutations", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      result.current.mutate("2");
      result.current.mutate("3");
      await waitFor(() => expect(deleteOverlay).toHaveBeenCalledTimes(3));
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount during pending mutation", async () => {
      const neverResolves = new Promise<void>(() => {});
      vi.mocked(deleteOverlay).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("ov-123");
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns status as idle on mount", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });

    it("returns status as pending during mutation", async () => {
      let resolveMutation!: (v: void) => void;
      vi.mocked(deleteOverlay).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.status).toBe("pending"));
      resolveMutation();
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as success after mutation", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after failed mutation", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("returns isIdle as true on mount", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("returns isIdle as false during mutation", async () => {
      let resolveMutation!: (v: void) => void;
      vi.mocked(deleteOverlay).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      resolveMutation();
    });

    it("returns isIdle as false after success", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.isIdle).toBe(false));
    });

    it("mutateAsync resolves on success", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync("1")).resolves.toBeUndefined();
    });

    it("mutateAsync rejects on API failure", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("async fail"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync("1")).rejects.toThrow("async fail");
    });

    it("returns submittedAt timestamp after mutation", async () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.submittedAt).toBeGreaterThan(0));
    });

    it("returns isPaused as false on mount", () => {
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(result.current.isPaused).toBe(false);
    });

    it("handles 422 validation error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Request failed with status code 422"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.error?.message).toContain("422"));
    });

    it("handles timeout error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });

    it("handles 409 conflict error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Request failed with status code 409"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.error?.message).toContain("409"));
    });

    it("does not call mutate on mount", () => {
      vi.mocked(deleteOverlay).mockResolvedValue(undefined);
      renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      expect(deleteOverlay).not.toHaveBeenCalled();
    });

    it("handles 401 unauthorized error", async () => {
      vi.mocked(deleteOverlay).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useDeleteOverlay(), { wrapper: createWrapper() });
      result.current.mutate("1");
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });
  });
});
