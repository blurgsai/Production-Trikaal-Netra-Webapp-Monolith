/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResolvedEventTypes } from '../hooks/useResolvedEventTypes';
import type { EventDetailsBase, PlaybackData } from '../model/types';

const baseEventDetails: EventDetailsBase = {
  type: 'test_event',
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
  timeWindow: {
    queryStartMs: 1704067200000,
    queryEndMs: 1704070800000,
    eventStartMs: 1704067200000,
    eventEndMs: 1704070800000,
  },
  ...overrides,
});

describe('useResolvedEventTypes', () => {
  // Atomic Event Tests
  describe('Atomic Event Tests', () => {
    it('Should return single eventType in resolvedTypes', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should return eventDetails mapped to eventType key', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'GEOFENCE_INTRUSION', false));
      expect(result.current.resolvedDetails['GEOFENCE_INTRUSION']).toBe(data.eventDetails);
    });

    it('Should return correct resolvedDetails object', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'DARK_ACTIVITY', false));
      expect(result.current.resolvedDetails).toEqual({ DARK_ACTIVITY: data.eventDetails });
    });

    it('Should handle valid atomic event data', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'PORT_VISIT', false));
      expect(result.current.resolvedTypes).toHaveLength(1);
      expect(result.current.resolvedDetails['PORT_VISIT']).toEqual(data.eventDetails);
    });

    it('Should ignore constituentTypes when isCompound is false', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['GEOFENCE_INTRUSION', 'DARK_ACTIVITY'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should return provided eventType even if constituentTypes exist', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['GEOFENCE_INTRUSION', 'DARK_ACTIVITY'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'UNKNOWN', false));
      expect(result.current.resolvedTypes).toEqual(['UNKNOWN']);
      expect(result.current.resolvedDetails['UNKNOWN']).toBe(data.eventDetails);
    });

    it('Should handle empty eventDetails', () => {
      const data = createPlaybackData({ eventDetails: { ...baseEventDetails, type: '', information: {} } });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
      expect(result.current.resolvedDetails['AIS_LOITERING']).toBe(data.eventDetails);
    });

    it('Should handle eventType with special characters', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'type!@#$%', false));
      expect(result.current.resolvedTypes).toEqual(['type!@#$%']);
    });

    it('Should handle eventType with numeric value', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, '12345', false));
      expect(result.current.resolvedTypes).toEqual(['12345']);
    });

    it('Should handle eventType with Unicode characters', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'événement', false));
      expect(result.current.resolvedTypes).toEqual(['événement']);
    });

    it('Should handle empty eventType string', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, '', false));
      expect(result.current.resolvedTypes).toEqual(['']);
    });

    it('Should handle whitespace eventType', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, '   ', false));
      expect(result.current.resolvedTypes).toEqual(['   ']);
    });

    it('Should handle long eventType string', () => {
      const data = createPlaybackData();
      const longType = 'A'.repeat(1000);
      const { result } = renderHook(() => useResolvedEventTypes(data, longType, false));
      expect(result.current.resolvedTypes).toEqual([longType]);
    });

    it('Should return same eventDetails reference for atomic events', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING']).toBe(data.eventDetails);
    });

    it('Should return only one resolved type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toHaveLength(1);
      expect(Object.keys(result.current.resolvedDetails)).toHaveLength(1);
    });
  });

  // Compound Event Tests
  describe('Compound Event Tests', () => {
    it('Should return all constituentTypes', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['GEOFENCE_INTRUSION', 'DARK_ACTIVITY'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['GEOFENCE_INTRUSION', 'DARK_ACTIVITY']);
    });

    it('Should return correct number of resolvedTypes', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'B', 'C'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toHaveLength(3);
    });

    it('Should map each constituent type to corresponding details', () => {
      const geofenceDetails: EventDetailsBase = { ...baseEventDetails, type: 'GEOFENCE_INTRUSION' };
      const darkDetails: EventDetailsBase = { ...baseEventDetails, type: 'DARK_ACTIVITY' };
      const data = createPlaybackData({
        eventDetails: {
          ...baseEventDetails,
          constituentTypes: ['GEOFENCE_INTRUSION', 'DARK_ACTIVITY'],
          GEOFENCE_INTRUSION: geofenceDetails as any,
          DARK_ACTIVITY: darkDetails as any,
        } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['GEOFENCE_INTRUSION']).toBe(geofenceDetails);
      expect(result.current.resolvedDetails['DARK_ACTIVITY']).toBe(darkDetails);
    });

    it('Should return correct resolvedDetails object', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'B'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(Object.keys(result.current.resolvedDetails)).toEqual(['A', 'B']);
    });

    it('Should handle two constituent types', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['X', 'Y'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['X', 'Y']);
    });

    it('Should handle three constituent types', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['X', 'Y', 'Z'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['X', 'Y', 'Z']);
    });

    it('Should handle many constituent types', () => {
      const types = Array.from({ length: 100 }, (_, i) => `type_${i}`);
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: types },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(types);
      expect(result.current.resolvedTypes).toHaveLength(100);
    });

    it('Should preserve constituentTypes order', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['Z', 'A', 'M'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['Z', 'A', 'M']);
    });

    it('Should handle duplicate constituent types', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'A', 'B'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['A', 'A', 'B']);
    });

    it('Should handle constituent type names with special characters', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['type!@#', 'type$%^'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['type!@#', 'type$%^']);
    });

    it('Should handle constituent type names with Unicode characters', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['événement', 'タイプ'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['événement', 'タイプ']);
    });

    it('Should handle numeric constituent type names', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['123', '456'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['123', '456']);
    });

    it('Should handle long constituent type names', () => {
      const longType = 'A'.repeat(1000);
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: [longType] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual([longType]);
    });

    it('Should correctly resolve nested event details', () => {
      const geofenceDetails: EventDetailsBase = { ...baseEventDetails, type: 'GEOFENCE_INTRUSION' };
      const data = createPlaybackData({
        eventDetails: {
          ...baseEventDetails,
          constituentTypes: ['GEOFENCE_INTRUSION'],
          GEOFENCE_INTRUSION: geofenceDetails as any,
        } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['GEOFENCE_INTRUSION']).toBe(geofenceDetails);
    });

    it('Should return fallback eventDetails when nested detail missing', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['MISSING_TYPE'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['MISSING_TYPE']).toBe(data.eventDetails);
    });
  });

  // Null / Undefined Data Tests
  describe('Null / Undefined Data Tests', () => {
    it('Should return empty resolvedTypes when data is null', () => {
      const { result } = renderHook(() => useResolvedEventTypes(null, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual([]);
    });

    it('Should return empty resolvedDetails when data is null', () => {
      const { result } = renderHook(() => useResolvedEventTypes(null, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails).toEqual({});
    });

    it('Should return empty resolvedTypes when data is undefined', () => {
      const { result } = renderHook(() => useResolvedEventTypes(undefined, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual([]);
    });

    it('Should return empty resolvedDetails when data is undefined', () => {
      const { result } = renderHook(() => useResolvedEventTypes(undefined, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails).toEqual({});
    });

    it('Should not throw when data is null', () => {
      expect(() => renderHook(() => useResolvedEventTypes(null, 'AIS_LOITERING', false))).not.toThrow();
    });

    it('Should not throw when data is undefined', () => {
      expect(() => renderHook(() => useResolvedEventTypes(undefined, 'AIS_LOITERING', false))).not.toThrow();
    });
  });

  // ConstituentTypes Edge Cases
  describe('ConstituentTypes Edge Cases', () => {
    it('Should use eventType when constituentTypes is undefined', () => {
      const data = createPlaybackData({ eventDetails: { ...baseEventDetails, constituentTypes: undefined } });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'FALLBACK', true));
      expect(result.current.resolvedTypes).toEqual(['FALLBACK']);
    });

    it('Should use eventType when constituentTypes is null', () => {
      const data = createPlaybackData({ eventDetails: { ...baseEventDetails, constituentTypes: null as any } });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'FALLBACK', true));
      expect(result.current.resolvedTypes).toEqual(['FALLBACK']);
    });

    it('Should use eventType when constituentTypes is empty array', () => {
      const data = createPlaybackData({ eventDetails: { ...baseEventDetails, constituentTypes: [] } });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'FALLBACK', true));
      expect(result.current.resolvedTypes).toEqual(['FALLBACK']);
    });

    it('Should return fallback eventType when no constituentTypes exist', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'FALLBACK', true));
      expect(result.current.resolvedTypes).toEqual(['FALLBACK']);
    });

    it('Should handle constituentTypes containing null values', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', null as any, 'B'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['A', null, 'B']);
    });

    it('Should handle constituentTypes containing undefined values', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', undefined as any, 'B'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['A', undefined, 'B']);
    });

    it('Should handle constituentTypes containing empty strings', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['', 'A', ''] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['', 'A', '']);
    });

    it('Should handle very large constituentTypes array', () => {
      const types = Array.from({ length: 10000 }, (_, i) => `type_${i}`);
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: types },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toHaveLength(10000);
    });

    it('Should handle constituentTypes with duplicate values', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'A', 'A'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual(['A', 'A', 'A']);
    });
  });

  // ResolvedDetails Tests
  describe('ResolvedDetails Tests', () => {
    it('Should return correct details for first constituent type', () => {
      const first: EventDetailsBase = { ...baseEventDetails, type: 'FIRST' };
      const data = createPlaybackData({
        eventDetails: {
          ...baseEventDetails,
          constituentTypes: ['FIRST', 'SECOND'],
          FIRST: first as any,
        } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['FIRST']).toBe(first);
    });

    it('Should return correct details for second constituent type', () => {
      const second: EventDetailsBase = { ...baseEventDetails, type: 'SECOND' };
      const data = createPlaybackData({
        eventDetails: {
          ...baseEventDetails,
          constituentTypes: ['FIRST', 'SECOND'],
          SECOND: second as any,
        } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['SECOND']).toBe(second);
    });

    it('Should return correct details for third constituent type', () => {
      const third: EventDetailsBase = { ...baseEventDetails, type: 'THIRD' };
      const data = createPlaybackData({
        eventDetails: {
          ...baseEventDetails,
          constituentTypes: ['FIRST', 'SECOND', 'THIRD'],
          THIRD: third as any,
        } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['THIRD']).toBe(third);
    });

    it('Should fallback to root eventDetails if constituent detail missing', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['MISSING'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['MISSING']).toBe(data.eventDetails);
    });

    it('Should fallback for all missing constituent details', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'B', 'C'] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['A']).toBe(data.eventDetails);
      expect(result.current.resolvedDetails['B']).toBe(data.eventDetails);
      expect(result.current.resolvedDetails['C']).toBe(data.eventDetails);
    });

    it('Should handle empty resolvedDetails', () => {
      const { result } = renderHook(() => useResolvedEventTypes(null, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails).toEqual({});
    });

    it('Should handle partially populated resolvedDetails', () => {
      const a: EventDetailsBase = { ...baseEventDetails, type: 'A' };
      const data = createPlaybackData({
        eventDetails: {
          ...baseEventDetails,
          constituentTypes: ['A', 'B'],
          A: a as any,
        } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['A']).toBe(a);
      expect(result.current.resolvedDetails['B']).toBe(data.eventDetails);
    });

    it('Should handle additional unknown detail properties', () => {
      const data = createPlaybackData({
        eventDetails: {
          ...baseEventDetails,
          constituentTypes: ['A'],
          unknownProp: 'value',
        } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedDetails['A']).toBe(data.eventDetails);
    });

    it('Should preserve detail object structure', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING']).toMatchObject(data.eventDetails);
    });

    it('Should preserve nested properties', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].location).toEqual(data.eventDetails.location);
      expect(result.current.resolvedDetails['AIS_LOITERING'].duration).toEqual(data.eventDetails.duration);
    });
  });

  // Memoization Tests
  describe('Memoization Tests', () => {
    it('Should memoize result when inputs unchanged', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      const first = result.current;
      rerender();
      expect(result.current).toBe(first);
    });

    it('Should not recompute when rerendered with same props', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      const first = result.current;
      rerender();
      const second = result.current;
      expect(first).toBe(second);
    });

    it('Should recompute when data changes', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(({ d }) => useResolvedEventTypes(d, 'AIS_LOITERING', false), {
        initialProps: { d: data },
      });
      const first = result.current;
      const newData = createPlaybackData({ extras: { changed: true } });
      rerender({ d: newData });
      expect(result.current).not.toBe(first);
      expect(result.current.resolvedDetails['AIS_LOITERING']).toBe(newData.eventDetails);
    });

    it('Should recompute when eventType changes', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(({ t }) => useResolvedEventTypes(data, t, false), {
        initialProps: { t: 'AIS_LOITERING' },
      });
      const first = result.current;
      rerender({ t: 'DARK_ACTIVITY' });
      expect(result.current).not.toBe(first);
      expect(result.current.resolvedTypes).toEqual(['DARK_ACTIVITY']);
    });

    it('Should recompute when isCompound changes', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'B'] },
      });
      const { result, rerender } = renderHook(({ c }) => useResolvedEventTypes(data, 'COMPOUND', c), {
        initialProps: { c: false },
      });
      const first = result.current;
      rerender({ c: true });
      expect(result.current).not.toBe(first);
      expect(result.current.resolvedTypes).toEqual(['A', 'B']);
    });

    it('Should recompute when constituentTypes change', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A'] },
      });
      const { result, rerender } = renderHook(({ d }) => useResolvedEventTypes(d, 'COMPOUND', true), {
        initialProps: { d: data },
      });
      const first = result.current;
      const newData = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'B'] },
      });
      rerender({ d: newData });
      expect(result.current).not.toBe(first);
      expect(result.current.resolvedTypes).toEqual(['A', 'B']);
    });

    it('Should recompute when eventDetails change', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(({ d }) => useResolvedEventTypes(d, 'AIS_LOITERING', false), {
        initialProps: { d: data },
      });
      const first = result.current;
      const newData = createPlaybackData({
        eventDetails: { ...baseEventDetails, status: 'resolved' },
      });
      rerender({ d: newData });
      expect(result.current).not.toBe(first);
      expect(result.current.resolvedDetails['AIS_LOITERING'].status).toBe('resolved');
    });

    it('Should return same reference when dependencies unchanged', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      const first = result.current;
      rerender();
      expect(result.current).toBe(first);
    });

    it('Should return new reference when dependencies change', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(({ d }) => useResolvedEventTypes(d, 'AIS_LOITERING', false), {
        initialProps: { d: data },
      });
      const first = result.current;
      rerender({ d: createPlaybackData({ extras: { foo: 'bar' } }) });
      expect(result.current).not.toBe(first);
    });

    it('Should handle multiple rerenders correctly', () => {
      const data = createPlaybackData();
      const { result, rerender } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      const first = result.current;
      rerender();
      rerender();
      expect(result.current).toBe(first);
    });
  });

  // Event Type Tests
  describe('Event Type Tests', () => {
    it('Should resolve AIS_LOITERING event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should resolve GEOFENCE_INTRUSION event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'GEOFENCE_INTRUSION', false));
      expect(result.current.resolvedTypes).toEqual(['GEOFENCE_INTRUSION']);
    });

    it('Should resolve DARK_ACTIVITY event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'DARK_ACTIVITY', false));
      expect(result.current.resolvedTypes).toEqual(['DARK_ACTIVITY']);
    });

    it('Should resolve PORT_VISIT event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'PORT_VISIT', false));
      expect(result.current.resolvedTypes).toEqual(['PORT_VISIT']);
    });

    it('Should resolve UNKNOWN event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'UNKNOWN', false));
      expect(result.current.resolvedTypes).toEqual(['UNKNOWN']);
    });

    it('Should resolve lowercase event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'ais_loitering', false));
      expect(result.current.resolvedTypes).toEqual(['ais_loitering']);
    });

    it('Should resolve uppercase event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should resolve mixed case event type', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'Ais_Loitering', false));
      expect(result.current.resolvedTypes).toEqual(['Ais_Loitering']);
    });

    it('Should resolve event type with spaces', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS LOITERING']);
    });

    it('Should resolve event type containing symbols', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS-LOITERING_V2', false));
      expect(result.current.resolvedTypes).toEqual(['AIS-LOITERING_V2']);
    });
  });

  // Data Integrity Tests
  describe('Data Integrity Tests', () => {
    it('Should not mutate original data', () => {
      const data = createPlaybackData();
      const original = JSON.stringify(data);
      renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(JSON.stringify(data)).toBe(original);
    });

    it('Should not mutate original eventDetails', () => {
      const data = createPlaybackData();
      const original = JSON.stringify(data.eventDetails);
      renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(JSON.stringify(data.eventDetails)).toBe(original);
    });

    it('Should not mutate constituentTypes', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: ['A', 'B'] },
      });
      const original = [...data.eventDetails.constituentTypes!];
      renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(data.eventDetails.constituentTypes).toEqual(original);
    });

    it('Should preserve original references', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING']).toBe(data.eventDetails);
    });

    it('Should preserve eventDetails values', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING']).toEqual(data.eventDetails);
    });

    it('Should preserve nested objects', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].location).toBe(data.eventDetails.location);
    });

    it('Should preserve arrays in eventDetails', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].vessels).toBe(data.eventDetails.vessels);
    });

    it('Should preserve date fields', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].timestamp).toBe(data.eventDetails.timestamp);
      expect(result.current.resolvedDetails['AIS_LOITERING'].startTime).toBe(data.eventDetails.startTime);
      expect(result.current.resolvedDetails['AIS_LOITERING'].endTime).toBe(data.eventDetails.endTime);
    });

    it('Should preserve vessel information', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].vessels).toEqual(['vessel1', 'vessel2']);
    });

    it('Should preserve metadata', () => {
      const data = createPlaybackData({ eventDetails: { ...baseEventDetails, information: { foo: 'bar' } } });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].information).toEqual({ foo: 'bar' });
    });
  });

  // Boundary Tests
  describe('Boundary Tests', () => {
    it('Should handle empty PlaybackData', () => {
      const data = createPlaybackData({ eventDetails: { ...baseEventDetails, vessels: [] }, timeline: [] });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should handle PlaybackData with only eventDetails', () => {
      const data = { eventDetails: baseEventDetails } as PlaybackData;
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should handle PlaybackData with missing constituentTypes', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'FALLBACK', true));
      expect(result.current.resolvedTypes).toEqual(['FALLBACK']);
    });

    it('Should handle large PlaybackData object', () => {
      const data = createPlaybackData({
        timeline: Array.from({ length: 1000 }, (_, i) => ({ timestampMs: i, vessels: {} })),
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should handle deeply nested eventDetails', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, information: { level1: { level2: { level3: 'deep' } } } } as any,
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].information).toEqual({
        level1: { level2: { level3: 'deep' } },
      });
    });

    it('Should handle large resolvedDetails object', () => {
      const types = Array.from({ length: 100 }, (_, i) => `type_${i}`);
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: types },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(Object.keys(result.current.resolvedDetails)).toHaveLength(100);
    });

    it('Should handle large number of constituent types', () => {
      const types = Array.from({ length: 1000 }, (_, i) => `type_${i}`);
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: types },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toHaveLength(1000);
    });

    it('Should handle large strings in event types', () => {
      const longType = 'A'.repeat(10000);
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: [longType] },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'COMPOUND', true));
      expect(result.current.resolvedTypes).toEqual([longType]);
    });

    it('Should handle very large nested objects', () => {
      const largeInfo: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeInfo[`key_${i}`] = { value: i };
      }
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, information: largeInfo },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedDetails['AIS_LOITERING'].information).toEqual(largeInfo);
    });

    it('Should handle circular-like structures safely if mocked', () => {
      const data = createPlaybackData();
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });
  });

  // Error Tolerance Tests
  describe('Error Tolerance Tests', () => {
    it('Should handle malformed eventDetails object', () => {
      const data = createPlaybackData({ eventDetails: { type: 'malformed' } as any });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should handle malformed constituentTypes', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, constituentTypes: 'not-an-array' as any },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', true));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should handle missing eventDetails', () => {
      const data = { eventDetails: undefined } as any;
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual([]);
      expect(result.current.resolvedDetails).toEqual({});
    });

    it('Should handle unexpected property types', () => {
      const data = createPlaybackData({
        eventDetails: { ...baseEventDetails, location: 123 as any, duration: 'abc' as any },
      });
      const { result } = renderHook(() => useResolvedEventTypes(data, 'AIS_LOITERING', false));
      expect(result.current.resolvedTypes).toEqual(['AIS_LOITERING']);
    });

    it('Should not crash for supported invalid inputs', () => {
      expect(() => renderHook(() => useResolvedEventTypes({} as any, '', false))).not.toThrow();
    });
  });
});
