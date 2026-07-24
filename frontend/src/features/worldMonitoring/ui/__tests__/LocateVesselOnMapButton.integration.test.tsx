import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";
import LocateVesselOnMapButton from "../LocateVesselOnMapButton";

const baseUrl = import.meta.env.VITE_BASE_URL || "http://localhost:5000";

function renderWithProviders(component: ReactNode) {
  return render(
    <ThemeProvider theme={defenseTheme}>
      <CssBaseline />
      <MemoryRouter initialEntries={["/world-monitoring/dashboard"]}>
        <Routes>
          <Route path="/world-monitoring/dashboard" element={component} />
          <Route path="/map" element={<div data-testid="map-page">Map</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("LocateVesselOnMapButton integration", () => {
  afterEach(() => {
    cleanup();
    mockApi.resetHandlers();
  });

  it("navigates to the map when one high-confidence match is found", async () => {
    mockApi.use(
      http.get(`${baseUrl}/world-monitor/vessels/search`, () =>
        HttpResponse.json({
          success: true,
          query: "Stellar",
          matches: [
            {
              vessel_id: 1,
              ship_name: "MV Stellar Voyager",
              mmsi: 123456789,
              score: 0.9,
            },
          ],
        }),
      ),
    );

    renderWithProviders(<LocateVesselOnMapButton vesselName="Stellar" />);

    await userEvent.click(screen.getByRole("button", { name: /Locate Stellar on map/i }));

    await waitFor(() => {
      expect(screen.getByTestId("map-page")).toBeInTheDocument();
    });
  });

  it("shows a picker when multiple matches are returned", async () => {
    mockApi.use(
      http.get(`${baseUrl}/world-monitor/vessels/search`, () =>
        HttpResponse.json({
          success: true,
          query: "Star",
          matches: [
            { vessel_id: 1, ship_name: "MV Sea Star", mmsi: 111111111, score: 0.5 },
            { vessel_id: 2, ship_name: "Star Queen", mmsi: 222222222, score: 0.4 },
          ],
        }),
      ),
    );

    renderWithProviders(<LocateVesselOnMapButton vesselName="Star" />);

    await userEvent.click(screen.getByRole("button", { name: /Locate Star on map/i }));

    await waitFor(() => {
      expect(screen.getByText(/Select a vessel to open on the map/i)).toBeInTheDocument();
    });
    expect(screen.getByText("MV Sea Star")).toBeInTheDocument();
    expect(screen.getByText("Star Queen")).toBeInTheDocument();
  });

  it("shows a message when no vessels match", async () => {
    mockApi.use(
      http.get(`${baseUrl}/world-monitor/vessels/search`, () =>
        HttpResponse.json({
          success: true,
          query: "Unknown",
          matches: [],
        }),
      ),
    );

    renderWithProviders(<LocateVesselOnMapButton vesselName="Unknown" />);

    await userEvent.click(screen.getByRole("button", { name: /Locate Unknown on map/i }));

    await waitFor(() => {
      expect(screen.getByText(/No vessel found matching/i)).toBeInTheDocument();
    });
  });
});
