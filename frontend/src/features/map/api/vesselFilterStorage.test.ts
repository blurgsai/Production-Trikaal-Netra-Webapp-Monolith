import { describe, it, expect, beforeEach } from "vitest";
import { loadSavedFilters, saveFilter, deleteSavedFilter } from "./vesselFilterStorage";
import type { VesselTableFilter } from "../model/types";

beforeEach(() => {
  localStorage.clear();
});

describe("vesselFilterStorage", () => {
  it("returns empty array when no filters are saved", () => {
    expect(loadSavedFilters()).toEqual([]);
  });

  it("saves a new filter set", () => {
    const filters: VesselTableFilter[] = [{ column: "identification_mmsi", operator: "=", value: "201" }];
    const updated = saveFilter("test", filters);
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("test");
    expect(updated[0].filters).toEqual(filters);
  });

  it("updates existing filter by name", () => {
    saveFilter("test", [{ column: "identification_mmsi", operator: "=", value: "201" }]);
    const updated = saveFilter("test", [{ column: "navigationstatus", operator: "=", value: "Under way" }]);
    expect(updated).toHaveLength(1);
    expect(updated[0].filters).toEqual([{ column: "navigationstatus", operator: "=", value: "Under way" }]);
  });

  it("saves polygon filters alongside table filters", () => {
    const polygon = { id: "1", points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }] };
    const updated = saveFilter("poly", [{ column: "identification_mmsi", operator: "=", value: "201" }], [polygon]);
    expect(updated[0].polygonFilters).toEqual([polygon]);
    expect(loadSavedFilters()[0].polygonFilters).toEqual([polygon]);
  });

  it("deletes a saved filter", () => {
    saveFilter("a", [{ column: "identification_mmsi", operator: "=", value: "201" }]);
    saveFilter("b", [{ column: "navigationstatus", operator: "=", value: "Under way" }]);
    const updated = deleteSavedFilter("a");
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("b");
  });

  it("returns empty array on invalid localStorage data", () => {
    localStorage.setItem("trikaal_saved_vessel_filters", "not json");
    expect(loadSavedFilters()).toEqual([]);
  });
});
