import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVesselTrajectory } from "./useVesselTrajectory";
import * as api from "../api";

vi.mock("../api", () => ({
  fetchVesselTrajectory: vi.fn(),
}));

describe("useVesselTrajectory", () => {
  it("starts with empty trajectory", () => {
    const { result } = renderHook(() => useVesselTrajectory());
    expect(result.current.trajectory).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("loads trajectory", async () => {
    vi.mocked(api.fetchVesselTrajectory).mockResolvedValue({
      trajectory: [{ lat: 10, lng: 20, timestamp: "2024-01-01" }],
    });
    const { result } = renderHook(() => useVesselTrajectory());
    act(() => {
      result.current.load("vessel-123");
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trajectory).toHaveLength(1);
  });

  it("clears trajectory", async () => {
    vi.mocked(api.fetchVesselTrajectory).mockResolvedValue({ trajectory: [{ lat: 10, lng: 20, timestamp: "2024-01-01" }] });
    const { result } = renderHook(() => useVesselTrajectory());
    await act(async () => {
      result.current.load("vessel-123");
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.trajectory).toHaveLength(0);
  });
});
