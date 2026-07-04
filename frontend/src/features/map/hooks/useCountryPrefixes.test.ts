import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCountryPrefixes } from "./useCountryPrefixes";
import type { CountryPrefixApi } from "../api/types";
import type { CountryPrefix } from "../model/types";

vi.mock("../api", () => ({
  fetchCountryPrefixes: vi.fn(),
}));

vi.mock("../model/mappers", () => ({
  mapCountryPrefixesFromApi: vi.fn(),
}));

import { fetchCountryPrefixes } from "../api";
import { mapCountryPrefixesFromApi } from "../model/mappers";

function apiPrefix(country: string, prefix: string): CountryPrefixApi {
  return { country, prefix };
}

function domainPrefix(country: string, prefix: string): CountryPrefix {
  return { country, prefix };
}

describe("useCountryPrefixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default passthrough mapper behavior unless overridden.
    vi.mocked(mapCountryPrefixesFromApi).mockImplementation((raw) =>
      raw.map((r) => ({ country: r.country, prefix: r.prefix }))
    );
  });

  // ── Initial state (Boundary / Lifecycle) ────────────────────────────────

  describe("initial state", () => {
    it("initializes countries as empty array before resolution", () => {
      vi.mocked(fetchCountryPrefixes).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useCountryPrefixes());
      expect(result.current.countries).toEqual([]);
    });

    it("initializes loading as false synchronously, flips true immediately on mount effect", async () => {
      vi.mocked(fetchCountryPrefixes).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useCountryPrefixes());
      // effect runs synchronously within React act() in test env; loading becomes true
      await waitFor(() => expect(result.current.loading).toBe(true));
    });

    it("initializes error as empty string", () => {
      vi.mocked(fetchCountryPrefixes).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useCountryPrefixes());
      expect(result.current.error).toBe("");
    });

    it("exposes a refresh function", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([]);
      const { result } = renderHook(() => useCountryPrefixes());
      expect(typeof result.current.refresh).toBe("function");
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("calls fetchCountryPrefixes exactly once on mount", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([]);
      renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(fetchCountryPrefixes).toHaveBeenCalledTimes(1));
    });
  });

  // ── Success state (Equivalence Partitioning) ────────────────────────────

  describe("success state", () => {
    it("loads and maps a normal list of countries", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("India", "+91"), apiPrefix("USA", "+1")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.countries).toEqual([domainPrefix("India", "+91"), domainPrefix("USA", "+1")]);
    });

    it("sets loading false after success", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("India", "+91")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("clears error on success after a previous failure (state transition ERROR -> SUCCESS)", async () => {
      vi.mocked(fetchCountryPrefixes).mockRejectedValueOnce(new Error("boom"));
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).toBe("Failed to load country prefixes"));

      vi.mocked(fetchCountryPrefixes).mockResolvedValueOnce([apiPrefix("India", "+91")]);
      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.error).toBe("");
      expect(result.current.countries).toEqual([domainPrefix("India", "+91")]);
    });

    it("calls mapCountryPrefixesFromApi with the raw API payload", async () => {
      const raw = [apiPrefix("India", "+91")];
      vi.mocked(fetchCountryPrefixes).mockResolvedValue(raw);
      renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(mapCountryPrefixesFromApi).toHaveBeenCalledWith(raw));
    });

    it("handles empty-array success (Empty State)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.countries).toEqual([]);
      expect(result.current.error).toBe("");
    });

    it("handles single-element success (Boundary Value)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("Nauru", "+674")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries).toHaveLength(1));
    });

    it("handles large dataset (250+ countries) without truncation", async () => {
      const large = Array.from({ length: 250 }, (_, i) => apiPrefix(`Country${i}`, `+${i}`));
      vi.mocked(fetchCountryPrefixes).mockResolvedValue(large);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries).toHaveLength(250));
    });

    it("preserves duplicate entries (mapper is passthrough, hook does not dedupe)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("India", "+91"), apiPrefix("India", "+91")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries).toHaveLength(2));
    });

    it("passes through unusual but valid prefix formats (e.g. multi-code '+1-242')", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("Bahamas", "+1-242")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries[0].prefix).toBe("+1-242"));
    });

    it("handles country names with unicode characters", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("Côte d'Ivoire", "+225")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries[0].country).toBe("Côte d'Ivoire"));
    });
  });

  // ── Error / Negative / Failure Injection ────────────────────────────────

  describe("error state", () => {
    it("sets a generic error message on rejection (message content is intentionally swallowed)", async () => {
      vi.mocked(fetchCountryPrefixes).mockRejectedValue(new Error("Network down"));
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).toBe("Failed to load country prefixes"));
    });

    it("sets loading false after failure", async () => {
      vi.mocked(fetchCountryPrefixes).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("leaves countries empty after failure with no prior data", async () => {
      vi.mocked(fetchCountryPrefixes).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).not.toBe(""));
      expect(result.current.countries).toEqual([]);
    });

    it("retains stale countries after a failed refresh (does not clear on error) — potential production bug surface", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValueOnce([apiPrefix("India", "+91")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries).toHaveLength(1));

      vi.mocked(fetchCountryPrefixes).mockRejectedValueOnce(new Error("fail"));
      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.error).toBe("Failed to load country prefixes");
      expect(result.current.countries).toEqual([domainPrefix("India", "+91")]);
    });

    it("handles rejection with non-Error value (string)", async () => {
      vi.mocked(fetchCountryPrefixes).mockRejectedValue("plain string failure");
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).toBe("Failed to load country prefixes"));
    });

    it("handles rejection with undefined", async () => {
      vi.mocked(fetchCountryPrefixes).mockRejectedValue(undefined);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).toBe("Failed to load country prefixes"));
    });

    it("handles rejection with null", async () => {
      vi.mocked(fetchCountryPrefixes).mockRejectedValue(null);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).toBe("Failed to load country prefixes"));
    });

    it("handles a mapper throwing synchronously (Failure Injection on transform layer)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("X", "+1")]);
      vi.mocked(mapCountryPrefixesFromApi).mockImplementation(() => {
        throw new Error("mapper exploded");
      });
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).toBe("Failed to load country prefixes"));
      expect(result.current.loading).toBe(false);
    });

    it("recovers after repeated failures once the API succeeds (State Transition ERR->ERR->SUCCESS)", async () => {
      vi.mocked(fetchCountryPrefixes)
        .mockRejectedValueOnce(new Error("e1"))
        .mockRejectedValueOnce(new Error("e2"))
        .mockResolvedValueOnce([apiPrefix("Fiji", "+679")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.error).not.toBe(""));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).not.toBe("");
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("");
      expect(result.current.countries).toEqual([domainPrefix("Fiji", "+679")]);
    });
  });

  // ── refresh() semantics (Callback stability / Re-entrancy) ──────────────

  describe("refresh", () => {
    it("refresh is referentially stable across re-renders (memoization correctness)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([]);
      const { result, rerender } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender();
      expect(result.current.refresh).toBe(ref1);
    });

    it("manually invoking refresh triggers a second fetch call", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("A", "+1")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(fetchCountryPrefixes).toHaveBeenCalledTimes(1));
      await act(async () => { await result.current.refresh(); });
      expect(fetchCountryPrefixes).toHaveBeenCalledTimes(2);
    });

    it("sets loading true then false during a manual refresh cycle", async () => {
      let resolveFn: (v: CountryPrefixApi[]) => void = () => {};
      vi.mocked(fetchCountryPrefixes).mockResolvedValueOnce([]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));

      vi.mocked(fetchCountryPrefixes).mockImplementationOnce(
        () => new Promise((resolve) => { resolveFn = resolve; })
      );
      let refreshPromise!: Promise<void>;
      act(() => {
        refreshPromise = result.current.refresh();
      });
      expect(result.current.loading).toBe(true);
      await act(async () => {
        resolveFn([apiPrefix("A", "+1")]);
        await refreshPromise;
      });
      expect(result.current.loading).toBe(false);
    });

    it("concurrent refresh calls both resolve without throwing (Race Condition Analysis)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("A", "+1")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await Promise.all([result.current.refresh(), result.current.refresh()]);
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.countries).toEqual([domainPrefix("A", "+1")]);
    });

    it("last-resolved response wins state when responses race out of order (documents current non-cancelling behavior)", async () => {
      let resolveFirst!: (v: CountryPrefixApi[]) => void;
      let resolveSecond!: (v: CountryPrefixApi[]) => void;
      vi.mocked(fetchCountryPrefixes)
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));

      // Mount consumes the first mockImplementationOnce (never resolved yet).
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(fetchCountryPrefixes).toHaveBeenCalledTimes(1));

      let p2!: Promise<void>;
      act(() => { p2 = result.current.refresh(); });
      await waitFor(() => expect(fetchCountryPrefixes).toHaveBeenCalledTimes(2));

      // Resolve second call first, then first call — first (stale) resolves later and overwrites.
      await act(async () => {
        resolveSecond([apiPrefix("Second", "+2")]);
        await p2;
      });
      expect(result.current.countries).toEqual([domainPrefix("Second", "+2")]);

      await act(async () => {
        resolveFirst([apiPrefix("First", "+1")]);
      });
      // Documents the hook has no request-id guard: the late "first" response overwrites the newer one.
      expect(result.current.countries).toEqual([domainPrefix("First", "+1")]);
    });
  });

  // ── Cleanup / Unmount safety ─────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("does not throw when unmounted while a fetch is still pending", async () => {
      let resolveFn: (v: CountryPrefixApi[]) => void = () => {};
      vi.mocked(fetchCountryPrefixes).mockImplementation(
        () => new Promise((resolve) => { resolveFn = resolve; })
      );
      const { unmount } = renderHook(() => useCountryPrefixes());
      expect(() => unmount()).not.toThrow();
      await act(async () => {
        resolveFn([apiPrefix("A", "+1")]);
        await Promise.resolve();
      });
    });

    it("does not throw when unmounted while a fetch is about to reject", async () => {
      let rejectFn: (e: unknown) => void = () => {};
      vi.mocked(fetchCountryPrefixes).mockImplementation(
        () => new Promise((_resolve, reject) => { rejectFn = reject; })
      );
      const { unmount } = renderHook(() => useCountryPrefixes());
      unmount();
      await act(async () => {
        rejectFn(new Error("late failure"));
        await Promise.resolve().catch(() => {});
      });
    });

    it("only fetches once across the component lifetime (no re-fetch on re-render)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([]);
      const { rerender } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(fetchCountryPrefixes).toHaveBeenCalledTimes(1));
      rerender();
      rerender();
      expect(fetchCountryPrefixes).toHaveBeenCalledTimes(1);
    });
  });

  // ── React Strict Mode / double-invoke resilience ────────────────────────

  describe("React Strict Mode compatibility", () => {
    it("mount -> unmount -> remount (simulating StrictMode double-invoke) does not duplicate stored state incorrectly", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("India", "+91")]);
      const { result: r1, unmount } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(r1.current.loading).toBe(false));
      unmount();

      const { result: r2 } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(r2.current.loading).toBe(false));
      expect(r2.current.countries).toEqual([domainPrefix("India", "+91")]);
    });
  });

  // ── Invalid / unexpected upstream data (Error Guessing) ─────────────────

  describe("unexpected data shapes", () => {
    it("handles API returning a non-array (defensive mapper call still invoked)", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue(null as unknown as CountryPrefixApi[]);
      vi.mocked(mapCountryPrefixesFromApi).mockReturnValue([]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe("");
    });

    it("handles entries with missing prefix field", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([{ country: "X" } as unknown as CountryPrefixApi]);
      vi.mocked(mapCountryPrefixesFromApi).mockReturnValue([{ country: "X", prefix: undefined as unknown as string }]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries[0].country).toBe("X"));
    });

    it("handles entries with missing country field", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([{ prefix: "+1" } as unknown as CountryPrefixApi]);
      vi.mocked(mapCountryPrefixesFromApi).mockReturnValue([{ country: undefined as unknown as string, prefix: "+1" }]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries[0].prefix).toBe("+1"));
    });

    it("handles empty-string country and prefix values", async () => {
      vi.mocked(fetchCountryPrefixes).mockResolvedValue([apiPrefix("", "")]);
      const { result } = renderHook(() => useCountryPrefixes());
      await waitFor(() => expect(result.current.countries).toEqual([domainPrefix("", "")]));
    });
  });
});
