import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { usePlaybackBuffer } from "../usePlaybackBuffer";

import type { PlaybackChunk } from "../../model/types";

const mockGeometry: GeoJSON.Geometry = {
  type: "Polygon",
  coordinates: [
    [
      [65, 15],
      [66, 15],
      [66, 16],
      [65, 16],
      [65, 15],
    ],
  ],
};


const mockChunkData: PlaybackChunk = {
  chunkOffset: 0,
  chunkStart: "2024-12-04T16:00:00Z",
  chunkEnd: "2024-12-04T16:01:00Z",
  timestamps: ["2024-12-04T16:00:00Z", "2024-12-04T16:00:15Z"],
  vessels: {
    V0001: [
      {
        timestamp: "2024-12-04T16:00:00Z",
        latitude: 15.9,
        longitude: 65.2,
        heading: 45, speed: 0,
      },
    ],
  },
};

const GRAN = "minute" as const;

describe("usePlaybackBuffer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Initial state ---
  it("returns null bufferManager initially", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(result.current.bufferManager).toBeNull();
  });

  it("returns currentChunk 0 initially", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(result.current.currentChunk).toBe(0);
  });

  it("returns isBuffering false initially", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(result.current.isBuffering).toBe(false);
  });

  it("returns bufferError null initially", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(result.current.bufferError).toBeNull();
  });

  it("returns all expected keys in result", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(result.current).toHaveProperty("bufferManager");
    expect(result.current).toHaveProperty("currentChunk");
    expect(result.current).toHaveProperty("isBuffering");
    expect(result.current).toHaveProperty("bufferError");
    expect(result.current).toHaveProperty("initializeBuffer");
    expect(result.current).toHaveProperty("handleSliderChange");
    expect(result.current).toHaveProperty("getChunkData");
    expect(result.current).toHaveProperty("updateBufferConfig");
    expect(result.current).toHaveProperty("clearBuffer");
  });

  it("initializeBuffer is a function", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(typeof result.current.initializeBuffer).toBe("function");
  });

  it("handleSliderChange is a function", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(typeof result.current.handleSliderChange).toBe("function");
  });

  it("getChunkData is a function", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(typeof result.current.getChunkData).toBe("function");
  });

  it("updateBufferConfig is a function", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(typeof result.current.updateBufferConfig).toBe("function");
  });

  it("clearBuffer is a function", () => {
    const { result } = renderHook(() => usePlaybackBuffer());
    expect(typeof result.current.clearBuffer).toBe("function");
  });

  // --- initializeBuffer ---
  it("initializeBuffer creates a TrajectoryBufferManager", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("initializeBuffer returns the manager instance", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    let manager: ReturnType<typeof result.current.initializeBuffer> | null = null;
    act(() => {
      manager = result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    expect(manager).not.toBeNull();
  });

  it("initializeBuffer sets bufferError to null", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    expect(result.current.bufferError).toBeNull();
  });

  it("initializeBuffer can be called multiple times", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T17:00:00Z",
        "2024-12-04T18:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("initializeBuffer accepts hour granularity", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T18:00:00Z",
        mockGeometry,
        "hour",
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("initializeBuffer accepts day granularity", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-05T16:00:00Z",
        mockGeometry,
        "day",
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("initializeBuffer accepts week granularity", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-11T16:00:00Z",
        mockGeometry,
        "week",
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  // --- getChunkData ---
  it("getChunkData throws if buffer not initialized", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    await expect(
      act(async () => {
        await result.current.getChunkData(0);
      }),
    ).rejects.toThrow("Buffer manager not initialized");
  });

  it("getChunkData sets isBuffering true while loading", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    const getSpy = vi
      .spyOn(manager, "getChunkData")
      .mockImplementation(async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockChunkData), 50);
        });
      });

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.getChunkData(0);
    });

    expect(result.current.isBuffering).toBe(true);

    await act(async () => {
      await promise;
    });

    expect(result.current.isBuffering).toBe(false);
    getSpy.mockRestore();
  });

  it("getChunkData returns PlaybackChunk data", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData").mockResolvedValue(mockChunkData);

    let data: PlaybackChunk | undefined;
    await act(async () => {
      data = await result.current.getChunkData(0);
    });

    expect(data).toEqual(mockChunkData);
  });

  it("getChunkData sets isBuffering false after success", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData").mockResolvedValue(mockChunkData);

    await act(async () => {
      await result.current.getChunkData(0);
    });

    expect(result.current.isBuffering).toBe(false);
  });

  it("getChunkData sets bufferError on failure", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData").mockRejectedValue(new Error("Fetch failed"));

    await act(async () => {
      try {
        await result.current.getChunkData(0);
      } catch {
        // expected
      }
    });

    expect(result.current.bufferError).not.toBeNull();
    expect(result.current.bufferError?.message).toBe("Fetch failed");
  });

  it("getChunkData sets isBuffering false after error", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData").mockRejectedValue(new Error("fail"));

    await act(async () => {
      try {
        await result.current.getChunkData(0);
      } catch {
        // expected
      }
    });

    expect(result.current.isBuffering).toBe(false);
  });

  it("getChunkData clears bufferError before loading", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData")
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValue(mockChunkData);

    await act(async () => {
      try {
        await result.current.getChunkData(0);
      } catch {
        // expected
      }
    });

    expect(result.current.bufferError).not.toBeNull();

    await act(async () => {
      await result.current.getChunkData(0);
    });

    expect(result.current.bufferError).toBeNull();
  });

  it("getChunkData rethrows error", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData").mockRejectedValue(new Error("rethrow me"));

    await expect(
      act(async () => {
        await result.current.getChunkData(0);
      }),
    ).rejects.toThrow("rethrow me");
  });

  // --- handleSliderChange ---
  it("handleSliderChange returns null if buffer not initialized", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    let res: unknown;
    await act(async () => {
      res = await result.current.handleSliderChange(0);
    });

    expect(res).toBeNull();
  });

  it("handleSliderChange returns SliderChangeResult on success", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "handleSliderChange").mockResolvedValue({
      chunkOffset: 1,
      data: mockChunkData,
    });

    let res: unknown;
    await act(async () => {
      res = await result.current.handleSliderChange(65);
    });

    expect(res).toEqual({ chunkOffset: 1, data: mockChunkData });
  });

  it("handleSliderChange updates currentChunk on success", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "handleSliderChange").mockResolvedValue({
      chunkOffset: 2,
      data: mockChunkData,
    });
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(2);

    await act(async () => {
      await result.current.handleSliderChange(125);
    });

    expect(result.current.currentChunk).toBe(2);
  });

  it("handleSliderChange sets isBuffering true while loading", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(1);
    vi.spyOn(manager, "handleSliderChange").mockImplementation(async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ chunkOffset: 1, data: mockChunkData }), 50);
      });
    });

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.handleSliderChange(65);
    });

    expect(result.current.isBuffering).toBe(true);

    await act(async () => {
      await promise;
    });

    expect(result.current.isBuffering).toBe(false);
  });

  it("handleSliderChange returns null for same chunk offset", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(0);
    vi.spyOn(manager, "handleSliderChange").mockResolvedValue({
      chunkOffset: 0,
      data: mockChunkData,
    });

    await act(async () => {
      await result.current.handleSliderChange(30);
    });

    let res2: unknown;
    await act(async () => {
      res2 = await result.current.handleSliderChange(40);
    });

    expect(res2).toBeNull();
  });

  it("handleSliderChange sets bufferError on failure", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(1);
    vi.spyOn(manager, "handleSliderChange").mockRejectedValue(
      new Error("Slider fetch error"),
    );

    await act(async () => {
      try {
        await result.current.handleSliderChange(65);
      } catch {
        // expected
      }
    });

    expect(result.current.bufferError?.message).toBe("Slider fetch error");
  });

  it("handleSliderChange sets isBuffering false after error", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(1);
    vi.spyOn(manager, "handleSliderChange").mockRejectedValue(new Error("fail"));

    await act(async () => {
      try {
        await result.current.handleSliderChange(65);
      } catch {
        // expected
      }
    });

    expect(result.current.isBuffering).toBe(false);
  });

  it("handleSliderChange rethrows error", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(1);
    vi.spyOn(manager, "handleSliderChange").mockRejectedValue(
      new Error("rethrow slider"),
    );

    await expect(
      act(async () => {
        await result.current.handleSliderChange(65);
      }),
    ).rejects.toThrow("rethrow slider");
  });

  it("handleSliderChange clears bufferError before loading", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(1);
    vi.spyOn(manager, "handleSliderChange")
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValue({ chunkOffset: 1, data: mockChunkData });

    await act(async () => {
      try {
        await result.current.handleSliderChange(65);
      } catch {
        // expected
      }
    });

    expect(result.current.bufferError).not.toBeNull();

    // Change chunk offset to trigger new call
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(2);
    vi.spyOn(manager, "handleSliderChange").mockResolvedValue({
      chunkOffset: 2,
      data: mockChunkData,
    });

    await act(async () => {
      await result.current.handleSliderChange(125);
    });

    expect(result.current.bufferError).toBeNull();
  });

  // --- updateBufferConfig ---
  it("updateBufferConfig does nothing if buffer not initialized", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.updateBufferConfig(mockGeometry);
    });

    expect(result.current.bufferManager).toBeNull();
  });

  it("updateBufferConfig calls manager.updateConfig", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    const updateSpy = vi.spyOn(manager, "updateConfig");

    const newGeometry: GeoJSON.Geometry = {
      type: "Polygon",
      coordinates: [
        [
          [70, 20],
          [71, 20],
          [71, 21],
          [70, 21],
          [70, 20],
        ],
      ],
    };

    act(() => {
      result.current.updateBufferConfig(newGeometry);
    });

    expect(updateSpy).toHaveBeenCalledWith(newGeometry);
  });

  it("updateBufferConfig clears bufferError", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    // Force an error first
    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData").mockRejectedValue(new Error("fail"));

    await act(async () => {
      try {
        await result.current.getChunkData(0);
      } catch {
        // expected
      }
    });

    expect(result.current.bufferError).not.toBeNull();

    act(() => {
      result.current.updateBufferConfig(mockGeometry);
    });

    expect(result.current.bufferError).toBeNull();
  });

  // --- clearBuffer ---
  it("clearBuffer sets bufferManager to null", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();

    act(() => {
      result.current.clearBuffer();
    });

    expect(result.current.bufferManager).toBeNull();
  });

  it("clearBuffer resets currentChunk to 0", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(3);
    vi.spyOn(manager, "handleSliderChange").mockResolvedValue({
      chunkOffset: 3,
      data: mockChunkData,
    });

    await act(async () => {
      await result.current.handleSliderChange(180);
    });

    act(() => {
      result.current.clearBuffer();
    });

    expect(result.current.currentChunk).toBe(0);
  });

  it("clearBuffer clears bufferError", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkData").mockRejectedValue(new Error("fail"));

    await act(async () => {
      try {
        await result.current.getChunkData(0);
      } catch {
        // expected
      }
    });

    expect(result.current.bufferError).not.toBeNull();

    act(() => {
      result.current.clearBuffer();
    });

    expect(result.current.bufferError).toBeNull();
  });

  it("clearBuffer calls manager.clear() if manager exists", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    const clearSpy = vi.spyOn(manager, "clear");

    act(() => {
      result.current.clearBuffer();
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it("clearBuffer works without initialized manager", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.clearBuffer();
    });

    expect(result.current.bufferManager).toBeNull();
  });

  // --- Cleanup on unmount ---
  it("cleans up buffer on unmount", () => {
    const { result, unmount } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    const clearSpy = vi.spyOn(manager, "clear");

    unmount();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  // --- Stability ---
  it("initializeBuffer callback is stable across re-renders", () => {
    const { result, rerender } = renderHook(() => usePlaybackBuffer());
    const first = result.current.initializeBuffer;
    rerender();
    expect(result.current.initializeBuffer).toBe(first);
  });

  it("handleSliderChange callback is stable across re-renders", () => {
    const { result, rerender } = renderHook(() => usePlaybackBuffer());
    const first = result.current.handleSliderChange;
    rerender();
    expect(result.current.handleSliderChange).toBe(first);
  });

  it("getChunkData callback is stable across re-renders", () => {
    const { result, rerender } = renderHook(() => usePlaybackBuffer());
    const first = result.current.getChunkData;
    rerender();
    expect(result.current.getChunkData).toBe(first);
  });

  it("updateBufferConfig callback is stable across re-renders", () => {
    const { result, rerender } = renderHook(() => usePlaybackBuffer());
    const first = result.current.updateBufferConfig;
    rerender();
    expect(result.current.updateBufferConfig).toBe(first);
  });

  it("clearBuffer callback is stable across re-renders", () => {
    const { result, rerender } = renderHook(() => usePlaybackBuffer());
    const first = result.current.clearBuffer;
    rerender();
    expect(result.current.clearBuffer).toBe(first);
  });

  // --- Edge cases ---
  it("handleSliderChange with 0 seconds returns null for chunk 0", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(0);
    vi.spyOn(manager, "handleSliderChange").mockResolvedValue({
      chunkOffset: 0,
      data: mockChunkData,
    });

    let res: unknown;
    await act(async () => {
      res = await result.current.handleSliderChange(0);
    });

    // First call should not return null (lastChunkRef starts at -1)
    expect(res).not.toBeNull();
  });

  it("handleSliderChange with large time value computes correct chunk", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    vi.spyOn(manager, "getChunkOffset").mockReturnValue(9);
    vi.spyOn(manager, "handleSliderChange").mockResolvedValue({
      chunkOffset: 9,
      data: mockChunkData,
    });

    await act(async () => {
      await result.current.handleSliderChange(540);
    });

    expect(result.current.currentChunk).toBe(9);
  });

  it("getChunkData with different offsets works", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    const manager = result.current.bufferManager!;
    const mockChunk5: PlaybackChunk = { ...mockChunkData, chunkOffset: 5 };
    vi.spyOn(manager, "getChunkData").mockResolvedValue(mockChunk5);

    let data: PlaybackChunk | undefined;
    await act(async () => {
      data = await result.current.getChunkData(5);
    });

    expect(data?.chunkOffset).toBe(5);
  });

  it("initializeBuffer with empty geometry works", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        { type: "Point", coordinates: [0, 0] },
        GRAN,
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("initializeBuffer with complex geometry works", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  // ── Filter integration tests ──

  it("initializeBuffer accepts filters and creates a bufferManager", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [{ field: "speed", operator: "gt", value: "10" }],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("initializeBuffer with empty filters creates a bufferManager", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("initializeBuffer with multiple filters and combinators creates a bufferManager", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [
          { field: "speed", operator: "gt", value: "5" },
          { field: "shipName", operator: "like", value: "%CARGO%", combinator: "AND" },
          { field: "heading", operator: "eq", value: "0", combinator: "OR" },
        ],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();
  });

  it("clearBuffer after initializeBuffer with filters resets bufferManager to null", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [{ field: "speed", operator: "gt", value: "10" }],
      );
    });

    expect(result.current.bufferManager).not.toBeNull();

    act(() => {
      result.current.clearBuffer();
    });

    expect(result.current.bufferManager).toBeNull();
  });

  it("handleSliderChange returns null when bufferManager not initialized (with filters)", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    let sliderResult: unknown;
    await act(async () => {
      sliderResult = await result.current.handleSliderChange(60);
    });

    expect(sliderResult).toBeNull();
  });

  it("getChunkData throws when bufferManager not initialized (with filters)", async () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    await expect(
      act(async () => {
        await result.current.getChunkData(0);
      }),
    ).rejects.toThrow("Buffer manager not initialized");
  });

  it("re-initializeBuffer with different filters creates a new bufferManager", () => {
    const { result } = renderHook(() => usePlaybackBuffer());

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [{ field: "speed", operator: "gt", value: "10" }],
      );
    });
    const firstManager = result.current.bufferManager;

    act(() => {
      result.current.initializeBuffer(
        "2024-12-04T16:00:00Z",
        "2024-12-04T17:00:00Z",
        mockGeometry,
        GRAN,
        [{ field: "heading", operator: "eq", value: "0" }],
      );
    });
    const secondManager = result.current.bufferManager;

    expect(secondManager).not.toBeNull();
    expect(secondManager).not.toBe(firstManager);
  });
});
