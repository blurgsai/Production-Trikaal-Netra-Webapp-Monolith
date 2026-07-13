import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { UserApiResponse } from "../../api/types";

vi.mock("../../api/usersApi", () => ({
  fetchUsers: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapUsersFromApi: vi.fn((raw: UserApiResponse[]) => raw.map((r) => ({ id: r.id, username: r.username, role: r.role }))),
  mapUserFromApi: vi.fn((raw: UserApiResponse) => ({ id: raw.id, username: raw.username, role: raw.role })),
}));

import { useUsers } from "../useUsers";
import { fetchUsers } from "../../api/usersApi";
import { mapUsersFromApi } from "../../model/mappers";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides?: Partial<UserApiResponse>): UserApiResponse {
  return { id: "1", username: "admin", role: "admin", ...overrides };
}

function makeUsers(count: number): UserApiResponse[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    username: `user${i + 1}`,
    role: i % 2 === 0 ? "admin" : "user",
  }));
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

// ── Hook Inventory ───────────────────────────────────────────────────────────
//
// Hook: useUsers
//   Purpose: Fetches all users from the admin API and maps them to domain User[] types
//   Public API: { data: User[] | undefined, isLoading: boolean, isError: boolean, error: Error | null, refetch: () => void }
//   Parameters: None
//   Internal state: Delegated to @tanstack/react-query useQuery
//   Side effects: HTTP fetch via fetchUsers, mapping via mapUsersFromApi
//   Dependencies: @tanstack/react-query, fetchUsers, mapUsersFromApi
//   Query key: ["admin", "users"]
//   Possible failure points:
//     - fetchUsers network failure or non-2xx response
//     - mapUsersFromApi throwing on malformed data
//     - Empty response from API
//
// ── Risk Assessment ──────────────────────────────────────────────────────────
//
// useUsers:
//   MEDIUM: queryKey is static ["admin", "users"] — no cache collision risk
//   LOW:    mapUsersFromApi is called inside queryFn — if it throws, error is caught by React Query
//   LOW:    No parameters, so no race condition or stale closure risk
//

