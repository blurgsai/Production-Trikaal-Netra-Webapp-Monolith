import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrajectoryOverrides } from '../useTrajectoryOverrides';
import type { PlaybackData, EventDetailsBase, TimeWindow } from '../../model/types';

function makeTimeWindow(overrides?: Partial<TimeWindow>): TimeWindow {
  return {
    queryStartMs: 1000,
    queryEndMs: 5000,
    eventStartMs: 1500,
    eventEndMs: 4000,
    ...overrides,
  };
}

function makeEventDetails(overrides?: Partial<EventDetailsBase>): EventDetailsBase {
  return {
    type: 'geofence_intrusion',
    location: { lat: 19.0, lon: 72.8 },
    timestamp: '2024-01-01T00:00:00Z',
    startTime: '2024-01-01T01:00:00Z',
    endTime: '2024-01-01T02:00:00Z',
    duration: { valueSeconds: 3600 },
    vessels: ['v1', 'v2'],
    severity: 'high',
    model: 'test-model',
    status: 'active',
    s2CellId: 'cell123',
    temporality: 'bounded',
    eventSource: 'radar',
    information: { Has_exited_polygon: false },
    ...overrides,
  };
}

function makePlaybackData(overrides?: Partial<PlaybackData>): PlaybackData {
  return {
    eventDetails: makeEventDetails(),
    extras: {},
    timeline: [],
    timeWindow: makeTimeWindow(),
    ...overrides,
  };
}

