import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { UserApiResponse } from "../../api/types";

vi.mock("../../api/usersApi", () => ({
  createUser: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapUserFromApi: vi.fn((raw: UserApiResponse) => ({ id: raw.id, username: raw.username, role: raw.role })),
}));

import { useCreateUser } from "../useCreateUser";
import { createUser } from "../../api/usersApi";
import { mapUserFromApi } from "../../model/mappers";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

function makeCreateInput(overrides?: { username?: string; password?: string; role?: string }) {
  return {
    username: overrides?.username ?? "newuser",
    password: overrides?.password ?? "password123",
    role: overrides?.role ?? "user",
  };
}

// ── Hook Inventory ───────────────────────────────────────────────────────────
//
// Hook: useCreateUser
//   Purpose: Creates a new user via the admin API and invalidates the users cache
//   Public API: { mutate, mutateAsync, isPending, isError, error, data, reset }
//   Parameters: None (hook itself), mutate accepts UserCreateRequest
//   Internal state: Delegated to @tanstack/react-query useMutation
//   Side effects: HTTP POST via createUser, cache invalidation on success
//   Dependencies: @tanstack/react-query, createUser, mapUserFromApi
//   Cache key invalidated: ["admin", "users"]
//   Possible failure points:
//     - createUser network failure or non-2xx response
//     - mapUserFromApi throwing on malformed response
//     - Cache invalidation not firing (stale data)
//

describe("useCreateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("starts with isPending false", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });

    it("starts with isError false", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });

    it("starts with data undefined", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });

    it("starts with error null", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });

    it("starts with isSuccess false", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });

    it("exposes a mutate function", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });

    it("exposes a mutateAsync function", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });

    it("exposes a reset function", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(typeof result.current.reset).toBe("function");
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("calls createUser with correct arguments", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "newuser", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(createUser).toHaveBeenCalledWith({
        username: "newuser", password: "password123", role: "user",
      }));
    });

    it("returns mapped user on success", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "99", username: "newuser", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.data).toEqual({ id: "99", username: "newuser", role: "user" }));
    });

    it("passes response through mapUserFromApi", async () => {
      const raw = { id: "1", username: "test", role: "admin" };
      vi.mocked(createUser).mockResolvedValue(raw);
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(mapUserFromApi).toHaveBeenCalledWith(raw));
    });

    it("sets isPending to true during mutation", async () => {
      let resolveMutation!: (v: UserApiResponse) => void;
      vi.mocked(createUser).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isPending).toBe(true));
      resolveMutation({ id: "1", username: "u", role: "user" });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it("sets isSuccess to true after mutation completes", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("sets isPending to false after success", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it("sets isError to false after success", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("sets error to null after success", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.error).toBeNull());
    });

    it("handles admin role creation", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "admin", role: "admin" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ role: "admin" }));
      await waitFor(() => expect(result.current.data?.role).toBe("admin"));
    });

    it("handles user role creation", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ role: "user" }));
      await waitFor(() => expect(result.current.data?.role).toBe("user"));
    });

    it("handles operator role creation", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "op", role: "operator" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ role: "operator" }));
      await waitFor(() => expect(result.current.data?.role).toBe("operator"));
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("Create failed"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("sets error message on API failure", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("Username already exists"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.error?.message).toBe("Username already exists"));
    });

    it("sets isPending to false on error", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it("keeps data undefined on error", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("handles 400 bad request error", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("Request failed with status code 400"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.error?.message).toContain("400"));
    });

    it("handles 409 conflict error", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("Request failed with status code 409"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.error?.message).toContain("409"));
    });

    it("handles 500 server error", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });

    it("handles network error", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.error?.message).toBe("Network Error"));
    });

    it("handles mapper throwing on response", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      vi.mocked(mapUserFromApi).mockImplementationOnce(() => {
        throw new Error("Mapper error");
      });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ── Cache invalidation ─────────────────────────────────────────────────

  describe("cache invalidation", () => {
    it("invalidates users cache on success", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const { result } = renderHook(() => useCreateUser(), { wrapper });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    });

    it("does not invalidate cache on error", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("fail"));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const { result } = renderHook(() => useCreateUser(), { wrapper });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  // ── Reset ──────────────────────────────────────────────────────────────

  describe("reset", () => {
    it("clears error after reset", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isError).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("clears data after reset", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.data).toBeDefined());
      result.current.reset();
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });

    it("clears isSuccess after reset", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty username", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ username: "" }));
      await waitFor(() => expect(result.current.data?.username).toBe(""));
    });

    it("handles empty password", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ password: "" }));
      await waitFor(() => expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ password: "" })));
    });

    it("handles special characters in username", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "test@#$", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ username: "test@#$" }));
      await waitFor(() => expect(result.current.data?.username).toBe("test@#$"));
    });

    it("handles very long username", async () => {
      const longName = "a".repeat(500);
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: longName, role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ username: longName }));
      await waitFor(() => expect(result.current.data?.username).toBe(longName));
    });

    it("handles unicode characters in username", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "用户", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput({ username: "用户" }));
      await waitFor(() => expect(result.current.data?.username).toBe("用户"));
    });

    it("handles non-Error rejection", async () => {
      vi.mocked(createUser).mockRejectedValue("string error" as unknown as Error);
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("can be called multiple times sequentially", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      result.current.reset();
      result.current.mutate(makeCreateInput({ username: "user2" }));
      await waitFor(() => expect(result.current.data?.username).toBe("u"));
    });
  });

  // ── Cleanup ────────────────────────────────────────────────────────────

  describe("cleanup", () => {
    it("does not update state after unmount during pending mutation", async () => {
      const neverResolves = new Promise<UserApiResponse>(() => {});
      vi.mocked(createUser).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result, unmount } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  // ── Additional coverage ────────────────────────────────────────────────

  describe("additional coverage", () => {
    it("returns status as idle on mount", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });

    it("returns status as pending during mutation", async () => {
      let resolveMutation!: (v: UserApiResponse) => void;
      vi.mocked(createUser).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.status).toBe("pending"));
      resolveMutation({ id: "1", username: "u", role: "user" });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as success after mutation", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after failed mutation", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("returns isIdle as true on mount", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("returns isIdle as false during mutation", async () => {
      let resolveMutation!: (v: UserApiResponse) => void;
      vi.mocked(createUser).mockImplementation(() => new Promise((r) => { resolveMutation = r; }));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      resolveMutation({ id: "1", username: "u", role: "user" });
    });

    it("returns isIdle as false after success", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.isIdle).toBe(false));
    });

    it("mutateAsync resolves with mapped user", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "99", username: "async", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      const data = await result.current.mutateAsync(makeCreateInput());
      expect(data).toEqual({ id: "99", username: "async", role: "user" });
    });

    it("mutateAsync rejects on API failure", async () => {
      vi.mocked(createUser).mockRejectedValue(new Error("async fail"));
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      await expect(result.current.mutateAsync(makeCreateInput())).rejects.toThrow("async fail");
    });

    it("returns submittedAt timestamp after mutation", async () => {
      vi.mocked(createUser).mockResolvedValue({ id: "1", username: "u", role: "user" });
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      result.current.mutate(makeCreateInput());
      await waitFor(() => expect(result.current.submittedAt).toBeGreaterThan(0));
    });

    it("returns isPaused as false on mount", () => {
      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });
      expect(result.current.isPaused).toBe(false);
    });
  });
});
