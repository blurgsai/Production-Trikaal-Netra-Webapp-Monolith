import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import L from "leaflet";
import { fetchVesselInfo } from "./vesselInfoApi";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("vesselInfoApi", () => {
  it("returns first feature properties", async () => {
    const response = {
      features: [
        {
          properties: {
            id: "1",
            vessel_id: "1",
            location_current_lat: "10",
            location_current_lon: "20",
            heading_current_consensusvalue: "30",
            speed_current_consensusvalue: "5",
            name: "Vessel A",
          },
        },
      ],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(response),
    });

    const latlng = L.latLng(10, 20);
    const point = L.point(100, 100);
    const size = L.point(800, 600);
    const bounds = L.latLngBounds([0, 0], [20, 30]);

    const result = await fetchVesselInfo(latlng, point, size, bounds);
    expect(result).toEqual(response.features[0].properties);
  });

  it("returns null when no features found", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ features: [] }),
    });

    const result = await fetchVesselInfo(L.latLng(0, 0), L.point(0, 0), L.point(100, 100), L.latLngBounds([0, 0], [1, 1]));
    expect(result).toBeNull();
  });
});
