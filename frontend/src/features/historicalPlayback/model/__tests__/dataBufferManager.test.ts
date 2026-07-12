import { describe, it, expect, vi } from "vitest";

import { TrajectoryBufferManager } from "../dataBufferManager";
import type { FetchTrajectoriesFn } from "../dataBufferManager";
import type { TimeGranularity, PlaybackFilter, TrajectoryRequest, PlaybackChunk } from "../types";

const mockGeometry: GeoJSON.Geometry = {
  type: "Polygon",
  coordinates: [
    [
      [65, 15],
      [66, 15],
      [66, 16],
      [65, 16],
      [65, 15],
    ],
  ],
};

const baseTime = "2024-12-04T16:00:00Z";
const endTime = "2024-12-04T17:00:00Z";

function createMockFetch(): FetchTrajectoriesFn & { calls: TrajectoryRequest[] } {
  const calls: TrajectoryRequest[] = [];
  const fn = vi.fn(async (payload: TrajectoryRequest) => {
    calls.push(payload);
    const chunk: PlaybackChunk = {
      chunkOffset: 0,
      chunkStart: payload.startTime ?? "",
      chunkEnd: payload.endTime ?? "",
      timestamps: [payload.startTime ?? ""],
      vessels: {
        V0001: [
          { timestamp: payload.startTime ?? "", latitude: 15.9, longitude: 65.2, heading: 45 },
        ],
      },
    };
    return chunk;
  }) as unknown as FetchTrajectoriesFn & { calls: TrajectoryRequest[] };
  fn.calls = calls;
  return fn;
}

function createManager(
  granularity: TimeGranularity = "minute",
  fetchFn?: FetchTrajectoriesFn,
) {
  return new TrajectoryBufferManager(
    baseTime,
    endTime,
    mockGeometry,
    granularity,
    [],
    fetchFn ?? createMockFetch(),
  );
}

