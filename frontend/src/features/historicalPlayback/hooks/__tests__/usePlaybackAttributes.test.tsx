import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { usePlaybackAttributes } from "../usePlaybackAttributes";

import * as playbackApi from "../../api/historicalPlaybackApi";
import * as mappers from "../../model/mappers";

import type { PlaybackAttributesResponse } from "../../api/types";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockAttributesResponse: PlaybackAttributesResponse = {
  attributes: [
    { key: "vessel_type", path: "vessel.vessel_type" },
    { key: "flag", path: "vessel.flag" },
    { key: "speed", path: "vessel.speed" },
    { key: "heading", path: "vessel.heading" },
    { key: "destination", path: "vessel.destination" },
    { key: "status", path: "vessel.status" },
  ],
};

const mockMappedAttributes = [
  { key: "vessel_type", path: "vessel.vessel_type" },
  { key: "flag", path: "vessel.flag" },
  { key: "speed", path: "vessel.speed" },
  { key: "heading", path: "vessel.heading" },
  { key: "destination", path: "vessel.destination" },
  { key: "status", path: "vessel.status" },
];

describe("usePlaybackAttributes", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let mapSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(playbackApi, "fetchPlaybackAttributes")
      .mockResolvedValue(mockAttributesResponse);
    mapSpy = vi
      .spyOn(mappers, "mapPlaybackAttributes")
      .mockReturnValue(mockMappedAttributes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- T-01: Loading state ---
  it("returns loading state initially", () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
  });

  it("isLoading is true on first render before promise resolves", () => {
    fetchSpy.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it("isFetching is true during initial load", () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(true);
  });

  // --- T-02: Success state ---
  it("returns mapped attribute data on success", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(6);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("calls fetchPlaybackAttributes once on mount", async () => {
    renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("calls mapPlaybackAttributes with raw API response", async () => {
    renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mapSpy).toHaveBeenCalledWith(mockAttributesResponse);
    });
  });

  it("returns domain-typed attributes (not raw API types)", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data![0]).toHaveProperty("key");
    expect(result.current.data![0]).toHaveProperty("path");
  });

  it("first attribute has key vessel_type", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data![0].key).toBe("vessel_type");
  });

  it("first attribute has path vessel.vessel_type", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data![0].path).toBe("vessel.vessel_type");
  });

  it("returns all 6 attributes", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(6);
    });
  });

  it("includes flag attribute in results", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const keys = result.current.data!.map((a) => a.key);
    expect(keys).toContain("flag");
  });

  it("includes speed attribute in results", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const keys = result.current.data!.map((a) => a.key);
    expect(keys).toContain("speed");
  });

  it("includes heading attribute in results", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const keys = result.current.data!.map((a) => a.key);
    expect(keys).toContain("heading");
  });

  it("includes destination attribute in results", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const keys = result.current.data!.map((a) => a.key);
    expect(keys).toContain("destination");
  });

  it("includes status attribute in results", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const keys = result.current.data!.map((a) => a.key);
    expect(keys).toContain("status");
  });

  it("isLoading transitions from true to false", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("isSuccess is true after data loads", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  // --- T-03: Error state ---
  it("returns error state on API failure", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("error message matches rejected error", async () => {
    fetchSpy.mockRejectedValue(new Error("500 Internal Server Error"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("500 Internal Server Error");
  });

  it("does not call mapper on API failure", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));
    renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mapSpy).not.toHaveBeenCalled();
    });
  });

  it("isError is false on success", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
    });
  });

  // --- T-04: Mapper integration ---
  it("data is mapped through mapper, not raw API types", async () => {
    mapSpy.mockReturnValue([{ key: "custom_key", path: "custom.path" }]);
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data![0].key).toBe("custom_key");
    });
  });

  it("mapper output length matches mocked return", async () => {
    mapSpy.mockReturnValue([
      { key: "a", path: "a.b" },
      { key: "b", path: "b.c" },
    ]);
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });
  });

  // --- T-05: Refetch ---
  it("refetch re-calls fetchPlaybackAttributes", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await result.current.refetch();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("refetch re-calls mapPlaybackAttributes", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mapSpy).toHaveBeenCalledTimes(1);
    });

    await result.current.refetch();

    expect(mapSpy).toHaveBeenCalledTimes(2);
  });

  // --- T-06: Cache behavior ---
  it("cache prevents duplicate fetch on re-render", async () => {
    const { result, rerender } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    rerender();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("data persists across re-renders (from cache)", async () => {
    const { result, rerender } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstData = result.current.data;
    rerender();

    expect(result.current.data).toBe(firstData);
  });

  // --- E-01: Empty data ---
  it("handles empty attributes response", async () => {
    fetchSpy.mockResolvedValue({ attributes: [] });
    mapSpy.mockReturnValue([]);
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it("empty data is not undefined", async () => {
    fetchSpy.mockResolvedValue({ attributes: [] });
    mapSpy.mockReturnValue([]);
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });

    expect(result.current.data).not.toBeUndefined();
  });

  // --- E-02: Single attribute ---
  it("handles single attribute response", async () => {
    fetchSpy.mockResolvedValue({
      attributes: [{ key: "speed", path: "vessel.speed" }],
    });
    mapSpy.mockReturnValue([{ key: "speed", path: "vessel.speed" }]);
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(result.current.data![0].key).toBe("speed");
  });

  // --- E-03: Large dataset ---
  it("handles large attributes response (100 items)", async () => {
    const largeResponse: PlaybackAttributesResponse = {
      attributes: Array.from({ length: 100 }, (_, i) => ({
        key: `attr_${i}`,
        path: `vessel.attr_${i}`,
      })),
    };
    const largeMapped = largeResponse.attributes.map((a) => ({ ...a }));
    fetchSpy.mockResolvedValue(largeResponse);
    mapSpy.mockReturnValue(largeMapped);

    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(100);
    });
  });

  // --- E-04: Mapper throws ---
  it("returns error state when mapper throws", async () => {
    mapSpy.mockImplementation(() => {
      throw new Error("Mapper error: invalid shape");
    });
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toContain("Mapper error");
  });

  // --- E-05: API returns null ---
  it("handles null response from API", async () => {
    fetchSpy.mockResolvedValue(null as unknown as PlaybackAttributesResponse);
    mapSpy.mockReturnValue([]);
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  // --- E-06: API returns undefined ---
  it("handles undefined response from API", async () => {
    fetchSpy.mockResolvedValue(
      undefined as unknown as PlaybackAttributesResponse,
    );
    mapSpy.mockReturnValue([]);
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  // --- E-07: Network error ---
  it("handles network error gracefully", async () => {
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(TypeError);
  });

  // --- E-08: Error with custom message ---
  it("preserves custom error message from API", async () => {
    fetchSpy.mockRejectedValue(new Error("Custom API error 123"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe("Custom API error 123");
    });
  });

  // --- E-09: Data integrity ---
  it("attribute keys are strings", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.data!.forEach((attr) => {
      expect(typeof attr.key).toBe("string");
    });
  });

  it("attribute paths are strings", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.data!.forEach((attr) => {
      expect(typeof attr.path).toBe("string");
    });
  });

  it("all attributes have non-empty keys", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.data!.forEach((attr) => {
      expect(attr.key.length).toBeGreaterThan(0);
    });
  });

  it("all attributes have non-empty paths", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.data!.forEach((attr) => {
      expect(attr.path.length).toBeGreaterThan(0);
    });
  });

  it("attribute keys are unique", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const keys = result.current.data!.map((a) => a.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  // --- E-10: Stale data ---
  it("data is undefined before first successful fetch", () => {
    fetchSpy.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
  });

  it("error is null on initial render", () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.error).toBeNull();
  });

  it("error is null on success", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.error).toBeNull();
  });

  // --- E-11: Multiple hooks ---
  it("multiple hook instances share cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result: result1 } = renderHook(() => usePlaybackAttributes(), {
      wrapper,
    });
    const { result: result2 } = renderHook(() => usePlaybackAttributes(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });
    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // --- E-12: Cleanup on unmount ---
  it("does not update state after unmount", async () => {
    const slowPromise = new Promise<PlaybackAttributesResponse>(() => {});
    fetchSpy.mockReturnValue(slowPromise);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    unmount();

    await new Promise((r) => setTimeout(r, 100));

    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining("unmounted component"),
    );
    spy.mockRestore();
  });

  // --- E-13: Query key ---
  it("uses stable query key for caching", async () => {
    const { result, rerender } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    rerender();

    expect(result.current.data).toBeDefined();
  });

  // --- E-14: isPending vs isLoading ---
  it("isPending is true on initial load", () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isPending).toBe(true);
  });

  it("isPending is false after success", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("isPending is false after error", async () => {
    fetchSpy.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  // --- E-15: status field ---
  it("status is pending on initial render", () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.status).toBe("pending");
  });

  it("status is success after data loads", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
  });

  it("status is error after API failure", async () => {
    fetchSpy.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  // --- E-16: fetchStatus ---
  it("fetchStatus is fetching during initial load", () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("fetching");
  });

  it("fetchStatus is idle after success", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // --- E-17: Refetch with error ---
  it("refetch after error re-attempts fetch", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    await result.current.refetch();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("refetch recovers from error to success", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  // --- E-18: Data shape verification ---
  it("data is an array", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Array.isArray(result.current.data)).toBe(true);
    });
  });

  it("each attribute has exactly key and path properties", async () => {
    const { result } = renderHook(() => usePlaybackAttributes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.data!.forEach((attr) => {
      expect(attr).toHaveProperty("key");
      expect(attr).toHaveProperty("path");
    });
  });
});
