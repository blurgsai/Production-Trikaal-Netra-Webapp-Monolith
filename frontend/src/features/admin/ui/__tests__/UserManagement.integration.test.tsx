import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";
import { http, HttpResponse } from "msw";
import { UserManagement } from "../UserManagement";

const BASE_URL = "http://localhost:5000";

function renderWithProviders(component: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>{component}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("UserManagement integration", () => {
  afterEach(() => {
    cleanup();
    mockApi.resetHandlers();
  });

  it("I-01: renders users fetched from API", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () =>
        HttpResponse.json([
          { id: "1", username: "admin_user", role: "admin" },
          { id: "2", username: "operator_user", role: "operator" },
        ]),
      ),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("admin_user")).toBeInTheDocument();
    });
    expect(screen.getByText("operator_user")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument();
  });

  it("I-02: shows empty state when no users exist", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () => HttpResponse.json([])),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("No users yet.")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /add your first user/i })).toBeInTheDocument();
  });

  it("I-03: shows error state when list request fails", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () =>
        HttpResponse.json({ detail: "Server error" }, { status: 500 }),
      ),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("I-04: displays loading indicator while fetching users", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json([
          { id: "1", username: "admin_user", role: "admin" },
        ]);
      }),
    );

    renderWithProviders(<UserManagement />);

    expect(screen.getAllByRole("progressbar").length).toBeGreaterThanOrEqual(1);
  });

  it("I-05: opens and closes the create user dialog", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () =>
        HttpResponse.json([{ id: "1", username: "admin_user", role: "admin" }]),
      ),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("admin_user")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /add user/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add User" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("I-06: creates a new user and refreshes the list", async () => {
    const users = [
      { id: "1", username: "admin_user", role: "admin" },
    ];

    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () => HttpResponse.json(users)),
      http.post(`${BASE_URL}/users/admin/users`, async ({ request }) => {
        const body = (await request.json()) as { username: string; role: string };
        const newUser = { id: "2", username: body.username, role: body.role };
        users.push(newUser);
        return HttpResponse.json(newUser, { status: 201 });
      }),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("admin_user")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /add user/i }));

    await userEvent.type(screen.getByRole("textbox", { name: /username/i }), "new_user");
    await userEvent.type(screen.getByTestId("create-password"), "password123");

    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByText("new_user")).toBeInTheDocument();
    });
  });

  it("I-07: selects a user and shows user details", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () =>
        HttpResponse.json([
          { id: "1", username: "admin_user", role: "admin" },
        ]),
      ),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("admin_user")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("admin_user"));

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("I-08: shows edit form with pre-filled values and cancels", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () =>
        HttpResponse.json([{ id: "1", username: "admin_user", role: "admin" }]),
      ),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("admin_user")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("admin_user"));
    await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    // Edit form should show pre-filled username
    const usernameInput = screen.getByRole("textbox", { name: /username/i }) as HTMLInputElement;
    expect(usernameInput.value).toBe("admin_user");

    // Cancel should exit edit mode
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    });
  });

  it("I-09: opens delete confirmation dialog", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () =>
        HttpResponse.json([{ id: "1", username: "admin_user", role: "admin" }]),
      ),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("admin_user")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("admin_user"));
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText((content, element) =>
      element?.tagName.toLowerCase() === "strong" && content === "admin_user",
    )).toBeInTheDocument();
  });

  it("I-10: deletes a user and removes it from the list", async () => {
    const users = [{ id: "1", username: "admin_user", role: "admin" }];

    mockApi.use(
      http.get(`${BASE_URL}/users/admin/users`, () => HttpResponse.json(users)),
      http.delete(`${BASE_URL}/users/admin/users/:userId`, ({ params }) => {
        users.splice(
          users.findIndex((u) => u.id === params.userId),
          1,
        );
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("admin_user")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("admin_user"));
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText("admin_user")).not.toBeInTheDocument();
    });
  });
});
