import { describe, it, expect } from "vitest";

import {
  fetchPlaybackAttributes,
  fetchPlaybackVessels,
} from "../historicalPlaybackApi";

import type { PlaybackQueryPayload } from "../types";

describe("historicalPlayback API (integration with MSW)", () => {
  describe("fetchPlaybackAttributes", () => {
    it("fetches and returns attributes from mock endpoint", async () => {
      const result = await fetchPlaybackAttributes();

      expect(result.attributes).toBeDefined();
      expect(result.attributes.length).toBeGreaterThan(0);
      expect(result.attributes[0]).toHaveProperty("key");
      expect(result.attributes[0]).toHaveProperty("path");
    });

    it("returns all 6 attributes", async () => {
      const result = await fetchPlaybackAttributes();
      expect(result.attributes).toHaveLength(6);
    });

    it("includes expected attribute keys", async () => {
      const result = await fetchPlaybackAttributes();
      const keys = result.attributes.map((a) => a.key);
      expect(keys).toContain("vessel_type");
      expect(keys).toContain("flag");
      expect(keys).toContain("speed");
      expect(keys).toContain("heading");
    });
  });

  describe("fetchPlaybackVessels", () => {
    const payload: PlaybackQueryPayload = {
      base_time: "2024-12-04T16:00:00Z",
      chunk_offset: 0,
      granularity: "minute",
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

    it("fetches chunk 0 data with correct structure", async () => {
      const result = await fetchPlaybackVessels(payload);

      expect(result.chunk_offset).toBe(0);
      expect(result.chunk_start).toBeDefined();
      expect(result.chunk_end).toBeDefined();
      expect(result.timestamps).toHaveLength(5);
      expect(result.vessels).toBeDefined();
    });

    it("returns vessel data with position points", async () => {
      const result = await fetchPlaybackVessels(payload);
      const vesselIds = Object.keys(result.vessels);

      expect(vesselIds.length).toBeGreaterThan(0);
      const firstVessel = result.vessels[vesselIds[0]];
      expect(firstVessel).toHaveLength(5);
      expect(firstVessel[0]).toHaveProperty("ts");
      expect(firstVessel[0]).toHaveProperty("lat");
      expect(firstVessel[0]).toHaveProperty("lon");
      expect(firstVessel[0]).toHaveProperty("heading");
    });

    it("fetches different data for chunk 1", async () => {
      const result0 = await fetchPlaybackVessels({
        ...payload,
        chunk_offset: 0,
      });
      const result1 = await fetchPlaybackVessels({
        ...payload,
        chunk_offset: 1,
      });

      expect(result1.chunk_offset).toBe(1);
      expect(result1.chunk_start).not.toBe(result0.chunk_start);
    });

    it("timestamps are in UTC (have Z suffix)", async () => {
      const result = await fetchPlaybackVessels(payload);
      expect(result.timestamps[0]).toMatch(/Z$/);
      expect(result.vessels[Object.keys(result.vessels)[0]][0].ts).toMatch(/Z$/);
    });

    it("supports hour granularity", async () => {
      const result = await fetchPlaybackVessels({
        ...payload,
        granularity: "hour",
        chunk_offset: 0,
      });
      expect(result.chunk_offset).toBe(0);
      expect(result.timestamps).toHaveLength(5);
    });

    it("supports day granularity", async () => {
      const result = await fetchPlaybackVessels({
        ...payload,
        granularity: "day",
        chunk_offset: 0,
      });
      expect(result.chunk_offset).toBe(0);
      expect(result.timestamps).toHaveLength(5);
    });

    it("supports week granularity", async () => {
      const result = await fetchPlaybackVessels({
        ...payload,
        granularity: "week",
        chunk_offset: 0,
      });
      expect(result.chunk_offset).toBe(0);
      expect(result.timestamps).toHaveLength(5);
    });
  });
});
