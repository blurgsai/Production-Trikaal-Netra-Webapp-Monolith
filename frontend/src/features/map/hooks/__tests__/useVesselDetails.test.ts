import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVesselDetails } from "../useVesselDetails";
import type { VesselDetailsApi } from "../../api/types";

vi.mock("../../api", () => ({
  fetchVesselDetails: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapVesselDetailsFromApi: vi.fn(),
}));

import { fetchVesselDetails } from "../../api";
import { mapVesselDetailsFromApi } from "../../model/mappers";

function apiDetails(overrides?: Partial<NonNullable<VesselDetailsApi["vessel"]>>): VesselDetailsApi {
  return {
    vessel: {
      vessel_type: "Cargo",
      vessel_name: "Vessel A",
      flag: "India",
      length: 200,
      width: 30,
      gross_tonnage: 50000,
      ...overrides,
    },
  };
}

describe("useVesselDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapVesselDetailsFromApi).mockImplementation((raw) => ({
      vesselType: raw.vessel?.vessel_type ?? "Unknown",
      vesselName: raw.vessel?.vessel_name ?? "Unknown Vessel",
      flag: raw.vessel?.flag ?? "Unknown",
      length: raw.vessel?.length,
      width: raw.vessel?.width,
      grossTonnage: raw.vessel?.gross_tonnage,
    }));
  });

  // ── vesselId guard / decision table ──────────────────────────────────────

  describe("vesselId guard (decision table: undefined / empty / valid)", () => {
    it("undefined vesselId: details=null, loading=false, error='', no fetch call", () => {
      const { result } = renderHook(() => useVesselDetails(undefined));
      expect(result.current.details).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("");
      expect(fetchVesselDetails).not.toHaveBeenCalled();
    });

    it("empty-string vesselId is treated as falsy and short-circuits (same as undefined)", () => {
      const { result } = renderHook(() => useVesselDetails(""));
      expect(result.current.details).toBeNull();
      expect(fetchVesselDetails).not.toHaveBeenCalled();
    });

    it("valid non-empty vesselId triggers a fetch", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith("v1"));
    });

    it("vesselId consisting only of whitespace is truthy and still triggers fetch (no server-side trim)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      renderHook(() => useVesselDetails("   "));
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith("   "));
    });

    it("vesselId '0' is truthy as a string and triggers fetch", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      renderHook(() => useVesselDetails("0"));
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith("0"));
    });
  });

  // ── Success ──────────────────────────────────────────────────────────────

  describe("success state", () => {
    it("loads and maps details for a valid vessel", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.details).toEqual({
        vesselType: "Cargo", vesselName: "Vessel A", flag: "India", length: 200, width: 30, grossTonnage: 50000,
      });
    });

    it("clears error after a successful reload (ERROR -> SUCCESS)", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));

      vi.mocked(fetchVesselDetails).mockResolvedValueOnce(apiDetails());
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("");
      expect(result.current.details).not.toBeNull();
    });

    it("handles missing optional numeric fields (length/width/grossTonnage undefined)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue({ vessel: { vessel_type: "Tanker", vessel_name: "T1", flag: "US" } });
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.details?.length).toBeUndefined();
      expect(result.current.details?.width).toBeUndefined();
      expect(result.current.details?.grossTonnage).toBeUndefined();
    });

    it("handles a completely empty vessel object with mapper defaults", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue({});
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.details).toEqual({
        vesselType: "Unknown", vesselName: "Unknown Vessel", flag: "Unknown",
        length: undefined, width: undefined, grossTonnage: undefined,
      });
    });

    it("handles zero-value numeric fields correctly (not conflated with missing)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ length: 0, width: 0, gross_tonnage: 0 }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.length).toBe(0));
      expect(result.current.details?.width).toBe(0);
      expect(result.current.details?.grossTonnage).toBe(0);
    });

    it("handles extremely large numeric fields", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ length: 999999, gross_tonnage: 1e9 }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.length).toBe(999999));
      expect(result.current.details?.grossTonnage).toBe(1e9);
    });

    it("handles unicode vessel names", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ vessel_name: "船舶 №1" }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.vesselName).toBe("船舶 №1"));
    });
  });

  // ── Error / negative ──────────────────────────────────────────────────────

  describe("error state", () => {
    it("sets a generic error message on failure", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue(new Error("500 Internal Server Error"));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });

    it("sets loading false after error", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("does not clear details to null on a failed refresh (stale-but-visible-data behavior)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValueOnce(apiDetails());
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details).not.toBeNull());

      vi.mocked(fetchVesselDetails).mockRejectedValueOnce(new Error("fail"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("Failed to load vessel details");
      expect(result.current.details).not.toBeNull();
    });

    it("handles non-Error rejection (string)", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue("boom");
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });

    it("handles rejection with 404-style axios error object", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue({ response: { status: 404 } });
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });

    it("handles mapper throwing (Failure Injection at transform boundary)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      vi.mocked(mapVesselDetailsFromApi).mockImplementation(() => { throw new Error("mapping error"); });
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });
  });

  // ── Dependency changes (vesselId transitions) ────────────────────────────

  describe("vesselId dependency changes", () => {
    it("re-fetches when vesselId changes from one valid id to another", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { rerender } = renderHook(({ id }) => useVesselDetails(id), { initialProps: { id: "v1" } });
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith("v1"));
      rerender({ id: "v2" });
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith("v2"));
      expect(fetchVesselDetails).toHaveBeenCalledTimes(2);
    });

    it("transitioning from valid id to undefined clears details and error (State Transition)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result, rerender } = renderHook(({ id }) => useVesselDetails(id), {
        initialProps: { id: "v1" as string | undefined },
      });
      await waitFor(() => expect(result.current.details).not.toBeNull());
      rerender({ id: undefined });
      await waitFor(() => expect(result.current.details).toBeNull());
      expect(result.current.error).toBe("");
    });

    it("transitioning from undefined to a valid id triggers a fetch", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { rerender } = renderHook(({ id }) => useVesselDetails(id), {
        initialProps: { id: undefined as string | undefined },
      });
      expect(fetchVesselDetails).not.toHaveBeenCalled();
      rerender({ id: "v1" });
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith("v1"));
    });

    it("does not re-fetch when vesselId stays the same across re-renders", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { rerender } = renderHook(({ id }) => useVesselDetails(id), { initialProps: { id: "v1" } });
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledTimes(1));
      rerender({ id: "v1" });
      rerender({ id: "v1" });
      expect(fetchVesselDetails).toHaveBeenCalledTimes(1);
    });

    it("rapid vesselId switching: stale response for an earlier id can overwrite state for a newer id (race condition — no cancellation guard)", async () => {
      let resolveV1!: (v: VesselDetailsApi) => void;
      let resolveV2!: (v: VesselDetailsApi) => void;
      vi.mocked(fetchVesselDetails)
        .mockImplementationOnce(() => new Promise((r) => { resolveV1 = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveV2 = r; }));

      const { result, rerender } = renderHook(({ id }) => useVesselDetails(id), { initialProps: { id: "v1" } });
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledTimes(1));

      rerender({ id: "v2" });
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledTimes(2));

      // v2 resolves first (fast network), then stale v1 resolves after — overwrites v2's fresher data.
      await act(async () => { resolveV2(apiDetails({ vessel_name: "Vessel V2" })); });
      expect(result.current.details?.vesselName).toBe("Vessel V2");

      await act(async () => { resolveV1(apiDetails({ vessel_name: "Vessel V1" })); });
      // Documents the current bug: the older request's data clobbers the newer state.
      expect(result.current.details?.vesselName).toBe("Vessel V1");
    });
  });

  // ── refresh() ─────────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("refresh is referentially stable when vesselId is unchanged", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result, rerender } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender();
      expect(result.current.refresh).toBe(ref1);
    });

    it("refresh identity changes when vesselId changes (expected, since load depends on vesselId)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result, rerender } = renderHook(({ id }) => useVesselDetails(id), { initialProps: { id: "v1" } });
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender({ id: "v2" });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.refresh).not.toBe(ref1);
    });

    it("manually calling refresh re-fetches for current vesselId", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledTimes(1));
      await act(async () => { await result.current.refresh(); });
      expect(fetchVesselDetails).toHaveBeenCalledTimes(2);
      expect(fetchVesselDetails).toHaveBeenLastCalledWith("v1");
    });
  });

  // ── Cleanup / unmount ─────────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmount during pending fetch does not throw", async () => {
      let resolveFn: (v: VesselDetailsApi) => void = () => {};
      vi.mocked(fetchVesselDetails).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { unmount } = renderHook(() => useVesselDetails("v1"));
      expect(() => unmount()).not.toThrow();
      await act(async () => { resolveFn(apiDetails()); await Promise.resolve(); });
    });

    it("unmount during pending rejection does not throw", async () => {
      let rejectFn: (e: unknown) => void = () => {};
      vi.mocked(fetchVesselDetails).mockImplementation(() => new Promise((_r, rej) => { rejectFn = rej; }));
      const { unmount } = renderHook(() => useVesselDetails("v1"));
      unmount();
      await act(async () => { rejectFn(new Error("late")); await Promise.resolve().catch(() => {}); });
    });
  });

  // ── Edge cases / error guessing ───────────────────────────────────────────

  describe("edge cases", () => {
    it("vesselId with special characters (URL-unsafe) is passed through untouched", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      renderHook(() => useVesselDetails("v/1?x=1&y=2"));
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith("v/1?x=1&y=2"));
    });

    it("very long vesselId is passed through", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const longId = "v".repeat(500);
      renderHook(() => useVesselDetails(longId));
      await waitFor(() => expect(fetchVesselDetails).toHaveBeenCalledWith(longId));
    });

    it("multiple sequential refreshes preserve final resolved data", async () => {
      vi.mocked(fetchVesselDetails)
        .mockResolvedValueOnce(apiDetails({ vessel_name: "First" }))
        .mockResolvedValueOnce(apiDetails({ vessel_name: "Second" }))
        .mockResolvedValueOnce(apiDetails({ vessel_name: "Third" }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.vesselName).toBe("First"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.details?.vesselName).toBe("Second");
      await act(async () => { await result.current.refresh(); });
      expect(result.current.details?.vesselName).toBe("Third");
    });
  });

  // ── Additional edge cases / State Transition / Error Guessing ────────────

  describe("additional edge cases", () => {
    it("return object has exactly the expected keys", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(Object.keys(result.current).sort()).toEqual(["details", "error", "loading", "refresh"]);
    });

    it("details are replaced (not merged) on a subsequent successful load", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValueOnce(apiDetails({ vessel_name: "First", flag: "India" }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.vesselName).toBe("First"));
      vi.mocked(fetchVesselDetails).mockResolvedValueOnce(apiDetails({ vessel_name: "Second", flag: "USA" }));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.details?.vesselName).toBe("Second");
      expect(result.current.details?.flag).toBe("USA");
    });

    it("error is cleared at the start of a new load (before resolution)", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
      let resolveFn!: (v: VesselDetailsApi) => void;
      vi.mocked(fetchVesselDetails).mockImplementationOnce(() => new Promise((r) => { resolveFn = r; }));
      let p!: Promise<void>;
      act(() => { p = result.current.refresh(); });
      expect(result.current.error).toBe("");
      await act(async () => { resolveFn(apiDetails()); await p; });
    });

    it("loading is true while a refresh is pending, then false after resolution", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValueOnce(apiDetails());
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      let resolveFn!: (v: VesselDetailsApi) => void;
      vi.mocked(fetchVesselDetails).mockImplementationOnce(() => new Promise((r) => { resolveFn = r; }));
      let p!: Promise<void>;
      act(() => { p = result.current.refresh(); });
      expect(result.current.loading).toBe(true);
      await act(async () => { resolveFn(apiDetails()); await p; });
      expect(result.current.loading).toBe(false);
    });

    it("handles rejection with null", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue(null);
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });

    it("handles rejection with undefined", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue(undefined);
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });

    it("handles rejection with a number", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue(42);
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });

    it("handles rejection with a boolean", async () => {
      vi.mocked(fetchVesselDetails).mockRejectedValue(true);
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel details"));
    });

    it("handles vessel with all fields undefined in the vessel sub-object", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue({ vessel: {} });
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.details).toEqual({
        vesselType: "Unknown", vesselName: "Unknown Vessel", flag: "Unknown",
        length: undefined, width: undefined, grossTonnage: undefined,
      });
    });

    it("handles vessel with negative length/width/grossTonnage", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ length: -50, width: -10, gross_tonnage: -1000 }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.length).toBe(-50));
      expect(result.current.details?.width).toBe(-10);
      expect(result.current.details?.grossTonnage).toBe(-1000);
    });

    it("handles vessel with fractional length/width", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ length: 199.99, width: 30.5 }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.length).toBe(199.99));
      expect(result.current.details?.width).toBe(30.5);
    });

    it("handles vessel with very long name (1000 chars)", async () => {
      const longName = "V".repeat(1000);
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ vessel_name: longName }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.vesselName).toBe(longName));
    });

    it("handles vessel with special characters in name", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ vessel_name: "Ship's \"Name\" <script>" }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.vesselName).toBe("Ship's \"Name\" <script>"));
    });

    it("handles vessel with empty-string flag", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ flag: "" }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.flag).toBe(""));
    });

    it("handles vessel with empty-string vessel_type", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ vessel_type: "" }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.vesselType).toBe(""));
    });

    it("handles vessel with numeric string gross_tonnage passed as number", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails({ gross_tonnage: 0 }));
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.details?.grossTonnage).toBe(0));
    });

    it("transitioning from valid id to empty string clears details and error", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result, rerender } = renderHook(({ id }) => useVesselDetails(id), {
        initialProps: { id: "v1" as string | undefined },
      });
      await waitFor(() => expect(result.current.details).not.toBeNull());
      rerender({ id: "" });
      await waitFor(() => expect(result.current.details).toBeNull());
      expect(result.current.error).toBe("");
    });

    it("concurrent refresh calls resolve without throwing (Promise.all)", async () => {
      vi.mocked(fetchVesselDetails).mockResolvedValue(apiDetails());
      const { result } = renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await Promise.all([result.current.refresh(), result.current.refresh()]);
      });
      expect(result.current.loading).toBe(false);
    });

    it("mapper is called with the raw API response (not just the vessel sub-object)", async () => {
      const raw = apiDetails();
      vi.mocked(fetchVesselDetails).mockResolvedValue(raw);
      renderHook(() => useVesselDetails("v1"));
      await waitFor(() => expect(mapVesselDetailsFromApi).toHaveBeenCalledWith(raw));
    });
  });
});
