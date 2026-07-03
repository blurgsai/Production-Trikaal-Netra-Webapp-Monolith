import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVesselDetails } from "./useVesselDetails";
import * as api from "../api";

vi.mock("../api", () => ({
  fetchVesselDetails: vi.fn(),
}));

describe("useVesselDetails", () => {
  it("returns null when vesselId is undefined", () => {
    const { result } = renderHook(() => useVesselDetails(undefined));
    expect(result.current.details).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("loads and maps vessel details", async () => {
    vi.mocked(api.fetchVesselDetails).mockResolvedValue({
      vessel: {
        vessel_type: "Cargo",
        vessel_name: "Vessel A",
        flag: "India",
      },
    });

    const { result } = renderHook(() => useVesselDetails("123"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.details?.vesselType).toBe("Cargo");
    expect(result.current.details?.vesselName).toBe("Vessel A");
  });
});
