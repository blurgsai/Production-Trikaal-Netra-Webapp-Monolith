import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import AuthProvider from "../AuthProvider";
import { useAuth } from "../useAuth";
import { BrowserRouter } from "react-router-dom";
import { axiosInstance } from "@/shared/api";

vi.mock("@/shared/api", () => ({
  axiosInstance: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("useAuth", () => {
  it("returns unauthenticated when no token", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("returns authenticated when token is present", () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("username", "user");
    localStorage.setItem("role", "admin");
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.username).toBe("user");
    expect(result.current.role).toBe("admin");
  });

  // ── Initial State ───────────────────────────────────────────────────────

  describe("initial state", () => {
    it("token is null when localStorage is empty", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.token).toBeNull();
    });

    it("username is null when localStorage is empty", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.username).toBeNull();
    });

    it("role is null when localStorage is empty", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.role).toBeNull();
    });

    it("login is a function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(typeof result.current.login).toBe("function");
    });

    it("logoutUser is a function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(typeof result.current.logoutUser).toBe("function");
    });

    it("return object has exactly the expected keys", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(Object.keys(result.current).sort()).toEqual([
        "isAuthenticated", "login", "logoutUser", "role", "token", "username",
      ]);
    });
  });

  // ── Token Edge Cases ────────────────────────────────────────────────────

  describe("token edge cases", () => {
    it("isAuthenticated is false when token is 'undefined' string", () => {
      localStorage.setItem("token", "undefined");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("isAuthenticated is false when token is 'null' string", () => {
      localStorage.setItem("token", "null");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("isAuthenticated is true when token is a valid string", () => {
      localStorage.setItem("token", "valid-token");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("token value matches localStorage value", () => {
      localStorage.setItem("token", "my-token-123");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.token).toBe("my-token-123");
    });

    it("isAuthenticated is true for a single-character token", () => {
      localStorage.setItem("token", "x");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("isAuthenticated is true for a very long token", () => {
      const longToken = "a".repeat(10000);
      localStorage.setItem("token", longToken);
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("isAuthenticated is true for a token with special characters", () => {
      localStorage.setItem("token", "tok!@#$%^&*()");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("isAuthenticated is true for a token with unicode characters", () => {
      localStorage.setItem("token", "トークン");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  // ── Login Function ──────────────────────────────────────────────────────

  describe("login function", () => {
    it("sets token in localStorage", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "newtok", role: "user", userId: "5", username: "bob" });
      });
      expect(localStorage.getItem("token")).toBe("newtok");
    });

    it("sets role in localStorage", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "t", role: "admin", userId: "1", username: "u" });
      });
      expect(localStorage.getItem("role")).toBe("admin");
    });

    it("sets user_id in localStorage", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "t", role: "r", userId: "42", username: "u" });
      });
      expect(localStorage.getItem("user_id")).toBe("42");
    });

    it("sets username in localStorage", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "t", role: "r", userId: "1", username: "alice" });
      });
      expect(localStorage.getItem("username")).toBe("alice");
    });

    it("updates isAuthenticated to true after login", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(false);
      act(() => {
        result.current.login({ token: "tok", role: "r", userId: "1", username: "u" });
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("updates token in context after login", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.token).toBeNull();
      act(() => {
        result.current.login({ token: "newtok", role: "r", userId: "1", username: "u" });
      });
      expect(result.current.token).toBe("newtok");
    });

    it("overwrites previous token on second login", () => {
      localStorage.setItem("token", "old");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "new", role: "r", userId: "1", username: "u" });
      });
      expect(localStorage.getItem("token")).toBe("new");
      expect(result.current.token).toBe("new");
    });

    it("login with empty string token sets isAuthenticated to false (empty string is falsy)", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "", role: "r", userId: "1", username: "u" });
      });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("login with 'undefined' string token sets isAuthenticated to false", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "undefined", role: "r", userId: "1", username: "u" });
      });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("login with 'null' string token sets isAuthenticated to false", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "null", role: "r", userId: "1", username: "u" });
      });
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ── Logout Function ─────────────────────────────────────────────────────

  describe("logout function", () => {
    it("removes token from localStorage", () => {
      localStorage.setItem("token", "abc");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logoutUser());
      expect(localStorage.getItem("token")).toBeNull();
    });

    it("removes role from localStorage", () => {
      localStorage.setItem("role", "admin");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logoutUser());
      expect(localStorage.getItem("role")).toBeNull();
    });

    it("removes user_id from localStorage", () => {
      localStorage.setItem("user_id", "1");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logoutUser());
      expect(localStorage.getItem("user_id")).toBeNull();
    });

    it("removes username from localStorage", () => {
      localStorage.setItem("username", "user");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logoutUser());
      expect(localStorage.getItem("username")).toBeNull();
    });

    it("sets token to null in context after logout", () => {
      localStorage.setItem("token", "abc");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logoutUser());
      expect(result.current.token).toBeNull();
    });

    it("sets isAuthenticated to false after logout", () => {
      localStorage.setItem("token", "abc");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isAuthenticated).toBe(true);
      act(() => result.current.logoutUser());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("clears all four localStorage keys on logout", () => {
      localStorage.setItem("token", "t");
      localStorage.setItem("role", "r");
      localStorage.setItem("user_id", "1");
      localStorage.setItem("username", "u");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logoutUser());
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("role")).toBeNull();
      expect(localStorage.getItem("user_id")).toBeNull();
      expect(localStorage.getItem("username")).toBeNull();
    });

    it("logout when already logged out does not throw", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(() => act(() => result.current.logoutUser())).not.toThrow();
    });
  });

  // ── Authentication Check (useEffect) ────────────────────────────────────

  describe("authentication check", () => {
    it("calls /users/auth when token is present on mount", async () => {
      localStorage.setItem("token", "abc");
      vi.mocked(axiosInstance.get).mockResolvedValue({ data: {} });
      renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledWith("/users/auth"));
    });

    it("does not call /users/auth when no token on mount", () => {
      vi.mocked(axiosInstance.get).mockResolvedValue({ data: {} });
      renderHook(() => useAuth(), { wrapper });
      expect(axiosInstance.get).not.toHaveBeenCalled();
    });

    it("calls logoutUser when /users/auth rejects", async () => {
      localStorage.setItem("token", "abc");
      vi.mocked(axiosInstance.get).mockRejectedValue(new Error("unauthorized"));
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
      expect(localStorage.getItem("token")).toBeNull();
    });

    it("does not call logoutUser when /users/auth resolves successfully", async () => {
      localStorage.setItem("token", "abc");
      vi.mocked(axiosInstance.get).mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem("token")).toBe("abc");
    });

    it("re-authenticates when token changes from null to a value", async () => {
      vi.mocked(axiosInstance.get).mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(axiosInstance.get).not.toHaveBeenCalled();
      act(() => {
        result.current.login({ token: "newtok", role: "r", userId: "1", username: "u" });
      });
      await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledWith("/users/auth"));
    });
  });

  // ── Context Error ───────────────────────────────────────────────────────

  describe("context error", () => {
    it("throws when used outside AuthProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within AuthProvider");
      spy.mockRestore();
    });
  });

  // ── Callback Stability ──────────────────────────────────────────────────

  describe("callback stability", () => {
    it("logoutUser identity is stable across re-renders", () => {
      localStorage.setItem("token", "abc");
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });
      const ref1 = result.current.logoutUser;
      rerender();
      expect(result.current.logoutUser).toBe(ref1);
    });

    it("login identity changes across re-renders (not memoized)", () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });
      const ref1 = result.current.login;
      rerender();
      expect(result.current.login).not.toBe(ref1);
    });
  });

  // ── Login -> Logout Cycle ───────────────────────────────────────────────

  describe("login -> logout cycle", () => {
    it("login then logout results in unauthenticated state", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "tok", role: "admin", userId: "1", username: "user" });
      });
      expect(result.current.isAuthenticated).toBe(true);
      act(() => result.current.logoutUser());
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
    });

    it("login -> logout -> login restores authenticated state", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "t1", role: "r", userId: "1", username: "u" });
      });
      expect(result.current.isAuthenticated).toBe(true);
      act(() => result.current.logoutUser());
      expect(result.current.isAuthenticated).toBe(false);
      act(() => {
        result.current.login({ token: "t2", role: "r", userId: "2", username: "u2" });
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe("t2");
    });
  });

  // ── Username / Role from localStorage ───────────────────────────────────

  describe("username and role from localStorage", () => {
    it("username is read from localStorage on mount", () => {
      localStorage.setItem("token", "t");
      localStorage.setItem("username", "testuser");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.username).toBe("testuser");
    });

    it("role is read from localStorage on mount", () => {
      localStorage.setItem("token", "t");
      localStorage.setItem("role", "viewer");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.role).toBe("viewer");
    });

    it("username is null when not set in localStorage", () => {
      localStorage.setItem("token", "t");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.username).toBeNull();
    });

    it("role is null when not set in localStorage", () => {
      localStorage.setItem("token", "t");
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.role).toBeNull();
    });

    it("login stores all four fields and they are readable from localStorage", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => {
        result.current.login({ token: "tk", role: "rl", userId: "uid", username: "un" });
      });
      expect(localStorage.getItem("token")).toBe("tk");
      expect(localStorage.getItem("role")).toBe("rl");
      expect(localStorage.getItem("user_id")).toBe("uid");
      expect(localStorage.getItem("username")).toBe("un");
    });

    it("logout does not remove unrelated localStorage keys", () => {
      localStorage.setItem("token", "t");
      localStorage.setItem("theme", "dark");
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logoutUser());
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });
});
