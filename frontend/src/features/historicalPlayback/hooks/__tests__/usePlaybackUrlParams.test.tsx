import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { usePlaybackUrlParams } from "../usePlaybackUrlParams";

function createWrapper(initialSearch: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[`/historical-playback?${initialSearch}`]}>
        {children}
      </MemoryRouter>
    );
  };
}

function renderHookWithSearch<T>(search: string, hook: () => T) {
  return renderHook(hook, { wrapper: createWrapper(search) });
}

describe("usePlaybackUrlParams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No params ─────────────────────────────────────────────────────

  describe("no params", () => {
    it("returns all defaults and hasParams=false when URL has no params", () => {
      const { result } = renderHookWithSearch("", () => usePlaybackUrlParams());
      expect(result.current.start).toBeUndefined();
      expect(result.current.end).toBeUndefined();
      expect(result.current.granularity).toBeUndefined();
      expect(result.current.zone).toBeUndefined();
      expect(result.current.filters).toEqual([]);
      expect(result.current.hasParams).toBe(false);
    });
  });

  // ── start / end ───────────────────────────────────────────────────

  describe("start / end", () => {
    it("parses start datetime", () => {
      const { result } = renderHookWithSearch(
        "start=2025-01-01T10:00",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.start).toBe("2025-01-01T10:00");
      expect(result.current.hasParams).toBe(true);
    });

    it("parses end datetime", () => {
      const { result } = renderHookWithSearch(
        "end=2025-01-01T12:00",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.end).toBe("2025-01-01T12:00");
      expect(result.current.hasParams).toBe(true);
    });

    it("parses both start and end", () => {
      const { result } = renderHookWithSearch(
        "start=2025-01-01T10:00&end=2025-01-01T12:00",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.start).toBe("2025-01-01T10:00");
      expect(result.current.end).toBe("2025-01-01T12:00");
    });
  });

  // ── granularity ───────────────────────────────────────────────────

  describe("granularity", () => {
    it("parses valid granularity=minute", () => {
      const { result } = renderHookWithSearch("granularity=minute", () => usePlaybackUrlParams());
      expect(result.current.granularity).toBe("minute");
      expect(result.current.hasParams).toBe(true);
    });

    it("parses valid granularity=hour", () => {
      const { result } = renderHookWithSearch("granularity=hour", () => usePlaybackUrlParams());
      expect(result.current.granularity).toBe("hour");
    });

    it("parses valid granularity=day", () => {
      const { result } = renderHookWithSearch("granularity=day", () => usePlaybackUrlParams());
      expect(result.current.granularity).toBe("day");
    });

    it("parses valid granularity=week", () => {
      const { result } = renderHookWithSearch("granularity=week", () => usePlaybackUrlParams());
      expect(result.current.granularity).toBe("week");
    });

    it("returns undefined for invalid granularity", () => {
      const { result } = renderHookWithSearch("granularity=month", () => usePlaybackUrlParams());
      expect(result.current.granularity).toBeUndefined();
    });
  });

  // ── zone ──────────────────────────────────────────────────────────

  describe("zone", () => {
    it("parses a single zone with 3 points (6 coords)", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5,73.2",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.zone).toBeDefined();
      expect(result.current.zone?.type).toBe("Feature");
      const geom = result.current.zone?.geometry as GeoJSON.Polygon;
      expect(geom.type).toBe("Polygon");
      expect(geom.coordinates[0]).toHaveLength(4);
      expect(geom.coordinates[0][0]).toEqual([72.8, 18.4]);
      expect(geom.coordinates[0][3]).toEqual([72.8, 18.4]);
      expect(result.current.hasParams).toBe(true);
    });

    it("parses a 4-point polygon (8 coords)", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5,73.2,18.3,72.9",
        () => usePlaybackUrlParams(),
      );
      const geom = result.current.zone?.geometry as GeoJSON.Polygon;
      expect(geom.coordinates[0]).toHaveLength(5);
    });

    it("parses multiple zone params as MultiPolygon", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5,73.2&zone=19.0,74.0,19.2,74.2,19.1,74.1",
        () => usePlaybackUrlParams(),
      );
      const geom = result.current.zone?.geometry as GeoJSON.MultiPolygon;
      expect(geom.type).toBe("MultiPolygon");
      expect(geom.coordinates).toHaveLength(2);
    });

    it("rejects zone with fewer than 3 points (< 6 coords)", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.zone).toBeUndefined();
    });

    it("rejects zone with odd number of coords", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.zone).toBeUndefined();
    });

    it("rejects zone with NaN coordinates", () => {
      const { result } = renderHookWithSearch(
        "zone=abc,72.8,18.6,73.0,18.5,73.2",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.zone).toBeUndefined();
    });

    it("closes the ring automatically", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5,73.2",
        () => usePlaybackUrlParams(),
      );
      const geom = result.current.zone?.geometry as GeoJSON.Polygon;
      const ring = geom.coordinates[0];
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    });

    it("returns undefined when zone is absent", () => {
      const { result } = renderHookWithSearch("", () => usePlaybackUrlParams());
      expect(result.current.zone).toBeUndefined();
    });
  });

  // ── Filters: MMSI ─────────────────────────────────────────────────

  describe("mmsi filter", () => {
    it("parses single MMSI", () => {
      const { result } = renderHookWithSearch("mmsi=123456789", () => usePlaybackUrlParams());
      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toEqual({
        field: "mmsi",
        operator: "eq",
        value: "123456789",
        combinator: undefined,
      });
      expect(result.current.hasParams).toBe(true);
    });

    it("parses multiple MMSI (repeatable)", () => {
      const { result } = renderHookWithSearch(
        "mmsi=123456789&mmsi=987654321",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[0].value).toBe("123456789");
      expect(result.current.filters[1].value).toBe("987654321");
      expect(result.current.filters[1].combinator).toBe("AND");
    });

    it("skips empty MMSI", () => {
      const { result } = renderHookWithSearch("mmsi=", () => usePlaybackUrlParams());
      expect(result.current.filters).toHaveLength(0);
    });
  });

  // ── Filters: vessel_id ────────────────────────────────────────────

  describe("vessel_id filter", () => {
    it("parses single vessel_id", () => {
      const { result } = renderHookWithSearch("vessel_id=42", () => usePlaybackUrlParams());
      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toEqual({
        field: "vesselId",
        operator: "eq",
        value: "42",
        combinator: undefined,
      });
    });

    it("parses multiple vessel_ids", () => {
      const { result } = renderHookWithSearch(
        "vessel_id=1&vessel_id=2",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[1].combinator).toBe("AND");
    });
  });

  // ── Filters: speed range ──────────────────────────────────────────

  describe("speed filter", () => {
    it("parses speed_min as gte", () => {
      const { result } = renderHookWithSearch("speed_min=10", () => usePlaybackUrlParams());
      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toEqual({
        field: "speed",
        operator: "gte",
        value: "10",
        combinator: undefined,
      });
    });

    it("parses speed_max as lte", () => {
      const { result } = renderHookWithSearch("speed_max=25", () => usePlaybackUrlParams());
      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].operator).toBe("lte");
      expect(result.current.filters[0].value).toBe("25");
    });

    it("parses both speed_min and speed_max as range", () => {
      const { result } = renderHookWithSearch(
        "speed_min=10&speed_max=25",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[0].operator).toBe("gte");
      expect(result.current.filters[1].operator).toBe("lte");
      expect(result.current.filters[1].combinator).toBe("AND");
    });
  });

  // ── Filters: text fields (like operator) ──────────────────────────

  describe("text filters (like operator)", () => {
    it("parses ship_name", () => {
      const { result } = renderHookWithSearch("ship_name=USS Nimitz", () => usePlaybackUrlParams());
      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toEqual({
        field: "shipName",
        operator: "like",
        value: "USS Nimitz",
        combinator: undefined,
      });
    });

    it("parses destination", () => {
      const { result } = renderHookWithSearch("destination=Singapore", () => usePlaybackUrlParams());
      expect(result.current.filters[0].field).toBe("destination");
      expect(result.current.filters[0].operator).toBe("like");
    });

    it("parses callsign", () => {
      const { result } = renderHookWithSearch("callsign=ABC123", () => usePlaybackUrlParams());
      expect(result.current.filters[0].field).toBe("callsign");
      expect(result.current.filters[0].operator).toBe("like");
    });
  });

  // ── Filters: navigation status ────────────────────────────────────

  describe("nav_status filter", () => {
    it("parses nav_status as eq", () => {
      const { result } = renderHookWithSearch("nav_status=0", () => usePlaybackUrlParams());
      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toEqual({
        field: "navigationStatus",
        operator: "eq",
        value: "0",
        combinator: undefined,
      });
    });
  });

  // ── Filters: heading / course range ───────────────────────────────

  describe("heading and course filters", () => {
    it("parses heading_min and heading_max", () => {
      const { result } = renderHookWithSearch(
        "heading_min=90&heading_max=270",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[0].field).toBe("heading");
      expect(result.current.filters[0].operator).toBe("gte");
      expect(result.current.filters[1].field).toBe("heading");
      expect(result.current.filters[1].operator).toBe("lte");
    });

    it("parses course_min and course_max", () => {
      const { result } = renderHookWithSearch(
        "course_min=0&course_max=180",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.filters).toHaveLength(2);
      expect(result.current.filters[0].field).toBe("course");
      expect(result.current.filters[0].operator).toBe("gte");
      expect(result.current.filters[1].field).toBe("course");
      expect(result.current.filters[1].operator).toBe("lte");
    });
  });

  // ── Filter combinator logic ───────────────────────────────────────

  describe("combinator logic", () => {
    it("first filter has undefined combinator", () => {
      const { result } = renderHookWithSearch("mmsi=123", () => usePlaybackUrlParams());
      expect(result.current.filters[0].combinator).toBeUndefined();
    });

    it("subsequent filters have AND combinator", () => {
      const { result } = renderHookWithSearch(
        "mmsi=123&speed_min=10",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.filters[0].combinator).toBeUndefined();
      expect(result.current.filters[1].combinator).toBe("AND");
    });
  });

  // ── hasParams ─────────────────────────────────────────────────────

  describe("hasParams", () => {
    it("is false when no params present", () => {
      const { result } = renderHookWithSearch("", () => usePlaybackUrlParams());
      expect(result.current.hasParams).toBe(false);
    });

    it("is true when only start is present", () => {
      const { result } = renderHookWithSearch("start=2025-01-01", () => usePlaybackUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only end is present", () => {
      const { result } = renderHookWithSearch("end=2025-01-01", () => usePlaybackUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only granularity is present", () => {
      const { result } = renderHookWithSearch("granularity=hour", () => usePlaybackUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only zone is present", () => {
      const { result } = renderHookWithSearch(
        "zone=18.4,72.8,18.6,73.0,18.5,73.2",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only mmsi is present", () => {
      const { result } = renderHookWithSearch("mmsi=123", () => usePlaybackUrlParams());
      expect(result.current.hasParams).toBe(true);
    });
  });

  // ── Combined ──────────────────────────────────────────────────────

  describe("combined params", () => {
    it("parses all params together", () => {
      const { result } = renderHookWithSearch(
        "start=2025-01-01T10:00&end=2025-01-01T12:00&granularity=minute" +
        "&zone=18.4,72.8,18.6,73.0,18.5,73.2" +
        "&mmsi=123456789&speed_min=10&speed_max=25&ship_name=Nimitz",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.start).toBe("2025-01-01T10:00");
      expect(result.current.end).toBe("2025-01-01T12:00");
      expect(result.current.granularity).toBe("minute");
      expect(result.current.zone).toBeDefined();
      expect(result.current.filters).toHaveLength(4);
      expect(result.current.hasParams).toBe(true);
    });

    it("does not mutate the URL (one-way: read-only)", () => {
      const { result } = renderHookWithSearch(
        "start=2025-01-01&granularity=hour",
        () => usePlaybackUrlParams(),
      );
      expect(result.current.start).toBe("2025-01-01");
      expect(result.current.granularity).toBe("hour");
    });
  });
});
