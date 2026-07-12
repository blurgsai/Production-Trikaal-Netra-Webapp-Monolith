import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  it("I-01: renders users fetched from API and opens create dialog", async () => {
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
});
