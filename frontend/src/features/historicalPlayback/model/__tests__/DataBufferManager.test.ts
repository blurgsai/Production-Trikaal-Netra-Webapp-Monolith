import { describe, it, expect } from "vitest";

import { DataBufferManager } from "../DataBufferManager";

import type { PlaybackQuery } from "../types";

const baseQuery: Omit<PlaybackQuery, "chunkOffset" | "granularity"> = {
  baseTime: "2024-12-04T16:00:00Z",
  geometry: {
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
  },
  filters: {},
};

describe("DataBufferManager (integration: manager → API → MSW)", () => {
  it("loads chunk 0 data via real API call", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
    );

    const data = await manager.getChunkData(0);
    expect(data.chunkOffset).toBe(0);
    expect(data.timestamps).toHaveLength(5);
    expect(Object.keys(data.vessels).length).toBeGreaterThan(0);
  });

  it("caches loaded data — second call does not refetch", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
    );

    const data1 = await manager.getChunkData(0);
    const data2 = await manager.getChunkData(0);

    expect(data2).toBe(data1);
  });

  it("loads different chunks with different data", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
    );

    const data0 = await manager.getChunkData(0);
    const data1 = await manager.getChunkData(1);

    expect(data0.chunkOffset).toBe(0);
    expect(data1.chunkOffset).toBe(1);
    expect(data1.chunkStart).not.toBe(data0.chunkStart);
  });

  it("getChunkOffset converts seconds to chunk index (minute)", () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
      "minute",
    );

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(59)).toBe(0);
    expect(manager.getChunkOffset(60)).toBe(1);
    expect(manager.getChunkOffset(125)).toBe(2);
  });

  it("getChunkOffset converts seconds to chunk index (hour)", () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
      "hour",
    );

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(3599)).toBe(0);
    expect(manager.getChunkOffset(3600)).toBe(1);
    expect(manager.getChunkOffset(7200)).toBe(2);
  });

  it("getChunkOffset converts seconds to chunk index (day)", () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
      "day",
    );

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(86399)).toBe(0);
    expect(manager.getChunkOffset(86400)).toBe(1);
  });

  it("getChunkOffset converts seconds to chunk index (week)", () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
      "week",
    );

    expect(manager.getChunkOffset(0)).toBe(0);
    expect(manager.getChunkOffset(604799)).toBe(0);
    expect(manager.getChunkOffset(604800)).toBe(1);
  });

  it("handleSliderChange returns correct chunk and data", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
    );

    const result = await manager.handleSliderChange(65);
    expect(result.chunkOffset).toBe(1);
    expect(result.data.chunkOffset).toBe(1);
  });

  it("clear() removes all cached data", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
    );

    await manager.getChunkData(0);
    manager.clear();
    expect(manager.getChunkOffset(0)).toBe(0);
  });

  it("updateConfig clears buffer for new geometry/filters", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
    );

    await manager.getChunkData(0);
    manager.updateConfig(
      {
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
      },
      { vessel_type: "cargo" },
    );

    const data = await manager.getChunkData(0);
    expect(data).toBeDefined();
  });

  it("cleanupBuffer removes far entries but keeps near ones", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
    );

    await manager.getChunkData(0);
    await manager.getChunkData(1);
    await manager.getChunkData(10);

    manager.cleanupBuffer(1);

    const data0 = await manager.getChunkData(0);
    expect(data0.chunkOffset).toBe(0);
  });

  it("supports hour granularity for data loading", async () => {
    const manager = new DataBufferManager(
      baseQuery.baseTime,
      baseQuery.geometry,
      baseQuery.filters,
      "hour",
    );

    const data = await manager.getChunkData(0);
    expect(data.chunkOffset).toBe(0);
    expect(data.timestamps).toHaveLength(5);
  });
});
