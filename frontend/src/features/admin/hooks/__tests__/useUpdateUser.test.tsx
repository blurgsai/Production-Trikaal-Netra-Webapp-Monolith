import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { UserApiResponse } from "../../api/types";

vi.mock("../../api/usersApi", () => ({
  updateUser: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapUserFromApi: vi.fn((raw: UserApiResponse) => ({ id: raw.id, username: raw.username, role: raw.role })),
}));

import { useUpdateUser } from "../useUpdateUser";
import { updateUser } from "../../api/usersApi";
import { mapUserFromApi } from "../../model/mappers";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe("useUpdateUser", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("initial state", () => {
    it("starts with isPending false", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });
    it("starts with isError false", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });
    it("starts with data undefined", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });
    it("starts with error null", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
    it("exposes a mutate function", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });
    it("exposes a mutateAsync function", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });
    it("exposes a reset function", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(typeof result.current.reset).toBe("function");
    });
    it("starts with isSuccess false", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe("success state", () => {
    it("calls updateUser with userId and data", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "updated", role: "admin" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "updated", password: "newpass", role: "admin" } });
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("1", { username: "updated", password: "newpass", role: "admin" }));
    });
    it("returns mapped user on success", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "updated", role: "admin" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "updated", password: "newpass", role: "admin" } });
      await waitFor(() => expect(result.current.data).toEqual({ id: "1", username: "updated", role: "admin" }));
    });
    it("passes response through mapUserFromApi", async () => {
      const raw = { id: "1", username: "u", role: "user" };
      vi.mocked(updateUser).mockResolvedValue(raw);
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(mapUserFromApi).toHaveBeenCalledWith(raw));
    });
    it("sets isSuccess to true after update", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
    it("sets isPending to false after success", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("sets isError to false after success", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("handles updating username only", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "newname", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "newname" } });
      await waitFor(() => expect(result.current.data?.username).toBe("newname"));
    });
    it("handles updating password only", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { password: "newpass" } });
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("1", { password: "newpass" }));
    });
    it("handles updating role only", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "admin" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { role: "admin" } });
      await waitFor(() => expect(result.current.data?.role).toBe("admin"));
    });
    it("handles updating all fields", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "new", role: "admin" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "new", password: "pass", role: "admin" } });
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("1", { username: "new", password: "pass", role: "admin" }));
    });
  });

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("Update failed"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("sets error message on API failure", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("Not found"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.error?.message).toBe("Not found"));
    });
    it("sets isPending to false on error", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
    it("keeps data undefined on error", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });
    it("handles 404 not found error", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("Request failed with status code 404"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "999", data: { username: "u" } });
      await waitFor(() => expect(result.current.error?.message).toContain("404"));
    });
    it("handles 403 forbidden error", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("Request failed with status code 403"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.error?.message).toContain("403"));
    });
    it("handles 500 server error", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });
    it("handles mapper throwing", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      vi.mocked(mapUserFromApi).mockImplementationOnce(() => { throw new Error("Mapper error"); });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
    it("handles non-Error rejection", async () => {
      vi.mocked(updateUser).mockRejectedValue("fail" as unknown as Error);
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("cache invalidation", () => {
    it("invalidates users cache on success", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useUpdateUser(), { wrapper });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    });
    it("does not invalidate cache on error", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("fail"));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useUpdateUser(), { wrapper });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears error after reset", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isError).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isError).toBe(false));
    });
    it("clears data after reset", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.data).toBeDefined());
      result.current.reset();
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });
    it("clears isSuccess after reset", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
  });

  describe("edge cases", () => {
    it("handles empty userId", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "", data: { username: "u" } });
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("", { username: "u" }));
    });
    it("handles empty data object", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: {} });
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("1", {}));
    });
    it("handles special characters in username", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "test@#$", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "test@#$" } });
      await waitFor(() => expect(result.current.data?.username).toBe("test@#$"));
    });
    it("handles very long userId", async () => {
      const longId = "x".repeat(500);
      vi.mocked(updateUser).mockResolvedValue({ id: longId, username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: longId, data: { username: "u" } });
      await waitFor(() => expect(result.current.data?.id).toBe(longId));
    });
    it("handles unicode in username", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "用户", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "用户" } });
      await waitFor(() => expect(result.current.data?.username).toBe("用户"));
    });
    it("handles sequential mutations", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u1" } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      result.current.mutate({ userId: "2", data: { username: "u2" } });
      await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(2));
    });
  });

  describe("cleanup", () => {
    it("does not update state after unmount during pending mutation", async () => {
      const neverResolves = new Promise<UserApiResponse>(() => {});
      vi.mocked(updateUser).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  describe("additional coverage", () => {
    it("returns status as idle on mount", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });

    it("returns status as pending during mutation", async () => {
      let resolveMutation!: (v: UserApiResponse) => void;
      vi.mocked(updateUser).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.status).toBe("pending"));
      resolveMutation({ id: "1", username: "u", role: "user" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as success after mutation", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after failed mutation", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("returns isIdle as true on mount", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("returns isIdle as false during mutation", async () => {
      let resolveMutation!: (v: UserApiResponse) => void;
      vi.mocked(updateUser).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      resolveMutation({ id: "1", username: "u", role: "user" });
    });

    it("mutateAsync resolves with mapped user", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "99", username: "async", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      const data = await result.current.mutateAsync({ userId: "99", data: { username: "async" } });
      expect(data).toEqual({ id: "99", username: "async", role: "user" });
    });

    it("mutateAsync rejects on API failure", async () => {
      vi.mocked(updateUser).mockRejectedValue(new Error("async fail"));
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync({ userId: "1", data: { username: "u" } })).rejects.toThrow("async fail");
    });

    it("returns submittedAt timestamp after mutation", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { username: "u" } });
      await waitFor(() => expect(result.current.submittedAt).toBeGreaterThan(0));
    });

    it("returns isPaused as false on mount", () => {
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      expect(result.current.isPaused).toBe(false);
    });

    it("handles updating only role field", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "admin" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { role: "admin" } });
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("1", { role: "admin" }));
    });

    it("handles updating only password field", async () => {
      vi.mocked(updateUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });
      result.current.mutate({ userId: "1", data: { password: "newpass" } });
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("1", { password: "newpass" }));
    });
  });
});
