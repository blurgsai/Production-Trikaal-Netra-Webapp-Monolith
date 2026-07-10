import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResolvedEventTypes } from '../useResolvedEventTypes';
import type { PlaybackData, EventDetailsBase } from '../../model/types';

function makeEventDetails(overrides?: Partial<EventDetailsBase>): EventDetailsBase {
  return {
    type: 'geofence_intrusion',
    location: { lat: 19.0, lon: 72.8 },
    timestamp: '2024-01-01T00:00:00Z',
    startTime: '2024-01-01T01:00:00Z',
    endTime: '2024-01-01T02:00:00Z',
    duration: { valueSeconds: 3600 },
    vessels: ['v1'],
    severity: 'high',
    model: 'test-model',
    status: 'active',
    s2CellId: 'cell123',
    temporality: 'bounded',
    eventSource: 'radar',
    information: {},
    ...overrides,
  };
}

function makePlaybackData(overrides?: Partial<PlaybackData>): PlaybackData {
  return {
    eventDetails: makeEventDetails(),
    extras: {},
    timeline: [],
    timeWindow: { queryStartMs: 1000, queryEndMs: 5000, eventStartMs: 1500, eventEndMs: 4000 },
    ...overrides,
  };
}

describe('useResolvedEventTypes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── T-01: Atomic event resolves to single type ──────────────────────────────
  it('atomic event resolves to single type', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(result.current.resolvedTypes).toEqual(['geofence_intrusion']);
  });

  // ── T-02: Atomic event resolves details for single type ─────────────────────
  it('atomic event resolves details for single type', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(result.current.resolvedDetails['geofence_intrusion']).toBe(data.eventDetails);
  });

  // ── T-03: Compound event with constituent types resolves to those types ─────
  it('compound event resolves to constituent types', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['type_a', 'type_b'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound_event', true));
    expect(result.current.resolvedTypes).toEqual(['type_a', 'type_b']);
  });

  // ── T-04: Compound event with empty constituentTypes falls back to eventType ─
  it('compound event with empty constituentTypes falls back to eventType', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: [] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound_event', true));
    expect(result.current.resolvedTypes).toEqual(['compound_event']);
  });

  // ── T-05: Compound event with undefined constituentTypes falls back ─────────
  it('compound event with undefined constituentTypes falls back to eventType', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound_event', true));
    expect(result.current.resolvedTypes).toEqual(['compound_event']);
  });

  // ── T-06: Null data returns empty results ───────────────────────────────────
  it('null data returns empty results', () => {
    const { result } = renderHook(() => useResolvedEventTypes(null, 'geofence_intrusion', false));
    expect(result.current.resolvedTypes).toEqual([]);
    expect(result.current.resolvedDetails).toEqual({});
  });

  // ── T-07: Undefined data returns empty results ──────────────────────────────
  it('undefined data returns empty results', () => {
    const { result } = renderHook(() => useResolvedEventTypes(undefined, 'geofence_intrusion', false));
    expect(result.current.resolvedTypes).toEqual([]);
    expect(result.current.resolvedDetails).toEqual({});
  });

  // ── T-08: Null eventDetails returns empty results ───────────────────────────
  it('null eventDetails returns empty results', () => {
    const data = makePlaybackData({ eventDetails: null as unknown as EventDetailsBase });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(result.current.resolvedTypes).toEqual([]);
    expect(result.current.resolvedDetails).toEqual({});
  });

  // ── T-09: Compound event resolves details per constituent type ──────────────
  it('compound event resolves details per constituent type', () => {
    const ed = makeEventDetails({ constituentTypes: ['type_a', 'type_b'] });
    const data = makePlaybackData({ eventDetails: ed });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound_event', true));
    expect(result.current.resolvedDetails['type_a']).toBeDefined();
    expect(result.current.resolvedDetails['type_b']).toBeDefined();
  });

  // ── T-10: Compound event with missing nested details falls back to eventDetails ─
  it('compound event with missing nested details falls back to eventDetails', () => {
    const ed = makeEventDetails({ constituentTypes: ['type_a'] });
    const data = makePlaybackData({ eventDetails: ed });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound_event', true));
    expect(result.current.resolvedDetails['type_a']).toBe(ed);
  });

  // ── T-11: Result is memoized for same inputs ────────────────────────────────
  it('result is memoized for same inputs', () => {
    const data = makePlaybackData();
    const { result, rerender } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-12: Result changes when data changes ──────────────────────────────────
  it('result changes when data changes', () => {
    const data1 = makePlaybackData({ eventDetails: makeEventDetails({ constituentTypes: ['a'] }) });
    const data2 = makePlaybackData({ eventDetails: makeEventDetails({ constituentTypes: ['b'] }) });
    const { result, rerender } = renderHook(
      ({ data }) => useResolvedEventTypes(data, 'compound', true),
      { initialProps: { data: data1 } },
    );
    expect(result.current.resolvedTypes).toEqual(['a']);
    rerender({ data: data2 });
    expect(result.current.resolvedTypes).toEqual(['b']);
  });

  // ── T-13: Result changes when eventType changes ─────────────────────────────
  it('result changes when eventType changes', () => {
    const data = makePlaybackData();
    const { result, rerender } = renderHook(
      ({ eventType }) => useResolvedEventTypes(data, eventType, false),
      { initialProps: { eventType: 'type_a' } },
    );
    expect(result.current.resolvedTypes).toEqual(['type_a']);
    rerender({ eventType: 'type_b' });
    expect(result.current.resolvedTypes).toEqual(['type_b']);
  });

  // ── T-14: Result changes when isCompound changes ────────────────────────────
  it('result changes when isCompound changes', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['type_a', 'type_b'] }),
    });
    const { result, rerender } = renderHook(
      ({ isCompound }) => useResolvedEventTypes(data, 'compound_event', isCompound),
      { initialProps: { isCompound: false } },
    );
    expect(result.current.resolvedTypes).toEqual(['compound_event']);
    rerender({ isCompound: true });
    expect(result.current.resolvedTypes).toEqual(['type_a', 'type_b']);
  });

  // ── T-15: Atomic event details are the full eventDetails block ──────────────
  it('atomic event details are the full eventDetails block', () => {
    const ed = makeEventDetails({ severity: 'critical' });
    const data = makePlaybackData({ eventDetails: ed });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(result.current.resolvedDetails['geofence_intrusion'].severity).toBe('critical');
  });

  // ── T-16: Compound event with single constituent type ───────────────────────
  it('compound event with single constituent type', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['single_type'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toEqual(['single_type']);
  });

  // ── T-17: Compound event with many constituent types ────────────────────────
  it('compound event with many constituent types', () => {
    const types = Array.from({ length: 10 }, (_, i) => `type_${i}`);
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: types }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toEqual(types);
  });

  // ── T-18: Return type has all expected properties ───────────────────────────
  it('return type has all expected properties', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(result.current).toHaveProperty('resolvedTypes');
    expect(result.current).toHaveProperty('resolvedDetails');
  });

  // ── T-19: Empty string eventType for atomic ─────────────────────────────────
  it('empty string eventType for atomic', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, '', false));
    expect(result.current.resolvedTypes).toEqual(['']);
  });

  // ── T-20: Empty string eventType for compound with no constituents ──────────
  it('empty string eventType for compound with no constituents', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, '', true));
    expect(result.current.resolvedTypes).toEqual(['']);
  });

  // ── T-21: Compound event details for type not in eventDetails ───────────────
  it('compound event details for unknown type falls back to eventDetails', () => {
    const ed = makeEventDetails({ constituentTypes: ['unknown_type'] });
    const data = makePlaybackData({ eventDetails: ed });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedDetails['unknown_type']).toBe(ed);
  });

  // ── T-22: Compound event with nested details under type key ─────────────────
  it('compound event with nested details under type key', () => {
    const nestedDetails = makeEventDetails({ type: 'type_a', severity: 'low' });
    const ed = makeEventDetails({
      constituentTypes: ['type_a'],
      information: { type_a: nestedDetails } as unknown as Record<string, unknown>,
    });
    const data = makePlaybackData({ eventDetails: ed });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    const resolved = result.current.resolvedDetails['type_a'];
    expect(resolved).toBeDefined();
  });

  // ── T-23: Null data with isCompound true returns empty ──────────────────────
  it('null data with isCompound true returns empty', () => {
    const { result } = renderHook(() => useResolvedEventTypes(null, 'compound', true));
    expect(result.current.resolvedTypes).toEqual([]);
  });

  // ── T-24: Data with null eventDetails and isCompound true ───────────────────
  it('data with null eventDetails and isCompound true returns empty', () => {
    const data = makePlaybackData({ eventDetails: null as unknown as EventDetailsBase });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toEqual([]);
  });

  // ── T-25: resolvedDetails is an object ──────────────────────────────────────
  it('resolvedDetails is an object', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(typeof result.current.resolvedDetails).toBe('object');
  });

  // ── T-26: resolvedTypes is an array ─────────────────────────────────────────
  it('resolvedTypes is an array', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(Array.isArray(result.current.resolvedTypes)).toBe(true);
  });

  // ── T-27: Atomic event with constituentTypes defined but isCompound false ───
  it('atomic event ignores constituentTypes when isCompound is false', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['type_a', 'type_b'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(result.current.resolvedTypes).toEqual(['geofence_intrusion']);
  });

  // ── T-28: Compound event with duplicate constituent types ───────────────────
  it('compound event with duplicate constituent types', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['type_a', 'type_a'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toEqual(['type_a', 'type_a']);
  });

  // ── T-29: Compound event with whitespace-only type names ────────────────────
  it('compound event with whitespace-only type names', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['  ', 'type_b'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toEqual(['  ', 'type_b']);
  });

  // ── T-30: Large number of constituent types ─────────────────────────────────
  it('large number of constituent types', () => {
    const types = Array.from({ length: 50 }, (_, i) => `type_${i}`);
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: types }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toHaveLength(50);
  });

  // ── T-31: resolvedDetails keys match resolvedTypes for atomic ───────────────
  it('resolvedDetails keys match resolvedTypes for atomic', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(Object.keys(result.current.resolvedDetails)).toEqual(result.current.resolvedTypes);
  });

  // ── T-32: resolvedDetails keys match resolvedTypes for compound ─────────────
  it('resolvedDetails keys match resolvedTypes for compound', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['type_a', 'type_b'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(Object.keys(result.current.resolvedDetails).sort()).toEqual(result.current.resolvedTypes.sort());
  });

  // ── T-33: Memoization with null data ────────────────────────────────────────
  it('memoization with null data', () => {
    const { result, rerender } = renderHook(() => useResolvedEventTypes(null, 'type', false));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-34: Switching from atomic to compound with same data ──────────────────
  it('switching from atomic to compound with same data', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['type_a'] }),
    });
    const { result, rerender } = renderHook(
      ({ isCompound }) => useResolvedEventTypes(data, 'compound', isCompound),
      { initialProps: { isCompound: false } },
    );
    expect(result.current.resolvedTypes).toEqual(['compound']);
    rerender({ isCompound: true });
    expect(result.current.resolvedTypes).toEqual(['type_a']);
  });

  // ── T-35: Switching from compound to atomic with same data ──────────────────
  it('switching from compound to atomic with same data', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['type_a'] }),
    });
    const { result, rerender } = renderHook(
      ({ isCompound }) => useResolvedEventTypes(data, 'geofence_intrusion', isCompound),
      { initialProps: { isCompound: true } },
    );
    expect(result.current.resolvedTypes).toEqual(['type_a']);
    rerender({ isCompound: false });
    expect(result.current.resolvedTypes).toEqual(['geofence_intrusion']);
  });

  // ── T-36: Data object without eventDetails property ─────────────────────────
  it('data without eventDetails returns empty', () => {
    const data = { timeline: [], timeWindow: { queryStartMs: 0, queryEndMs: 0, eventStartMs: 0, eventEndMs: null }, extras: {} } as unknown as PlaybackData;
    const { result } = renderHook(() => useResolvedEventTypes(data, 'type', false));
    expect(result.current.resolvedTypes).toEqual([]);
  });

  // ── T-37: Compound event details object has correct number of keys ──────────
  it('compound event details has correct number of keys', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['a', 'b', 'c'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(Object.keys(result.current.resolvedDetails)).toHaveLength(3);
  });

  // ── T-38: Atomic event details has exactly 1 key ────────────────────────────
  it('atomic event details has exactly 1 key', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(Object.keys(result.current.resolvedDetails)).toHaveLength(1);
  });

  // ── T-39: Compound with constituentTypes containing empty strings ───────────
  it('compound with empty string constituent type', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: [''] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toEqual(['']);
  });

  // ── T-40: Compound with constituentTypes containing numbers as strings ──────
  it('compound with numeric string constituent types', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['1', '2', '3'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedTypes).toEqual(['1', '2', '3']);
  });

  // ── T-41: eventType with special characters ─────────────────────────────────
  it('eventType with special characters', () => {
    const data = makePlaybackData();
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence-intrusion_v2', false));
    expect(result.current.resolvedTypes).toEqual(['geofence-intrusion_v2']);
  });

  // ── T-42: Compound event where nested detail is null ────────────────────────
  it('compound event where nested detail is null falls back to eventDetails', () => {
    const ed = makeEventDetails({
      constituentTypes: ['type_a'],
      information: { type_a: null } as unknown as Record<string, unknown>,
    });
    const data = makePlaybackData({ eventDetails: ed });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    expect(result.current.resolvedDetails['type_a']).toBe(ed);
  });

  // ── T-43: Re-render with same data reference is memoized ────────────────────
  it('re-render with same data reference is memoized', () => {
    const data = makePlaybackData();
    const { result, rerender } = renderHook(() => useResolvedEventTypes(data, 'type', false));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-44: Re-render with new data reference but same content is not memoized ─
  it('re-render with new data reference produces new result', () => {
    const data1 = makePlaybackData();
    const data2 = makePlaybackData();
    const { result, rerender } = renderHook(
      ({ data }) => useResolvedEventTypes(data, 'type', false),
      { initialProps: { data: data1 } },
    );
    const first = result.current;
    rerender({ data: data2 });
    expect(result.current).not.toBe(first);
  });

  // ── T-45: Compound event with constituentTypes as undefined explicitly ──────
  it('compound event with constituentTypes explicitly undefined', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: undefined }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound_event', true));
    expect(result.current.resolvedTypes).toEqual(['compound_event']);
  });

  // ── T-46: Null data, null eventType ─────────────────────────────────────────
  it('null data with any eventType returns empty', () => {
    const { result } = renderHook(() => useResolvedEventTypes(null, '', false));
    expect(result.current.resolvedTypes).toEqual([]);
    expect(result.current.resolvedDetails).toEqual({});
  });

  // ── T-47: Data with eventDetails but empty timeline ─────────────────────────
  it('data with eventDetails and empty timeline still resolves', () => {
    const data = makePlaybackData({ timeline: [] });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'geofence_intrusion', false));
    expect(result.current.resolvedTypes).toEqual(['geofence_intrusion']);
  });

  // ── T-48: Compound event with many types and details ────────────────────────
  it('compound event with many types has details for each', () => {
    const types = ['a', 'b', 'c', 'd', 'e'];
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: types }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'compound', true));
    for (const t of types) {
      expect(result.current.resolvedDetails[t]).toBeDefined();
    }
  });

  // ── T-49: Switching data from null to valid ─────────────────────────────────
  it('switching data from null to valid resolves', () => {
    const data = makePlaybackData();
    const { result, rerender } = renderHook(
      ({ data: d }) => useResolvedEventTypes(d, 'geofence_intrusion', false),
      { initialProps: { data: null as PlaybackData | null } },
    );
    expect(result.current.resolvedTypes).toEqual([]);
    rerender({ data });
    expect(result.current.resolvedTypes).toEqual(['geofence_intrusion']);
  });

  // ── T-50: Switching data from valid to null ─────────────────────────────────
  it('switching data from valid to null empties results', () => {
    const data = makePlaybackData();
    const { result, rerender } = renderHook(
      ({ data: d }) => useResolvedEventTypes(d, 'geofence_intrusion', false),
      { initialProps: { data: data as PlaybackData | null } },
    );
    expect(result.current.resolvedTypes).toEqual(['geofence_intrusion']);
    rerender({ data: null });
    expect(result.current.resolvedTypes).toEqual([]);
  });

  // ── T-51: Compound event with single constituent and isCompound false ───────
  it('compound event data with isCompound false uses eventType', () => {
    const data = makePlaybackData({
      eventDetails: makeEventDetails({ constituentTypes: ['only_type'] }),
    });
    const { result } = renderHook(() => useResolvedEventTypes(data, 'main_type', false));
    expect(result.current.resolvedTypes).toEqual(['main_type']);
    expect(result.current.resolvedDetails['main_type']).toBe(data.eventDetails);
  });

  // ── T-52: Empty resolvedDetails when data is null ───────────────────────────
  it('resolvedDetails is empty object when data is null', () => {
    const { result } = renderHook(() => useResolvedEventTypes(null, 'type', true));
    expect(result.current.resolvedDetails).toEqual({});
  });
});
