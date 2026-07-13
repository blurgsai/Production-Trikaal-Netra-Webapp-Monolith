import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { http, HttpResponse, delay } from "msw";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";
import VesselFlags from "../VesselFlags";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";
const FLAGS_URL = `${BASE_URL}/vessel-flags`;

function renderWithProviders(component: ReactNode) {
  return render(
    <ThemeProvider theme={defenseTheme}>
      <CssBaseline />
      {component}
    </ThemeProvider>,
  );
}

function flagResponse(overrides?: Record<string, unknown>) {
  return {
    id: "flag-001",
    vessel_id: "vessel-001",
    user_id: "user-abc",
    flag: "suspicious",
    comment: "Vessel deviating from route",
    created_at: "2024-01-15T10:30:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.setItem("token", "test-token");
});

afterEach(() => {
  mockApi.resetHandlers();
});

describe("VesselFlags integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  it("I-01: shows loading spinner while fetching flags", async () => {
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, async () => {
        await delay(5000);
        return HttpResponse.json({ success: true, data: [], total: 0 });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  // ── Success: empty state ───────────────────────────────────────────────

  it("I-02: shows 'No flags yet' when vessel has no flags", async () => {
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({ success: true, data: [], total: 0 });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });
  });

  // ── Success: flags displayed ───────────────────────────────────────────

  it("I-03: displays existing flags with comment, user, and timestamp", async () => {
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            flagResponse({ id: "f1", flag: "safe", comment: "All good", user_id: "user-1" }),
            flagResponse({ id: "f2", flag: "unsafe", comment: "Danger", user_id: "user-2" }),
          ],
          total: 2,
        });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("All good")).toBeInTheDocument();
      expect(screen.getByText("Danger")).toBeInTheDocument();
      expect(screen.getByText("user-1")).toBeInTheDocument();
      expect(screen.getByText("user-2")).toBeInTheDocument();
    });
  });

  // ── Create flag ────────────────────────────────────────────────────────

  it("I-04: user can submit a new flag with comment", async () => {
    const user = userEvent.setup();

    // Initial fetch: empty
    let flagsData: unknown[] = [];
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({ success: true, data: flagsData, total: flagsData.length });
      }),
      http.post(`${FLAGS_URL}`, async ({ request }) => {
        const body = (await request.json()) as { flag: string; comment: string };
        const newFlag = flagResponse({
          id: "new-flag",
          flag: body.flag,
          comment: body.comment,
          user_id: "user-abc",
        });
        flagsData = [newFlag, ...flagsData];
        return HttpResponse.json(newFlag, { status: 201 });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    // Wait for initial empty state
    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });

    // Select flag from dropdown
    const select = screen.getByRole("combobox");
    await user.click(select);
    const unsafeOption = await screen.findByText("Unsafe");
    await user.click(unsafeOption);

    // Type a comment
    const commentField = screen.getByPlaceholderText("Add a comment...");
    await user.type(commentField, "Vessel is suspicious");

    // Submit
    const submitButton = screen.getByText("Submit Flag");
    await user.click(submitButton);

    // Verify the new flag appears
    await waitFor(() => {
      expect(screen.getByText("Vessel is suspicious")).toBeInTheDocument();
    });
  });

  // ── Delete flag ────────────────────────────────────────────────────────

  it("I-05: user can delete an existing flag", async () => {
    const user = userEvent.setup();

    let flagsData: unknown[] = [
      flagResponse({ id: "flag-to-delete", flag: "unsafe", comment: "Bad vessel" }),
    ];

    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({ success: true, data: flagsData, total: flagsData.length });
      }),
      http.delete(`${FLAGS_URL}/flag-to-delete`, () => {
        flagsData = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    // Wait for flag to appear
    await waitFor(() => {
      expect(screen.getByText("Bad vessel")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    // Verify flag is removed and empty state shows
    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  it("I-06: shows error message when fetch fails", async () => {
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({ detail: "Internal error" }, { status: 500 });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load flags")).toBeInTheDocument();
    });
  });

  // ── Flag count badge ───────────────────────────────────────────────────

  it("I-07: shows flag count chip when flags exist", async () => {
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            flagResponse({ id: "f1", flag: "safe" }),
            flagResponse({ id: "f2", flag: "unsafe" }),
            flagResponse({ id: "f3", flag: "neutral" }),
          ],
          total: 3,
        });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });
});
