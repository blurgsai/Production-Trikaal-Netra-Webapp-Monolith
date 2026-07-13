import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    await user.click(select);
    const listbox = await screen.findByRole("listbox");
    const unsafeOption = within(listbox).getByText("Unsafe");
    await user.click(unsafeOption);

    const commentField = screen.getByPlaceholderText("Add a comment...");
    await user.type(commentField, "Vessel is suspicious");

    const submitButton = screen.getByText("Submit Flag");
    await user.click(submitButton);

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

    await waitFor(() => {
      expect(screen.getByText("Bad vessel")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /delete flag/i });
    await user.click(deleteButton);

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

  // ── Submit with empty comment ──────────────────────────────────────────

  it("I-08: user can submit a flag with empty comment", async () => {
    const user = userEvent.setup();

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

    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });

    // Select 'Safe' from dropdown
    const select = screen.getByRole("combobox");
    await user.click(select);
    const listbox = await screen.findByRole("listbox");
    const safeOption = within(listbox).getByText("Safe");
    await user.click(safeOption);

    // Submit without typing a comment
    const submitButton = screen.getByText("Submit Flag");
    await user.click(submitButton);

    // Flag should appear with empty comment (no comment text rendered)
    await waitFor(() => {
      expect(screen.getByText("safe")).toBeInTheDocument();
    });
  });

  // ── Flag without comment displays correctly ────────────────────────────

  it("I-09: displays flag with no comment without crashing", async () => {
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            flagResponse({ id: "f1", flag: "safe", comment: "" }),
          ],
          total: 1,
        });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("safe")).toBeInTheDocument();
      expect(screen.getByText("user-abc")).toBeInTheDocument();
    });
  });

  // ── Different flag types displayed ─────────────────────────────────────

  it("I-10: displays all flag types correctly (safe, unsafe, suspicious, neutral, unknown)", async () => {
    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            flagResponse({ id: "f1", flag: "safe", comment: "c1" }),
            flagResponse({ id: "f2", flag: "unsafe", comment: "c2" }),
            flagResponse({ id: "f3", flag: "suspicious", comment: "c3" }),
            flagResponse({ id: "f4", flag: "neutral", comment: "c4" }),
            flagResponse({ id: "f5", flag: "unknown", comment: "c5" }),
          ],
          total: 5,
        });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("c1")).toBeInTheDocument();
      expect(screen.getByText("c2")).toBeInTheDocument();
      expect(screen.getByText("c3")).toBeInTheDocument();
      expect(screen.getByText("c4")).toBeInTheDocument();
      expect(screen.getByText("c5")).toBeInTheDocument();
    });

    // Verify count chip shows 5
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  // ── Dropdown shows all 5 options ───────────────────────────────────────

  it("I-11: flag dropdown shows all 5 predefined options when opened", async () => {
    const user = userEvent.setup();

    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({ success: true, data: [], total: 0 });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    await user.click(select);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Safe")).toBeInTheDocument();
    expect(within(listbox).getByText("Unsafe")).toBeInTheDocument();
    expect(within(listbox).getByText("Suspicious")).toBeInTheDocument();
    expect(within(listbox).getByText("Neutral")).toBeInTheDocument();
    expect(within(listbox).getByText("Unknown")).toBeInTheDocument();
  });

  // ── Create flag error doesn't crash UI ─────────────────────────────────

  it("I-12: create flag error does not crash the UI", async () => {
    const user = userEvent.setup();

    mockApi.use(
      http.get(`${FLAGS_URL}/vessel-001`, () => {
        return HttpResponse.json({ success: true, data: [], total: 0 });
      }),
      http.post(`${FLAGS_URL}`, () => {
        return HttpResponse.json({ detail: "Invalid flag" }, { status: 400 });
      }),
    );

    renderWithProviders(<VesselFlags vesselId="vessel-001" />);

    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    await user.click(select);
    const listbox = await screen.findByRole("listbox");
    const safeOption = within(listbox).getByText("Safe");
    await user.click(safeOption);

    const commentField = screen.getByPlaceholderText("Add a comment...");
    await user.type(commentField, "Test");

    const submitButton = screen.getByText("Submit Flag");
    await user.click(submitButton);

    // UI should still be functional — empty state still visible
    await waitFor(() => {
      expect(screen.getByText("No flags yet for this vessel.")).toBeInTheDocument();
    });
  });
});
