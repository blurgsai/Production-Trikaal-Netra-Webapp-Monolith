import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEezRegions } from "./useEezRegions";
import * as eezRegionsApi from "../api/eezRegionsApi";

vi.mock("../api/eezRegionsApi", () => ({
  fetchEezRegions: vi.fn(),
}));

describe("useEezRegions", () => {
  it("returns loading initially", () => {
    vi.mocked(eezRegionsApi.fetchEezRegions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEezRegions());
    expect(result.current.loading).toBe(true);
    expect(result.current.regions).toEqual([]);
  });

  it("loads mapped EEZ regions", async () => {
    vi.mocked(eezRegionsApi.fetchEezRegions).mockResolvedValue([
      { id: "IN", name: "India", bounds: [68, 8, 97, 37] },
      { id: "US", name: "United States", bounds: [-125, 25, -66, 49] },
    ]);
    const { result } = renderHook(() => useEezRegions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.regions).toHaveLength(2);
    expect(result.current.regions[0].name).toBe("India");
  });

  it("sets error on failure", async () => {
    vi.mocked(eezRegionsApi.fetchEezRegions).mockRejectedValue(new Error("Failed"));
    const { result } = renderHook(() => useEezRegions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed");
  });
});
