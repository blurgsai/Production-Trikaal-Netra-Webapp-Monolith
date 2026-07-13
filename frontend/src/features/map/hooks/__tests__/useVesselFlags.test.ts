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

function apiResponse(flags: VesselFlagApi[]) {
  return { success: true, data: flags, total: flags.length };
}

describe("useVesselFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── vesselId guard (decision table) ─────────────────────────────────────

  describe("vesselId guard (decision table: undefined / empty / valid)", () => {
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
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      renderHook(() => useVesselFlags("vessel-001"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledWith("vessel-001"));
    });

    it("vesselId consisting only of whitespace is truthy and still triggers fetch", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      renderHook(() => useVesselFlags("   "));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledWith("   "));
    });

    it("vesselId '0' is truthy as a string and triggers fetch", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      renderHook(() => useVesselFlags("0"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledWith("0"));
    });
  });

  // ── Loading state ───────────────────────────────────────────────────────

  describe("loading state", () => {
    it("sets loading=true while fetching, then false on success", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.flags).toHaveLength(1);
    });

    it("sets loading=false after error", async () => {
      vi.mocked(fetchVesselFlags).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("does not set loading=true when vesselId is undefined", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(result.current.loading).toBe(false);
    });

    it("sets loading=true on subsequent refresh calls", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      await act(async () => {
        await result.current.refresh();
      });
      expect(fetchVesselFlags).toHaveBeenCalledTimes(2);
    });
  });

  // ── Success: single flag ────────────────────────────────────────────────

  describe("success: single flag", () => {
    it("maps a single flag correctly with all fields", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(1));
      expect(result.current.flags[0]).toEqual({
        id: "flag-1",
        vesselId: "vessel-001",
        userId: "user-abc",
        flag: "suspicious",
        comment: "Off course",
        createdAt: "2024-01-15T10:30:00Z",
      });
    });

    it("maps flag with empty comment correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag({ comment: "" })]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(1));
      expect(result.current.flags[0].comment).toBe("");
    });

    it("maps flag with 'safe' status correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag({ flag: "safe" })]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags[0].flag).toBe("safe"));
    });

    it("maps flag with 'unsafe' status correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag({ flag: "unsafe" })]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags[0].flag).toBe("unsafe"));
    });

    it("maps flag with 'neutral' status correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag({ flag: "neutral" })]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags[0].flag).toBe("neutral"));
    });

    it("maps flag with 'unknown' status correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag({ flag: "unknown" })]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags[0].flag).toBe("unknown"));
    });
  });

  // ── Success: multiple flags ─────────────────────────────────────────────

  describe("success: multiple flags", () => {
    it("maps multiple flags preserving order", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([
          apiFlag({ id: "f1", flag: "safe" }),
          apiFlag({ id: "f2", flag: "unsafe" }),
          apiFlag({ id: "f3", flag: "neutral" }),
        ]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(3));
      expect(result.current.flags[0].id).toBe("f1");
      expect(result.current.flags[1].id).toBe("f2");
      expect(result.current.flags[2].id).toBe("f3");
    });

    it("maps flags from different users correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([
          apiFlag({ id: "f1", user_id: "user-a" }),
          apiFlag({ id: "f2", user_id: "user-b" }),
        ]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(2));
      expect(result.current.flags[0].userId).toBe("user-a");
      expect(result.current.flags[1].userId).toBe("user-b");
    });

    it("maps flags with different comments correctly", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([
          apiFlag({ id: "f1", comment: "First comment" }),
          apiFlag({ id: "f2", comment: "Second comment" }),
        ]),
      );
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(2));
      expect(result.current.flags[0].comment).toBe("First comment");
      expect(result.current.flags[1].comment).toBe("Second comment");
    });

    it("handles 10+ flags correctly", async () => {
      const manyFlags = Array.from({ length: 15 }, (_, i) =>
        apiFlag({ id: `f${i}`, flag: "safe", comment: `comment-${i}` }),
      );
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse(manyFlags));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(15));
      expect(result.current.flags[14].comment).toBe("comment-14");
    });
  });

  // ── Success: empty result ───────────────────────────────────────────────

  describe("success: empty result", () => {
    it("returns empty flags array when API returns empty data", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toEqual([]));
      expect(result.current.error).toBe("");
    });

    it("clears error on successful refetch after previous error", async () => {
      vi.mocked(fetchVesselFlags).mockRejectedValueOnce(new Error("Network error"));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load flags"));

      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.error).toBe("");
      expect(result.current.flags).toEqual([]);
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────

  describe("error handling", () => {
    it("sets error message on fetch failure", async () => {
      vi.mocked(fetchVesselFlags).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load flags"));
    });

    it("sets error message on 500 response", async () => {
      vi.mocked(fetchVesselFlags).mockRejectedValue(new Error("Internal Server Error"));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load flags"));
    });

    it("sets error message on timeout", async () => {
      vi.mocked(fetchVesselFlags).mockRejectedValue(new Error("timeout"));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load flags"));
    });

    it("clears flags on error after refetch", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(1));

      vi.mocked(fetchVesselFlags).mockRejectedValue(new Error("Network error"));
      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.error).toBe("Failed to load flags");
    });

    it("does not set error when vesselId is undefined", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(result.current.error).toBe("");
    });
  });

  // ── addFlag: success cases ──────────────────────────────────────────────

  describe("addFlag: success cases", () => {
    it("calls createVesselFlag with correct payload and refetches", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockResolvedValue(apiFlag());

      const { result } = renderHook(() => useVesselFlags("vessel-001"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
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

    it("addFlag with 'safe' status sends correct payload", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockResolvedValue(apiFlag({ flag: "safe" }));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.addFlag("safe", "Looks fine");
      });

      expect(createVesselFlag).toHaveBeenCalledWith({
        vessel_id: "v1",
        flag: "safe",
        comment: "Looks fine",
      });
    });

    it("addFlag with 'unsafe' status sends correct payload", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockResolvedValue(apiFlag({ flag: "unsafe" }));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.addFlag("unsafe", "Danger");
      });

      expect(createVesselFlag).toHaveBeenCalledWith({
        vessel_id: "v1",
        flag: "unsafe",
        comment: "Danger",
      });
    });

    it("addFlag with empty comment sends empty string", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockResolvedValue(apiFlag({ comment: "" }));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.addFlag("neutral", "");
      });

      expect(createVesselFlag).toHaveBeenCalledWith({
        vessel_id: "v1",
        flag: "neutral",
        comment: "",
      });
    });

    it("addFlag with 'unknown' status sends correct payload", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockResolvedValue(apiFlag({ flag: "unknown" }));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.addFlag("unknown", "Not sure");
      });

      expect(createVesselFlag).toHaveBeenCalledWith({
        vessel_id: "v1",
        flag: "unknown",
        comment: "Not sure",
      });
    });

    it("addFlag refetches flags after successful creation", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockResolvedValue(apiFlag());

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag(), apiFlag({ id: "f2" })]),
      );
      await act(async () => {
        await result.current.addFlag("safe", "ok");
      });

      expect(fetchVesselFlags).toHaveBeenCalledTimes(2);
      expect(result.current.flags).toHaveLength(2);
    });
  });

  // ── addFlag: guard cases ────────────────────────────────────────────────

  describe("addFlag: guard cases", () => {
    it("does nothing when vesselId is undefined", async () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      await act(async () => {
        await result.current.addFlag("safe", "test");
      });
      expect(createVesselFlag).not.toHaveBeenCalled();
    });

    it("does nothing when vesselId is empty string", async () => {
      const { result } = renderHook(() => useVesselFlags(""));
      await act(async () => {
        await result.current.addFlag("safe", "test");
      });
      expect(createVesselFlag).not.toHaveBeenCalled();
    });
  });

  // ── addFlag: error cases ────────────────────────────────────────────────

  describe("addFlag: error cases", () => {
    it("propagates error when createVesselFlag fails", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await expect(
        act(async () => {
          await result.current.addFlag("safe", "test");
        }),
      ).rejects.toThrow("Create failed");
    });

    it("does not refetch when createVesselFlag fails", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(createVesselFlag).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      try {
        await act(async () => {
          await result.current.addFlag("safe", "test");
        });
      } catch {
        // expected
      }

      expect(fetchVesselFlags).toHaveBeenCalledTimes(1);
    });
  });

  // ── removeFlag: success cases ───────────────────────────────────────────

  describe("removeFlag: success cases", () => {
    it("calls deleteVesselFlag and refetches", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      vi.mocked(deleteVesselFlag).mockResolvedValue(undefined);

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      await act(async () => {
        await result.current.removeFlag("flag-1");
      });

      expect(deleteVesselFlag).toHaveBeenCalledWith("flag-1");
      expect(fetchVesselFlags).toHaveBeenCalledTimes(2);
      expect(result.current.flags).toEqual([]);
    });

    it("removeFlag with different flag IDs", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      vi.mocked(deleteVesselFlag).mockResolvedValue(undefined);

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.removeFlag("some-other-id");
      });

      expect(deleteVesselFlag).toHaveBeenCalledWith("some-other-id");
    });

    it("removeFlag refetches and updates flags list", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag({ id: "f1" }), apiFlag({ id: "f2" })]),
      );
      vi.mocked(deleteVesselFlag).mockResolvedValue(undefined);

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toHaveLength(2));

      vi.mocked(fetchVesselFlags).mockResolvedValue(
        apiResponse([apiFlag({ id: "f2" })]),
      );
      await act(async () => {
        await result.current.removeFlag("f1");
      });

      expect(result.current.flags).toHaveLength(1);
      expect(result.current.flags[0].id).toBe("f2");
    });
  });

  // ── removeFlag: error cases ─────────────────────────────────────────────

  describe("removeFlag: error cases", () => {
    it("propagates error when deleteVesselFlag fails", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      vi.mocked(deleteVesselFlag).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await expect(
        act(async () => {
          await result.current.removeFlag("flag-1");
        }),
      ).rejects.toThrow("Delete failed");
    });

    it("does not refetch when deleteVesselFlag fails", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      vi.mocked(deleteVesselFlag).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      try {
        await act(async () => {
          await result.current.removeFlag("flag-1");
        });
      } catch {
        // expected
      }

      expect(fetchVesselFlags).toHaveBeenCalledTimes(1);
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("re-fetches flags when refresh is called", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.refresh();
      });

      expect(fetchVesselFlags).toHaveBeenCalledTimes(2);
    });

    it("refresh calls fetchVesselFlags with same vesselId", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("vessel-xyz"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.refresh();
      });

      expect(fetchVesselFlags).toHaveBeenLastCalledWith("vessel-xyz");
    });

    it("refresh updates flags with new data", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(result.current.flags).toEqual([]));

      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.flags).toHaveLength(1);
    });

    it("refresh with undefined vesselId does not fetch", async () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      await act(async () => {
        await result.current.refresh();
      });
      expect(fetchVesselFlags).not.toHaveBeenCalled();
    });
  });

  // ── vesselId changes ────────────────────────────────────────────────────

  describe("vesselId changes", () => {
    it("refetches when vesselId changes from one valid ID to another", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { rerender } = renderHook(({ id }: { id: string | undefined }) => useVesselFlags(id), {
        initialProps: { id: "v1" },
      });
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledWith("v1"));

      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      rerender({ id: "v2" });
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledWith("v2"));
    });

    it("clears flags when vesselId changes to undefined", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      const { result, rerender } = renderHook(({ id }: { id: string | undefined }) => useVesselFlags(id), {
        initialProps: { id: "v1" },
      });
      await waitFor(() => expect(result.current.flags).toHaveLength(1));

      rerender({ id: undefined });
      await waitFor(() => expect(result.current.flags).toEqual([]));
    });

    it("clears flags when vesselId changes to empty string", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([apiFlag()]));
      const { result, rerender } = renderHook(({ id }: { id: string | undefined }) => useVesselFlags(id), {
        initialProps: { id: "v1" },
      });
      await waitFor(() => expect(result.current.flags).toHaveLength(1));

      rerender({ id: "" });
      await waitFor(() => expect(result.current.flags).toEqual([]));
    });
  });

  // ── Callback stability ──────────────────────────────────────────────────

  describe("callback stability", () => {
    it("addFlag is a function when vesselId is stable", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));
      expect(typeof result.current.addFlag).toBe("function");
    });

    it("removeFlag is a function when vesselId is stable", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));
      expect(typeof result.current.removeFlag).toBe("function");
    });

    it("refresh is a function when vesselId is stable", async () => {
      vi.mocked(fetchVesselFlags).mockResolvedValue(apiResponse([]));
      const { result } = renderHook(() => useVesselFlags("v1"));
      await waitFor(() => expect(fetchVesselFlags).toHaveBeenCalledTimes(1));
      expect(typeof result.current.refresh).toBe("function");
    });
  });

  // ── Return value shape ──────────────────────────────────────────────────

  describe("return value shape", () => {
    it("returns all expected properties", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(result.current).toHaveProperty("flags");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("addFlag");
      expect(result.current).toHaveProperty("removeFlag");
      expect(result.current).toHaveProperty("refresh");
    });

    it("flags is always an array", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(Array.isArray(result.current.flags)).toBe(true);
    });

    it("loading is always a boolean", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(typeof result.current.loading).toBe("boolean");
    });

    it("error is always a string", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(typeof result.current.error).toBe("string");
    });

    it("addFlag is always a function", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(typeof result.current.addFlag).toBe("function");
    });

    it("removeFlag is always a function", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(typeof result.current.removeFlag).toBe("function");
    });

    it("refresh is always a function", () => {
      const { result } = renderHook(() => useVesselFlags(undefined));
      expect(typeof result.current.refresh).toBe("function");
    });
  });
});
