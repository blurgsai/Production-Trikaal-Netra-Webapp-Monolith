import { describe, it, expect } from "vitest";

import {
  mapPlaybackAttribute,
  mapPlaybackAttributes,
  mapPlaybackPoint,
  mapPlaybackChunk,
  mapPlaybackQuery,
} from "../mappers";

import type {
  PlaybackAttributeApi,
  PlaybackAttributesResponse,
  PlaybackChunkResponse,
  PlaybackPointApi,
} from "../../api/types";

import type { PlaybackQuery } from "../types";

describe("historicalPlayback model mappers", () => {
  describe("mapPlaybackAttribute", () => {
    it("maps a single API attribute to domain type", () => {
      const api: PlaybackAttributeApi = {
        key: "vessel_type",
        path: "vessel.vessel_type",
      };
      const result = mapPlaybackAttribute(api);
      expect(result).toEqual({ key: "vessel_type", path: "vessel.vessel_type" });
    });

    it("preserves key and path without transformation", () => {
      const api: PlaybackAttributeApi = { key: "speed", path: "vessel.speed" };
      const result = mapPlaybackAttribute(api);
      expect(result.key).toBe("speed");
      expect(result.path).toBe("vessel.speed");
    });
  });

  describe("mapPlaybackAttributes", () => {
    it("maps a full attributes response to domain array", () => {
      const response: PlaybackAttributesResponse = {
        attributes: [
          { key: "vessel_type", path: "vessel.vessel_type" },
          { key: "flag", path: "vessel.flag" },
        ],
      };
      const result = mapPlaybackAttributes(response);
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe("vessel_type");
      expect(result[1].path).toBe("vessel.flag");
    });

    it("returns empty array for empty response", () => {
      const response: PlaybackAttributesResponse = { attributes: [] };
      const result = mapPlaybackAttributes(response);
      expect(result).toEqual([]);
    });
  });

  describe("mapPlaybackPoint", () => {
    it("maps API point to domain point with renamed fields", () => {
      const api: PlaybackPointApi = {
        ts: "2024-12-04T16:00:00Z",
        lat: 15.9,
        lon: 65.2,
        heading: 45,
      };
      const result = mapPlaybackPoint(api);
      expect(result).toEqual({
        timestamp: "2024-12-04T16:00:00Z",
        latitude: 15.9,
        longitude: 65.2,
        heading: 45,
      });
    });

    it("preserves numeric precision", () => {
      const api: PlaybackPointApi = {
        ts: "2024-12-04T16:00:15Z",
        lat: 15.123456,
        lon: 65.987654,
        heading: 180,
      };
      const result = mapPlaybackPoint(api);
      expect(result.latitude).toBe(15.123456);
      expect(result.longitude).toBe(65.987654);
    });
  });

  describe("mapPlaybackChunk", () => {
    it("maps a full chunk response to domain chunk", () => {
      const response: PlaybackChunkResponse = {
        chunk_offset: 0,
        chunk_start: "2024-12-04T16:00:00Z",
        chunk_end: "2024-12-04T16:01:00Z",
        timestamps: [
          "2024-12-04T16:00:00Z",
          "2024-12-04T16:00:15Z",
        ],
        vessels: {
          V0001: [
            { ts: "2024-12-04T16:00:00Z", lat: 15.9, lon: 65.2, heading: 45 },
            { ts: "2024-12-04T16:00:15Z", lat: 15.91, lon: 65.21, heading: 46 },
          ],
          V0002: [
            { ts: "2024-12-04T16:00:00Z", lat: 16.1, lon: 65.5, heading: 90 },
          ],
        },
      };
      const result = mapPlaybackChunk(response);

      expect(result.chunkOffset).toBe(0);
      expect(result.chunkStart).toBe("2024-12-04T16:00:00Z");
      expect(result.chunkEnd).toBe("2024-12-04T16:01:00Z");
      expect(result.timestamps).toHaveLength(2);
      expect(Object.keys(result.vessels)).toEqual(["V0001", "V0002"]);
      expect(result.vessels.V0001).toHaveLength(2);
      expect(result.vessels.V0001[0].latitude).toBe(15.9);
      expect(result.vessels.V0002[0].heading).toBe(90);
    });

    it("handles empty vessels object", () => {
      const response: PlaybackChunkResponse = {
        chunk_offset: 5,
        chunk_start: "2024-12-04T16:05:00Z",
        chunk_end: "2024-12-04T16:06:00Z",
        timestamps: [],
        vessels: {},
      };
      const result = mapPlaybackChunk(response);
      expect(result.vessels).toEqual({});
      expect(result.timestamps).toEqual([]);
    });
  });

  describe("mapPlaybackQuery", () => {
    it("maps domain query to API payload with snake_case", () => {
      const query: PlaybackQuery = {
        baseTime: "2024-12-04T16:00:00Z",
        chunkOffset: 3,
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
        filters: { vessel_type: "cargo" },
      };
      const result = mapPlaybackQuery(query);
      expect(result.base_time).toBe("2024-12-04T16:00:00Z");
      expect(result.chunk_offset).toBe(3);
      expect(result.granularity).toBe("minute");
      expect(result.geometry.type).toBe("Polygon");
      expect(result.filters).toEqual({ vessel_type: "cargo" });
    });

    it("maps hour granularity correctly", () => {
      const query: PlaybackQuery = {
        baseTime: "2024-12-04T16:00:00Z",
        chunkOffset: 2,
        granularity: "hour",
        geometry: { type: "Point", coordinates: [65, 15] },
        filters: {},
      };
      const result = mapPlaybackQuery(query);
      expect(result.granularity).toBe("hour");
      expect(result.chunk_offset).toBe(2);
    });
  });
});
