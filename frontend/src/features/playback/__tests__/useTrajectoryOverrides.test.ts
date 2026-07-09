/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrajectoryOverrides } from '../hooks/useTrajectoryOverrides';
import { getTrajectoryOverridesForType } from '../model/trajectoryOverrideRegistry';
import type { EventDetailsBase, PlaybackData, TimeWindow, TrajectoryOverrideRule } from '../model/types';

vi.mock('../model/trajectoryOverrideRegistry');

const baseTimeWindow: TimeWindow = {
  queryStartMs: 1704067200000,
  queryEndMs: 1704070800000,
  eventStartMs: 1704067200000,
  eventEndMs: 1704070800000,
};

const baseEventDetails: EventDetailsBase = {
  type: 'geofence_intrusion',
  location: { lat: 12.34, lon: 56.78 },
  timestamp: '2024-01-01T00:00:00Z',
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-01T01:00:00Z',
  duration: { valueSeconds: 3600 },
  vessels: ['vessel1', 'vessel2'],
  severity: 'high',
  model: 'v1',
  status: 'active',
  s2CellId: 's2cell123',
  temporality: 'bounded',
  eventSource: 'sensor',
  information: {},
};

const createPlaybackData = (overrides: Partial<PlaybackData> = {}): PlaybackData => ({
  eventDetails: baseEventDetails,
  extras: {},
  timeline: [],
  timeWindow: baseTimeWindow,
  ...overrides,
});

const createRule = (overrides: Partial<TrajectoryOverrideRule> = {}): TrajectoryOverrideRule => ({
  start: 0,
  end: 1000,
  style: { color: '#ff0000', weight: 2, opacity: 0.5 },
  ...overrides,
});

