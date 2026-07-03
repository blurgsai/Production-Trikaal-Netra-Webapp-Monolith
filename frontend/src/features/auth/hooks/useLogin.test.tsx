import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useLogin } from "./useLogin";
import * as authApi from "../api/authApi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthProvider from "../providers/AuthProvider";
import type { ReactNode } from "react";

vi.mock("../api/authApi", () => ({
  loginUser: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
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

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ username: "user", password: "pass" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(localStorage.getItem("token")).toBe("abc");
    expect(localStorage.getItem("username")).toBe("user");
  });
});
