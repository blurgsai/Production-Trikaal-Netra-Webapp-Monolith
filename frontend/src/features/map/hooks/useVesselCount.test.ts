import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVesselCount } from "./useVesselCount";
import * as api from "../api";

vi.mock("../api", () => ({
  fetchVesselCount: vi.fn(),
  fetchVesselCategoryCounts: vi.fn(),
}));

describe("useVesselCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads total and category counts", async () => {
    vi.mocked(api.fetchVesselCount).mockResolvedValue(100);
    vi.mocked(api.fetchVesselCategoryCounts).mockResolvedValue([
      { category: "Cargo", count: 50 },
      { category: "Tanker", count: 50 },
    ]);

    const { result } = renderHook(() => useVesselCount("cql = 1"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(100);
    expect(result.current.categories).toHaveLength(2);
  });

  it("sets error on failure", async () => {
    vi.mocked(api.fetchVesselCount).mockRejectedValue(new Error("fail"));
    vi.mocked(api.fetchVesselCategoryCounts).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useVesselCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load vessel count data");
  });
});
