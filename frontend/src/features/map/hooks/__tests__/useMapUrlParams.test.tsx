import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useMapUrlParams } from "../useMapUrlParams";

function createWrapper(initialSearch: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[`/map?${initialSearch}`]}>
        {children}
      </MemoryRouter>
    );
  };
}

function renderHookWithSearch<T>(search: string, hook: () => T) {
  return renderHook(hook, { wrapper: createWrapper(search) });
}

describe("useMapUrlParams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty / no params ────────────────────────────────────────────────

  describe("no params", () => {
    it("returns all defaults and hasParams=false when URL has no params", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.vessel).toBeUndefined();
      expect(result.current.track).toBeUndefined();
      expect(result.current.zone).toEqual([]);
      expect(result.current.flyto).toBeUndefined();
      expect(result.current.layers).toEqual([]);
      expect(result.current.basemap).toBeUndefined();
      expect(result.current.briefing).toBe(false);
      expect(result.current.view).toEqual([]);
      expect(result.current.filters).toEqual([]);
      expect(result.current.hasParams).toBe(false);
    });
  });

  // ── vessel ───────────────────────────────────────────────────────────

  describe("vessel", () => {
    it("parses vessel MMSI string", () => {
      const { result } = renderHookWithSearch("vessel=123456789", () => useMapUrlParams());
      expect(result.current.vessel).toBe("123456789");
      expect(result.current.hasParams).toBe(true);
    });

    it("returns undefined when vessel param is absent", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.vessel).toBeUndefined();
    });
  });

  // ── track ────────────────────────────────────────────────────────────

  describe("track", () => {
    it("parses track as integer", () => {
      const { result } = renderHookWithSearch("track=3600", () => useMapUrlParams());
      expect(result.current.track).toBe(3600);
      expect(result.current.hasParams).toBe(true);
    });

    it("returns undefined when track is absent", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.track).toBeUndefined();
    });

    it("handles NaN track gracefully (parseInt('abc') → NaN, falsy → undefined)", () => {
      const { result } = renderHookWithSearch("track=abc", () => useMapUrlParams());
      expect(Number.isNaN(result.current.track)).toBe(true);
    });
  });

  // ── zone (polygon filters) ───────────────────────────────────────────

  describe("zone", () => {
    it("parses a single zone with 3 points (6 coords)", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5,73.2",
        () => useMapUrlParams(),
      );
      expect(result.current.zone).toHaveLength(1);
      expect(result.current.zone[0].id).toBe("url-zone-0");
      expect(result.current.zone[0].points).toEqual([
        { lat: 18.4, lng: 72.8 },
        { lat: 18.6, lng: 73.0 },
        { lat: 18.5, lng: 73.2 },
      ]);
      expect(result.current.hasParams).toBe(true);
    });

    it("parses multiple zone params", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5,73.2&zone=19.0,73.0,19.2,73.2,19.1,73.3",
        () => useMapUrlParams(),
      );
      expect(result.current.zone).toHaveLength(2);
      expect(result.current.zone[0].id).toBe("url-zone-0");
      expect(result.current.zone[1].id).toBe("url-zone-1");
    });

    it("rejects zone with fewer than 3 points (< 6 coords)", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0",
        () => useMapUrlParams(),
      );
      expect(result.current.zone).toEqual([]);
    });

    it("rejects zone with odd number of coords", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5",
        () => useMapUrlParams(),
      );
      expect(result.current.zone).toEqual([]);
    });

    it("rejects zone with NaN coordinates", () => {
      const { result } = renderHookWithSearch(
        "zone=abc,72.8,18.6,73.0,18.5,73.2",
        () => useMapUrlParams(),
      );
      expect(result.current.zone).toEqual([]);
    });

    it("parses a 4-point polygon (8 coords)", () => {
      const { result } = renderHookWithSearch(
        "zone=10,20,30,40,50,60,70,80",
        () => useMapUrlParams(),
      );
      expect(result.current.zone).toHaveLength(1);
      expect(result.current.zone[0].points).toHaveLength(4);
    });
  });

  // ── flyto ────────────────────────────────────────────────────────────

  describe("flyto", () => {
    it("parses 4-number bounding box and swaps to [minLng, minLat, maxLng, maxLat]", () => {
      const { result } = renderHookWithSearch(
        "flyto=18.4,72.8,18.6,73.0",
        () => useMapUrlParams(),
      );
      expect(result.current.flyto).toEqual([72.8, 18.4, 73.0, 18.6]);
      expect(result.current.hasParams).toBe(true);
    });

    it("returns undefined when flyto is absent", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.flyto).toBeUndefined();
    });

    it("returns undefined when flyto has wrong number of parts", () => {
      const { result } = renderHookWithSearch("flyto=1,2,3", () => useMapUrlParams());
      expect(result.current.flyto).toBeUndefined();
    });

    it("returns undefined when flyto has NaN values", () => {
      const { result } = renderHookWithSearch("flyto=abc,2,3,4", () => useMapUrlParams());
      expect(result.current.flyto).toBeUndefined();
    });
  });

  // ── layers ───────────────────────────────────────────────────────────

  describe("layers", () => {
    it("parses comma-separated layer IDs", () => {
      const { result } = renderHookWithSearch(
        "layers=eez,weather,clouds_new",
        () => useMapUrlParams(),
      );
      expect(result.current.layers).toEqual(["eez", "weather", "clouds_new"]);
      expect(result.current.hasParams).toBe(true);
    });

    it("trims whitespace from layer IDs", () => {
      const { result } = renderHookWithSearch(
        "layers=eez, weather , clouds_new",
        () => useMapUrlParams(),
      );
      expect(result.current.layers).toEqual(["eez", "weather", "clouds_new"]);
    });

    it("filters out empty strings from layers", () => {
      const { result } = renderHookWithSearch("layers=eez,,weather,", () => useMapUrlParams());
      expect(result.current.layers).toEqual(["eez", "weather"]);
    });

    it("returns empty array when layers is absent", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.layers).toEqual([]);
    });
  });

  // ── basemap ──────────────────────────────────────────────────────────

  describe("basemap", () => {
    it("parses basemap ID", () => {
      const { result } = renderHookWithSearch("basemap=dark", () => useMapUrlParams());
      expect(result.current.basemap).toBe("dark");
      expect(result.current.hasParams).toBe(true);
    });

    it("returns undefined when basemap is absent", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.basemap).toBeUndefined();
    });
  });

  // ── briefing ─────────────────────────────────────────────────────────

  describe("briefing", () => {
    it("is true when briefing=1", () => {
      const { result } = renderHookWithSearch("briefing=1", () => useMapUrlParams());
      expect(result.current.briefing).toBe(true);
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when briefing=true", () => {
      const { result } = renderHookWithSearch("briefing=true", () => useMapUrlParams());
      expect(result.current.briefing).toBe(true);
    });

    it("is false when briefing=0", () => {
      const { result } = renderHookWithSearch("briefing=0", () => useMapUrlParams());
      expect(result.current.briefing).toBe(false);
    });

    it("is false when briefing is absent", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.briefing).toBe(false);
    });

    it("is false for arbitrary string", () => {
      const { result } = renderHookWithSearch("briefing=yes", () => useMapUrlParams());
      expect(result.current.briefing).toBe(false);
    });
  });

  // ── view ─────────────────────────────────────────────────────────────

  describe("view", () => {
    it("parses comma-separated valid tile names", () => {
      const { result } = renderHookWithSearch("view=map,table", () => useMapUrlParams());
      expect(result.current.view).toEqual(["map", "table"]);
      expect(result.current.hasParams).toBe(true);
    });

    it("filters out invalid tile names", () => {
      const { result } = renderHookWithSearch("view=map,invalid,table", () => useMapUrlParams());
      expect(result.current.view).toEqual(["map", "table"]);
    });

    it("trims whitespace", () => {
      const { result } = renderHookWithSearch("view= map , table , charts ", () => useMapUrlParams());
      expect(result.current.view).toEqual(["map", "table", "charts"]);
    });

    it("returns empty array when all tiles are invalid", () => {
      const { result } = renderHookWithSearch("view=foo,bar", () => useMapUrlParams());
      expect(result.current.view).toEqual([]);
    });

    it("returns empty array when view is absent", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.view).toEqual([]);
    });

    it("accepts all 5 valid tile types", () => {
      const { result } = renderHookWithSearch(
        "view=map,table,layers,vessel,charts",
        () => useMapUrlParams(),
      );
      expect(result.current.view).toEqual(["map", "table", "layers", "vessel", "charts"]);
    });
  });

  // ── filters (dynamic column filters) ─────────────────────────────────

  describe("filters", () => {
    it("parses a bare value as '=' operator", () => {
      const { result } = renderHookWithSearch("vessel_type=cargo", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "vessel_type", operator: "=", value: "cargo", combinator: "AND" },
      ]);
      expect(result.current.hasParams).toBe(true);
    });

    it("parses '!=' operator", () => {
      const { result } = renderHookWithSearch("vessel_type=!=fishing", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "vessel_type", operator: "!=", value: "fishing", combinator: "AND" },
      ]);
    });

    it("parses '>=' operator", () => {
      const { result } = renderHookWithSearch("speed=>=15", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "speed", operator: ">=", value: "15", combinator: "AND" },
      ]);
    });

    it("parses '<=' operator", () => {
      const { result } = renderHookWithSearch("speed=<=25", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "speed", operator: "<=", value: "25", combinator: "AND" },
      ]);
    });

    it("parses '>' operator", () => {
      const { result } = renderHookWithSearch("speed=>15", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "speed", operator: ">", value: "15", combinator: "AND" },
      ]);
    });

    it("parses '<' operator", () => {
      const { result } = renderHookWithSearch("speed=<5", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "speed", operator: "<", value: "5", combinator: "AND" },
      ]);
    });

    it("parses 'contains:' operator", () => {
      const { result } = renderHookWithSearch("name=contains:MAERSK", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "name", operator: "contains", value: "MAERSK", combinator: "AND" },
      ]);
    });

    it("parses 'starts:' operator", () => {
      const { result } = renderHookWithSearch("name=starts:USS", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "name", operator: "startsWith", value: "USS", combinator: "AND" },
      ]);
    });

    it("parses 'ends:' operator", () => {
      const { result } = renderHookWithSearch("name=ends:LINE", () => useMapUrlParams());
      expect(result.current.filters).toEqual([
        { column: "name", operator: "endsWith", value: "LINE", combinator: "AND" },
      ]);
    });

    it("parses multiple filters on different columns", () => {
      const { result } = renderHookWithSearch(
        "vessel_type=cargo&speed=>=15",
        () => useMapUrlParams(),
      );
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[0].column).toBe("vessel_type");
      expect(result.current.filters[1].column).toBe("speed");
    });

    it("parses multiple filters on the same column (e.g. range)", () => {
      const { result } = renderHookWithSearch(
        "speed=>=5&speed=<=25",
        () => useMapUrlParams(),
      );
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[0]).toEqual({
        column: "speed", operator: ">=", value: "5", combinator: "AND",
      });
      expect(result.current.filters[1]).toEqual({
        column: "speed", operator: "<=", value: "25", combinator: "AND",
      });
    });

    it("skips reserved params (vessel, track, zone, flyto, layers, basemap, briefing, view)", () => {
      const { result } = renderHookWithSearch(
        "vessel=123&track=3600&zone=1,2,3,4,5,6&flyto=1,2,3,4&layers=eez&basemap=dark&briefing=1&view=map",
        () => useMapUrlParams(),
      );
      expect(result.current.filters).toEqual([]);
    });

    it("skips empty filter values", () => {
      const { result } = renderHookWithSearch("vessel_type=", () => useMapUrlParams());
      expect(result.current.filters).toEqual([]);
    });

    it("skips whitespace-only filter values", () => {
      const { result } = renderHookWithSearch("vessel_type=   ", () => useMapUrlParams());
      expect(result.current.filters).toEqual([]);
    });

    it("trims filter values", () => {
      const { result } = renderHookWithSearch("vessel_type=  cargo  ", () => useMapUrlParams());
      expect(result.current.filters[0].value).toBe("cargo");
    });

    it("always sets combinator to AND", () => {
      const { result } = renderHookWithSearch("a=1&b=2&c=3", () => useMapUrlParams());
      expect(result.current.filters.every((f) => f.combinator === "AND")).toBe(true);
    });
  });

  // ── hasParams ────────────────────────────────────────────────────────

  describe("hasParams", () => {
    it("is false when no params are present", () => {
      const { result } = renderHookWithSearch("", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(false);
    });

    it("is true when only vessel is present", () => {
      const { result } = renderHookWithSearch("vessel=123", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only track is present", () => {
      const { result } = renderHookWithSearch("track=3600", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only zone is present", () => {
      const { result } = renderHookWithSearch("zone=1,2,3,4,5,6", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only flyto is present", () => {
      const { result } = renderHookWithSearch("flyto=1,2,3,4", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only layers is present", () => {
      const { result } = renderHookWithSearch("layers=eez", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only basemap is present", () => {
      const { result } = renderHookWithSearch("basemap=dark", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only briefing is present", () => {
      const { result } = renderHookWithSearch("briefing=1", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only view is present", () => {
      const { result } = renderHookWithSearch("view=map", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only a column filter is present", () => {
      const { result } = renderHookWithSearch("vessel_type=cargo", () => useMapUrlParams());
      expect(result.current.hasParams).toBe(true);
    });
  });

  // ── Combined / integration ───────────────────────────────────────────

  describe("combined params", () => {
    it("parses all params together", () => {
      const { result } = renderHookWithSearch(
        "vessel=123456789&track=3600&zone=18.4,72.8,18.6,73.0,18.5,73.2" +
        "&flyto=18.4,72.8,18.6,73.0&layers=eez,weather&basemap=dark&briefing=1" +
        "&view=map,table&vessel_type=cargo&speed=>=15",
        () => useMapUrlParams(),
      );
      expect(result.current.vessel).toBe("123456789");
      expect(result.current.track).toBe(3600);
      expect(result.current.zone).toHaveLength(1);
      expect(result.current.flyto).toEqual([72.8, 18.4, 73.0, 18.6]);
      expect(result.current.layers).toEqual(["eez", "weather"]);
      expect(result.current.basemap).toBe("dark");
      expect(result.current.briefing).toBe(true);
      expect(result.current.view).toEqual(["map", "table"]);
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.hasParams).toBe(true);
    });

    it("does not mutate the URL (one-way: read-only)", () => {
      const search = "vessel=123&basemap=dark";
      const { result } = renderHookWithSearch(search, () => useMapUrlParams());
      // Just accessing the values should not throw or change anything
      expect(result.current.vessel).toBe("123");
      expect(result.current.basemap).toBe("dark");
    });
  });

  // ── Operator precedence ──────────────────────────────────────────────

  describe("operator precedence", () => {
    it("'>=' takes precedence over '>'", () => {
      const { result } = renderHookWithSearch("speed=>=10", () => useMapUrlParams());
      expect(result.current.filters[0].operator).toBe(">=");
      expect(result.current.filters[0].value).toBe("10");
    });

    it("'<=' takes precedence over '<'", () => {
      const { result } = renderHookWithSearch("speed=<=10", () => useMapUrlParams());
      expect(result.current.filters[0].operator).toBe("<=");
      expect(result.current.filters[0].value).toBe("10");
    });

    it("'!=' takes precedence over '='", () => {
      const { result } = renderHookWithSearch("type=!=cargo", () => useMapUrlParams());
      expect(result.current.filters[0].operator).toBe("!=");
      expect(result.current.filters[0].value).toBe("cargo");
    });

    it("'contains:' beats bare '=' fallback", () => {
      const { result } = renderHookWithSearch("name=contains:ABC", () => useMapUrlParams());
      expect(result.current.filters[0].operator).toBe("contains");
      expect(result.current.filters[0].value).toBe("ABC");
    });
  });
});
