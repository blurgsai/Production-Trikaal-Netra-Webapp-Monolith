import { describe, it, expect, vi } from "vitest";
import { fetchVesselTrajectory } from "./trajectoryApi";

vi.mock("@/shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axiosInstance from "@/shared/api/client";

describe("trajectoryApi", () => {
  it("returns trajectory data", async () => {
    const data = { trajectory: [{ lat: 10, lng: 20, timestamp: "2024-01-01" }] };
    vi.mocked(axiosInstance.get).mockResolvedValue({ data });
    const result = await fetchVesselTrajectory("vessel-123");
    expect(result).toEqual(data);
    expect(axiosInstance.get).toHaveBeenCalledWith("/vessels/trajectory/vessel-123");
  });
});
