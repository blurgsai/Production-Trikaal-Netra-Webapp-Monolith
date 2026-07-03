import { describe, it, expect, vi } from "vitest";
import { fetchVesselImage } from "./vesselImageApi";

vi.mock("@/shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axiosInstance from "@/shared/api/client";

describe("vesselImageApi", () => {
  it("returns vessel image URL", async () => {
    const data = { image_url: "https://example.com/image.jpg" };
    vi.mocked(axiosInstance.get).mockResolvedValue({ data });
    const result = await fetchVesselImage("1234567");
    expect(result).toEqual(data);
    expect(axiosInstance.get).toHaveBeenCalledWith("/admin/vessel-images/1234567");
  });
});
