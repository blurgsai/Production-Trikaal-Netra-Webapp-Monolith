import { describe, it, expect, beforeEach, vi } from "vitest";
// vi is used for alert spy in I-11
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";
import AuthProvider from "../../hooks/AuthProvider";
import LoginPage from "../LoginPage";

const BASE_URL = "http://localhost:5000";

function renderWithProviders(component: ReactNode, initialEntry = "/login") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<AuthProvider>{component}</AuthProvider>} />
            <Route path="/map" element={<div>Map Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("LoginPage integration", () => {
  it("I-01: renders username and password fields", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("I-02: sign in button is present and enabled initially", () => {
    renderWithProviders(<LoginPage />);
    const signInBtn = screen.getByRole("button", { name: /sign in/i });
    expect(signInBtn).toBeInTheDocument();
    expect(signInBtn).toBeEnabled();
  });

  it("I-03: typing username updates the input field", async () => {
    renderWithProviders(<LoginPage />);
    const usernameInput = screen.getByPlaceholderText("Username");
    await userEvent.type(usernameInput, "testuser");
    expect(usernameInput).toHaveValue("testuser");
  });

  it("I-04: typing password updates the input field", async () => {
    renderWithProviders(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText("Password");
    await userEvent.type(passwordInput, "testpass123");
    expect(passwordInput).toHaveValue("testpass123");
  });

  it("I-05: password visibility toggle shows and hides password", async () => {
    renderWithProviders(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByLabelText("toggle password visibility");
    await userEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    await userEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("I-06: successful login stores token in localStorage and navigates to /map", async () => {
    mockApi.use(
      http.post(`${BASE_URL}/users/login`, () =>
        HttpResponse.json({
          token: "jwt-token-123",
          role: "admin",
          user_id: "507f1f77bcf86cd799439011",
          username: "testuser",
        }),
      ),
      http.get(`${BASE_URL}/users/auth`, () =>
        HttpResponse.json({ username: "testuser", role: "admin" }),
      ),
    );

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Password"), "testpass123");

    const signInBtn = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(signInBtn);

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("jwt-token-123");
    });
    await waitFor(() => {
      expect(screen.getByText("Map Page")).toBeInTheDocument();
    });
  });

  it("I-07: login API is called with correct form-encoded body", async () => {
    let capturedBody: string | null = null;
    let capturedHeaders: Record<string, string> | null = null;

    mockApi.use(
      http.post(`${BASE_URL}/users/login`, async ({ request }) => {
        capturedBody = await request.text();
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json({
          token: "jwt-token-123",
          role: "user",
          user_id: "1",
          username: "testuser",
        });
      }),
      http.get(`${BASE_URL}/users/auth`, () =>
        HttpResponse.json({ username: "testuser", role: "user" }),
      ),
    );

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Password"), "testpass123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
    });
    expect(capturedBody).toContain("username=testuser");
    expect(capturedBody).toContain("password=testpass123");
    expect(capturedHeaders!["content-type"]).toContain("application/x-www-form-urlencoded");
  });

  it("I-08: failed login (401) does not store token or navigate", async () => {
    mockApi.use(
      http.post(`${BASE_URL}/users/login`, () =>
        HttpResponse.json({ detail: "Invalid username or password" }, { status: 401 }),
      ),
      http.get(`${BASE_URL}/users/auth`, () =>
        HttpResponse.json({ username: "testuser", role: "user" }),
      ),
    );

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "wronguser");
    await userEvent.type(screen.getByPlaceholderText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBeNull();
    });
    expect(screen.queryByText("Map Page")).not.toBeInTheDocument();
  });

  it("I-09: sign in button shows AUTHENTICATING text during pending mutation", async () => {
    mockApi.use(
      http.post(`${BASE_URL}/users/login`, async () => {
        await new Promise((r) => setTimeout(r, 3000));
        return HttpResponse.json({ token: "x", role: "user", user_id: "1", username: "u" });
      }),
      http.get(`${BASE_URL}/users/auth`, () =>
        HttpResponse.json({ username: "u", role: "user" }),
      ),
    );

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Password"), "testpass123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/authenticating/i)).toBeInTheDocument();
    });
  });

  it("I-10: Trikaal Netra branding text is rendered", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText("Trikaal Netra")).toBeInTheDocument();
    expect(screen.getByText("Maritime Surveillance")).toBeInTheDocument();
  });

  it("I-11: forgot password text is clickable", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderWithProviders(<LoginPage />);

    const forgotLink = screen.getByText("Forgot Password?");
    await userEvent.click(forgotLink);

    expect(alertSpy).toHaveBeenCalledWith("Forgot password clicked");
    alertSpy.mockRestore();
  });

  it("I-12: login with empty username does not submit", async () => {
    let loginCalled = false;
    mockApi.use(
      http.post(`${BASE_URL}/users/login`, () => {
        loginCalled = true;
        return HttpResponse.json({ token: "x", role: "user", user_id: "1", username: "u" });
      }),
    );

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText("Password"), "testpass123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await new Promise((r) => setTimeout(r, 500));
    expect(loginCalled).toBe(false);
  });
});