describe("TrajectoryBufferManager", () => {
  it("loads chunk 0 data via fetch call", async () => {
    const fetchFn = createMockFetch();
    const manager = createManager("minute", fetchFn);

    const data = await manager.getChunkData(0);
    expect(data.chunkOffset).toBe(0);
    expect(Object.keys(data.vessels).length).toBeGreaterThan(0);
    expect(fetchFn.calls[0].polygon).toEqual(mockGeometry);
  });

  it("caches loaded data — second call does not refetch", async () => {
    const fetchFn = createMockFetch();
    const manager = createManager("minute", fetchFn);

    const data1 = await manager.getChunkData(0);
    const data2 = await manager.getChunkData(0);

    expect(data2).toBe(data1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("loads different chunks with different time windows", async () => {
    const fetchFn = createMockFetch();
    const manager = createManager("minute", fetchFn);

    const data0 = await manager.getChunkData(0);
    const data1 = await manager.getChunkData(1);

    expect(data0.chunkOffset).toBe(0);
    expect(data1.chunkOffset).toBe(1);
    expect(fetchFn.calls[0].startTime).not.toBe(fetchFn.calls[1].startTime);
  });

  it("getChunkOffset converts seconds to chunk index (minute)", () => {
    const manager = createManager("minute");

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(59)).toBe(0);
    expect(manager.getChunkOffset(60)).toBe(1);
    expect(manager.getChunkOffset(125)).toBe(2);
  });

  it("getChunkOffset converts seconds to chunk index (hour)", () => {
    const manager = createManager("hour");

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(3599)).toBe(0);
    expect(manager.getChunkOffset(3600)).toBe(1);
    expect(manager.getChunkOffset(7200)).toBe(2);
  });

  it("getChunkOffset converts seconds to chunk index (day)", () => {
    const manager = createManager("day");

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(86399)).toBe(0);
    expect(manager.getChunkOffset(86400)).toBe(1);
  });

  it("getChunkOffset converts seconds to chunk index (week)", () => {
    const manager = createManager("week");

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(604799)).toBe(0);
    expect(manager.getChunkOffset(604800)).toBe(1);
  });

  it("handleSliderChange returns correct chunk and data", async () => {
    const manager = createManager("minute");

    const result = await manager.handleSliderChange(65);
    expect(result.chunkOffset).toBe(1);
    expect(result.data.chunkOffset).toBe(1);
  });

  it("clear() removes all cached data", async () => {
    const fetchFn = createMockFetch();
    const manager = createManager("minute", fetchFn);

    await manager.getChunkData(0);
    manager.clear();
    await manager.getChunkData(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("updateConfig clears buffer for new geometry", async () => {
    const fetchFn = createMockFetch();
    const manager = createManager("minute", fetchFn);

    await manager.getChunkData(0);
    manager.updateConfig({
      type: "Polygon",
      coordinates: [
        [
          [70, 20],
          [71, 20],
          [71, 21],
          [70, 21],
          [70, 20],
        ],
      ],
    });

    await manager.getChunkData(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.calls[1].polygon!.type).toBe("Polygon");
  });

  it("clamps chunk end time to overall end time", async () => {
    const fetchFn = createMockFetch();
    const manager = createManager("hour", fetchFn);

    await manager.getChunkData(0);
    const chunkEnd = new Date(fetchFn.calls[0].endTime!).getTime();
    const overallEnd = new Date(endTime).getTime();
    expect(chunkEnd).toBeLessThanOrEqual(overallEnd);
  });

  // ── Filter integration tests ──

  it("passes filters in domain payload when filters are provided", async () => {
    const fetchFn = createMockFetch();
    const manager = new TrajectoryBufferManager(
      baseTime,
      endTime,
      mockGeometry,
      "minute",
      [{ field: "speed", operator: "gt", value: "10" }],
      fetchFn,
    );

    await manager.getChunkData(0);
    expect(fetchFn.calls[0].filters).toBeDefined();
    expect(fetchFn.calls[0].filters).toHaveLength(1);
    expect(fetchFn.calls[0].filters![0].field).toBe("speed");
    expect(fetchFn.calls[0].filters![0].operator).toBe("gt");
    expect(fetchFn.calls[0].filters![0].value).toBe("10");
  });

  it("passes undefined filters when no filters are provided", async () => {
    const fetchFn = createMockFetch();
    const manager = createManager("minute", fetchFn);

    await manager.getChunkData(0);
    expect(fetchFn.calls[0].filters).toBeUndefined();
  });

  it("passes undefined filters when filters array is empty", async () => {
    const fetchFn = createMockFetch();
    const manager = new TrajectoryBufferManager(
      baseTime,
      endTime,
      mockGeometry,
      "minute",
      [],
      fetchFn,
    );

    await manager.getChunkData(0);
    expect(fetchFn.calls[0].filters).toBeUndefined();
  });

  it("preserves domain field names in payload filters", async () => {
    const fetchFn = createMockFetch();
    const manager = new TrajectoryBufferManager(
      baseTime,
      endTime,
      mockGeometry,
      "minute",
      [
        { field: "vesselId", operator: "eq", value: "123" },
        { field: "shipName", operator: "like", value: "%CARGO%", combinator: "AND" },
        { field: "destination", operator: "eq", value: "TOKYO", combinator: "OR" },
      ],
      fetchFn,
    );

    await manager.getChunkData(0);
    const filters = fetchFn.calls[0].filters!;
    expect(filters[0].field).toBe("vesselId");
    expect(filters[1].field).toBe("shipName");
    expect(filters[2].field).toBe("destination");
  });

  it("preserves combinator values in mapped filters", async () => {
    const fetchFn = createMockFetch();
    const manager = new TrajectoryBufferManager(
      baseTime,
      endTime,
      mockGeometry,
      "minute",
      [
        { field: "speed", operator: "gt", value: "5" },
        { field: "heading", operator: "eq", value: "0", combinator: "OR" },
      ],
      fetchFn,
    );

    await manager.getChunkData(0);
    const filters = fetchFn.calls[0].filters!;
    expect(filters[0].combinator).toBeUndefined();
    expect(filters[1].combinator).toBe("OR");
  });

  it("passes filters on every chunk load", async () => {
    const fetchFn = createMockFetch();
    const manager = new TrajectoryBufferManager(
      baseTime,
      endTime,
      mockGeometry,
      "minute",
      [{ field: "speed", operator: "gt", value: "10" }],
      fetchFn,
    );

    await manager.getChunkData(0);
    await manager.getChunkData(1);
    expect(fetchFn.calls[0].filters).toBeDefined();
    expect(fetchFn.calls[1].filters).toBeDefined();
    expect(fetchFn.calls[0].filters![0].field).toBe("speed");
    expect(fetchFn.calls[1].filters![0].field).toBe("speed");
  });

  it("passes filters through handleSliderChange", async () => {
    const fetchFn = createMockFetch();
    const manager = new TrajectoryBufferManager(
      baseTime,
      endTime,
      mockGeometry,
      "minute",
      [{ field: "speed", operator: "lte", value: "20" }],
      fetchFn,
    );

    await manager.handleSliderChange(65);
    expect(fetchFn.calls[0].filters).toBeDefined();
    expect(fetchFn.calls[0].filters![0].operator).toBe("lte");
    expect(fetchFn.calls[0].filters![0].value).toBe("20");
  });

  it("passes all supported filter fields in domain payload", async () => {
    const fetchFn = createMockFetch();
    const allFields: PlaybackFilter[] = [
      { field: "vesselId", operator: "eq", value: "1" },
      { field: "mmsi", operator: "eq", value: "2", combinator: "AND" },
      { field: "speed", operator: "gt", value: "3", combinator: "AND" },
      { field: "heading", operator: "eq", value: "4", combinator: "AND" },
      { field: "course", operator: "eq", value: "5", combinator: "AND" },
      { field: "navigationStatus", operator: "eq", value: "6", combinator: "AND" },
      { field: "latitude", operator: "eq", value: "7", combinator: "AND" },
      { field: "longitude", operator: "eq", value: "8", combinator: "AND" },
      { field: "shipName", operator: "like", value: "9", combinator: "AND" },
      { field: "destination", operator: "eq", value: "10", combinator: "AND" },
      { field: "callsign", operator: "eq", value: "11", combinator: "AND" },
    ];
    const manager = new TrajectoryBufferManager(
      baseTime,
      endTime,
      mockGeometry,
      "minute",
      allFields,
      fetchFn,
    );

    await manager.getChunkData(0);
    const filters = fetchFn.calls[0].filters!;
    const fields = filters.map((f) => f.field);
    expect(fields).toEqual([
      "vesselId",
      "mmsi",
      "speed",
      "heading",
      "course",
      "navigationStatus",
      "latitude",
      "longitude",
      "shipName",
      "destination",
      "callsign",
    ]);
  });
});
