import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse, delay } from "msw";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";
import { PlaybackPanel } from "../PlaybackPanel";

// Mock react-leaflet at top level — jsdom doesn't support Leaflet's DOM APIs
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }: { children?: ReactNode }) => <div data-testid="circle-marker">{children}</div>,
  Polyline: () => null,
  Polygon: ({ children }: { children?: ReactNode }) => <div data-testid="polygon">{children}</div>,
  Tooltip: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  useMap: () => ({ setView: vi.fn() }),
}));

function renderWithProviders(component: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        {component}
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const mockPlaybackResponse = {
  event_details: {
    id: "evt-001",
    type: "geofence_intrusion",
    compound: false,
    location: { type: "Point", coordinates: [67.2, 24.08] },
    timestamp: "2024-06-15T12:20:00Z",
    start_time: "2024-06-15T11:35:00Z",
    end_time: "2024-06-15T12:20:00Z",
    duration: { value: 2700, unit: "seconds" },
    vessels_involved: ["366168522"],
    severity: "high",
    model: "heuristic",
    status: "detected",
    s2_cell_id: "89c260100000000",
    temporality: "bounded",
    event_source: "spark",
    information: {
      geofence_id: "pak_eez_001",
      geofence_name: "Pakistan EEZ",
      Has_exited_polygon: false,
    },
  },
  geofence_polygon: {
    geofence_id: "pak_eez_001",
    asset_name: "Pakistan EEZ",
    polygon: {
      type: "Polygon",
      coordinates: [[[65.0, 22.5], [69.5, 22.5], [70.2, 24.0], [69.0, 25.8], [66.5, 25.8], [65.0, 24.8], [65.0, 22.5]]],
    },
  },
  trajectories: {
    "1718440500000": {
      "366168522": { latitude: 23.8, longitude: 71.5, speed_mps: 5.7, heading: 275, course: 273 },
    },
    "1718441400000": {
      "366168522": { latitude: 23.83, longitude: 71.0, speed_mps: 5.6, heading: 277, course: 275 },
    },
    "1718464800000": {
      "366168522": { latitude: 24.34, longitude: 62.88, speed_mps: 5.1, heading: 252, course: 250 },
    },
  },
  time_window: {
    query_start: 1718440500000,
    query_end: 1718464800000,
    event_start: 1718451300000,
    event_end: 1718454000000,
    buffer_hours: 3,
  },
};

beforeEach(() => {
  localStorage.setItem("token", "test-token");
});

describe("PlaybackPanel integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  it("I-01: shows loading spinner while fetching playback data", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", async () => {
        await delay(5000);
        return HttpResponse.json(mockPlaybackResponse);
      }),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  it("I-02: renders event info panel with event ID on success", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("evt-001")).toBeInTheDocument();
    });
  });

  it("I-03: displays event type as human-readable title", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("geofence intrusion")).toBeInTheDocument();
    });
  });

  it("I-04: shows severity and status chips", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("high")).toBeInTheDocument();
    });
    expect(screen.getByText("detected")).toBeInTheDocument();
  });

  it("I-05: shows vessel count in info panel", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Vessels")).toBeInTheDocument();
    });
    const vesselRow = screen.getByText("Vessels").closest("div");
    expect(vesselRow).toHaveTextContent("1");
  });

  it("I-06: displays event information fields in info panel", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/geofence id/i)).toBeInTheDocument();
    });
    expect(screen.getByText("pak_eez_001")).toBeInTheDocument();
    expect(screen.getByText(/geofence name/i)).toBeInTheDocument();
    expect(screen.getAllByText("Pakistan EEZ").length).toBeGreaterThan(0);
  });

  // ── Playback Controls ──────────────────────────────────────────────────

  it("I-07: play/pause button toggles between play and pause icons", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("evt-001")).toBeInTheDocument();
    });

    const playBtn = screen.getByTestId("PlayArrowIcon").closest("button")!;
    await userEvent.click(playBtn);

    await waitFor(() => {
      expect(screen.getByTestId("PauseIcon")).toBeInTheDocument();
    });
  });

  it("I-08: seek slider is rendered with correct time range", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("slider")).toBeInTheDocument();
    });
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "1718440500000");
    expect(slider).toHaveAttribute("aria-valuemax", "1718464800000");
  });

  it("I-09: expanding/collapsing info panel toggles detail rows", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(mockPlaybackResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("evt-001")).toBeInTheDocument();
    });

    expect(screen.getByText("Vessels")).toBeInTheDocument();

    // Find the expand button inside EventInfoPanel — it's the IconButton
    // in the same Stack row as the event ID text
    const eventIdEl = screen.getByText("evt-001");
    const stackRow = eventIdEl.parentElement!; // Stack direction="row"
    const expandBtn = stackRow.querySelector("button")!;
    await userEvent.click(expandBtn);

    // MUI Collapse hides elements but doesn't remove from DOM
    await waitFor(() => {
      expect(screen.getByText("Vessels")).not.toBeVisible();
    });
  });

  // ── Error State ────────────────────────────────────────────────────────

  it("I-10: shows error message when mock fetch fails", async () => {
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json({ message: "Not found" }, { status: 404 }),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-001" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Mock not found for event type/)).toBeInTheDocument();
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  it("E-01: compound event shows Compound chip in info panel", async () => {
    const compoundResponse = {
      ...mockPlaybackResponse,
      event_details: {
        ...mockPlaybackResponse.event_details,
        constituent_types: ["geofence_intrusion", "dark_activity"],
      },
    };
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(compoundResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-compound-001" eventType="compound_event" isCompound={true} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Compound")).toBeInTheDocument();
    });
  });

  it("E-02: event with no end time still renders without crashing", async () => {
    const noEndResponse = {
      ...mockPlaybackResponse,
      event_details: {
        ...mockPlaybackResponse.event_details,
        end_time: null,
      },
      time_window: {
        query_start: 1718440500000,
        query_end: null,
        event_start: 1718451300000,
        event_end: null,
        buffer_hours: 3,
      },
    };
    mockApi.use(
      http.get("/mock/playback/:eventType.json", () =>
        HttpResponse.json(noEndResponse),
      ),
    );

    renderWithProviders(
      <PlaybackPanel eventId="evt-002" eventType="geofence_intrusion" isCompound={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("evt-002")).toBeInTheDocument();
    });
  });
});
