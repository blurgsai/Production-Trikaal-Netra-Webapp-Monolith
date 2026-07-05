import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useLogin } from "../useLogin";
import * as authApi from "../../api/authApi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthProvider from "../AuthProvider";
import type { ReactNode } from "react";

vi.mock("../../api/authApi", () => ({
  loginUser: vi.fn(),
}));

vi.mock("@/shared/api", () => ({
  axiosInstance: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("useLogin", () => {
  it("logs in and stores session", async () => {
    vi.mocked(authApi.loginUser).mockResolvedValue({
      token: "abc",
      role: "admin",
      user_id: "1",
      username: "user",
    });

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
    result.current.mutate({ username: "user", password: "pass" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(localStorage.getItem("token")).toBe("abc");
    expect(localStorage.getItem("username")).toBe("user");
  });

  // ── Initial State ───────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns a mutate function", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(typeof result.current.mutate).toBe("function");
    });

    it("returns a mutateAsync function", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(typeof result.current.mutateAsync).toBe("function");
    });

    it("isIdle before any mutation", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
    });

    it("isPending is false before any mutation", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.isPending).toBe(false);
    });

    it("isError is false before any mutation", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.isError).toBe(false);
    });

    it("isSuccess is false before any mutation", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.isSuccess).toBe(false);
    });

    it("data is undefined before any mutation", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
    });

    it("error is null before any mutation", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });
  });

  // ── Successful Login ────────────────────────────────────────────────────

  describe("successful login", () => {
    it("stores token in localStorage", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "tok123", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(localStorage.getItem("token")).toBe("tok123");
    });

    it("stores role in localStorage", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "admin", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(localStorage.getItem("role")).toBe("admin");
    });

    it("stores user_id in localStorage", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "42", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(localStorage.getItem("user_id")).toBe("42");
    });

    it("stores username in localStorage", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "alice" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "alice", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(localStorage.getItem("username")).toBe("alice");
    });

    it("calls loginUser with the provided credentials", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "bob", password: "secret" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(authApi.loginUser).toHaveBeenCalledWith({ username: "bob", password: "secret" });
    });

    it("data contains the mapped session", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ token: "t", role: "r", userId: "1", username: "u" });
    });

    it("transitions from idle to pending to success", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.isIdle).toBe(true);
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.isIdle).toBe(false);
    });

    it("calls loginUser exactly once", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(authApi.loginUser).toHaveBeenCalledTimes(1);
    });
  });

  // ── Failed Login ────────────────────────────────────────────────────────

  describe("failed login", () => {
    it("sets isError to true on rejection", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("Invalid credentials"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("does not store token in localStorage on error", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(localStorage.getItem("token")).toBeNull();
    });

    it("does not store username in localStorage on error", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(localStorage.getItem("username")).toBeNull();
    });

    it("error property contains the rejection error", async () => {
      const err = new Error("Bad credentials");
      vi.mocked(authApi.loginUser).mockRejectedValue(err);
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBe(err);
    });

    it("isSuccess is false on error", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.isSuccess).toBe(false);
    });

    it("data is undefined on error", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });

    it("handles rejection with a non-Error value (string)", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue("network error");
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles rejection with null", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(null);
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles rejection with undefined", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(undefined);
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles rejection with a number", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(500);
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles rejection with a plain object", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue({ status: 401, message: "unauthorized" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ── Credential Edge Cases ───────────────────────────────────────────────

  describe("credential edge cases", () => {
    it("passes empty username and password to loginUser", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "", password: "" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(authApi.loginUser).toHaveBeenCalledWith({ username: "", password: "" });
    });

    it("passes very long username and password", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const longUser = "u".repeat(1000);
      const longPass = "p".repeat(1000);
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: longUser, password: longPass }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(authApi.loginUser).toHaveBeenCalledWith({ username: longUser, password: longPass });
    });

    it("passes username with special characters", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "user!@#$%^&*()", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(authApi.loginUser).toHaveBeenCalledWith({ username: "user!@#$%^&*()", password: "p" });
    });

    it("passes username with unicode characters", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "ユーザー", password: "パスワード" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(authApi.loginUser).toHaveBeenCalledWith({ username: "ユーザー", password: "パスワード" });
    });
  });

  // ── Mapper ──────────────────────────────────────────────────────────────

  describe("mapper", () => {
    it("maps user_id to userId in the session", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "99", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.userId).toBe("99");
    });

    it("maps token directly", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "mapped-tok", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.token).toBe("mapped-tok");
    });

    it("maps role directly", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "superadmin", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.role).toBe("superadmin");
    });

    it("maps username directly", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "mapped-user" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.username).toBe("mapped-user");
    });
  });

  // ── Mutation Reset ──────────────────────────────────────────────────────

  describe("mutation reset", () => {
    it("reset clears error state", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      await act(async () => { result.current.reset(); });
      await waitFor(() => expect(result.current.isError).toBe(false));
      expect(result.current.isIdle).toBe(true);
    });

    it("reset clears success state", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await act(async () => { result.current.reset(); });
      await waitFor(() => expect(result.current.isSuccess).toBe(false));
      expect(result.current.isIdle).toBe(true);
    });

    it("reset clears data", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
      await act(async () => { result.current.reset(); });
      await waitFor(() => expect(result.current.data).toBeUndefined());
    });
  });

  // ── Retry After Error ───────────────────────────────────────────────────

  describe("retry after error", () => {
    it("can retry after an error", async () => {
      vi.mocked(authApi.loginUser)
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(localStorage.getItem("token")).toBe("t");
    });
  });

  // ── mutateAsync ─────────────────────────────────────────────────────────

  describe("mutateAsync", () => {
    it("mutateAsync resolves with the mapped session", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      let session: unknown;
      await act(async () => {
        session = await result.current.mutateAsync({ username: "u", password: "p" });
      });
      expect(session).toEqual({ token: "t", role: "r", userId: "1", username: "u" });
    });

    it("mutateAsync rejects on login failure", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      await expect(
        act(async () => { await result.current.mutateAsync({ username: "u", password: "p" }); })
      ).rejects.toThrow("fail");
    });
  });

  // ── Multiple Mutations ──────────────────────────────────────────────────

  describe("multiple mutations", () => {
    it("second successful mutation overwrites first session data", async () => {
      vi.mocked(authApi.loginUser)
        .mockResolvedValueOnce({ token: "t1", role: "r1", user_id: "1", username: "u1" })
        .mockResolvedValueOnce({ token: "t2", role: "r2", user_id: "2", username: "u2" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u1", password: "p" }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(localStorage.getItem("token")).toBe("t1");
      act(() => result.current.mutate({ username: "u2", password: "p" }));
      await waitFor(() => expect(result.current.data?.token).toBe("t2"));
      expect(localStorage.getItem("token")).toBe("t2");
      expect(localStorage.getItem("username")).toBe("u2");
    });
  });

  // ── Status Flags ────────────────────────────────────────────────────────

  describe("status flags", () => {
    it("isPending is true while mutation is in flight", async () => {
      let resolveFn!: (v: { token: string; role: string; user_id: string; username: string }) => void;
      vi.mocked(authApi.loginUser).mockImplementationOnce(
        () => new Promise((r) => { resolveFn = r; })
      );
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isPending).toBe(true));
      await act(async () => { resolveFn({ token: "t", role: "r", user_id: "1", username: "u" }); });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it("isIdle is false while mutation is pending", async () => {
      let resolveFn!: (v: { token: string; role: string; user_id: string; username: string }) => void;
      vi.mocked(authApi.loginUser).mockImplementationOnce(
        () => new Promise((r) => { resolveFn = r; })
      );
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isIdle).toBe(false));
      await act(async () => { resolveFn({ token: "t", role: "r", user_id: "1", username: "u" }); });
    });

    it("isPending is false after error", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.isPending).toBe(false);
    });

    it("isIdle is false after error", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.isIdle).toBe(false);
    });

    it("status is 'success' after successful mutation", async () => {
      vi.mocked(authApi.loginUser).mockResolvedValue({ token: "t", role: "r", user_id: "1", username: "u" });
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.status).toBe("success"));
    });

    it("status is 'error' after failed mutation", async () => {
      vi.mocked(authApi.loginUser).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      act(() => result.current.mutate({ username: "u", password: "p" }));
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("status is 'idle' before any mutation", () => {
      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
      expect(result.current.status).toBe("idle");
    });
  });
});