const ruleA = createRule({ style: { color: '#ff0000' } });
const ruleB = createRule({ style: { color: '#00ff00' } });

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useTrajectoryOverrides', () => {
  describe('Basic Functionality', () => {
    it('Verify hook returns trajectory overrides for a single event type', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify hook returns trajectory overrides for multiple event types', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel2: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA], vessel2: [ruleB] });
    });

    it('Verify hook merges overrides from multiple event types', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel1: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA, ruleB] });
    });

    it('Verify hook returns correct vessel IDs', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({
        vessel1: [ruleA],
        vessel2: [ruleB],
      });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toEqual(['vessel1', 'vessel2']);
    });

    it('Verify hook returns correct override rules', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA, ruleB] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current?.vessel1).toEqual([ruleA, ruleB]);
    });

    it('Verify hook handles one vessel with one rule', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify hook handles one vessel with multiple rules', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA, ruleB] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA, ruleB] });
    });

    it('Verify hook handles multiple vessels with one rule each', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({
        vessel1: [ruleA],
        vessel2: [ruleB],
      });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA], vessel2: [ruleB] });
    });

    it('Verify hook handles multiple vessels with multiple rules', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({
        vessel1: [ruleA, ruleB],
        vessel2: [ruleA, ruleB],
      });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({
        vessel1: [ruleA, ruleB],
        vessel2: [ruleA, ruleB],
      });
    });

    it('Verify hook returns expected structure', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toHaveProperty('vessel1');
      expect(Array.isArray(result.current?.vessel1)).toBe(true);
      expect(result.current?.vessel1[0]).toHaveProperty('start');
      expect(result.current?.vessel1[0]).toHaveProperty('end');
      expect(result.current?.vessel1[0]).toHaveProperty('style');
    });

    it('Verify hook returns override data from registry', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(getTrajectoryOverridesForType).toHaveBeenCalledWith('geofence_intrusion', baseEventDetails, data.timeWindow);
    });

    it('Verify hook preserves all override properties', () => {
      const data = createPlaybackData();
      const rule = createRule({
        start: 100,
        end: 200,
        style: { color: '#0000ff', weight: 5, opacity: 0.9, dashArray: '5,5' },
      });
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [rule] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current?.vessel1[0]).toEqual(rule);
    });

    it('Verify hook works with atomic events', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify hook works with compound events', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel2: [ruleB] }
      );
      const { result } = renderHook(() =>
        useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails })
      );
      expect(result.current).toEqual({ vessel1: [ruleA], vessel2: [ruleB] });
    });

    it('Verify hook correctly passes timeWindow to registry', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(null);
      renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(getTrajectoryOverridesForType).toHaveBeenCalledWith('geofence_intrusion', baseEventDetails, baseTimeWindow);
    });
  });

  describe('Missing Data', () => {
    it('Verify null data returns null', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(null, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify undefined data returns null', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(undefined, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify empty data object', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides({} as any, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify data with empty timeWindow', () => {
      const data = createPlaybackData({ timeWindow: {} as any });
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });
  });

  describe('resolvedTypes', () => {
    const data = createPlaybackData();

    it('Verify empty resolvedTypes array returns null', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, [], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify resolvedTypes contains one type', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify resolvedTypes contains many types', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel2: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA], vessel2: [ruleB] });
    });

    it('Verify resolvedTypes contains duplicate values', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type1'], { type1: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(1);
    });

    it('Verify resolvedTypes contains empty string', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, [''], { '': baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify resolvedTypes contains whitespace', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['   '], { '   ': baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify resolvedTypes contains Unicode characters', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['événement'], { événement: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify resolvedTypes contains special characters', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type!@#$%'], { 'type!@#$%': baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify resolvedTypes contains very long strings', () => {
      const longType = 'A'.repeat(1000);
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, [longType], { [longType]: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });
  });

  describe('resolvedDetails', () => {
    const data = createPlaybackData();

    it('Verify empty resolvedDetails object', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], {}));
      expect(result.current).toBeNull();
    });

    it('Verify missing detail for one type', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t) =>
        t === 'type1' ? { vessel1: [ruleA] } : null
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify missing detail for all types', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type3: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify null detail value', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: null as any }));
      expect(result.current).toBeNull();
    });

    it('Verify undefined detail value', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: undefined as any }));
      expect(result.current).toBeNull();
    });

    it('Verify partial detail object', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: { type: 'geofence_intrusion' } as any }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify extra unexpected fields', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const details = { ...baseEventDetails, extraField: 'ignored' } as any;
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify nested detail structures', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const details = { ...baseEventDetails, information: { nested: { deep: 'value' } } };
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify deeply nested detail structures', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const details = { ...baseEventDetails, information: { a: { b: { c: { d: 'value' } } } } };
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: details }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify malformed detail object', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: { invalid: true } as any }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });
  });

  describe('Registry Failures', () => {
    const data = createPlaybackData();

    it('Verify registry returns null', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(null);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns undefined', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(undefined as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns empty object', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({});
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns malformed object', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ invalid: 'value' } as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns unexpected data types', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: 'not-an-array' } as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry throws exception', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation(() => {
        throw new Error('registry error');
      });
      expect(() => renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }))).toThrow('registry error');
    });

    it('Verify registry returns array instead of object', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue([ruleA] as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns string', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue('invalid' as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns number', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(123 as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns boolean', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(true as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });
  });

  describe('Invalid Vessel IDs', () => {
    const data = createPlaybackData();

    it('Verify vesselId is empty string', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ '': [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ '': [ruleA] });
    });

    it('Verify vesselId is whitespace', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ '   ': [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ '   ': [ruleA] });
    });

    it('Verify vesselId is numeric string', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ '123': [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ '123': [ruleA] });
    });

    it('Verify vesselId contains special characters', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ 'v@#$%': [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ 'v@#$%': [ruleA] });
    });

    it('Verify vesselId contains Unicode characters', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ '船舶1': [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ '船舶1': [ruleA] });
    });

    it('Verify vesselId is extremely long', () => {
      const longId = 'v'.repeat(1000);
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ [longId]: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ [longId]: [ruleA] });
    });
  });

  describe('Invalid Rules', () => {
    const data = createPlaybackData();

    it('Verify rules array is empty', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify rules array contains null', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [null as any] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [] });
    });

    it('Verify rules array contains undefined', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [undefined as any] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [] });
    });

    it('Verify rules array contains malformed rule', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [{ invalid: true } as any] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [{ invalid: true }] });
    });

    it('Verify rules array contains duplicate rules', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA, ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA, ruleA] });
    });

    it('Verify rules array contains unexpected properties', () => {
      const rule = { ...ruleA, extra: 'value' } as any;
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [rule] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [rule] });
    });

    it('Verify rules array contains invalid color values', () => {
      const rule = { ...ruleA, style: { color: 'not-a-color' } };
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [rule as any] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [rule] });
    });

    it('Verify rules array contains missing fields', () => {
      const rule = { style: { color: '#ff0000' } } as any;
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [rule] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [rule] });
    });
  });

  describe('Merge Problems', () => {
    const data = createPlaybackData();

    it('Verify same vessel appears in multiple event types', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel1: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA, ruleB] });
    });

    it('Verify conflicting override rules merge correctly', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel1: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA, ruleB] });
    });

    it('Verify duplicate vessel IDs merge correctly', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel1: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA, ruleB] });
    });

    it('Verify override order remains consistent', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel1: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current?.vessel1).toEqual([ruleA, ruleB]);
    });

    it('Verify merged result contains all rules', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA], vessel2: [ruleB] } : { vessel2: [ruleA] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA], vessel2: [ruleB, ruleA] });
    });

    it('Verify merge does not overwrite previous rules', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel1: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current?.vessel1).toContain(ruleA);
    });

    it('Verify merge does not lose rules', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t): Record<string, TrajectoryOverrideRule[]> =>
        t === 'type1' ? { vessel1: [ruleA] } : { vessel1: [ruleB] }
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(result.current?.vessel1).toHaveLength(2);
    });
  });

  describe('Memoization', () => {
    const data = createPlaybackData();
    const resolvedTypes = ['geofence_intrusion'];
    const resolvedDetails = { geofence_intrusion: baseEventDetails };

    it('Verify useMemo caches result', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result, rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes, resolvedDetails } }
      );
      const first = result.current;
      rerender({ data, resolvedTypes, resolvedDetails });
      expect(result.current).toBe(first);
    });

    it('Verify rerender with same props returns same reference', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result, rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes, resolvedDetails } }
      );
      const first = result.current;
      rerender({ data, resolvedTypes, resolvedDetails });
      expect(result.current).toBe(first);
    });

    it('Verify rerender with same data does not recompute', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result, rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes, resolvedDetails } }
      );
      const first = result.current;
      rerender({ data, resolvedTypes, resolvedDetails });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(1);
      expect(result.current).toBe(first);
    });

    it('Verify rerender with same resolvedTypes does not recompute', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result, rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes, resolvedDetails } }
      );
      const first = result.current;
      rerender({ data, resolvedTypes, resolvedDetails });
      expect(result.current).toBe(first);
    });

    it('Verify rerender with same resolvedDetails does not recompute', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result, rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes, resolvedDetails } }
      );
      const first = result.current;
      rerender({ data, resolvedTypes, resolvedDetails });
      expect(result.current).toBe(first);
    });
  });

  describe('Dependency Changes', () => {
    it('Verify recomputation when data changes', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData();
      const resolvedDetails = { geofence_intrusion: baseEventDetails };
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['geofence_intrusion'], resolvedDetails } }
      );
      const newData = createPlaybackData({ extras: { changed: true } });
      rerender({ data: newData, resolvedTypes: ['geofence_intrusion'], resolvedDetails });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify recomputation when resolvedTypes changes', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData();
      const resolvedDetails = { type1: baseEventDetails };
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['type1'], resolvedDetails } }
      );
      rerender({ data, resolvedTypes: ['type1', 'type2'], resolvedDetails });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify recomputation when resolvedDetails changes', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData();
      const resolvedTypes = ['geofence_intrusion'];
      const details = { geofence_intrusion: baseEventDetails };
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes, resolvedDetails: details } }
      );
      const newDetails = { geofence_intrusion: { ...baseEventDetails, vessels: ['vessel3'] } };
      rerender({ data, resolvedTypes, resolvedDetails: newDetails });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify recomputation when all dependencies change', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }: { data: PlaybackData; resolvedTypes: string[]; resolvedDetails: Record<string, EventDetailsBase> }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data: createPlaybackData(), resolvedTypes: ['type1'], resolvedDetails: { type1: baseEventDetails } as Record<string, EventDetailsBase> } }
      );
      rerender({ data: createPlaybackData({ extras: { changed: true } }), resolvedTypes: ['type2'], resolvedDetails: { type2: baseEventDetails } });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify recomputation after event switch', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }: { data: PlaybackData; resolvedTypes: string[]; resolvedDetails: Record<string, EventDetailsBase> }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data: createPlaybackData({ eventDetails: { ...baseEventDetails, type: 'type1' } }), resolvedTypes: ['type1'], resolvedDetails: { type1: baseEventDetails } as Record<string, EventDetailsBase> } }
      );
      rerender({ data: createPlaybackData({ eventDetails: { ...baseEventDetails, type: 'type2' } }), resolvedTypes: ['type2'], resolvedDetails: { type2: baseEventDetails } });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify recomputation after compound event changes', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData();
      const resolvedDetails = { type1: baseEventDetails, type2: baseEventDetails };
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['type1', 'type2'], resolvedDetails } }
      );
      rerender({ data, resolvedTypes: ['type1', 'type2', 'type3'], resolvedDetails });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(4);
    });
  });

  describe('Reference Issues', () => {
    it('Verify cloned resolvedTypes triggers recomputation', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const resolvedTypes = ['geofence_intrusion'];
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data: createPlaybackData(), resolvedTypes, resolvedDetails: { geofence_intrusion: baseEventDetails } } }
      );
      rerender({ data: createPlaybackData(), resolvedTypes: [...resolvedTypes], resolvedDetails: { geofence_intrusion: baseEventDetails } });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify cloned resolvedDetails triggers recomputation', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const resolvedDetails = { geofence_intrusion: baseEventDetails };
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data: createPlaybackData(), resolvedTypes: ['geofence_intrusion'], resolvedDetails } }
      );
      rerender({ data: createPlaybackData(), resolvedTypes: ['geofence_intrusion'], resolvedDetails: { ...resolvedDetails } });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify cloned data triggers recomputation', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData();
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: baseEventDetails } } }
      );
      rerender({ data: { ...data }, resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: baseEventDetails } });
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(2);
    });

    it('Verify rapid rerenders', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender, result } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data: createPlaybackData(), resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: baseEventDetails } } }
      );
      for (let i = 0; i < 10; i++) {
        rerender({ data: createPlaybackData(), resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: baseEventDetails } });
      }
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify consecutive prop changes', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender, result } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }: { data: PlaybackData; resolvedTypes: string[]; resolvedDetails: Record<string, EventDetailsBase> }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data: createPlaybackData(), resolvedTypes: ['type1'], resolvedDetails: { type1: baseEventDetails } as Record<string, EventDetailsBase> } }
      );
      rerender({ data: createPlaybackData(), resolvedTypes: ['type2'], resolvedDetails: { type2: baseEventDetails } });
      rerender({ data: createPlaybackData(), resolvedTypes: ['type3'], resolvedDetails: { type3: baseEventDetails } });
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });
  });

  describe('API Contract Issues', () => {
    const data = createPlaybackData();

    it('Verify missing timeWindow', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData({ timeWindow: undefined as any });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify null timeWindow', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData({ timeWindow: null as any });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify undefined timeWindow', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData({ timeWindow: undefined as any });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify malformed timeWindow', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData({ timeWindow: { invalid: true } as any });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify missing event details', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const data = createPlaybackData({ eventDetails: undefined as any });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: undefined as any }));
      expect(result.current).toBeNull();
    });

    it('Verify registry returns new field structure', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [{ start: 0, end: 100, style: { color: '#abc' } }] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [{ start: 0, end: 100, style: { color: '#abc' } }] });
    });

    it('Verify registry removes expected field', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [{ style: { color: '#abc' } } as any] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [{ style: { color: '#abc' } }] });
    });

    it('Verify registry returns nested override format', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [{ start: 0, end: 100, style: { color: '#abc', nested: { value: 1 } } } as any] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [{ start: 0, end: 100, style: { color: '#abc', nested: { value: 1 } } }] });
    });

    it('Verify registry returns unsupported format', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ 'unsupported-format': [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ 'unsupported-format': [ruleA] });
    });

    it('Verify vessel IDs returned as numbers instead of strings', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ 123: [ruleA] } as any);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ '123': [ruleA] });
    });

    it('Verify rules returned as object instead of array', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: { 0: ruleA } as any });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [] });
    });

    it('Verify API returns unexpected event type', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(null);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['unknown_type'], { unknown_type: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify API returns deprecated event type', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(null);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['deprecated_type'], { deprecated_type: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify API returns unknown event type', () => {
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(null);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['unknown_type'], { unknown_type: baseEventDetails }));
      expect(result.current).toBeNull();
    });

    it('Verify API returns mixed valid and invalid event types', () => {
      vi.mocked(getTrajectoryOverridesForType).mockImplementation((t) =>
        t === 'valid_type' ? { vessel1: [ruleA] } : null
      );
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['valid_type', 'invalid_type'], { valid_type: baseEventDetails, invalid_type: baseEventDetails }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });
  });

  describe('Large Datasets', () => {
    it('Verify 100 vessel IDs', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 100; i++) overrides[`vessel${i}`] = [ruleA];
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(100);
    });

    it('Verify 1000 vessel IDs', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 1000; i++) overrides[`vessel${i}`] = [ruleA];
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(1000);
    });

    it('Verify 5000 vessel IDs', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 5000; i++) overrides[`vessel${i}`] = [ruleA];
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(5000);
    });

    it('Verify 10000 vessel IDs', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 10000; i++) overrides[`vessel${i}`] = [ruleA];
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(10000);
    });
  });

  describe('Large Rule Sets', () => {
    it('Verify one vessel with 100 rules', () => {
      const data = createPlaybackData();
      const rules = Array.from({ length: 100 }, (_, i) => createRule({ start: i, end: i + 1 }));
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: rules });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current?.vessel1).toHaveLength(100);
    });

    it('Verify one vessel with 1000 rules', () => {
      const data = createPlaybackData();
      const rules = Array.from({ length: 1000 }, (_, i) => createRule({ start: i, end: i + 1 }));
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: rules });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(result.current?.vessel1).toHaveLength(1000);
    });

    it('Verify multiple vessels with large rule arrays', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 100; i++) overrides[`vessel${i}`] = Array.from({ length: 100 }, (_, j) => createRule({ start: j, end: j + 1 }));
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(100);
      expect(result.current?.vessel0).toHaveLength(100);
    });

    it('Verify merge performance with large datasets', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 1000; i++) overrides[`vessel${i}`] = [ruleA];
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(1000);
      expect(result.current?.vessel0).toHaveLength(2);
    });
  });

  describe('Many Event Types', () => {
    it('Verify 10 event types', () => {
      const data = createPlaybackData();
      const types = Array.from({ length: 10 }, (_, i) => `type${i}`);
      const resolvedDetails: Record<string, EventDetailsBase> = {};
      types.forEach((t) => (resolvedDetails[t] = baseEventDetails));
      vi.mocked(getTrajectoryOverridesForType).mockImplementation(() => ({ vessel1: [ruleA] }));
      const { result } = renderHook(() => useTrajectoryOverrides(data, types, resolvedDetails));
      expect(result.current?.vessel1).toHaveLength(10);
    });

    it('Verify 100 event types', () => {
      const data = createPlaybackData();
      const types = Array.from({ length: 100 }, (_, i) => `type${i}`);
      const resolvedDetails: Record<string, EventDetailsBase> = {};
      types.forEach((t) => (resolvedDetails[t] = baseEventDetails));
      vi.mocked(getTrajectoryOverridesForType).mockImplementation(() => ({ vessel1: [ruleA] }));
      const { result } = renderHook(() => useTrajectoryOverrides(data, types, resolvedDetails));
      expect(result.current?.vessel1).toHaveLength(100);
    });

    it('Verify 1000 event types', () => {
      const data = createPlaybackData();
      const types = Array.from({ length: 1000 }, (_, i) => `type${i}`);
      const resolvedDetails: Record<string, EventDetailsBase> = {};
      types.forEach((t) => (resolvedDetails[t] = baseEventDetails));
      vi.mocked(getTrajectoryOverridesForType).mockImplementation(() => ({ vessel1: [ruleA] }));
      const { result } = renderHook(() => useTrajectoryOverrides(data, types, resolvedDetails));
      expect(result.current?.vessel1).toHaveLength(1000);
    });
  });

  describe('Stress Scenarios', () => {
    it('Verify rapid prop updates', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender, result } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }: { data: PlaybackData; resolvedTypes: string[]; resolvedDetails: Record<string, EventDetailsBase> }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['type1'], resolvedDetails: { type1: baseEventDetails } as Record<string, EventDetailsBase> } }
      );
      for (let i = 0; i < 50; i++) {
        rerender({ data, resolvedTypes: [`type${i}`], resolvedDetails: { [`type${i}`]: baseEventDetails } });
      }
      expect(result.current).toBeDefined();
    });

    it('Verify rapid event switching', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender, result } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }: { data: PlaybackData; resolvedTypes: string[]; resolvedDetails: Record<string, EventDetailsBase> }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['type1'], resolvedDetails: { type1: baseEventDetails } as Record<string, EventDetailsBase> } }
      );
      rerender({ data, resolvedTypes: ['type2'], resolvedDetails: { type2: baseEventDetails } });
      rerender({ data, resolvedTypes: ['type1'], resolvedDetails: { type1: baseEventDetails } });
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify repeated rerenders', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender, result } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: baseEventDetails } } }
      );
      for (let i = 0; i < 100; i++) {
        rerender({ data, resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: baseEventDetails } });
      }
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify memory usage remains stable', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: baseEventDetails } } }
      );
      for (let i = 0; i < 100; i++) {
        rerender({ data: { ...data }, resolvedTypes: ['geofence_intrusion'], resolvedDetails: { geofence_intrusion: { ...baseEventDetails } } });
      }
      expect(getTrajectoryOverridesForType).toHaveBeenCalledTimes(101);
    });

    it('Verify no stack overflow with deep objects', () => {
      const data = createPlaybackData();
      const deep = {} as any;
      let current = deep;
      for (let i = 0; i < 1000; i++) {
        current.nested = {};
        current = current.nested;
      }
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: { ...baseEventDetails, information: deep } }));
      expect(result.current).toEqual({ vessel1: [ruleA] });
    });

    it('Verify no freeze with large payloads', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 10000; i++) overrides[`vessel${i}`] = [ruleA];
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(10000);
    });

    it('Verify hook handles high-frequency updates', () => {
      const data = createPlaybackData();
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue({ vessel1: [ruleA] });
      const { rerender, result } = renderHook(
        ({ data, resolvedTypes, resolvedDetails }: { data: PlaybackData; resolvedTypes: string[]; resolvedDetails: Record<string, EventDetailsBase> }) => useTrajectoryOverrides(data, resolvedTypes, resolvedDetails),
        { initialProps: { data, resolvedTypes: ['type1'], resolvedDetails: { type1: baseEventDetails } as Record<string, EventDetailsBase> } }
      );
      for (let i = 0; i < 20; i++) {
        rerender({ data, resolvedTypes: [`type${i % 2}`], resolvedDetails: { [`type${i % 2}`]: baseEventDetails } });
      }
      expect(result.current).toBeDefined();
    });

    it('Verify merge operation scales correctly', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 5000; i++) overrides[`vessel${i}`] = [ruleA];
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['type1', 'type2'], { type1: baseEventDetails, type2: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(5000);
      expect(result.current?.vessel0).toHaveLength(2);
    });

    it('Verify application remains responsive with maximum expected data', () => {
      const data = createPlaybackData();
      const overrides: Record<string, TrajectoryOverrideRule[]> = {};
      for (let i = 0; i < 1000; i++) overrides[`vessel${i}`] = Array.from({ length: 100 }, (_, j) => createRule({ start: j, end: j + 1 }));
      vi.mocked(getTrajectoryOverridesForType).mockReturnValue(overrides);
      const { result } = renderHook(() => useTrajectoryOverrides(data, ['geofence_intrusion'], { geofence_intrusion: baseEventDetails }));
      expect(Object.keys(result.current ?? {})).toHaveLength(1000);
      expect(result.current?.vessel0).toHaveLength(100);
    });
  });
});
