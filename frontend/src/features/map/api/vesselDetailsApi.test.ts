import { describe, it, expect, vi } from "vitest";
import { fetchVesselDetails } from "./vesselDetailsApi";

vi.mock("@/shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axiosInstance from "@/shared/api/client";

describe("vesselDetailsApi", () => {
  it("returns vessel details", async () => {
    const data = { vessel: { vessel_type: "Cargo", vessel_name: "Vessel A", flag: "India" } };
    vi.mocked(axiosInstance.get).mockResolvedValue({ data });
    const result = await fetchVesselDetails("123");
    expect(result).toEqual(data);
    expect(axiosInstance.get).toHaveBeenCalledWith("/vessels/123");
  });
});
