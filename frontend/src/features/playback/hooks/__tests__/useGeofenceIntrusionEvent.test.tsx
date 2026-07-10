import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGeofenceIntrusionEvent } from '../useGeofenceIntrusionEvent';
import type { EventDetailsBase } from '../../model/types';
import type { GeofencePolygon } from '../../model/eventTypeTypes';

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
    information: {
      geofence_id: 'gf1',
      geofence_name: 'Zone A',
      Has_exited_polygon: false,
    },
    ...overrides,
  };
}

function makePolygon(): GeofencePolygon {
  return {
    geofence_id: 'gf1',
    asset_name: 'Asset A',
    polygon: {
      type: 'Polygon',
      coordinates: [[[72.8, 19.0], [72.9, 19.1], [73.0, 19.0], [72.8, 19.0]]],
    },
  };
}

describe('useGeofenceIntrusionEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── T-01: Returns mapped geofence event ────────────────────────────────────
  it('returns mapped geofence event', () => {
    const details = makeEventDetails();
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, { geofence_polygon: makePolygon() }));
    expect(result.current).toBeDefined();
    expect(result.current.geofenceName).toBe('Zone A');
  });

  // ── T-02: Maps geofenceName from information ────────────────────────────────
  it('maps geofenceName from information', () => {
    const details = makeEventDetails({ information: { geofence_name: 'Restricted Zone B' } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceName).toBe('Restricted Zone B');
  });

  // ── T-03: Defaults geofenceName to "Restricted Area" when missing ───────────
  it('defaults geofenceName to Restricted Area when missing', () => {
    const details = makeEventDetails({ information: {} });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceName).toBe('Restricted Area');
  });

  // ── T-04: Maps geofenceId from information ──────────────────────────────────
  it('maps geofenceId from information', () => {
    const details = makeEventDetails({ information: { geofence_id: 'gf-999' } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceId).toBe('gf-999');
  });

  // ── T-05: geofenceId is null when missing ───────────────────────────────────
  it('geofenceId is null when missing', () => {
    const details = makeEventDetails({ information: {} });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceId).toBeNull();
  });

  // ── T-06: Maps hasExitedPolygon from information ────────────────────────────
  it('maps hasExitedPolygon from information', () => {
    const details = makeEventDetails({ information: { Has_exited_polygon: true } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  // ── T-07: hasExitedPolygon defaults to false when missing ───────────────────
  it('hasExitedPolygon defaults to false when missing', () => {
    const details = makeEventDetails({ information: {} });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  // ── T-08: Maps intrusionStartMs from startTime ──────────────────────────────
  it('maps intrusionStartMs from startTime', () => {
    const details = makeEventDetails({ startTime: '2024-06-15T08:30:00Z' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).toBe(Date.parse('2024-06-15T08:30:00Z'));
  });

  // ── T-09: intrusionStartMs is null when startTime is null ───────────────────
  it('intrusionStartMs is null when startTime is null', () => {
    const details = makeEventDetails({ startTime: null });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).toBeNull();
  });

  // ── T-10: Maps intrusionEndMs from endTime ──────────────────────────────────
  it('maps intrusionEndMs from endTime', () => {
    const details = makeEventDetails({ endTime: '2024-06-15T10:30:00Z' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionEndMs).toBe(Date.parse('2024-06-15T10:30:00Z'));
  });

  // ── T-11: intrusionEndMs is null when endTime is null ───────────────────────
  it('intrusionEndMs is null when endTime is null', () => {
    const details = makeEventDetails({ endTime: null });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionEndMs).toBeNull();
  });

  // ── T-12: Maps vesselIds from eventDetails ──────────────────────────────────
  it('maps vesselIds from eventDetails', () => {
    const details = makeEventDetails({ vessels: ['v1', 'v2', 'v3'] });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.vesselIds).toEqual(['v1', 'v2', 'v3']);
  });

  // ── T-13: vesselIds is empty array when no vessels ──────────────────────────
  it('vesselIds is empty array when no vessels', () => {
    const details = makeEventDetails({ vessels: [] });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.vesselIds).toEqual([]);
  });

  // ── T-14: Maps polygonPositions from extras geofence_polygon ────────────────
  it('maps polygonPositions from extras geofence_polygon', () => {
    const details = makeEventDetails();
    const extras = { geofence_polygon: makePolygon() };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).not.toBeNull();
    expect(result.current.polygonPositions).toHaveLength(1);
  });

  // ── T-15: polygonPositions is null when no geofence_polygon in extras ───────
  it('polygonPositions is null when no geofence_polygon in extras', () => {
    const details = makeEventDetails();
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.polygonPositions).toBeNull();
  });

  // ── T-16: Polygon coordinates are swapped from [lon, lat] to [lat, lon] ─────
  it('swaps polygon coordinates from [lon, lat] to [lat, lon]', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        geofence_id: 'gf1',
        polygon: {
          type: 'Polygon' as const,
          coordinates: [[[72.8, 19.0], [73.0, 19.5]]],
        },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions![0][0]).toEqual([19.0, 72.8]);
    expect(result.current.polygonPositions![0][1]).toEqual([19.5, 73.0]);
  });

  // ── T-17: MultiPolygon is parsed correctly ──────────────────────────────────
  it('parses MultiPolygon correctly', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        polygon: {
          type: 'MultiPolygon' as const,
          coordinates: [
            [[[72.8, 19.0], [73.0, 19.5]]],
            [[[74.0, 20.0], [74.5, 20.5]]],
          ],
        },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).toHaveLength(2);
    expect(result.current.polygonPositions![0][0]).toEqual([19.0, 72.8]);
    expect(result.current.polygonPositions![1][0]).toEqual([20.0, 74.0]);
  });

  // ── T-18: Polygon with no coordinates returns null ──────────────────────────
  it('polygon with no coordinates returns null', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon' as const, coordinates: [] },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).not.toBeNull();
  });

  // ── T-19: Polygon with undefined returns null ───────────────────────────────
  it('undefined geofence_polygon returns null polygonPositions', () => {
    const details = makeEventDetails();
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, { geofence_polygon: undefined }));
    expect(result.current.polygonPositions).toBeNull();
  });

  // ── T-20: startTime without Z suffix is parsed ──────────────────────────────
  it('startTime without Z suffix is parsed', () => {
    const details = makeEventDetails({ startTime: '2024-06-15T08:30:00' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).toBe(Date.parse('2024-06-15T08:30:00Z'));
  });

  // ── T-21: startTime with timezone offset is parsed ──────────────────────────
  it('startTime with timezone offset is parsed', () => {
    const details = makeEventDetails({ startTime: '2024-06-15T08:30:00+05:30' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).toBe(Date.parse('2024-06-15T08:30:00+05:30'));
  });

  // ── T-22: endTime without Z suffix is parsed ────────────────────────────────
  it('endTime without Z suffix is parsed', () => {
    const details = makeEventDetails({ endTime: '2024-06-15T10:30:00' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionEndMs).toBe(Date.parse('2024-06-15T10:30:00Z'));
  });

  // ── T-23: Invalid startTime returns null ────────────────────────────────────
  it('invalid startTime returns null', () => {
    const details = makeEventDetails({ startTime: 'not-a-date' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).toBeNull();
  });

  // ── T-24: Invalid endTime returns null ──────────────────────────────────────
  it('invalid endTime returns null', () => {
    const details = makeEventDetails({ endTime: 'not-a-date' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionEndMs).toBeNull();
  });

  // ── T-25: Result is memoized for same inputs ────────────────────────────────
  it('result is memoized for same inputs', () => {
    const details = makeEventDetails();
    const extras = { geofence_polygon: makePolygon() };
    const { result, rerender } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-26: Result changes when eventDetails change ───────────────────────────
  it('result changes when eventDetails change', () => {
    const details1 = makeEventDetails({ information: { geofence_name: 'Zone A' } });
    const details2 = makeEventDetails({ information: { geofence_name: 'Zone B' } });
    const { result, rerender } = renderHook(
      ({ details }) => useGeofenceIntrusionEvent(details, {}),
      { initialProps: { details: details1 } },
    );
    expect(result.current.geofenceName).toBe('Zone A');
    rerender({ details: details2 });
    expect(result.current.geofenceName).toBe('Zone B');
  });

  // ── T-27: Result changes when extras change ─────────────────────────────────
  it('result changes when extras change', () => {
    const details = makeEventDetails();
    const extras1: Record<string, unknown> = { geofence_polygon: makePolygon() };
    const extras2: Record<string, unknown> = { geofence_polygon: undefined };
    const { result, rerender } = renderHook(
      ({ extras }: { extras: Record<string, unknown> }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { extras: extras1 } },
    );
    expect(result.current.polygonPositions).not.toBeNull();
    rerender({ extras: extras2 });
    expect(result.current.polygonPositions).toBeNull();
  });

  // ── T-28: Empty extras object ───────────────────────────────────────────────
  it('handles empty extras object', () => {
    const details = makeEventDetails();
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.polygonPositions).toBeNull();
    expect(result.current.geofenceName).toBe('Zone A');
  });

  // ── T-29: Empty information object ──────────────────────────────────────────
  it('handles empty information object', () => {
    const details = makeEventDetails({ information: {} });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceName).toBe('Restricted Area');
    expect(result.current.geofenceId).toBeNull();
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  // ── T-30: hasExitedPolygon explicitly false ─────────────────────────────────
  it('hasExitedPolygon explicitly false', () => {
    const details = makeEventDetails({ information: { Has_exited_polygon: false } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  // ── T-31: hasExitedPolygon explicitly true ──────────────────────────────────
  it('hasExitedPolygon explicitly true', () => {
    const details = makeEventDetails({ information: { Has_exited_polygon: true } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  // ── T-32: Single vessel ─────────────────────────────────────────────────────
  it('handles single vessel', () => {
    const details = makeEventDetails({ vessels: ['v1'] });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.vesselIds).toEqual(['v1']);
  });

  // ── T-33: Many vessels ──────────────────────────────────────────────────────
  it('handles many vessels', () => {
    const vessels = Array.from({ length: 50 }, (_, i) => `v${i}`);
    const details = makeEventDetails({ vessels });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.vesselIds).toHaveLength(50);
  });

  // ── T-34: Polygon with multiple rings (outer + holes) ───────────────────────
  it('polygon with multiple rings', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        polygon: {
          type: 'Polygon' as const,
          coordinates: [
            [[72.8, 19.0], [73.0, 19.0], [73.0, 19.5], [72.8, 19.0]],
            [[72.85, 19.05], [72.95, 19.05], [72.95, 19.1], [72.85, 19.05]],
          ],
        },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).toHaveLength(2);
  });

  // ── T-35: startTime as number is passed through ─────────────────────────────
  it('startTime as number is passed through', () => {
    const details = makeEventDetails({ startTime: '2024-06-15T08:30:00.123Z' });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).not.toBeNull();
  });

  // ── T-36: geofence_id from extras polygon ───────────────────────────────────
  it('uses geofence_id from information not extras', () => {
    const details = makeEventDetails({ information: { geofence_id: 'from-info' } });
    const extras = { geofence_polygon: { geofence_id: 'from-extras', polygon: { type: 'Polygon' as const, coordinates: [[[72, 19]]] } } };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.geofenceId).toBe('from-info');
  });

  // ── T-37: Return type has all expected properties ───────────────────────────
  it('return type has all expected properties', () => {
    const details = makeEventDetails();
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, { geofence_polygon: makePolygon() }));
    expect(result.current).toHaveProperty('geofenceName');
    expect(result.current).toHaveProperty('geofenceId');
    expect(result.current).toHaveProperty('hasExitedPolygon');
    expect(result.current).toHaveProperty('intrusionStartMs');
    expect(result.current).toHaveProperty('intrusionEndMs');
    expect(result.current).toHaveProperty('vesselIds');
    expect(result.current).toHaveProperty('polygonPositions');
  });

  // ── T-38: Both startTime and endTime null ───────────────────────────────────
  it('both startTime and endTime null returns null for both', () => {
    const details = makeEventDetails({ startTime: null, endTime: null });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).toBeNull();
    expect(result.current.intrusionEndMs).toBeNull();
  });

  // ── T-39: Polygon type is not Polygon or MultiPolygon ───────────────────────
  it('unknown polygon type returns null', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        polygon: { type: 'LineString' as unknown as 'Polygon', coordinates: [[[72, 19]]] },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  // ── T-40: geofence_name with empty string ───────────────────────────────────
  it('geofence_name with empty string defaults to Restricted Area', () => {
    const details = makeEventDetails({ information: { geofence_name: undefined } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceName).toBe('Restricted Area');
  });

  // ── T-41: Extras with non-geofence keys ─────────────────────────────────────
  it('extras with non-geofence keys do not interfere', () => {
    const details = makeEventDetails();
    const extras = { other_key: 'value', another: 123 };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.geofenceName).toBe('Zone A');
    expect(result.current.polygonPositions).toBeNull();
  });

  // ── T-42: startTime and endTime are the same ────────────────────────────────
  it('startTime and endTime are the same', () => {
    const ts = '2024-06-15T08:30:00Z';
    const details = makeEventDetails({ startTime: ts, endTime: ts });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.intrusionStartMs).toBe(result.current.intrusionEndMs);
  });

  // ── T-43: Polygon with single point ring ────────────────────────────────────
  it('polygon with single point ring', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon' as const, coordinates: [[[72.8, 19.0]]] },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).toHaveLength(1);
    expect(result.current.polygonPositions![0]).toEqual([[19.0, 72.8]]);
  });

  // ── T-44: MultiPolygon with single polygon ──────────────────────────────────
  it('MultiPolygon with single polygon', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        polygon: {
          type: 'MultiPolygon' as const,
          coordinates: [[[[72.8, 19.0], [73.0, 19.5]]]],
        },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).toHaveLength(1);
  });

  // ── T-45: geofence_id as number in information ──────────────────────────────
  it('geofence_id as number is handled', () => {
    const details = makeEventDetails({ information: { geofence_id: 12345 } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceId).toBe(12345);
  });

  // ── T-46: Null information fields ───────────────────────────────────────────
  it('null geofence_name defaults', () => {
    const details = makeEventDetails({ information: { geofence_name: null as unknown as string } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.geofenceName).toBe('Restricted Area');
  });

  // ── T-47: Has_exited_polygon as truthy non-boolean ──────────────────────────
  it('Has_exited_polygon as truthy non-boolean', () => {
    const details = makeEventDetails({ information: { Has_exited_polygon: 1 as unknown as boolean } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.hasExitedPolygon).toBe(1);
  });

  // ── T-48: Has_exited_polygon as falsy non-boolean ───────────────────────────
  it('Has_exited_polygon as falsy non-boolean', () => {
    const details = makeEventDetails({ information: { Has_exited_polygon: 0 as unknown as boolean } });
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, {}));
    expect(result.current.hasExitedPolygon).toBe(0);
  });

  // ── T-49: Large polygon with many coordinates ───────────────────────────────
  it('large polygon with many coordinates', () => {
    const details = makeEventDetails();
    const coords = Array.from({ length: 1000 }, (_, i) => [72 + i * 0.001, 19 + i * 0.001]);
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon' as const, coordinates: [coords] },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions![0]).toHaveLength(1000);
  });

  // ── T-50: Re-render with same object references is memoized ─────────────────
  it('re-render with same object references is memoized', () => {
    const details = makeEventDetails();
    const extras = { geofence_polygon: makePolygon() };
    const { result, rerender } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    const first = result.current;
    rerender();
    expect(result.current).toStrictEqual(first);
  });

  // ── T-51: Polygon with empty coordinates array ──────────────────────────────
  it('polygon with empty coordinates array returns empty array', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon' as const, coordinates: [] },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).toEqual([]);
  });

  // ── T-52: Multiple extras keys with geofence_polygon ────────────────────────
  it('multiple extras keys with geofence_polygon', () => {
    const details = makeEventDetails();
    const extras = {
      geofence_polygon: makePolygon(),
      other_data: { foo: 'bar' },
      count: 42,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, extras));
    expect(result.current.polygonPositions).not.toBeNull();
    expect(result.current.geofenceName).toBe('Zone A');
  });
});
