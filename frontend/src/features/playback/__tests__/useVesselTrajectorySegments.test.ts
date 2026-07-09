/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVesselTrajectorySegments, DEFAULT_TRAJECTORY_STYLE } from '../hooks/useVesselTrajectorySegments';
import type { TimelineFrame, TrajectoryOverrideRule, VesselPosition } from '../model/types';

const pos = (lat: number, lon: number): VesselPosition => ({ lat, lon });

const createFrame = (timestampMs: number, vessels: Record<string, VesselPosition>): TimelineFrame => ({
  timestampMs,
  vessels,
});

const createStyle = (color: string, weight = 2, opacity = 0.6): { color: string; weight: number; opacity: number } => ({
  color,
  weight,
  opacity,
});

const createOverride = (start: number, end: number, color: string): TrajectoryOverrideRule => ({
  start,
  end,
  style: createStyle(color),
});

function runHook(timeline: unknown, currentTimestampMs: unknown, trajectoryOverrides: unknown) {
  let result: ReturnType<typeof useVesselTrajectorySegments> | undefined;
  let error: unknown;
  try {
    const { result: r } = renderHook(() =>
      useVesselTrajectorySegments(
        timeline as TimelineFrame[],
        currentTimestampMs as number,
        trajectoryOverrides as Record<string, TrajectoryOverrideRule[]> | null,
      ),
    );
    result = r.current;
  } catch (e) {
    error = e;
  }
  return { result, error };
}

