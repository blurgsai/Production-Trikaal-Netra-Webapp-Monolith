import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVesselFlags } from "../useVesselFlags";
import type { VesselFlagApi } from "../../api/types";

vi.mock("../../api", () => ({
  fetchVesselFlags: vi.fn(),
  createVesselFlag: vi.fn(),
  deleteVesselFlag: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapVesselFlagsFromApi: vi.fn((raw: VesselFlagApi[]) =>
    raw.map((r) => ({
      id: r.id,
      vesselId: r.vessel_id,
      userId: r.user_id,
      flag: r.flag,
      comment: r.comment,
      createdAt: r.created_at,
    })),
  ),
}));

import { fetchVesselFlags, createVesselFlag, deleteVesselFlag } from "../../api";

function apiFlag(overrides?: Partial<VesselFlagApi>): VesselFlagApi {
  return {
    id: "flag-1",
    vessel_id: "vessel-001",
    user_id: "user-abc",
    flag: "suspicious",
    comment: "Off course",
    created_at: "2024-01-15T10:30:00Z",
    ...overrides,
  };
}

describe("useVesselFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── vesselId guard ──

  describe("vesselId guard", () => {
    it("undefined vesselId: flags=[], loading=false, error='', no fetch call", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(result.current.flags).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("");
      expect(fetchVesselFlags).not.toHaveBeenCalled();
    });

    it("empty-string vesselId is treated as falsy and short-circuits", () => {
      const { result } = renderHook(() => useVesselFlags(""));
      expect(result.current.flags).toEqual([]);
      expect(fetchVesselFlags).not.toHaveBeenCalled();
    });

    it("valid non-empty vesselId triggers a fetch", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [apiFlag()],
        total: 1,
      });
      renderHook(() => useVesselFlags("vessel-001"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledWith("vessel-001"));
    });
  });

  // ── Loading / success ──

  describe("loading and success states", () => {
    it("sets loading=true while fetching, then false on success", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [apiFlag()],
        total: 1,
      });
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.flags).toHaveLength(1);
      expect(result.current.flags[0].flag).toBe("suspicious");
      expect(result.current.flags[0].vesselId).toBe("vessel-001");
      expect(result.current.flags[0].userId).toBe("user-abc");
      expect(result.current.error).toBe("");
    });

    it("maps multiple flags correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [
          apiFlag({ id: "f1", flag: "safe", comment: "ok" }),
          apiFlag({ id: "f2", flag: "unsafe", comment: "danger", user_id: "u2" }),
        ],
        total: 2,
      });
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(2));
      expect(result.current.flags[0].flag).toBe("safe");
      expect(result.current.flags[1].flag).toBe("unsafe");
      expect(result.current.flags[1].userId).toBe("u2");
    });
  });

  // ── Error ──

  describe("error handling", () => {
    it("sets error message on fetch failure", async () => {
      vi.mocked(fetchVesselFlags).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load flags"));
      expect(result.current.loading).toBe(false);
      expect(result.current.flags).toEqual([]);
    });
  });

  // ── addFlag ──

  describe("addFlag", () => {
    it("calls createVesselFlag with correct payload and refetches", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });
      vi.mocked(createVesselFlag).mockResolvedValue(apiFlag());

      const { result } = renderHook(() => useVesselFlags("vessel-001"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      // Simulate refetch returning the new flag
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [apiFlag()],
        total: 1,
      });

      await act(async () => {
        await result.current.addFlag("suspicious", "Off course");
      });

      expect(createVesselFlag).toHaveBeenCalledWith({
        vessel_id: "vessel-001",
        flag: "suspicious",
        comment: "Off course",
      });
      expect(fetchVesselFlags).toHaveBeenCalledTimes(2);
    });

    it("does nothing when vesselId is undefined", async () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      await act(async () => {
        await result.current.addFlag("safe", "test");
      });
      expect(createVesselFlag).not.toHaveBeenCalled();
    });
  });

  // ── removeFlag ──

  describe("removeFlag", () => {
    it("calls deleteVesselFlag and refetches", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [apiFlag()],
        total: 1,
      });
      vi.mocked(deleteVesselFlag).mockResolvedValue(undefined);

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      // Simulate refetch returning empty after delete
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      await act(async () => {
        await result.current.removeFlag("flag-1");
      });

      expect(deleteVesselFlag).toHaveBeenCalledWith("flag-1");
      expect(fetchVesselFlags).toHaveBeenCalledTimes(2);
      expect(result.current.flags).toEqual([]);
    });
  });

  // ── refresh ──

  describe("refresh", () => {
    it("re-fetches flags when refresh is called", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.refresh();
      });

      expect(fetchVesselFlags).toHaveBeenCalledTimes(2);
    });
  });
});
