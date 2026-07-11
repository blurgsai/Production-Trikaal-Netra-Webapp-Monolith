import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { http, HttpResponse, delay } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";
import { EventTablePanel } from "../EventTablePanel";

const BASE_URL = "http://localhost:5000";

function renderWithProviders(component: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        <MemoryRouter>{component}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockMetadata = {
  columns: [
    { field: "type", label: "Type", type: "string", filterable: true, unique_values: ["geofence_intrusion", "dark_activity"] },
    { field: "severity", label: "Severity", type: "string", filterable: true, unique_values: ["high", "medium", "low"] },
    { field: "status", label: "Status", type: "string", filterable: true, unique_values: ["detected", "resolved"] },
  ],
};

const mockEvents = {
  events: [
    {
      id: "evt-001-abc",
      type: "geofence_intrusion",
      severity: "high",
      status: "detected",
      timestamp: "2024-06-15T12:20:00Z",
      start_time: "2024-06-15T11:35:00Z",
      end_time: "2024-06-15T12:20:00Z",
      vessels_involved: ["366168522"],
      location: null,
      temporality: "bounded",
      event_source: "spark",
      model: "heuristic",
      compound: false,
      constituent_types: [],
    },
    {
      id: "evt-002-def",
      type: "dark_activity",
      severity: "medium",
      status: "resolved",
      timestamp: "2024-06-14T08:00:00Z",
      start_time: "2024-06-14T07:00:00Z",
      end_time: "2024-06-14T09:00:00Z",
      vessels_involved: ["123456789", "987654321"],
      location: null,
      temporality: "bounded",
      event_source: "spark",
      model: "ml",
      compound: false,
      constituent_types: [],
    },
  ],
  total: 2,
  limit: 25,
  offset: 0,
};

const mockCompoundConfigs = {
  events: [
    {
      id: "cfg-001",
      type: "compound_intrusion",
      constituent_types: ["geofence_intrusion", "dark_activity"],
      description: "Geofence + dark activity compound",
      severity: "high",
      start_time: "2024-06-15T11:35:00Z",
      end_time: "2024-06-15T12:20:00Z",
      timestamp: "2024-06-15T12:20:00Z",
      compound: true,
    },
  ],
  total: 1,
};

beforeEach(() => {
  localStorage.setItem("token", "test-token");
});

describe("EventTablePanel integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  it("I-01: shows loading state while fetching events metadata", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, async () => {
        await delay(5000);
        return HttpResponse.json(mockMetadata);
      }),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  it("I-02: renders Events heading and table headers on success", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json(mockEvents),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Events")).toBeInTheDocument();
    });
    expect(screen.getByText("Event ID")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Vessel")).toBeInTheDocument();
    expect(screen.getByText("Severity")).toBeInTheDocument();
    expect(screen.getByText("Timestamp")).toBeInTheDocument();
  });

  it("I-03: displays mapped event data in table rows", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json(mockEvents),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("EVT-001-")).toBeInTheDocument();
    });
    expect(screen.getByText("geofence intrusion")).toBeInTheDocument();
    expect(screen.getByText("366168522")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("I-04: shows multiple vessels with +N suffix", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json(mockEvents),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("123456789")).toBeInTheDocument();
    });
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("I-05: clicking an event row calls onSelectEvent", async () => {
    const onSelect = vi.fn();
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json(mockEvents),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={onSelect} />,
    );

    await waitFor(() => {
      expect(screen.getByText("EVT-001-")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("EVT-001-"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("evt-001-abc");
  });

  it("I-06: search input filters events by updating query params", async () => {
    let capturedQuery: URLSearchParams | null = null;
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, ({ request }) => {
        capturedQuery = new URL(request.url).searchParams;
        return HttpResponse.json(mockEvents);
      }),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search events…")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search events…");
    await userEvent.type(searchInput, "geofence");

    await waitFor(() => {
      expect(capturedQuery!.get("q")).toBe("geofence");
    });
  });

  // ── Empty State ────────────────────────────────────────────────────────

  it("I-07: shows no events found when API returns empty list", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json({ events: [], total: 0, limit: 25, offset: 0 }),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No events found")).toBeInTheDocument();
    });
  });

  // ── Error State ────────────────────────────────────────────────────────

  it("I-08: metadata API failure does not crash the panel", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json({ message: "Server Error" }, { status: 500 }),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Events")).toBeInTheDocument();
    });

    errorSpy.mockRestore();
  });

  // ── Compound Mode Toggle ───────────────────────────────────────────────

  it("I-09: toggling to Compound Events shows compound config list", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json(mockEvents),
      ),
      http.get(`${BASE_URL}/api/compound-events/list`, () =>
        HttpResponse.json(mockCompoundConfigs),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Events")).toBeInTheDocument();
    });

    // Click the "Compound Events" toggle button (not the heading)
    const toggleBtn = screen.getByRole("button", { name: /compound events/i });
    await userEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText("Constituent Types")).toBeInTheDocument();
    });
  });

  it("I-10: compound config list displays config data from API", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json(mockEvents),
      ),
      http.get(`${BASE_URL}/api/compound-events/list`, () =>
        HttpResponse.json(mockCompoundConfigs),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Events")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole("button", { name: /compound events/i });
    await userEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText("compound intrusion")).toBeInTheDocument();
    });
    expect(screen.getByText("geofence intrusion")).toBeInTheDocument();
    expect(screen.getByText("dark activity")).toBeInTheDocument();
  });

  // ── Mode Toggle Clears Selection ───────────────────────────────────────

  it("I-11: switching mode clears selected event via onSelectEvent", async () => {
    const onSelect = vi.fn();
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json(mockEvents),
      ),
      http.get(`${BASE_URL}/api/compound-events/list`, () =>
        HttpResponse.json(mockCompoundConfigs),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={onSelect} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Events")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole("button", { name: /compound events/i });
    await userEvent.click(toggleBtn);

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  it("E-01: refresh button refetches events data", async () => {
    let fetchCount = 0;
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () => {
        fetchCount++;
        return HttpResponse.json(mockEvents);
      }),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("EVT-001-")).toBeInTheDocument();
    });

    const initialCount = fetchCount;
    const refreshBtn = screen.getByLabelText("Refresh");
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchCount).toBeGreaterThan(initialCount);
    });
  });

  it("E-02: event with no vessels shows dash placeholder", async () => {
    mockApi.use(
      http.get(`${BASE_URL}/api/mongo-events/metadata`, () =>
        HttpResponse.json(mockMetadata),
      ),
      http.get(`${BASE_URL}/api/mongo-events/list`, () =>
        HttpResponse.json({
          events: [
            {
              ...mockEvents.events[0],
              id: "evt-no-vessel",
              vessels_involved: [],
            },
          ],
          total: 1,
          limit: 25,
          offset: 0,
        }),
      ),
    );

    renderWithProviders(
      <EventTablePanel selectedEvent={null} onSelectEvent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("EVT-NO-V")).toBeInTheDocument();
    });
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