describe('useVesselTrajectorySegments', () => {
  describe('Valid Scenarios', () => {
    it('Verify trajectory is generated when vessel has exactly 2 timeline points', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toEqual([{ vesselId: 'a', coords: [[0, 0], [1, 1]], segmentStyles: null }]);
    });

    it('Verify trajectory is generated when vessel has more than 2 timeline points', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      expect(result.current).toEqual([{ vesselId: 'a', coords: [[0, 0], [1, 1], [2, 2]], segmentStyles: null }]);
    });

    it('Verify coordinates are returned in chronological order', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1], [2, 2]]);
    });

    it('Verify vesselId is returned correctly', () => {
      const timeline = [createFrame(0, { vesselX: pos(0, 0) }), createFrame(100, { vesselX: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].vesselId).toBe('vesselX');
    });

    it('Verify multiple vessels generate separate trajectory objects', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0), b: pos(10, 10) }),
        createFrame(100, { a: pos(1, 1), b: pos(11, 11) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toHaveLength(2);
      expect(result.current?.map(v => v.vesselId).sort()).toEqual(['a', 'b']);
    });

    it('Verify frames up to currentTimestampMs are included', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 150, null));
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1]]);
    });

    it('Verify frames after currentTimestampMs are excluded', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 50, null));
      expect(result.current).toEqual([]);
    });

    it('Verify frame with timestamp equal to currentTimestampMs is included', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toHaveLength(2);
    });

    it('Verify coordinates are correctly mapped from lat/lon values', () => {
      const timeline = [
        createFrame(0, { a: pos(12.34, 56.78) }),
        createFrame(100, { a: pos(90, -180) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toEqual([[12.34, 56.78], [90, -180]]);
    });

    it('Verify trajectory returns correct coordinate count', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
        createFrame(300, { a: pos(3, 3) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 300, null));
      expect(result.current?.[0].coords).toHaveLength(4);
    });

    it('Verify trajectory for a single vessel', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toEqual([{ vesselId: 'a', coords: [[0, 0], [1, 1]], segmentStyles: null }]);
    });

    it('Verify trajectory for multiple vessels', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0), b: pos(10, 10) }),
        createFrame(100, { a: pos(1, 1), b: pos(11, 11) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toEqual([
        { vesselId: 'a', coords: [[0, 0], [1, 1]], segmentStyles: null },
        { vesselId: 'b', coords: [[10, 10], [11, 11]], segmentStyles: null },
      ]);
    });

    it('Verify trajectory with no overrides returns segmentStyles as null', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].segmentStyles).toBeNull();
    });

    it('Verify trajectory with one override rule applies override style', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(0, 100, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([createStyle('#ff0000')]);
    });

    it('Verify trajectory with multiple override rules applies correct styles', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const overrides = { a: [createOverride(0, 100, '#ff0000'), createOverride(100, 200, '#00ff00')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([createStyle('#ff0000'), createStyle('#00ff00')]);
    });

    it('Verify override style is applied when segment timestamp falls within override window', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(0, 200, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(createStyle('#ff0000'));
    });

    it('Verify default style is used when segment timestamp does not match override window', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(200, 300, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    });

    it('Verify segmentStyles length equals number of segments', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
        createFrame(300, { a: pos(3, 3) }),
      ];
      const overrides = { a: [createOverride(0, 300, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 300, overrides));
      expect(result.current?.[0].segmentStyles).toHaveLength(3);
    });

    it('Verify same vessel appearing in all frames generates complete path', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1], [2, 2]]);
    });

    it('Verify vessel appearing in selected frames generates partial path', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { b: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      const a = result.current?.find(v => v.vesselId === 'a');
      expect(a?.coords).toEqual([[0, 0], [2, 2]]);
    });
  });

  describe('Edge Cases', () => {
    it('Verify empty timeline returns empty array', () => {
      const { result } = renderHook(() => useVesselTrajectorySegments([], 100, null));
      expect(result.current).toEqual([]);
    });

    it('Verify timeline with only one frame returns empty array', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toEqual([]);
    });

    it('Verify vessel appears in only one frame', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { b: pos(1, 1), c: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toEqual([]);
    });

    it('Verify currentTimestampMs before first frame timestamp', () => {
      const timeline = [createFrame(100, { a: pos(0, 0) }), createFrame(200, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 50, null));
      expect(result.current).toEqual([]);
    });

    it('Verify currentTimestampMs exactly matches first frame timestamp', () => {
      const timeline = [createFrame(100, { a: pos(0, 0) }), createFrame(200, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toEqual([]);
    });

    it('Verify currentTimestampMs after last frame timestamp', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 500, null));
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1]]);
    });

    it('Verify timeline contains duplicate timestamps', () => {
      const timeline = [
        createFrame(100, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1], [2, 2]]);
    });

    it('Verify timeline contains identical coordinates', () => {
      const timeline = [
        createFrame(0, { a: pos(1, 1) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(1, 1) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      expect(result.current?.[0].coords).toEqual([[1, 1], [1, 1], [1, 1]]);
    });

    it('Verify timeline contains negative latitude values', () => {
      const timeline = [createFrame(0, { a: pos(-10, 0) }), createFrame(100, { a: pos(-20, 0) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toEqual([[-10, 0], [-20, 0]]);
    });

    it('Verify timeline contains negative longitude values', () => {
      const timeline = [createFrame(0, { a: pos(0, -10) }), createFrame(100, { a: pos(0, -20) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toEqual([[0, -10], [0, -20]]);
    });

    it('Verify timeline contains zero latitude', () => {
      const timeline = [createFrame(0, { a: pos(0, 10) }), createFrame(100, { a: pos(0, 20) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toEqual([[0, 10], [0, 20]]);
    });

    it('Verify timeline contains zero longitude', () => {
      const timeline = [createFrame(0, { a: pos(10, 0) }), createFrame(100, { a: pos(20, 0) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toEqual([[10, 0], [20, 0]]);
    });

    it('Verify timeline contains decimal coordinates', () => {
      const timeline = [
        createFrame(0, { a: pos(12.3456, -98.7654) }),
        createFrame(100, { a: pos(12.3457, -98.7653) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toEqual([[12.3456, -98.7654], [12.3457, -98.7653]]);
    });

    it('Verify vessel disappears between frames', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, {}),
        createFrame(300, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 300, null));
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1], [2, 2]]);
    });

    it('Verify vessel reappears after missing frames', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, {}),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      expect(result.current?.[0].coords).toEqual([[0, 0], [2, 2]]);
    });

    it('Verify multiple vessels share same coordinates', () => {
      const timeline = [
        createFrame(0, { a: pos(1, 1), b: pos(1, 1) }),
        createFrame(100, { a: pos(2, 2), b: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].coords).toEqual([[1, 1], [2, 2]]);
      expect(result.current?.[1].coords).toEqual([[1, 1], [2, 2]]);
    });

    it('Verify trajectoryOverrides is null', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current?.[0].segmentStyles).toBeNull();
    });

    it('Verify trajectoryOverrides is empty object', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, {}));
      expect(result.current?.[0].segmentStyles).toBeNull();
    });

    it('Verify vessel has empty override array', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, { a: [] }));
      expect(result.current?.[0].segmentStyles).toBeNull();
    });

    it('Verify override start equals segment timestamp', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(0, 100, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(createStyle('#ff0000'));
    });

    it('Verify override end equals segment timestamp', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(100, 200, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    });

    it('Verify override window covers entire trajectory', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const overrides = { a: [createOverride(0, 300, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([createStyle('#ff0000'), createStyle('#ff0000')]);
    });

    it('Verify override window covers only first segment', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const overrides = { a: [createOverride(0, 100, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([createStyle('#ff0000'), DEFAULT_TRAJECTORY_STYLE]);
    });

    it('Verify override window covers only last segment', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const overrides = { a: [createOverride(100, 300, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([DEFAULT_TRAJECTORY_STYLE, createStyle('#ff0000')]);
    });

    it('Verify multiple overrides for same vessel', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const overrides = {
        a: [createOverride(0, 100, '#ff0000'), createOverride(100, 200, '#00ff00')],
      };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([createStyle('#ff0000'), createStyle('#00ff00')]);
    });

    it('Verify overlapping override windows', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = {
        a: [createOverride(0, 200, '#ff0000'), createOverride(50, 150, '#00ff00')],
      };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(createStyle('#ff0000'));
    });

    it('Verify adjacent override windows', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const overrides = {
        a: [createOverride(0, 100, '#ff0000'), createOverride(100, 200, '#00ff00')],
      };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([createStyle('#ff0000'), createStyle('#00ff00')]);
    });

    it('Verify override array contains one rule', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(0, 100, '#ff0000')] };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(createStyle('#ff0000'));
    });

    it('Verify override array contains many rules', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const overrides = {
        a: [createOverride(0, 50, '#ff0000'), createOverride(50, 150, '#00ff00'), createOverride(150, 300, '#0000ff')],
      };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, overrides));
      expect(result.current?.[0].segmentStyles).toEqual([createStyle('#ff0000'), createStyle('#00ff00')]);
    });

    it('Verify resolved vessel list contains duplicate vessel IDs across frames', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 200, null));
      expect(result.current).toHaveLength(1);
      expect(result.current?.[0].vesselId).toBe('a');
    });
  });

  describe('Break Cases', () => {
    it('Verify timeline is null', () => {
      const { result, error } = runHook(null, 100, null);
      expect(error).toBeUndefined();
      expect(result).toEqual([]);
    });

    it('Verify timeline is undefined', () => {
      const { result, error } = runHook(undefined, 100, null);
      expect(error).toBeUndefined();
      expect(result).toEqual([]);
    });

    it('Verify timeline contains null frame', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), null, createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify timeline contains undefined frame', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), undefined, createFrame(100, { a: pos(1, 1) })] as any;
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame missing timestampMs', () => {
      const timeline = [{ vessels: { a: pos(0, 0) } }, createFrame(100, { a: pos(1, 1) })] as any;
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame timestampMs is null', () => {
      const timeline = [createFrame(null as any, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame timestampMs is undefined', () => {
      const timeline = [createFrame(undefined as any, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame timestampMs is NaN', () => {
      const timeline = [createFrame(NaN, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame timestampMs is Infinity', () => {
      const timeline = [createFrame(Infinity, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame missing vessels property', () => {
      const timeline = [{ timestampMs: 0 }, createFrame(100, { a: pos(1, 1) })] as any;
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame vessels is null', () => {
      const timeline = [createFrame(0, null as any), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame vessels is undefined', () => {
      const timeline = [createFrame(0, undefined as any), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify frame vessels is array instead of object', () => {
      const timeline = [createFrame(0, ['a', 'b'] as any), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position missing lat', () => {
      const timeline = [createFrame(0, { a: { lon: 0 } as any }), createFrame(100, { a: { lon: 1 } as any })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position missing lon', () => {
      const timeline = [createFrame(0, { a: { lat: 0 } as any }), createFrame(100, { a: { lat: 1 } as any })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position has null lat', () => {
      const timeline = [
        createFrame(0, { a: { lat: null, lon: 0 } as any }),
        createFrame(100, { a: { lat: null, lon: 1 } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position has null lon', () => {
      const timeline = [
        createFrame(0, { a: { lat: 0, lon: null } as any }),
        createFrame(100, { a: { lat: 1, lon: null } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position has undefined lat', () => {
      const timeline = [
        createFrame(0, { a: { lat: undefined, lon: 0 } as any }),
        createFrame(100, { a: { lat: undefined, lon: 1 } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position has undefined lon', () => {
      const timeline = [
        createFrame(0, { a: { lat: 0, lon: undefined } as any }),
        createFrame(100, { a: { lat: 1, lon: undefined } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position contains NaN coordinates', () => {
      const timeline = [createFrame(0, { a: pos(NaN, NaN) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vessel position contains Infinity coordinates', () => {
      const timeline = [createFrame(0, { a: pos(Infinity, Infinity) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify vesselId is empty string', () => {
      const timeline = [createFrame(0, { '': pos(0, 0) }), createFrame(100, { '': pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result?.[0].vesselId).toBe('');
    });

    it('Verify vesselId contains whitespace only', () => {
      const timeline = [createFrame(0, { '   ': pos(0, 0) }), createFrame(100, { '   ': pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result?.[0].vesselId).toBe('   ');
    });

    it('Verify vesselId contains special characters', () => {
      const timeline = [createFrame(0, { 'v@#$%': pos(0, 0) }), createFrame(100, { 'v@#$%': pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result?.[0].vesselId).toBe('v@#$%');
    });

    it('Verify vesselId contains Unicode characters', () => {
      const timeline = [createFrame(0, { '船A': pos(0, 0) }), createFrame(100, { '船A': pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result?.[0].vesselId).toBe('船A');
    });

    it('Verify duplicate vessel IDs returned from backend', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toHaveLength(1);
    });

    it('Verify override start greater than override end', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(200, 100, '#ff0000')] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result?.[0].segmentStyles?.[0]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    });

    it('Verify override end less than override start', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(200, 100, '#ff0000')] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result?.[0].segmentStyles?.[0]).toEqual(DEFAULT_TRAJECTORY_STYLE);
    });

    it('Verify override contains NaN start value', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: NaN, end: 200, style: createStyle('#ff0000') }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override contains NaN end value', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: NaN, style: createStyle('#ff0000') }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override contains Infinity values', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: Infinity, style: createStyle('#ff0000') }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style is null', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: null as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style is undefined', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: undefined as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style missing color', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { weight: 2 } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style missing opacity', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { color: '#ff0000', weight: 2 } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style missing weight', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { color: '#ff0000' } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style contains invalid color code', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { color: 'not-a-color' } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style contains negative opacity', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { color: '#ff0000', opacity: -1 } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style contains opacity greater than 1', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { color: '#ff0000', opacity: 2 } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override style contains negative weight', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { color: '#ff0000', weight: -1 } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override array contains null entries', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [null, createOverride(0, 100, '#ff0000')] as any };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override array contains undefined entries', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [undefined, createOverride(0, 100, '#ff0000')] as any };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify override array contains malformed objects', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ invalid: true } as any, createOverride(0, 100, '#ff0000')] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify currentTimestampMs is NaN', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, NaN, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify currentTimestampMs is Infinity', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, Infinity, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify currentTimestampMs is negative', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, -100, null);
      expect(error).toBeUndefined();
      expect(result).toEqual([]);
    });

    it('Verify currentTimestampMs is extremely large', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, Number.MAX_SAFE_INTEGER, null);
      expect(error).toBeUndefined();
      expect(result?.[0].coords).toEqual([[0, 0], [1, 1]]);
    });

    it('Verify timeline contains corrupted vessel structure', () => {
      const timeline = [createFrame(0, { a: 'corrupted' as any }), createFrame(100, { a: pos(1, 1) })];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify trajectoryOverrides contains unexpected vessel IDs', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { unknownVessel: [createOverride(0, 100, '#ff0000')] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result?.[0].segmentStyles).toBeNull();
    });

    it('Verify override matching logic breaks when rules are unsorted', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [createOverride(100, 200, '#00ff00'), createOverride(0, 100, '#ff0000')] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result?.[0].segmentStyles?.[0]).toEqual(createStyle('#ff0000'));
    });
  });

  describe('State Management Issues', () => {
    const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
    const overrides = { a: [createOverride(0, 100, '#ff0000')] };

    it('Verify hook returns same result when inputs are unchanged', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      rerender({ tl: timeline, ts: 100, ov: null });
      expect(result.current).toBe(first);
    });

    it('Verify useMemo prevents unnecessary recomputation', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      rerender({ tl: timeline, ts: 100, ov: null });
      expect(result.current).toBe(first);
    });

    it('Verify timeline change triggers recomputation', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      const newTimeline = [...timeline, createFrame(200, { a: pos(2, 2) })];
      rerender({ tl: newTimeline, ts: 200, ov: null });
      expect(result.current).not.toBe(first);
    });

    it('Verify currentTimestampMs change triggers recomputation', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      rerender({ tl: timeline, ts: 50, ov: null });
      expect(result.current).not.toBe(first);
    });

    it('Verify trajectoryOverrides change triggers recomputation', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      rerender({ tl: timeline, ts: 100, ov: overrides });
      expect(result.current).not.toBe(first);
    });

    it('Verify rerender with same props returns same reference', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      rerender({ tl: timeline, ts: 100, ov: null });
      expect(result.current).toBe(first);
    });

    it('Verify rerender with cloned timeline triggers recomputation', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      rerender({ tl: [...timeline], ts: 100, ov: null });
      expect(result.current).not.toBe(first);
    });

    it('Verify rerender with cloned override object triggers recomputation', () => {
      const { result, rerender } = renderHook(
        ({ tl, ts, ov }) => useVesselTrajectorySegments(tl, ts, ov),
        { initialProps: { tl: timeline, ts: 100, ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      const first = result.current;
      rerender({ tl: timeline, ts: 100, ov: { ...overrides } });
      expect(result.current).not.toBe(first);
    });

    it('Verify vessel trajectory updates correctly as playback progresses', () => {
      const tl = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result, rerender } = renderHook(
        ({ ts }) => useVesselTrajectorySegments(tl, ts, null),
        { initialProps: { ts: 0 } }
      );
      expect(result.current).toEqual([]);
      rerender({ ts: 100 });
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1]]);
      rerender({ ts: 200 });
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1], [2, 2]]);
    });

    it('Verify vessel trajectory shrinks when currentTimestampMs decreases', () => {
      const tl = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result, rerender } = renderHook(
        ({ ts }) => useVesselTrajectorySegments(tl, ts, null),
        { initialProps: { ts: 200 } }
      );
      expect(result.current?.[0].coords).toHaveLength(3);
      rerender({ ts: 100 });
      expect(result.current?.[0].coords).toHaveLength(2);
    });

    it('Verify vessel trajectory grows when currentTimestampMs increases', () => {
      const tl = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result, rerender } = renderHook(
        ({ ts }) => useVesselTrajectorySegments(tl, ts, null),
        { initialProps: { ts: 0 } }
      );
      expect(result.current).toEqual([]);
      rerender({ ts: 200 });
      expect(result.current?.[0].coords).toHaveLength(3);
    });

    it('Verify override changes are reflected immediately', () => {
      const tl = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, rerender } = renderHook(
        ({ ov }) => useVesselTrajectorySegments(tl, 100, ov),
        { initialProps: { ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      expect(result.current?.[0].segmentStyles).toBeNull();
      rerender({ ov: overrides });
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(createStyle('#ff0000'));
    });

    it('Verify stale trajectory data is not returned', () => {
      const tl = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, rerender } = renderHook(
        ({ tl: currentTl }) => useVesselTrajectorySegments(currentTl, 100, null),
        { initialProps: { tl } }
      );
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1]]);
      rerender({ tl: [createFrame(0, { b: pos(5, 5) }), createFrame(100, { b: pos(6, 6) })] });
      expect(result.current?.map(v => v.vesselId)).toEqual(['b']);
    });

    it('Verify stale override styles are not returned', () => {
      const tl = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, rerender } = renderHook(
        ({ ov }) => useVesselTrajectorySegments(tl, 100, ov),
        { initialProps: { ov: { a: [createOverride(0, 100, '#ff0000')] } } }
      );
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(createStyle('#ff0000'));
      rerender({ ov: { a: [createOverride(0, 100, '#00ff00')] } });
      expect(result.current?.[0].segmentStyles?.[0]).toEqual(createStyle('#00ff00'));
    });

    it('Verify rapid timestamp updates produce correct trajectory', () => {
      const tl = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
        createFrame(200, { a: pos(2, 2) }),
      ];
      const { result, rerender } = renderHook(
        ({ ts }) => useVesselTrajectorySegments(tl, ts, null),
        { initialProps: { ts: 0 } }
      );
      for (let ts = 0; ts <= 200; ts += 50) {
        rerender({ ts });
      }
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1], [2, 2]]);
    });

    it('Verify rapid override updates produce correct styles', () => {
      const tl = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, rerender } = renderHook(
        ({ ov }) => useVesselTrajectorySegments(tl, 100, ov),
        { initialProps: { ov: null as Record<string, TrajectoryOverrideRule[]> | null } }
      );
      for (let i = 0; i < 10; i++) {
        rerender({ ov: { a: [createOverride(0, 100, `#color${i}`)] } });
      }
      expect(result.current?.[0].segmentStyles?.[0].color).toBe('#color9');
    });

    it('Verify timeline updates while playback is active', () => {
      const tl = [createFrame(0, { a: pos(0, 0) })];
      const { result, rerender } = renderHook(
        ({ tl: currentTl, ts }) => useVesselTrajectorySegments(currentTl, ts, null),
        { initialProps: { tl, ts: 0 } }
      );
      rerender({ tl: [...tl, createFrame(100, { a: pos(1, 1) })], ts: 100 });
      expect(result.current?.[0].coords).toEqual([[0, 0], [1, 1]]);
    });

    it('Verify vessel disappears after rerender', () => {
      const tl = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, rerender } = renderHook(
        ({ tl: currentTl }) => useVesselTrajectorySegments(currentTl, 100, null),
        { initialProps: { tl } }
      );
      expect(result.current?.map(v => v.vesselId)).toContain('a');
      rerender({ tl: [createFrame(0, { b: pos(0, 0) }), createFrame(100, { b: pos(1, 1) })] });
      expect(result.current?.map(v => v.vesselId)).not.toContain('a');
    });

    it('Verify vessel appears after rerender', () => {
      const tl = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const { result, rerender } = renderHook(
        ({ tl: currentTl }) => useVesselTrajectorySegments(currentTl, 100, null),
        { initialProps: { tl } }
      );
      expect(result.current?.map(v => v.vesselId)).not.toContain('b');
      rerender({ tl: [createFrame(0, { a: pos(0, 0), b: pos(2, 2) }), createFrame(100, { a: pos(1, 1), b: pos(3, 3) })] });
      expect(result.current?.map(v => v.vesselId)).toContain('b');
    });

    it('Verify switching datasets resets trajectory correctly', () => {
      const tl1 = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const tl2 = [createFrame(0, { b: pos(5, 5) }), createFrame(100, { b: pos(6, 6) })];
      const { result, rerender } = renderHook(
        ({ tl: currentTl }) => useVesselTrajectorySegments(currentTl, 100, null),
        { initialProps: { tl: tl1 } }
      );
      expect(result.current?.[0].vesselId).toBe('a');
      rerender({ tl: tl2 });
      expect(result.current?.[0].vesselId).toBe('b');
    });
  });

  describe('API Contract Issues', () => {
    it('Verify backend returns timeline without vessels field', () => {
      const timeline = [{ timestampMs: 0 }, { timestampMs: 100 }] as any;
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toEqual([]);
    });

    it('Verify backend returns timeline without timestampMs', () => {
      const timeline = [{ vessels: { a: pos(0, 0) } }, { vessels: { a: pos(1, 1) } }] as any;
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns lat/lon as strings', () => {
      const timeline = [
        createFrame(0, { a: { lat: '12.34', lon: '56.78' } as any }),
        createFrame(100, { a: { lat: '13.34', lon: '57.78' } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns lat/lon as null', () => {
      const timeline = [
        createFrame(0, { a: { lat: null, lon: null } as any }),
        createFrame(100, { a: { lat: null, lon: null } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns lat/lon as undefined', () => {
      const timeline = [
        createFrame(0, { a: { lat: undefined, lon: undefined } as any }),
        createFrame(100, { a: { lat: undefined, lon: undefined } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns lat/lon as arrays', () => {
      const timeline = [
        createFrame(0, { a: { lat: [12.34], lon: [56.78] } as any }),
        createFrame(100, { a: { lat: [13.34], lon: [57.78] } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns override start as string', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: '0' as any, end: 100, style: createStyle('#ff0000') }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns override end as string', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: '100' as any, style: createStyle('#ff0000') }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns override style as string', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: 'red' as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns override style as empty object', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: {} as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns additional unexpected style properties', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ start: 0, end: 100, style: { color: '#ff0000', extra: true } as any }] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns duplicate timeline frames', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0) }),
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result?.[0].coords).toHaveLength(3);
    });

    it('Verify backend returns out-of-order timeline frames', () => {
      const timeline = [
        createFrame(200, { a: pos(2, 2) }),
        createFrame(0, { a: pos(0, 0) }),
        createFrame(100, { a: pos(1, 1) }),
      ];
      const { result, error } = runHook(timeline, 200, null);
      expect(error).toBeUndefined();
      expect(result?.[0].coords).toEqual([[0, 0], [1, 1], [2, 2]]);
    });

    it('Verify backend returns partially populated vessel objects', () => {
      const timeline = [
        createFrame(0, { a: { lat: 0 } as any }),
        createFrame(100, { a: pos(1, 1) }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns mixed valid and invalid vessel data', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0), b: 'bad' as any }),
        createFrame(100, { a: pos(1, 1), b: pos(2, 2) }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend changes override schema', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: [{ from: 0, to: 100, colour: '#ff0000' } as any] };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend changes coordinate schema', () => {
      const timeline = [
        createFrame(0, { a: { latitude: 0, longitude: 0 } as any }),
        createFrame(100, { a: { latitude: 1, longitude: 1 } as any }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend returns unknown fields', () => {
      const timeline = [
        createFrame(0, { a: pos(0, 0), unknownField: true } as any),
        createFrame(100, { a: pos(1, 1) }),
      ];
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('Verify backend omits required fields', () => {
      const timeline = [{}, {}] as any;
      const { result, error } = runHook(timeline, 100, null);
      expect(error).toBeUndefined();
      expect(result).toEqual([]);
    });

    it('Verify backend returns malformed override arrays', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = { a: 'not-an-array' as any };
      const { result, error } = runHook(timeline, 100, overrides);
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
    });
  });

  describe('Performance / Stress Cases', () => {
    it('Verify 100 timeline frames', () => {
      const timeline: TimelineFrame[] = [];
      for (let i = 0; i < 100; i++) {
        timeline.push(createFrame(i * 100, { a: pos(i, i) }));
      }
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 9900, null));
      expect(result.current?.[0].coords).toHaveLength(100);
    });

    it('Verify 1,000 timeline frames', () => {
      const timeline: TimelineFrame[] = [];
      for (let i = 0; i < 1000; i++) {
        timeline.push(createFrame(i * 10, { a: pos(i, i) }));
      }
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 9990, null));
      expect(result.current?.[0].coords).toHaveLength(1000);
    });

    it('Verify 10,000 timeline frames', () => {
      const timeline: TimelineFrame[] = [];
      for (let i = 0; i < 10000; i++) {
        timeline.push(createFrame(i, { a: pos(i, i) }));
      }
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 9999, null));
      expect(result.current?.[0].coords).toHaveLength(10000);
    });

    it('Verify 100 vessels across timeline', () => {
      const timeline: TimelineFrame[] = [];
      const vessels: Record<string, VesselPosition> = {};
      for (let i = 0; i < 100; i++) {
        vessels[`vessel${i}`] = pos(i, i);
      }
      timeline.push(createFrame(0, vessels));
      timeline.push(createFrame(100, vessels));
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toHaveLength(100);
    });

    it('Verify 1,000 vessels across timeline', () => {
      const timeline: TimelineFrame[] = [];
      const vessels: Record<string, VesselPosition> = {};
      for (let i = 0; i < 1000; i++) {
        vessels[`vessel${i}`] = pos(i, i);
      }
      timeline.push(createFrame(0, vessels));
      timeline.push(createFrame(100, vessels));
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, null));
      expect(result.current).toHaveLength(1000);
    });

    it('Verify large coordinate history for a single vessel', () => {
      const timeline: TimelineFrame[] = [];
      for (let i = 0; i < 5000; i++) {
        timeline.push(createFrame(i, { a: pos(i, i) }));
      }
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 4999, null));
      expect(result.current?.[0].coords).toHaveLength(5000);
    });

    it('Verify 100 override rules for one vessel', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = {
        a: Array.from({ length: 100 }, (_, i) => createOverride(i, i + 1, `#c${i}`)),
      };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles).toBeDefined();
    });

    it('Verify 1,000 override rules for one vessel', () => {
      const timeline = [createFrame(0, { a: pos(0, 0) }), createFrame(100, { a: pos(1, 1) })];
      const overrides = {
        a: Array.from({ length: 1000 }, (_, i) => createOverride(i, i + 1, `#c${i}`)),
      };
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current?.[0].segmentStyles).toBeDefined();
    });

    it('Verify many vessels each having large override arrays', () => {
      const timeline: TimelineFrame[] = [];
      const vessels: Record<string, VesselPosition> = {};
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 100; i++) {
        const id = `vessel${i}`;
        vessels[id] = pos(i, i);
        overrides[id] = Array.from({ length: 50 }, (_, j) => createOverride(j, j + 1, `#c${j}`));
      }
      timeline.push(createFrame(0, vessels));
      timeline.push(createFrame(100, vessels));
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 100, overrides));
      expect(result.current).toHaveLength(100);
    });

    it('Verify trajectory generation remains responsive with maximum expected production dataset', () => {
      const timeline: TimelineFrame[] = [];
      const vessels: Record<string, VesselPosition> = {};
      for (let i = 0; i < 100; i++) {
        vessels[`vessel${i}`] = pos(i, i);
      }
      for (let t = 0; t < 1000; t++) {
        timeline.push(createFrame(t, vessels));
      }
      const start = performance.now();
      const { result } = renderHook(() => useVesselTrajectorySegments(timeline, 999, null));
      const duration = performance.now() - start;
      expect(result.current).toHaveLength(100);
      expect(duration).toBeLessThan(1000);
    });
  });
});