describe('useTrajectoryOverrides', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── T-01: Returns null when data is null ────────────────────────────────────
  it('returns null when data is null', () => {
    const { result } = renderHook(() => useTrajectoryOverrides(null, [], {}));
    expect(result.current).toBeNull();
  });

  // ── T-02: Returns null when data is undefined ───────────────────────────────
  it('returns null when data is undefined', () => {
    const { result } = renderHook(() => useTrajectoryOverrides(undefined, [], {}));
    expect(result.current).toBeNull();
  });

  // ── T-03: Returns null when timeWindow is missing ───────────────────────────
  it('returns null when timeWindow is missing', () => {
    const data = makePlaybackData();
    data.timeWindow = undefined as unknown as TimeWindow;
    const { result } = renderHook(() => useTrajectoryOverrides(data, [], {}));
    expect(result.current).toBeNull();
  });

  // ── T-04: Returns null when resolvedTypes is empty ──────────────────────────
  it('returns null when resolvedTypes is empty', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useTrajectoryOverrides(data, [], {}));
    expect(result.current).toBeNull();
  });

  // ── T-05: Returns null when resolvedDetails is empty ────────────────────────
  it('returns null when resolvedDetails is empty', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], {}));
    expect(result.current).toBeNull();
  });

  // ── T-06: Returns overrides for geofence_intrusion type ─────────────────────
  it('returns overrides for geofence_intrusion type', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current).not.toBeNull();
  });

  // ── T-07: Override contains vessel IDs from eventDetails ────────────────────
  it('override contains vessel IDs from eventDetails', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['v1', 'v2'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current).toHaveProperty('v1');
    expect(result.current).toHaveProperty('v2');
  });

  // ── T-08: Override rules have start, end, and style ─────────────────────────
  it('override rules have start, end, and style', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    const rules = result.current!['v1'];
    expect(rules[0]).toHaveProperty('start');
    expect(rules[0]).toHaveProperty('end');
    expect(rules[0]).toHaveProperty('style');
  });

  // ── T-09: Override color is red when hasExitedPolygon is false ──────────────
  it('override color is red when hasExitedPolygon is false', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ information: { Has_exited_polygon: false } });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.color).toBe('#ff4444');
  });

  // ── T-10: Override color is orange when hasExitedPolygon is true ────────────
  it('override color is orange when hasExitedPolygon is true', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ information: { Has_exited_polygon: true } });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.color).toBe('#ff8c00');
  });

  // ── T-11: Override start is parsed from startTime ───────────────────────────
  it('override start is parsed from startTime', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ startTime: '2024-06-15T08:30:00Z' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].start).toBe(Date.parse('2024-06-15T08:30:00Z'));
  });

  // ── T-12: Override end is parsed from endTime ───────────────────────────────
  it('override end is parsed from endTime', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ endTime: '2024-06-15T10:30:00Z' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].end).toBe(Date.parse('2024-06-15T10:30:00Z'));
  });

  // ── T-13: Override start falls back to eventStartMs when startTime is null ──
  it('override start falls back to eventStartMs when startTime is null', () => {
    const data = makePlaybackData({ timeWindow: makeTimeWindow({ eventStartMs: 2000 }) });
    const details = makeEventDetails({ startTime: null });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].start).toBe(2000);
  });

  // ── T-14: Override end falls back to eventEndMs when endTime is null ────────
  it('override end falls back to eventEndMs when endTime is null', () => {
    const data = makePlaybackData({ timeWindow: makeTimeWindow({ eventEndMs: 3000 }) });
    const details = makeEventDetails({ endTime: null });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].end).toBe(3000);
  });

  // ── T-15: Override end falls back to queryEndMs when both endTime and eventEndMs are null ─
  it('override end falls back to queryEndMs when endTime and eventEndMs are null', () => {
    const data = makePlaybackData({ timeWindow: makeTimeWindow({ eventEndMs: null, queryEndMs: 9000 }) });
    const details = makeEventDetails({ endTime: null });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].end).toBe(9000);
  });

  // ── T-16: Returns null when vessels array is empty ──────────────────────────
  it('returns null when vessels array is empty', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: [] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current).toBeNull();
  });

  // ── T-17: Returns null for unregistered event type ──────────────────────────
  it('returns null for unregistered event type', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ type: 'unknown_type' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['unknown_type'], { unknown_type: details }),
    );
    expect(result.current).toBeNull();
  });

  // ── T-18: Merges overrides from multiple types ──────────────────────────────
  it('merges overrides from multiple types', () => {
    const data = makePlaybackData();
    const details1 = makeEventDetails({ vessels: ['v1'] });
    const details2 = makeEventDetails({ vessels: ['v2'], information: { Has_exited_polygon: true } });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(
        data,
        ['geofence_intrusion', 'geofence_intrusion'],
        { geofence_intrusion: details1, 'geofence_intrusion_2': details2 },
      ),
    );
    expect(result.current).not.toBeNull();
  });

  // ── T-19: Skips types with no details in resolvedDetails ────────────────────
  it('skips types with no details in resolvedDetails', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['v1'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion', 'missing_type'], { geofence_intrusion: details }),
    );
    expect(result.current).not.toBeNull();
    expect(result.current).toHaveProperty('v1');
  });

  // ── T-20: Style has weight 3 ────────────────────────────────────────────────
  it('style has weight 3', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.weight).toBe(3);
  });

  // ── T-21: Style has opacity 0.9 ─────────────────────────────────────────────
  it('style has opacity 0.9', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.opacity).toBe(0.9);
  });

  // ── T-22: Result is memoized for same inputs ────────────────────────────────
  it('result is memoized for same inputs', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const resolvedDetails = { geofence_intrusion: details };
    const { result, rerender } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], resolvedDetails),
    );
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-23: Result changes when data changes ──────────────────────────────────
  it('result changes when data changes', () => {
    const data1 = makePlaybackData();
    const data2 = makePlaybackData({ timeWindow: makeTimeWindow({ eventStartMs: 9999 }) });
    const details = makeEventDetails({ startTime: null });
    const { result, rerender } = renderHook(
      ({ data }) => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
      { initialProps: { data: data1 } },
    );
    const firstStart = result.current!['v1'][0].start;
    rerender({ data: data2 });
    expect(result.current!['v1'][0].start).not.toBe(firstStart);
  });

  // ── T-24: Result changes when resolvedTypes changes ─────────────────────────
  it('result changes when resolvedTypes changes', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const { result, rerender } = renderHook(
      ({ types }) => useTrajectoryOverrides(data, types, { geofence_intrusion: details }),
      { initialProps: { types: ['geofence_intrusion'] } },
    );
    expect(result.current).not.toBeNull();
    rerender({ types: [] });
    expect(result.current).toBeNull();
  });

  // ── T-25: Result changes when resolvedDetails changes ───────────────────────
  it('result changes when resolvedDetails changes', () => {
    const data = makePlaybackData();
    const details1 = makeEventDetails({ vessels: ['v1'] });
    const details2 = makeEventDetails({ vessels: ['v2'] });
    const { result, rerender } = renderHook(
      ({ details }) => useTrajectoryOverrides(data, ['geofence_intrusion'], details),
      { initialProps: { details: { geofence_intrusion: details1 } } },
    );
    expect(result.current).toHaveProperty('v1');
    rerender({ details: { geofence_intrusion: details2 } });
    expect(result.current).toHaveProperty('v2');
  });

  // ── T-26: Single vessel override ────────────────────────────────────────────
  it('single vessel override', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['v1'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(Object.keys(result.current!)).toEqual(['v1']);
  });

  // ── T-27: Multiple vessels each get overrides ───────────────────────────────
  it('multiple vessels each get overrides', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['v1', 'v2', 'v3'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(Object.keys(result.current!).sort()).toEqual(['v1', 'v2', 'v3']);
  });

  // ── T-28: startTime without Z suffix is parsed ──────────────────────────────
  it('startTime without Z suffix is parsed', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ startTime: '2024-06-15T08:30:00' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].start).toBe(Date.parse('2024-06-15T08:30:00Z'));
  });

  // ── T-29: endTime without Z suffix is parsed ────────────────────────────────
  it('endTime without Z suffix is parsed', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ endTime: '2024-06-15T10:30:00' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].end).toBe(Date.parse('2024-06-15T10:30:00Z'));
  });

  // ── T-30: Invalid startTime falls back to eventStartMs ──────────────────────
  it('invalid startTime falls back to eventStartMs', () => {
    const data = makePlaybackData({ timeWindow: makeTimeWindow({ eventStartMs: 1234 }) });
    const details = makeEventDetails({ startTime: 'not-a-date' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].start).toBe(1234);
  });

  // ── T-31: Invalid endTime falls back to eventEndMs ──────────────────────────
  it('invalid endTime falls back to eventEndMs', () => {
    const data = makePlaybackData({ timeWindow: makeTimeWindow({ eventEndMs: 5678 }) });
    const details = makeEventDetails({ endTime: 'not-a-date' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].end).toBe(5678);
  });

  // ── T-32: hasExitedPolygon undefined defaults to false (red) ────────────────
  it('hasExitedPolygon undefined defaults to red', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ information: {} });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.color).toBe('#ff4444');
  });

  // ── T-33: Merges rules from same vessel across types ────────────────────────
  it('merges rules from same vessel across types', () => {
    const data = makePlaybackData();
    const details1 = makeEventDetails({ vessels: ['v1'], startTime: '2024-01-01T01:00:00Z', endTime: '2024-01-01T02:00:00Z' });
    const details2 = makeEventDetails({ vessels: ['v1'], startTime: '2024-01-01T03:00:00Z', endTime: '2024-01-01T04:00:00Z' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(
        data,
        ['geofence_intrusion', 'geofence_intrusion'],
        { geofence_intrusion: details1, 'geofence_intrusion_2': details2 },
      ),
    );
    expect(result.current).not.toBeNull();
    expect(result.current!['v1']).toHaveLength(2);
  });

  // ── T-34: Returns null when all types have no details ───────────────────────
  it('returns null when all types have no details', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['type_a', 'type_b'], {}),
    );
    expect(result.current).toBeNull();
  });

  // ── T-35: Override rule count is 1 per vessel for single type ───────────────
  it('override rule count is 1 per vessel for single type', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['v1', 'v2'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1']).toHaveLength(1);
    expect(result.current!['v2']).toHaveLength(1);
  });

  // ── T-36: Large number of vessels ───────────────────────────────────────────
  it('handles large number of vessels', () => {
    const data = makePlaybackData();
    const vessels = Array.from({ length: 50 }, (_, i) => `v${i}`);
    const details = makeEventDetails({ vessels });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(Object.keys(result.current!)).toHaveLength(50);
  });

  // ── T-37: startTime with timezone offset ────────────────────────────────────
  it('startTime with timezone offset is parsed', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ startTime: '2024-06-15T08:30:00+05:30' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].start).toBe(Date.parse('2024-06-15T08:30:00+05:30'));
  });

  // ── T-38: endTime with timezone offset ──────────────────────────────────────
  it('endTime with timezone offset is parsed', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ endTime: '2024-06-15T10:30:00+05:30' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].end).toBe(Date.parse('2024-06-15T10:30:00+05:30'));
  });

  // ── T-39: Both startTime and endTime null ────────────────────────────────────
  it('both startTime and endTime null uses timeWindow fallbacks', () => {
    const data = makePlaybackData({ timeWindow: makeTimeWindow({ eventStartMs: 1111, eventEndMs: 2222 }) });
    const details = makeEventDetails({ startTime: null, endTime: null });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].start).toBe(1111);
    expect(result.current!['v1'][0].end).toBe(2222);
  });

  // ── T-40: Style has color, weight, opacity but no dashArray ─────────────────
  it('style does not have dashArray for geofence overrides', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.dashArray).toBeUndefined();
  });

  // ── T-41: Returns null when type is not in registry ─────────────────────────
  it('returns null when type is not in registry', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ type: 'collision' });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['collision'], { collision: details }),
    );
    expect(result.current).toBeNull();
  });

  // ── T-42: Mixed registered and unregistered types ───────────────────────────
  it('mixed registered and unregistered types only returns registered overrides', () => {
    const data = makePlaybackData();
    const geofenceDetails = makeEventDetails({ vessels: ['v1'] });
    const otherDetails = makeEventDetails({ type: 'collision', vessels: ['v2'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(
        data,
        ['geofence_intrusion', 'collision'],
        { geofence_intrusion: geofenceDetails, collision: otherDetails },
      ),
    );
    expect(result.current).toHaveProperty('v1');
    expect(result.current).not.toHaveProperty('v2');
  });

  // ── T-43: Memoization with null data ────────────────────────────────────────
  it('memoization with null data', () => {
    const { result, rerender } = renderHook(() => useTrajectoryOverrides(null, [], {}));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-44: Data with null timeWindow ─────────────────────────────────────────
  it('data with null timeWindow returns null', () => {
    const data = makePlaybackData();
    data.timeWindow = null as unknown as TimeWindow;
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: makeEventDetails() }),
    );
    expect(result.current).toBeNull();
  });

  // ── T-45: Override end falls back correctly through chain ───────────────────
  it('override end falls back to queryEndMs when eventEndMs is null and endTime is null', () => {
    const data = makePlaybackData({ timeWindow: makeTimeWindow({ eventEndMs: null, queryEndMs: 7777 }) });
    const details = makeEventDetails({ endTime: null });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].end).toBe(7777);
  });

  // ── T-46: Single vessel with single rule ────────────────────────────────────
  it('single vessel with single rule', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['v1'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1']).toHaveLength(1);
  });

  // ── T-47: Vessel ID as number string ────────────────────────────────────────
  it('vessel ID as number string', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['123'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current).toHaveProperty('123');
  });

  // ── T-48: Vessel ID with special characters ─────────────────────────────────
  it('vessel ID with special characters', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ vessels: ['vessel-alpha_1'] });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current).toHaveProperty('vessel-alpha_1');
  });

  // ── T-49: Result is an object or null ───────────────────────────────────────
  it('result is an object or null', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(typeof result.current).toBe('object');
    expect(result.current).not.toBeNull();
  });

  // ── T-50: Re-render with same references is memoized ────────────────────────
  it('re-render with same references is memoized', () => {
    const data = makePlaybackData();
    const details = makeEventDetails();
    const types = ['geofence_intrusion'];
    const resolvedDetails = { geofence_intrusion: details };
    const { result, rerender } = renderHook(() =>
      useTrajectoryOverrides(data, types, resolvedDetails),
    );
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-51: Empty resolvedDetails with non-empty resolvedTypes ────────────────
  it('empty resolvedDetails with non-empty resolvedTypes returns null', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion', 'type_b'], {}),
    );
    expect(result.current).toBeNull();
  });

  // ── T-52: hasExitedPolygon false explicitly ─────────────────────────────────
  it('hasExitedPolygon false explicitly gives red color', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ information: { Has_exited_polygon: false } });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.color).toBe('#ff4444');
  });

  // ── T-53: hasExitedPolygon true explicitly ──────────────────────────────────
  it('hasExitedPolygon true explicitly gives orange color', () => {
    const data = makePlaybackData();
    const details = makeEventDetails({ information: { Has_exited_polygon: true } });
    const { result } = renderHook(() =>
      useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }),
    );
    expect(result.current!['v1'][0].style.color).toBe('#ff8c00');
  });
});
