import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import AuthProvider, { useAuth } from "../providers/AuthProvider";
import { BrowserRouter } from "react-router-dom";

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
});
