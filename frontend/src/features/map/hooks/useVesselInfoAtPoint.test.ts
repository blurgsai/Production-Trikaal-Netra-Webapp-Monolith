import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVesselInfoAtPoint } from "./useVesselInfoAtPoint";
import * as api from "../api/vesselInfoApi";
import * as mappers from "../model/mappers";
import L from "leaflet";

let registeredHandler: ((e: L.LeafletMouseEvent) => void) | null = null;

vi.mock("react-leaflet", () => ({
  useMapEvents: (handlers: { click?: (e: L.LeafletMouseEvent) => void }) => {
    registeredHandler = handlers.click ?? null;
  },
}));

vi.mock("../api/vesselInfoApi", () => ({
  fetchVesselInfo: vi.fn(),
}));

vi.mock("../model/mappers", () => ({
  mapRawVesselToInfo: vi.fn(),
}));

describe("useVesselInfoAtPoint", () => {
  it("calls onVesselSelect and onVesselClick when a vessel is found", async () => {
    const onVesselSelect = vi.fn();
    const onVesselClick = vi.fn();
    const vesselInfo = { id: "1", locationCurrentLat: 10, locationCurrentLon: 20 } as ReturnType<typeof mappers.mapRawVesselToInfo>;
    const raw = { id: "1" };

    vi.mocked(api.fetchVesselInfo).mockResolvedValue(raw);
    vi.mocked(mappers.mapRawVesselToInfo).mockReturnValue(vesselInfo);

    renderHook(() => useVesselInfoAtPoint({ onVesselSelect, onVesselClick }));

    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    const map = L.map(container).setView([10, 20], 5);
    const latlng = L.latLng(10, 20);
    const event = { target: map, latlng } as unknown as L.LeafletMouseEvent;

    await registeredHandler?.(event);

    document.body.removeChild(container);

    expect(api.fetchVesselInfo).toHaveBeenCalledOnce();
    expect(mappers.mapRawVesselToInfo).toHaveBeenCalledWith(raw);
    expect(onVesselSelect).toHaveBeenCalledWith(vesselInfo, { lat: 10, lng: 20 });
    expect(onVesselClick).toHaveBeenCalledWith(vesselInfo);
  });
});
