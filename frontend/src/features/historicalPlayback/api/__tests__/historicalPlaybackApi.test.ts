import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchVesselTrajectories } from "../historicalPlaybackApi";

import type { TrajectoryRequestApi, TrajectoryResponseApi } from "../types";

vi.mock("@/shared/api", () => ({
  axiosInstance: {
    post: vi.fn(),
  },
}));

import { axiosInstance } from "@/shared/api";

const mockedPost = vi.mocked(axiosInstance.post);

const mockResponse: TrajectoryResponseApi = {
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

const basePayload: TrajectoryRequestApi = {
  polygon: {
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
  start_time: "2024-12-04T16:00:00Z",
  end_time: "2024-12-04T16:01:00Z",
};

describe("historicalPlayback API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchVesselTrajectories sends POST to /vessels/trajectory", async () => {
    mockedPost.mockResolvedValue({ data: mockResponse });

    await fetchVesselTrajectories(basePayload);

    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/vessels/trajectory",
      basePayload,
    );
  });

  it("fetchVesselTrajectories returns response data", async () => {
    mockedPost.mockResolvedValue({ data: mockResponse });

    const result = await fetchVesselTrajectories(basePayload);

    expect(result.trajectories).toBeDefined();
    expect(result.timestamps).toHaveLength(2);
    expect(Object.keys(result.trajectories)).toEqual(["V0001", "V0002"]);
  });

  it("fetchVesselTrajectories returns vessel points with correct fields", async () => {
    mockedPost.mockResolvedValue({ data: mockResponse });

    const result = await fetchVesselTrajectories(basePayload);
    const firstVessel = result.trajectories.V0001;

    expect(firstVessel).toHaveLength(2);
    expect(firstVessel[0]).toHaveProperty("ts");
    expect(firstVessel[0]).toHaveProperty("lat");
    expect(firstVessel[0]).toHaveProperty("lon");
    expect(firstVessel[0]).toHaveProperty("heading");
  });

  it("fetchVesselTrajectories timestamps have UTC Z suffix", async () => {
    mockedPost.mockResolvedValue({ data: mockResponse });

    const result = await fetchVesselTrajectories(basePayload);
    expect(result.timestamps[0]).toMatch(/Z$/);
    expect(result.trajectories.V0001[0].ts).toMatch(/Z$/);
  });

  it("fetchVesselTrajectories throws on API error", async () => {
    mockedPost.mockRejectedValue(new Error("Network error"));

    await expect(fetchVesselTrajectories(basePayload)).rejects.toThrow(
      "Network error",
    );
  });

  it("fetchVesselTrajectories works with different time windows", async () => {
    const chunk1Response: TrajectoryResponseApi = {
      trajectories: {
        V0001: [
          { ts: "2024-12-04T16:01:00Z", lat: 15.95, lon: 65.25, heading: 47, speed: 12 },
        ],
      },
      timestamps: ["2024-12-04T16:01:00Z"],
    };
    mockedPost.mockResolvedValue({ data: chunk1Response });

    const result = await fetchVesselTrajectories({
      ...basePayload,
      start_time: "2024-12-04T16:01:00Z",
      end_time: "2024-12-04T16:02:00Z",
    });

    expect(result.timestamps[0]).toBe("2024-12-04T16:01:00Z");
    expect(result.trajectories.V0001[0].lat).toBe(15.95);
  });
});
