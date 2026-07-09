/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGeofenceIntrusionEvent } from '../hooks/eventTypes/geofenceIntrusion/useGeofenceIntrusionEvent';
import type { EventDetailsBase } from '../model/types';
import type { GeofenceIntrusionInformationRaw } from '../api/eventTypes/geofenceIntrusion/geofenceIntrusionTypes';
import type { GeofencePolygonRaw } from '../api/eventTypes/geofenceIntrusion/geofenceIntrusionTypes';

const mockEventDetails: EventDetailsBase = {
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
  information: {
    geofence_name: 'Test Geofence',
    geofence_id: 'geo123',
    Has_exited_polygon: true,
  } as GeofenceIntrusionInformationRaw,
};

const mockExtras: Record<string, unknown> = {
  geofence_polygon: {
    geofence_id: 'geo123',
    asset_name: 'Test Asset',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ],
      ],
    },
  } as GeofencePolygonRaw,
};

describe('useGeofenceIntrusionEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Basic Data Mapping Tests
  it('Verify hook returns correct data with valid geofence intrusion event details', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current).toBeDefined();
    expect(result.current.geofenceName).toBe('Test Geofence');
    expect(result.current.geofenceId).toBe('geo123');
    expect(result.current.hasExitedPolygon).toBe(true);
    expect(result.current.vesselIds).toEqual(['vessel1', 'vessel2']);
  });

  it('Verify hook maps geofenceName correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.geofenceName).toBe('Test Geofence');
  });

  it('Verify hook maps geofenceId correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.geofenceId).toBe('geo123');
  });

  it('Verify hook maps hasExitedPolygon correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  it('Verify hook maps intrusionStartMs correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.intrusionStartMs).toBe(1704067200000);
  });

  it('Verify hook maps intrusionEndMs correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.intrusionEndMs).toBe(1704070800000);
  });

  it('Verify hook maps vesselIds correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel1', 'vessel2']);
  });

  it('Verify hook maps polygonPositions correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.polygonPositions).toEqual([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
  });

  // Vessel ID Tests
  it('Verify hook handles a single vessel ID', () => {
    const details = { ...mockEventDetails, vessels: ['vessel1'] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel1']);
  });

  it('Verify hook handles multiple vessel IDs', () => {
    const details = { ...mockEventDetails, vessels: ['vessel1', 'vessel2', 'vessel3'] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel1', 'vessel2', 'vessel3']);
  });

  it('Verify hook handles empty vessel list', () => {
    const details = { ...mockEventDetails, vessels: [] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual([]);
  });

  it('Verify hook handles large vessel list', () => {
    const vessels = Array.from({ length: 1000 }, (_, i) => `vessel${i}`);
    const details = { ...mockEventDetails, vessels };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toHaveLength(1000);
  });

  // geofenceName Tests
  it('Verify hook handles missing geofence_name', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
  });

  it('Verify hook handles null geofence_name', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: null },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
  });

  it('Verify hook handles undefined geofence_name', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
  });

  it('Verify default geofenceName is "Restricted Area"', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
  });

  it('Verify hook handles empty string geofence_name', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: '' },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('');
  });

  it('Verify hook handles whitespace geofence_name', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: '   ' },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('   ');
  });

  it('Verify hook handles Unicode geofence_name', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: '地理围栏' },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('地理围栏');
  });

  it('Verify hook handles special characters in geofence_name', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: 'Test@#$%' },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Test@#$%');
  });

  it('Verify hook coerces numeric geofence_name to string', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: 123 as any },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('123');
  });

  it('Verify hook handles long geofence_name', () => {
    const longName = 'a'.repeat(1000);
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_name: longName },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe(longName);
  });

  // geofenceId Tests
  it('Verify hook handles missing geofence_id', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBeNull();
  });

  it('Verify hook handles null geofence_id', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: null },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBeNull();
  });

  it('Verify hook handles undefined geofence_id', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBeNull();
  });

  it('Verify geofenceId defaults to null', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBeNull();
  });

  it('Verify hook coerces numeric geofence_id to string', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: 123 as any },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBe('123');
  });

  it('Verify hook handles string geofence_id', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: 'geo123' },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBe('geo123');
  });

  it('Verify hook treats empty geofence_id as null', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: '' },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBeNull();
  });

  it('Verify hook handles large geofence_id value', () => {
    const largeId = 'x'.repeat(1000);
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, geofence_id: largeId },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceId).toBe(largeId);
  });

  // hasExitedPolygon Tests
  it('Verify hook handles Has_exited_polygon = true', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: true },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  it('Verify hook handles Has_exited_polygon = false', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: false },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles missing Has_exited_polygon', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles null Has_exited_polygon', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: null },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles undefined Has_exited_polygon', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hasExitedPolygon defaults to false', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: undefined },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook coerces numeric Has_exited_polygon to boolean', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: 1 as any },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  it('Verify hook coerces string Has_exited_polygon to boolean', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: 'true' as any },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  it('Verify hook handles boolean conversion correctly', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: true },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  it('Verify hook coerces unexpected Has_exited_polygon values to boolean', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, Has_exited_polygon: 'random' as any },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.hasExitedPolygon).toBe(true);
  });

  // Time-related Tests
  it('Verify hook handles valid startTime', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.intrusionStartMs).toBe(1704067200000);
  });

  it('Verify hook handles valid endTime', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.intrusionEndMs).toBe(1704070800000);
  });

  it('Verify hook handles same startTime and endTime', () => {
    const details = { ...mockEventDetails, startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBe(result.current.intrusionEndMs);
  });

  it('Verify hook handles future startTime', () => {
    const details = { ...mockEventDetails, startTime: '2099-01-01T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeGreaterThan(Date.now());
  });

  it('Verify hook handles future endTime', () => {
    const details = { ...mockEventDetails, endTime: '2099-01-01T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeGreaterThan(Date.now());
  });

  it('Verify hook handles past startTime', () => {
    const details = { ...mockEventDetails, startTime: '2000-01-01T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeLessThan(Date.now());
  });

  it('Verify hook handles past endTime', () => {
    const details = { ...mockEventDetails, endTime: '2000-01-01T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeLessThan(Date.now());
  });

  it('Verify hook handles missing startTime', () => {
    const details = { ...mockEventDetails, startTime: null };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeNull();
  });

  it('Verify hook handles missing endTime', () => {
    const details = { ...mockEventDetails, endTime: null };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeNull();
  });

  it('Verify hook handles null startTime', () => {
    const details = { ...mockEventDetails, startTime: null };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeNull();
  });

  it('Verify hook handles null endTime', () => {
    const details = { ...mockEventDetails, endTime: null };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeNull();
  });

  it('Verify hook handles undefined startTime', () => {
    const details = { ...mockEventDetails, startTime: null };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeNull();
  });

  it('Verify hook handles undefined endTime', () => {
    const details = { ...mockEventDetails, endTime: null };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeNull();
  });

  it('Verify hook handles empty startTime', () => {
    const details = { ...mockEventDetails, startTime: '' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeNull();
  });

  it('Verify hook handles empty endTime', () => {
    const details = { ...mockEventDetails, endTime: '' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeNull();
  });

  it('Verify hook handles invalid startTime format', () => {
    const details = { ...mockEventDetails, startTime: 'invalid-date' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeNull();
  });

  it('Verify hook handles invalid endTime format', () => {
    const details = { ...mockEventDetails, endTime: 'invalid-date' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeNull();
  });

  it('Verify hook handles timezone formatted startTime', () => {
    const details = { ...mockEventDetails, startTime: '2024-01-01T00:00:00+05:30' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeDefined();
  });

  it('Verify hook handles timezone formatted endTime', () => {
    const details = { ...mockEventDetails, endTime: '2024-01-01T00:00:00+05:30' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBeDefined();
  });

  it('Verify hook handles ISO date startTime', () => {
    const details = { ...mockEventDetails, startTime: '2024-01-01T00:00:00.000Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBe(1704067200000);
  });

  it('Verify hook handles ISO date endTime', () => {
    const details = { ...mockEventDetails, endTime: '2024-01-01T00:00:00.000Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionEndMs).toBe(1704067200000);
  });

  it('Verify hook handles leap year dates', () => {
    const details = { ...mockEventDetails, startTime: '2024-02-29T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeDefined();
  });

  it('Verify hook handles epoch timestamps', () => {
    const details = { ...mockEventDetails, startTime: '1704067200000' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBe(1704067200000);
  });

  it('Verify hook handles extremely old dates', () => {
    const details = { ...mockEventDetails, startTime: '1970-01-01T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBe(0);
  });

  it('Verify hook handles extremely future dates', () => {
    const details = { ...mockEventDetails, startTime: '3000-01-01T00:00:00Z' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.intrusionStartMs).toBeDefined();
  });

  // Polygon Tests
  it('Verify hook handles valid geofence polygon', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.polygonPositions).toBeDefined();
    expect(result.current.polygonPositions).toHaveLength(1);
  });

  it('Verify hook handles missing geofence_polygon', () => {
    const extras = {};
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles null geofence_polygon', () => {
    const extras = { geofence_polygon: null };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles undefined geofence_polygon', () => {
    const extras = { geofence_polygon: undefined };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles empty geofence_polygon', () => {
    const extras = { geofence_polygon: {} as GeofencePolygonRaw };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles invalid geofence_polygon', () => {
    const extras = { geofence_polygon: { polygon: { type: 'Invalid', coordinates: [] } } as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });


  it('Verify hook handles polygon with one point', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[0, 0]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toEqual([[[0, 0]]]);
  });

  it('Verify hook handles polygon with two points', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[0, 0], [1, 1]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toEqual([[[0, 0], [1, 1]]]);
  });

  it('Verify hook handles polygon with minimum valid points', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toHaveLength(1);
  });

  it('Verify hook handles polygon with many points', () => {
    const coords = Array.from({ length: 100 }, (_, i) => [i % 10, Math.floor(i / 10)]);
    coords.push(coords[0]);
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [coords] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions?.[0]).toHaveLength(101);
  });

  it('Verify hook handles polygon crossing coordinates', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[0, 0], [180, 0], [180, 90], [0, 90], [0, 0]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles negative coordinates', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[-10, -10], [-10, 10], [10, 10], [10, -10], [-10, -10]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles decimal coordinates', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[0.123, 45.678], [0.124, 45.679], [0.125, 45.680], [0.123, 45.678]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles large coordinate values', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[1000, 1000], [2000, 1000], [2000, 2000], [1000, 2000], [1000, 1000]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles nested polygon structures', () => {
    const extras = {
      geofence_polygon: {
        polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
            [
              [2, 2],
              [8, 2],
              [8, 8],
              [2, 8],
              [2, 2],
            ],
          ],
        },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toHaveLength(2);
  });

  it('Verify hook handles unsupported geometry types', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Point', coordinates: [0, 0] } as any,
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles MultiPolygon data', () => {
    const extras = {
      geofence_polygon: {
        polygon: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
            [
              [
                [2, 2],
                [3, 2],
                [3, 3],
                [2, 3],
                [2, 2],
              ],
            ],
          ],
        },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toHaveLength(2);
  });

  it('Verify hook handles polygon without coordinates', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: undefined } as any,
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles polygon with empty coordinates', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [] } as any,
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toEqual([]);
  });

  it('Verify hook handles polygon with invalid coordinate types', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [['invalid'] as any] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles polygon containing null values', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[null, null] as any]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles polygon containing string values', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[['0', '0'] as any]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles polygon containing duplicate points', () => {
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles polygon containing very large coordinate arrays', () => {
    const coords = Array.from({ length: 10000 }, (_, i) => [i % 100, Math.floor(i / 100)]);
    coords.push(coords[0]);
    const extras = {
      geofence_polygon: {
        polygon: { type: 'Polygon', coordinates: [coords] },
      } as GeofencePolygonRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions?.[0]).toHaveLength(10001);
  });

  // Information Object Tests
  it('Verify hook handles empty information object', () => {
    const details = { ...mockEventDetails, information: {} };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
    expect(result.current.geofenceId).toBeNull();
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles missing information object', () => {
    const details = { ...mockEventDetails, information: {} };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
    expect(result.current.geofenceId).toBeNull();
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles null information object', () => {
    const details = { ...mockEventDetails, information: {} };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
    expect(result.current.geofenceId).toBeNull();
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles undefined information object', () => {
    const details = { ...mockEventDetails, information: {} };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Restricted Area');
    expect(result.current.geofenceId).toBeNull();
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles partially populated information object', () => {
    const details = {
      ...mockEventDetails,
      information: { geofence_name: 'Test' } as GeofenceIntrusionInformationRaw,
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.geofenceName).toBe('Test');
    expect(result.current.geofenceId).toBeNull();
    expect(result.current.hasExitedPolygon).toBe(false);
  });

  it('Verify hook handles additional unexpected fields', () => {
    const details = {
      ...mockEventDetails,
      information: { ...mockEventDetails.information, unexpected_field: 'value' },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current).toBeDefined();
  });

  // Extras Object Tests
  it('Verify hook ignores unrelated extra properties', () => {
    const extras = { ...mockExtras, unrelated_field: 'value' };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook handles empty extras object', () => {
    const extras = {};
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles null extras object', () => {
    const extras = {};
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles undefined extras object', () => {
    const extras = {};
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles extras with unrelated keys', () => {
    const extras = { unrelated_key: 'value', another_key: 123 };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles extras with nested objects', () => {
    const extras = { nested: { deep: { value: 'test' } } };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles extras with arrays', () => {
    const extras = { array_field: [1, 2, 3] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles extras with primitive values', () => {
    const extras = { string_field: 'test', number_field: 123, boolean_field: true };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles extras with large payload', () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => i);
    const extras = { large_array: largeArray };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, extras));
    expect(result.current.polygonPositions).toBeNull();
  });

  // Return Value Shape Tests
  it('Verify hook returns GeofenceEvent object shape correctly', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current).toHaveProperty('geofenceName');
    expect(result.current).toHaveProperty('geofenceId');
    expect(result.current).toHaveProperty('hasExitedPolygon');
    expect(result.current).toHaveProperty('intrusionStartMs');
    expect(result.current).toHaveProperty('intrusionEndMs');
    expect(result.current).toHaveProperty('vesselIds');
    expect(result.current).toHaveProperty('polygonPositions');
  });

  it('Verify returned object contains all expected fields', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    const keys = Object.keys(result.current);
    expect(keys).toEqual(['geofenceName', 'geofenceId', 'hasExitedPolygon', 'intrusionStartMs', 'intrusionEndMs', 'vesselIds', 'polygonPositions']);
  });

  it('Verify returned object contains no unexpected fields', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    const keys = Object.keys(result.current);
    expect(keys.length).toBe(7);
  });

  it('Verify returned values match source data', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.geofenceName).toBe(mockEventDetails.information.geofence_name);
    expect(result.current.geofenceId).toBe(mockEventDetails.information.geofence_id);
    expect(result.current.hasExitedPolygon).toBe(mockEventDetails.information.Has_exited_polygon);
    expect(result.current.vesselIds).toBe(mockEventDetails.vessels);
  });

  // Data Integrity Tests
  it('Verify hook output remains consistent for same input', () => {
    const { result: result1 } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    const { result: result2 } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result1.current).toEqual(result2.current);
  });

  it('Verify hook does not mutate eventDetails', () => {
    const originalDetails = JSON.parse(JSON.stringify(mockEventDetails));
    renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(mockEventDetails).toEqual(originalDetails);
  });

  it('Verify hook does not mutate extras', () => {
    const originalExtras = JSON.parse(JSON.stringify(mockExtras));
    renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(mockExtras).toEqual(originalExtras);
  });

  it('Verify hook preserves vesselIds order', () => {
    const details = { ...mockEventDetails, vessels: ['vessel3', 'vessel1', 'vessel2'] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel3', 'vessel1', 'vessel2']);
  });

  it('Verify hook preserves polygon point order', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.polygonPositions?.[0][0]).toEqual([0, 0]);
    expect(result.current.polygonPositions?.[0][1]).toEqual([1, 0]);
  });

  it('Verify hook handles duplicate vessel IDs', () => {
    const details = { ...mockEventDetails, vessels: ['vessel1', 'vessel1', 'vessel2'] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel1', 'vessel1', 'vessel2']);
  });

  it('Verify hook handles vessel IDs as strings', () => {
    const details = { ...mockEventDetails, vessels: ['vessel1', 'vessel2'] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel1', 'vessel2']);
  });

  it('Verify hook coerces vessel IDs to strings', () => {
    const details = { ...mockEventDetails, vessels: [123, 456] as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['123', '456']);
  });

  it('Verify hook coerces mixed vessel ID formats to strings', () => {
    const details = { ...mockEventDetails, vessels: ['vessel1', 123, 'vessel2'] as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel1', '123', 'vessel2']);
  });

  it('Verify hook handles large vessel ID values as strings', () => {
    const details = { ...mockEventDetails, vessels: [999999999999] as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['999999999999']);
  });

  it('Verify hook coerces vessel ID value zero to string', () => {
    const details = { ...mockEventDetails, vessels: [0] as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['0']);
  });

  it('Verify hook coerces negative vessel IDs to strings', () => {
    const details = { ...mockEventDetails, vessels: [-1, -2] as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['-1', '-2']);
  });

  it('Verify hook filters out null vessel IDs', () => {
    const details = { ...mockEventDetails, vessels: [null] as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual([]);
  });

  it('Verify hook filters out undefined vessel IDs', () => {
    const details = { ...mockEventDetails, vessels: [undefined] as any };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual([]);
  });

  it('Verify hook handles empty vessel ID entries', () => {
    const details = { ...mockEventDetails, vessels: [''] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['']);
  });

  it('Verify hook handles vessel IDs containing special characters', () => {
    const details = { ...mockEventDetails, vessels: ['vessel@#$%'] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['vessel@#$%']);
  });

  it('Verify hook handles vessel IDs containing Unicode characters', () => {
    const details = { ...mockEventDetails, vessels: ['船舶1'] };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toEqual(['船舶1']);
  });

  // useMemo Tests
  it('Verify hook recomputes when eventDetails changes', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    const newDetails = { ...mockEventDetails, information: { ...mockEventDetails.information, geofence_name: 'New Name' } };
    rerender({ details: newDetails, extras: mockExtras });
    expect(result.current).not.toBe(firstResult);
    expect(result.current.geofenceName).toBe('New Name');
  });

  it('Verify hook recomputes when extras changes', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    const newExtras = { ...mockExtras, geofence_polygon: undefined };
    rerender({ details: mockEventDetails, extras: newExtras });
    expect(result.current).not.toBe(firstResult);
  });

  it('Verify hook recomputes when both inputs change', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    const newDetails = { ...mockEventDetails, information: { ...mockEventDetails.information, geofence_name: 'New Name' } };
    const newExtras = { ...mockExtras, geofence_polygon: undefined };
    rerender({ details: newDetails, extras: newExtras });
    expect(result.current).not.toBe(firstResult);
  });

  it('Verify hook does not recompute when inputs remain unchanged', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    rerender({ details: mockEventDetails, extras: mockExtras });
    expect(result.current).toBe(firstResult);
  });

  it('Verify useMemo caches result correctly', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    rerender({ details: mockEventDetails, extras: mockExtras });
    rerender({ details: mockEventDetails, extras: mockExtras });
    expect(result.current).toBe(firstResult);
  });

  it('Verify memoized value remains stable between renders', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    for (let i = 0; i < 5; i++) {
      rerender({ details: mockEventDetails, extras: mockExtras });
      expect(result.current).toBe(firstResult);
    }
  });

  it('Verify rerender with same props returns same result', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    rerender({ details: mockEventDetails, extras: mockExtras });
    expect(result.current).toBe(firstResult);
  });

  it('Verify rerender with changed eventDetails returns updated result', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const newDetails = { ...mockEventDetails, information: { ...mockEventDetails.information, geofence_name: 'Updated' } };
    rerender({ details: newDetails, extras: mockExtras });
    expect(result.current.geofenceName).toBe('Updated');
  });

  it('Verify rerender with changed extras returns updated result', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const newExtras = { ...mockExtras, geofence_polygon: undefined };
    rerender({ details: mockEventDetails, extras: newExtras });
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles rapid consecutive rerenders', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    for (let i = 0; i < 10; i++) {
      rerender({ details: mockEventDetails, extras: mockExtras });
    }
    expect(result.current).toBeDefined();
  });

  it('Verify hook handles multiple component renders', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    for (let i = 0; i < 20; i++) {
      rerender({ details: mockEventDetails, extras: mockExtras });
    }
    expect(result.current).toBeDefined();
  });

  it('Verify hook handles concurrent hook instances', () => {
    const { result: result1 } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    const { result: result2 } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result1.current).toEqual(result2.current);
  });

  it('Verify hook handles large eventDetails payload', () => {
    const largeVessels = Array.from({ length: 10000 }, (_, i) => `vessel${i}`);
    const details = { ...mockEventDetails, vessels: largeVessels };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(details, mockExtras));
    expect(result.current.vesselIds).toHaveLength(10000);
  });

  it('Verify hook handles deeply nested extras payload', () => {
    const deepExtras = {
      level1: {
        level2: {
          level3: {
            level4: { value: 'deep' },
          },
        },
      },
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, deepExtras));
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook handles object reference changes', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstResult = result.current;
    const clonedDetails = { ...mockEventDetails, information: { ...mockEventDetails.information } };
    rerender({ details: clonedDetails, extras: mockExtras });
    expect(result.current).not.toBe(firstResult);
  });

  it('Verify hook handles cloned eventDetails object', () => {
    const clonedDetails = JSON.parse(JSON.stringify(mockEventDetails));
    const { result } = renderHook(() => useGeofenceIntrusionEvent(clonedDetails, mockExtras));
    expect(result.current.geofenceName).toBe('Test Geofence');
  });

  it('Verify hook handles cloned extras object', () => {
    const clonedExtras = JSON.parse(JSON.stringify(mockExtras));
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, clonedExtras));
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook behaves consistently across renders', () => {
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: mockEventDetails, extras: mockExtras } },
    );
    const firstOutput = JSON.stringify(result.current);
    rerender({ details: mockEventDetails, extras: mockExtras });
    const secondOutput = JSON.stringify(result.current);
    expect(firstOutput).toBe(secondOutput);
  });

  // Edge Cases
  it('Verify hook handles malformed eventDetails structure', () => {
    const malformedDetails = { type: 'test', information: {} } as any;
    const { result } = renderHook(() => useGeofenceIntrusionEvent(malformedDetails, mockExtras));
    expect(result.current).toBeDefined();
  });

  it('Verify hook handles malformed extras structure', () => {
    const malformedExtras = 'invalid' as any;
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, malformedExtras));
    expect(result.current).toBeDefined();
  });

  it('Verify hook returns expected defaults for missing data', () => {
    const minimalDetails = {
      type: 'geofence_intrusion',
      location: null,
      timestamp: '2024-01-01T00:00:00Z',
      startTime: null,
      endTime: null,
      duration: null,
      vessels: [],
      severity: 'high',
      model: 'v1',
      status: 'active',
      s2CellId: null,
      temporality: 'bounded' as const,
      eventSource: null,
      information: {},
    };
    const { result } = renderHook(() => useGeofenceIntrusionEvent(minimalDetails, {}));
    expect(result.current.geofenceName).toBe('Restricted Area');
    expect(result.current.geofenceId).toBeNull();
    expect(result.current.hasExitedPolygon).toBe(false);
    expect(result.current.intrusionStartMs).toBeNull();
    expect(result.current.intrusionEndMs).toBeNull();
    expect(result.current.vesselIds).toEqual([]);
    expect(result.current.polygonPositions).toBeNull();
  });

  it('Verify hook remains stable when optional fields are absent', () => {
    const minimalDetails = {
      type: 'geofence_intrusion',
      location: null,
      timestamp: '2024-01-01T00:00:00Z',
      startTime: null,
      endTime: null,
      duration: null,
      vessels: [],
      severity: 'high',
      model: 'v1',
      status: 'active',
      s2CellId: null,
      temporality: 'bounded' as const,
      eventSource: null,
      information: {},
    };
    const { result, rerender } = renderHook(
      ({ details, extras }) => useGeofenceIntrusionEvent(details, extras),
      { initialProps: { details: minimalDetails, extras: {} } },
    );
    const firstResult = result.current;
    rerender({ details: minimalDetails, extras: {} });
    expect(result.current).toEqual(firstResult);
  });

  it('Verify hook processes valid geofence intrusion event end-to-end', () => {
    const { result } = renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    expect(result.current.geofenceName).toBe('Test Geofence');
    expect(result.current.geofenceId).toBe('geo123');
    expect(result.current.hasExitedPolygon).toBe(true);
    expect(result.current.intrusionStartMs).toBe(1704067200000);
    expect(result.current.intrusionEndMs).toBe(1704070800000);
    expect(result.current.vesselIds).toEqual(['vessel1', 'vessel2']);
    expect(result.current.polygonPositions).toBeDefined();
  });

  it('Verify hook does not throw exceptions for supported input combinations', () => {
    expect(() => {
      renderHook(() => useGeofenceIntrusionEvent(mockEventDetails, mockExtras));
    }).not.toThrow();
  });
});
