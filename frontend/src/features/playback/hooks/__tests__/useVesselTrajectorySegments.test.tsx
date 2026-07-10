import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useVesselTrajectorySegments,
  DEFAULT_TRAJECTORY_STYLE,
} from '../useVesselTrajectorySegments';
import type { TimelineFrame, TrajectoryOverrideRule } from '../../model/types';

function makeFrame(ts: number, vessels: Record<string, { lat: number; lon: number }>): TimelineFrame {
  return { timestampMs: ts, vessels };
}

function makeTimeline(): TimelineFrame[] {
  return [
    makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
    makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
    makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 } }),
    makeFrame(4000, { v1: { lat: 19.3, lon: 73.1 } }),
    makeFrame(5000, { v1: { lat: 19.4, lon: 73.2 } }),
  ];
}

function makeOverride(
  start: number,
  end: number,
  color: string,
): TrajectoryOverrideRule {
  return { start, end, style: { color, weight: 3, opacity: 0.9 } };
}

describe('useVesselTrajectorySegments', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── T-01: Returns empty array for empty timeline ────────────────────────────
  it('returns empty array for empty timeline', () => {
    const { result } = renderHook(() => useVesselTrajectorySegments([], 5000, null));
    expect(result.current).toEqual([]);
  });

  // ── T-02: Returns empty array when no frames before currentTimestampMs ──────
  it('returns empty array when no frames before currentTimestampMs', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 500, null));
    expect(result.current).toEqual([]);
  });

  // ── T-03: Returns segments for single vessel ────────────────────────────────
  it('returns segments for single vessel', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, null));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].vesselId).toBe('v1');
  });

  // ── T-04: Filters frames to only those at or before currentTimestampMs ──────
  it('filters frames to only those at or before currentTimestampMs', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, null));
    expect(result.current[0].coords).toHaveLength(3);
  });

  // ── T-05: Coords are [lat, lon] pairs ───────────────────────────────────────
  it('coords are [lat, lon] pairs', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, null));
    expect(result.current[0].coords[0]).toEqual([19.0, 72.8]);
    expect(result.current[0].coords[1]).toEqual([19.1, 72.9]);
  });

  // ── T-06: segmentStyles is null when no overrides ───────────────────────────
  it('segmentStyles is null when no overrides', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, null));
    expect(result.current[0].segmentStyles).toBeNull();
  });

  // ── T-07: segmentStyles is null when overrides is empty object ──────────────
  it('segmentStyles is null when overrides is empty object', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, {}));
    expect(result.current[0].segmentStyles).toBeNull();
  });

  // ── T-08: segmentStyles is null when vessel has no overrides ────────────────
  it('segmentStyles is null when vessel has no overrides', () => {
    const timeline = makeTimeline();
    const overrides = { v2: [makeOverride(1000, 3000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles).toBeNull();
  });

  // ── T-09: segmentStyles is null when vessel overrides array is empty ────────
  it('segmentStyles is null when vessel overrides array is empty', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles).toBeNull();
  });

  // ── T-10: segmentStyles has entries when overrides match ────────────────────
  it('segmentStyles has entries when overrides match', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 3000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles).not.toBeNull();
  });

  // ── T-11: segmentStyles length is coords length - 1 ─────────────────────────
  it('segmentStyles length is coords length - 1', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 5000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles).toHaveLength(result.current[0].coords.length - 1);
  });

  // ── T-12: Override style applied to matching segment ────────────────────────
  it('override style applied to matching segment', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 3000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0].color).toBe('#ff0000');
    expect(result.current[0].segmentStyles![1].color).toBe('#ff0000');
  });

  // ── T-13: Default style for segment outside override window ─────────────────
  it('default style for segment outside override window', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 2000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0].color).toBe('#ff0000');
    expect(result.current[0].segmentStyles![1]).toEqual(DEFAULT_TRAJECTORY_STYLE);
  });

  // ── T-14: DEFAULT_TRAJECTORY_STYLE has correct values ───────────────────────
  it('DEFAULT_TRAJECTORY_STYLE has correct values', () => {
    expect(DEFAULT_TRAJECTORY_STYLE.color).toBe('#90caf9');
    expect(DEFAULT_TRAJECTORY_STYLE.weight).toBe(2);
    expect(DEFAULT_TRAJECTORY_STYLE.opacity).toBe(0.6);
  });

  // ── T-15: Multiple vessels in timeline ──────────────────────────────────────
  it('handles multiple vessels in timeline', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 }, v2: { lat: 20.1, lon: 73.1 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, null));
    expect(result.current).toHaveLength(2);
  });

  // ── T-16: Vessel appearing in only some frames ──────────────────────────────
  it('handles vessel appearing in only some frames', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 }, v2: { lat: 20.1, lon: 73.1 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, null));
    const v2 = result.current.find(v => v.vesselId === 'v2');
    expect(v2).toBeDefined();
    expect(v2!.coords).toHaveLength(2);
  });

  // ── T-17: Filters out vessels with fewer than 2 coords ──────────────────────
  it('filters out vessels with fewer than 2 coords', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, null));
    expect(result.current.find(v => v.vesselId === 'v2')).toBeUndefined();
  });

  // ── T-18: Exactly 2 coords passes the filter ────────────────────────────────
  it('vessel with exactly 2 coords is included', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, null));
    expect(result.current).toHaveLength(1);
  });

  // ── T-19: Single coord vessel is filtered out ───────────────────────────────
  it('vessel with single coord is filtered out', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 1000, null));
    expect(result.current).toEqual([]);
  });

  // ── T-20: currentTimestampMs exactly matches a frame timestamp ──────────────
  it('currentTimestampMs exactly matching frame includes that frame', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, null));
    expect(result.current[0].coords).toHaveLength(3);
    expect(result.current[0].coords[2]).toEqual([19.2, 73.0]);
  });

  // ── T-21: Result is memoized for same inputs ────────────────────────────────
  it('result is memoized for same inputs', () => {
    const timeline = makeTimeline();
    const { result, rerender } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, null));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-22: Result changes when timeline changes ──────────────────────────────
  it('result changes when timeline changes', () => {
    const timeline1 = makeTimeline();
    const timeline2 = [...makeTimeline(), makeFrame(6000, { v1: { lat: 19.5, lon: 73.3 } })];
    const { result, rerender } = renderHook(
      ({ timeline }) => useVesselTrajectorySegments(timeline, 6000, null),
      { initialProps: { timeline: timeline1 } },
    );
    expect(result.current[0].coords).toHaveLength(5);
    rerender({ timeline: timeline2 });
    expect(result.current[0].coords).toHaveLength(6);
  });

  // ── T-23: Result changes when currentTimestampMs changes ────────────────────
  it('result changes when currentTimestampMs changes', () => {
    const timeline = makeTimeline();
    const { result, rerender } = renderHook(
      ({ ts }) => useVesselTrajectorySegments(timeline, ts, null),
      { initialProps: { ts: 3000 } },
    );
    expect(result.current[0].coords).toHaveLength(3);
    rerender({ ts: 5000 });
    expect(result.current[0].coords).toHaveLength(5);
  });

  // ── T-24: Result changes when trajectoryOverrides change ────────────────────
  it('result changes when trajectoryOverrides change', () => {
    const timeline = makeTimeline();
    type OverrideProp = Record<string, TrajectoryOverrideRule[]> | null;
    type OverrideProps = { overrides: OverrideProp };
    const overrides1: OverrideProp = null;
    const overrides2: OverrideProp = { v1: [makeOverride(1000, 5000, '#ff0000')] };
    const { result, rerender } = renderHook(
      ({ overrides }: OverrideProps) => useVesselTrajectorySegments(timeline, 5000, overrides),
      { initialProps: { overrides: overrides1 } as OverrideProps },
    );
    expect(result.current[0].segmentStyles).toBeNull();
    rerender({ overrides: overrides2 });
    expect(result.current[0].segmentStyles).not.toBeNull();
  });

  // ── T-25: Override with start exactly at segment timestamp ──────────────────
  it('override with start exactly at segment timestamp matches', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(2000, 4000, '#00ff00')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![1].color).toBe('#00ff00');
  });

  // ── T-26: Override with end exactly at segment timestamp does not match ─────
  it('override with end exactly at segment timestamp does not match', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 2000, '#00ff00')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![1]).toEqual(DEFAULT_TRAJECTORY_STYLE);
  });

  // ── T-27: Multiple override rules for same vessel ───────────────────────────
  it('multiple override rules for same vessel', () => {
    const timeline = makeTimeline();
    const overrides = {
      v1: [
        makeOverride(1000, 2000, '#ff0000'),
        makeOverride(3000, 5000, '#00ff00'),
      ],
    };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0].color).toBe('#ff0000');
    expect(result.current[0].segmentStyles![1]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![2].color).toBe('#00ff00');
    expect(result.current[0].segmentStyles![3].color).toBe('#00ff00');
  });

  // ── T-28: Override for different vessel does not affect this vessel ─────────
  it('override for different vessel does not affect this vessel', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 }, v2: { lat: 20.1, lon: 73.1 } }),
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 }, v2: { lat: 20.2, lon: 73.2 } }),
    ];
    const overrides = { v2: [makeOverride(1000, 3000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, overrides));
    const v1 = result.current.find(v => v.vesselId === 'v1');
    expect(v1!.segmentStyles).toBeNull();
  });

  // ── T-29: Large timeline with 1000 frames ───────────────────────────────────
  it('handles large timeline with 1000 frames', () => {
    const timeline: TimelineFrame[] = Array.from({ length: 1000 }, (_, i) =>
      makeFrame(i * 1000, { v1: { lat: 19 + i * 0.001, lon: 72 + i * 0.001 } }),
    );
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 999999, null));
    expect(result.current[0].coords).toHaveLength(1000);
  });

  // ── T-30: currentTimestampMs of 0 returns empty ─────────────────────────────
  it('currentTimestampMs of 0 returns empty', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 0, null));
    expect(result.current).toEqual([]);
  });

  // ── T-31: Negative currentTimestampMs returns empty ─────────────────────────
  it('negative currentTimestampMs returns empty', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, -100, null));
    expect(result.current).toEqual([]);
  });

  // ── T-32: currentTimestampMs far beyond last frame includes all frames ──────
  it('currentTimestampMs far beyond last frame includes all frames', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 999999, null));
    expect(result.current[0].coords).toHaveLength(5);
  });

  // ── T-33: Return type has vesselId, coords, segmentStyles ───────────────────
  it('return type has vesselId, coords, segmentStyles', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, null));
    expect(result.current[0]).toHaveProperty('vesselId');
    expect(result.current[0]).toHaveProperty('coords');
    expect(result.current[0]).toHaveProperty('segmentStyles');
  });

  // ── T-34: Coords are arrays of [number, number] ─────────────────────────────
  it('coords are arrays of [number, number]', () => {
    const timeline = makeTimeline();
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, null));
    const coord = result.current[0].coords[0];
    expect(Array.isArray(coord)).toBe(true);
    expect(coord).toHaveLength(2);
    expect(typeof coord[0]).toBe('number');
    expect(typeof coord[1]).toBe('number');
  });

  // ── T-35: Override matching first segment only ──────────────────────────────
  it('override matching first segment only', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 2000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0].color).toBe('#ff0000');
    expect(result.current[0].segmentStyles![1]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![2]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![3]).toEqual(DEFAULT_TRAJECTORY_STYLE);
  });

  // ── T-36: Override matching last segment only ───────────────────────────────
  it('override matching last segment only', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(4000, 5000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![1]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![2]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![3].color).toBe('#ff0000');
  });

  // ── T-37: Override covering entire timeline ─────────────────────────────────
  it('override covering entire timeline', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(0, 999999, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    for (const style of result.current[0].segmentStyles!) {
      expect(style.color).toBe('#ff0000');
    }
  });

  // ── T-38: Two vessels with different overrides ──────────────────────────────
  it('two vessels with different overrides', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 }, v2: { lat: 20.1, lon: 73.1 } }),
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 }, v2: { lat: 20.2, lon: 73.2 } }),
    ];
    const overrides = {
      v1: [makeOverride(1000, 3000, '#ff0000')],
      v2: [makeOverride(1000, 3000, '#00ff00')],
    };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, overrides));
    const v1 = result.current.find(v => v.vesselId === 'v1');
    const v2 = result.current.find(v => v.vesselId === 'v2');
    expect(v1!.segmentStyles![0].color).toBe('#ff0000');
    expect(v2!.segmentStyles![0].color).toBe('#00ff00');
  });

  // ── T-39: Vessel with 3 frames has 2 segment styles ─────────────────────────
  it('vessel with 3 frames has 2 segment styles', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 5000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, overrides));
    expect(result.current[0].segmentStyles).toHaveLength(2);
  });

  // ── T-40: Vessel with 5 frames has 4 segment styles ─────────────────────────
  it('vessel with 5 frames has 4 segment styles', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 5000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles).toHaveLength(4);
  });

  // ── T-41: Unsorted timeline frames ──────────────────────────────────────────
  it('handles unsorted timeline frames by filtering correctly', () => {
    const timeline = [
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 } }),
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, null));
    expect(result.current[0].coords).toHaveLength(3);
  });

  // ── T-42: Vessel with same position across frames ───────────────────────────
  it('vessel with same position across frames', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
      makeFrame(2000, { v1: { lat: 19.0, lon: 72.8 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, null));
    expect(result.current[0].coords[0]).toEqual([19.0, 72.8]);
    expect(result.current[0].coords[1]).toEqual([19.0, 72.8]);
  });

  // ── T-43: Override with no matching segments ────────────────────────────────
  it('override with no matching segments uses all defaults', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(99999, 999999, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    for (const style of result.current[0].segmentStyles!) {
      expect(style).toEqual(DEFAULT_TRAJECTORY_STYLE);
    }
  });

  // ── T-44: Multiple vessels only some have overrides ─────────────────────────
  it('multiple vessels only some have overrides', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 }, v2: { lat: 20.1, lon: 73.1 } }),
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 }, v2: { lat: 20.2, lon: 73.2 } }),
    ];
    const overrides = { v1: [makeOverride(1000, 3000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, overrides));
    const v1 = result.current.find(v => v.vesselId === 'v1');
    const v2 = result.current.find(v => v.vesselId === 'v2');
    expect(v1!.segmentStyles).not.toBeNull();
    expect(v2!.segmentStyles).toBeNull();
  });

  // ── T-45: Override style with weight and opacity ────────────────────────────
  it('override style preserves weight and opacity', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(1000, 5000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0].weight).toBe(3);
    expect(result.current[0].segmentStyles![0].opacity).toBe(0.9);
  });

  // ── T-46: Override with dashArray ───────────────────────────────────────────
  it('override with dashArray is preserved', () => {
    const timeline = makeTimeline();
    const overrides = {
      v1: [{ start: 1000, end: 5000, style: { color: '#ff0000', dashArray: '5,5' } }],
    };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0].dashArray).toBe('5,5');
  });

  // ── T-47: Vessel appearing only in first frame is filtered ──────────────────
  it('vessel appearing only in first frame is filtered out', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, null));
    expect(result.current.find(v => v.vesselId === 'v2')).toBeUndefined();
  });

  // ── T-48: Vessel appearing only in last frame is filtered ───────────────────
  it('vessel appearing only in last frame is filtered out', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 }, v2: { lat: 20.0, lon: 73.0 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 3000, null));
    expect(result.current.find(v => v.vesselId === 'v2')).toBeUndefined();
  });

  // ── T-49: Vessel appearing in non-consecutive frames ────────────────────────
  it('vessel appearing in non-consecutive frames', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 }, v2: { lat: 20.0, lon: 73.0 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
      makeFrame(3000, { v1: { lat: 19.2, lon: 73.0 }, v2: { lat: 20.1, lon: 73.1 } }),
      makeFrame(4000, { v1: { lat: 19.3, lon: 73.1 } }),
      makeFrame(5000, { v1: { lat: 19.4, lon: 73.2 }, v2: { lat: 20.2, lon: 73.2 } }),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, null));
    const v2 = result.current.find(v => v.vesselId === 'v2');
    expect(v2).toBeDefined();
    expect(v2!.coords).toHaveLength(3);
  });

  // ── T-50: Override spanning exactly one segment ─────────────────────────────
  it('override spanning exactly one segment', () => {
    const timeline = makeTimeline();
    const overrides = { v1: [makeOverride(2000, 3000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 5000, overrides));
    expect(result.current[0].segmentStyles![0]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![1].color).toBe('#ff0000');
    expect(result.current[0].segmentStyles![2]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    expect(result.current[0].segmentStyles![3]).toEqual(DEFAULT_TRAJECTORY_STYLE);
  });

  // ── T-51: 50 vessels in single frame ────────────────────────────────────────
  it('handles 50 vessels in timeline', () => {
    const vessels: Record<string, { lat: number; lon: number }> = {};
    for (let i = 0; i < 50; i++) {
      vessels[`v${i}`] = { lat: 19 + i * 0.1, lon: 72 + i * 0.1 };
    }
    const timeline = [
      makeFrame(1000, vessels),
      makeFrame(2000, vessels),
    ];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, null));
    expect(result.current).toHaveLength(50);
  });

  // ── T-52: Memoization with empty timeline ───────────────────────────────────
  it('memoization with empty timeline', () => {
    const { result, rerender } = renderHook(() => useVesselTrajectorySegments([], 5000, null));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-53: Override at timestamp 0 ────────────────────────────────────────────
  it('override starting at 0 matches first segment', () => {
    const timeline = [
      makeFrame(0, { v1: { lat: 19.0, lon: 72.8 } }),
      makeFrame(1000, { v1: { lat: 19.1, lon: 72.9 } }),
      makeFrame(2000, { v1: { lat: 19.2, lon: 73.0 } }),
    ];
    const overrides = { v1: [makeOverride(0, 1000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, overrides));
    expect(result.current[0].segmentStyles![0].color).toBe('#ff0000');
  });

  // ── T-54: Single frame timeline returns empty ───────────────────────────────
  it('single frame timeline returns empty', () => {
    const timeline = [makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } })];
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 1000, null));
    expect(result.current).toEqual([]);
  });

  // ── T-55: Two frame timeline with override ──────────────────────────────────
  it('two frame timeline with override has 1 segment style', () => {
    const timeline = [
      makeFrame(1000, { v1: { lat: 19.0, lon: 72.8 } }),
      makeFrame(2000, { v1: { lat: 19.1, lon: 72.9 } }),
    ];
    const overrides = { v1: [makeOverride(1000, 2000, '#ff0000')] };
    const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 2000, overrides));
    expect(result.current[0].segmentStyles).toHaveLength(1);
    expect(result.current[0].segmentStyles![0].color).toBe('#ff0000');
  });
});
