import { describe, it, expect } from "vitest";

import {
  mapTrajectoryPoint,
  mapTrajectoryResponse,
} from "../mappers";

import type {
  TrajectoryPointApi,
  TrajectoryResponseApi,
} from "../../api/types";

describe("historicalPlayback model mappers", () => {
  describe("mapTrajectoryPoint", () => {
    it("maps API point to domain point with renamed fields", () => {
      const api: TrajectoryPointApi = {
        ts: "2024-12-04T16:00:00Z",
        lat: 15.9,
        lon: 65.2,
        heading: 45,
        speed: 12.5,
      };
      const result = mapTrajectoryPoint(api);
      expect(result).toEqual({
        timestamp: "2024-12-04T16:00:00Z",
        latitude: 15.9,
        longitude: 65.2,
        heading: 45,
        speed: 12.5,
      });
    });

    it("preserves numeric precision", () => {
      const api: TrajectoryPointApi = {
        ts: "2024-12-04T16:00:15Z",
        lat: 15.123456,
        lon: 65.987654,
        heading: 180,
        speed: 0,
      };
      const result = mapTrajectoryPoint(api);
      expect(result.latitude).toBe(15.123456);
      expect(result.longitude).toBe(65.987654);
    });
  });

  describe("mapTrajectoryResponse", () => {
    it("maps a full trajectory response to domain chunk", () => {
      const response: TrajectoryResponseApi = {
        trajectories: {
          V0001: [
            { ts: "2024-12-04T16:00:00Z", lat: 15.9, lon: 65.2, heading: 45, speed: 10 },
            { ts: "2024-12-04T16:00:15Z", lat: 15.91, lon: 65.21, heading: 46, speed: 11 },
          ],
          V0002: [
            { ts: "2024-12-04T16:00:00Z", lat: 16.1, lon: 65.5, heading: 90, speed: 5 },
          ],
        },
        timestamps: [
          "2024-12-04T16:00:00Z",
          "2024-12-04T16:00:15Z",
        ],
      };
      const result = mapTrajectoryResponse(response);

      expect(result.chunkOffset).toBe(0);
      expect(result.chunkStart).toBe("2024-12-04T16:00:00Z");
      expect(result.chunkEnd).toBe("2024-12-04T16:00:15Z");
      expect(result.timestamps).toHaveLength(2);
      expect(Object.keys(result.vessels)).toEqual(["V0001", "V0002"]);
      expect(result.vessels.V0001).toHaveLength(2);
      expect(result.vessels.V0001[0].latitude).toBe(15.9);
      expect(result.vessels.V0002[0].heading).toBe(90);
    });

    it("handles empty trajectories object", () => {
      const response: TrajectoryResponseApi = {
        trajectories: {},
        timestamps: [],
      };
      const result = mapTrajectoryResponse(response);
      expect(result.vessels).toEqual({});
      expect(result.timestamps).toEqual([]);
      expect(result.chunkStart).toBe("");
      expect(result.chunkEnd).toBe("");
    });
  });
});