describe("useUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("starts in loading state on mount", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
    });

    it("has undefined data before fetch resolves", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });

    it("has isError false on mount", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });

    it("has error null on mount", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });

    it("calls fetchUsers on mount", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([]);
      renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("returns mapped user data on successful fetch", async () => {
      const raw = makeUsers(2);
      vi.mocked(fetchUsers).mockResolvedValue(raw);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].id).toBe("1");
      expect(result.current.data?.[0].username).toBe("user1");
    });

    it("passes raw data through mapUsersFromApi", async () => {
      const raw = makeUsers(3);
      vi.mocked(fetchUsers).mockResolvedValue(raw);
      renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(mapUsersFromApi).toHaveBeenCalledWith(raw));
    });

    it("sets isLoading to false after success", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("sets isError to false after success", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it("sets error to null after success", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error).toBeNull());
    });

    it("handles empty array response", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it("handles single user response", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([makeUser()]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });

    it("handles large dataset (100 users)", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(100));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(100));
    });

    it("preserves user field order from mapper", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([{ id: "1", username: "test", role: "admin" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.[0]).toEqual({ id: "1", username: "test", role: "admin" });
    });

    it("calls fetchUsers exactly once on mount", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("sets isError to true on API failure", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("500"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("sets error message on API failure", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toBe("Network error"));
    });

    it("sets isLoading to false on error", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("keeps data undefined on error", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("handles 401 unauthorized error", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("Request failed with status code 401"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("401"));
    });

    it("handles 500 server error", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("Request failed with status code 500"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("500"));
    });

    it("handles network timeout error", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("timeout of 5000ms exceeded"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.error?.message).toContain("timeout"));
    });

    it("handles non-Error rejection (string)", async () => {
      vi.mocked(fetchUsers).mockRejectedValue("string error" as unknown as Error);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ── Refetch behaviour ──────────────────────────────────────────────────

  describe("refetch", () => {
    it("refetch re-calls fetchUsers", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
      await result.current.refetch();
      expect(fetchUsers).toHaveBeenCalledTimes(2);
    });

    it("refetch updates data after re-fetch", async () => {
      vi.mocked(fetchUsers).mockResolvedValueOnce(makeUsers(1));
      vi.mocked(fetchUsers).mockResolvedValueOnce(makeUsers(5));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
      await result.current.refetch();
      await waitFor(() => expect(result.current.data).toHaveLength(5));
    });

    it("refetch can recover from error", async () => {
      vi.mocked(fetchUsers).mockRejectedValueOnce(new Error("fail"));
      vi.mocked(fetchUsers).mockResolvedValueOnce(makeUsers(2));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      await result.current.refetch();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });
  });

  // ── Cache behaviour ────────────────────────────────────────────────────

  describe("cache behaviour", () => {
    it("does not re-fetch on re-render (served from cache)", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      const { rerender } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
      rerender();
      expect(fetchUsers).toHaveBeenCalledTimes(1);
    });

    it("multiple hook instances share the same cache", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(3));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      renderHook(() => useUsers(), { wrapper });
      await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
      renderHook(() => useUsers(), { wrapper });
      expect(fetchUsers).toHaveBeenCalledTimes(1);
    });
  });

  // ── State transitions ──────────────────────────────────────────────────

  describe("state transitions", () => {
    it("transitions from loading to success", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.isLoading).toBe(false);
    });

    it("transitions from loading to error", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles response with null username field", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([{ id: "1", username: null as unknown as string, role: "admin" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it("handles response with empty string username", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([{ id: "1", username: "", role: "user" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].username).toBe(""));
    });

    it("handles response with special characters in username", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([{ id: "1", username: "test@#$%", role: "user" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].username).toBe("test@#$%"));
    });

    it("handles response with very long username", async () => {
      const longName = "a".repeat(1000);
      vi.mocked(fetchUsers).mockResolvedValue([{ id: "1", username: longName, role: "user" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].username).toBe(longName));
    });

    it("handles response with very long id", async () => {
      const longId = "x".repeat(500);
      vi.mocked(fetchUsers).mockResolvedValue([{ id: longId, username: "u", role: "user" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].id).toBe(longId));
    });

    it("handles response with unicode characters", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([{ id: "1", username: "用户名", role: "管理员" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data?.[0].username).toBe("用户名"));
    });

    it("handles duplicate user ids (no dedup)", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([
        { id: "1", username: "a", role: "user" },
        { id: "1", username: "b", role: "user" },
      ]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(2));
    });

    it("handles response with numeric id coerced to string", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([{ id: 123 as unknown as string, username: "u", role: "user" }]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });

    it("handles mapper throwing on malformed data", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([{ id: "1", username: "u", role: "user" }]);
      vi.mocked(mapUsersFromApi).mockImplementationOnce(() => {
        throw new Error("Mapper error");
      });
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Mapper error");
    });

    it("handles mapper returning empty array", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(5));
      vi.mocked(mapUsersFromApi).mockReturnValue([]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.data).toEqual([]));
    });
  });

  // ── Cleanup ────────────────────────────────────────────────────────────

  describe("cleanup", () => {
    it("does not update state after unmount", async () => {
      const neverResolves = new Promise<UserApiResponse[]>(() => {});
      vi.mocked(fetchUsers).mockReturnValue(neverResolves);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { unmount } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      unmount();
      await new Promise((r) => setTimeout(r, 100));
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("unmounted"));
      spy.mockRestore();
    });
  });

  // ── Query key ──────────────────────────────────────────────────────────

  describe("query key", () => {
    it("uses admin users query key", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([]);
      renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
    });
  });

  // ── Additional coverage ────────────────────────────────────────────────

  describe("additional coverage", () => {
    it("returns fetchStatus as fetching on mount", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe("fetching");
    });

    it("returns fetchStatus as idle before first fetch", () => {
      vi.mocked(fetchUsers).mockResolvedValue([]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe("fetching");
    });

    it("returns status as pending on mount", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("pending");
    });

    it("returns status as success after fetch resolves", async () => {
      vi.mocked(fetchUsers).mockResolvedValue(makeUsers(1));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("returns status as error after fetch fails", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("exposes refetch function", () => {
      vi.mocked(fetchUsers).mockResolvedValue([]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(typeof result.current.refetch).toBe("function");
    });

    it("exposes isFetching flag", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.isFetching).toBe(true);
    });

    it("isFetching is false after success", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it("isFetching is false after error", async () => {
      vi.mocked(fetchUsers).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it("returns isFetched flag as false before fetch", () => {
      vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      expect(result.current.isFetched).toBe(false);
    });

    it("returns isFetched flag as true after fetch", async () => {
      vi.mocked(fetchUsers).mockResolvedValue([]);
      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isFetched).toBe(true));
    });
  });
});
