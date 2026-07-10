import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePlaybackData } from '../usePlaybackData';
import * as playbackApi from '../../api/playbackApi';
import type { PlaybackApiResponse } from '../../api/types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function makeRawResponse(overrides?: Partial<PlaybackApiResponse>): PlaybackApiResponse {
  return {
    event_details: {
      type: 'geofence_intrusion',
      location: { type: 'Point', coordinates: [72.8, 19.0] },
      timestamp: '2024-01-01T00:00:00Z',
      start_time: '2024-01-01T01:00:00Z',
      end_time: '2024-01-01T02:00:00Z',
      duration: { value: 3600, unit: 'seconds' },
      vessels_involved: [1, 2],
      severity: 'high',
      model: 'test-model',
      status: 'active',
      s2_cell_id: 'cell123',
      temporality: 'bounded',
      event_source: 'radar',
      constituent_types: undefined,
      information: { geofence_id: 'gf1', geofence_name: 'Zone A', Has_exited_polygon: false },
    },
    trajectories: {
      '1000': { '1': { latitude: 19.0, longitude: 72.8, speed_mps: 5, course: 90, heading: 90 } },
      '2000': { '1': { latitude: 19.1, longitude: 72.9, speed_mps: 6, course: 95, heading: 95 } },
    },
    time_window: {
      query_start: 1000,
      query_end: 3000,
      event_start: 1500,
      event_end: 2500,
      buffer_hours: 3,
    },
    ...overrides,
  };
}

describe('usePlaybackData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── T-01: Loading state initially ──────────────────────────────────────────
  it('returns loading state initially', () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  // ── T-02: Returns mapped data on success ───────────────────────────────────
  it('returns mapped data on success', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeDefined();
    expect(result.current.data!.timeline).toHaveLength(2);
  });

  // ── T-03: Returns error state on API failure ───────────────────────────────
  it('returns error state on API failure', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.error).toBe('500'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('500');
    expect(result.current.data).toBeUndefined();
  });

  // ── T-04: Data is mapped through mapper (not raw API types) ────────────────
  it('maps vessel positions from raw API types', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline[0].vessels['1'].lat).toBe(19.0);
    expect(result.current.data!.timeline[0].vessels['1'].lon).toBe(72.8);
    expect(result.current.data!.timeline[0].vessels['1'].speedMps).toBe(5);
  });

  // ── T-05: Maps event details from raw API types ────────────────────────────
  it('maps event details from raw API types', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const ed = result.current.data!.eventDetails;
    expect(ed.type).toBe('geofence_intrusion');
    expect(ed.startTime).toBe('2024-01-01T01:00:00Z');
    expect(ed.endTime).toBe('2024-01-01T02:00:00Z');
    expect(ed.vessels).toEqual(['1', '2']);
    expect(ed.severity).toBe('high');
  });

  // ── T-06: Maps location from GeoJSON [lon, lat] to {lat, lon} ──────────────
  it('maps location from GeoJSON coordinates to lat/lon', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.location).toEqual({ lat: 19.0, lon: 72.8 });
  });

  // ── T-07: Maps null location to null ───────────────────────────────────────
  it('maps null location to null', async () => {
    const raw = makeRawResponse();
    raw.event_details.location = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.location).toBeNull();
  });

  // ── T-08: Maps duration from raw API types ─────────────────────────────────
  it('maps duration from raw API types', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.duration).toEqual({ valueSeconds: 3600 });
  });

  // ── T-09: Maps null duration to null ───────────────────────────────────────
  it('maps null duration to null', async () => {
    const raw = makeRawResponse();
    raw.event_details.duration = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.duration).toBeNull();
  });

  // ── T-10: Maps vessels_involved to string array ────────────────────────────
  it('maps vessels_involved numbers to string array', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.vessels).toEqual(['1', '2']);
  });

  // ── T-11: Timeline is sorted by timestampMs ────────────────────────────────
  it('sorts timeline by timestampMs', async () => {
    const raw = makeRawResponse();
    raw.trajectories = {
      '3000': { '1': { latitude: 19.2, longitude: 73.0 } },
      '1000': { '1': { latitude: 19.0, longitude: 72.8 } },
      '2000': { '1': { latitude: 19.1, longitude: 72.9 } },
    };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const ts = result.current.data!.timeline.map(f => f.timestampMs);
    expect(ts).toEqual([1000, 2000, 3000]);
  });

  // ── T-12: Maps timeWindow from raw API types ───────────────────────────────
  it('maps timeWindow from raw API types', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.queryStartMs).toBe(1000);
    expect(result.current.data!.timeWindow.queryEndMs).toBe(3000);
    expect(result.current.data!.timeWindow.eventStartMs).toBe(1500);
    expect(result.current.data!.timeWindow.eventEndMs).toBe(2500);
  });

  // ── T-13: Does not fetch when eventId is null ───────────────────────────────
  it('does not fetch when eventId is null', () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: null, eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── T-14: Does not fetch when eventType is null ─────────────────────────────
  it('does not fetch when eventType is null', () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: null, isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── T-15: Does not fetch when both eventId and eventType are null ───────────
  it('does not fetch when both eventId and eventType are null', () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: null, eventType: null, isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── T-16: Fetches when eventId and eventType are provided ───────────────────
  it('fetches when eventId and eventType are provided', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  });

  // ── T-17: Passes isCompound to fetchPlaybackData ────────────────────────────
  it('passes isCompound to fetchPlaybackData', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: true }), { wrapper: createWrapper() });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('ev1', 'geofence_intrusion', true));
  });

  // ── T-18: Passes false isCompound to fetchPlaybackData ──────────────────────
  it('passes false isCompound to fetchPlaybackData', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('ev1', 'geofence_intrusion', false));
  });

  // ── T-19: Error message is extracted from Error ─────────────────────────────
  it('extracts error message from Error', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockRejectedValue(new Error('Network failed'));
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.error).toBe('Network failed'));
  });

  // ── T-20: Error is null on success ──────────────────────────────────────────
  it('error is null on success', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  // ── E-01: Empty eventId string does not fetch ───────────────────────────────
  it('does not fetch when eventId is empty string', () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: '', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── E-02: Empty eventType string does not fetch ─────────────────────────────
  it('does not fetch when eventType is empty string', () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: '', isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── E-03: Empty trajectories returns empty timeline ─────────────────────────
  it('handles empty trajectories object', async () => {
    const raw = makeRawResponse();
    raw.trajectories = {};
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline).toEqual([]);
  });

  // ── E-04: Large dataset with 10000 timeline frames ──────────────────────────
  it('handles large dataset with 10000 timeline frames', async () => {
    const trajectories: Record<string, Record<string, { latitude: number; longitude: number }>> = {};
    for (let i = 0; i < 10000; i++) {
      trajectories[String(i)] = { '1': { latitude: 19 + i * 0.001, longitude: 72 + i * 0.001 } };
    }
    const raw = makeRawResponse({ trajectories: trajectories as PlaybackApiResponse['trajectories'] });
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline).toHaveLength(10000);
  });

  // ── E-05: Duplicate timestamp keys are both included ────────────────────────
  it('handles duplicate timestamp keys in trajectories', async () => {
    const raw = makeRawResponse();
    raw.trajectories = {
      '1000': { '1': { latitude: 19.0, longitude: 72.8 }, '2': { latitude: 19.1, longitude: 72.9 } },
    };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline).toHaveLength(1);
    expect(Object.keys(result.current.data!.timeline[0].vessels)).toHaveLength(2);
  });

  // ── E-06: Missing optional fields in vessel position ────────────────────────
  it('handles missing optional fields in vessel position', async () => {
    const raw = makeRawResponse();
    raw.trajectories = { '1000': { '1': { latitude: 19.0, longitude: 72.8 } } };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const pos = result.current.data!.timeline[0].vessels['1'];
    expect(pos.lat).toBe(19.0);
    expect(pos.lon).toBe(72.8);
    expect(pos.speedMps).toBeUndefined();
    expect(pos.course).toBeUndefined();
    expect(pos.heading).toBeUndefined();
  });

  // ── E-07: queryEndMs fallback when query_end is null and event_start exists ─
  it('falls back to event_start + buffer when query_end is null', async () => {
    const raw = makeRawResponse();
    raw.time_window.query_end = null;
    raw.time_window.event_start = 1500;
    raw.time_window.buffer_hours = 3;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.queryEndMs).toBe(1500 + 3 * 3_600_000);
  });

  // ── E-08: queryEndMs fallback when query_end and event_start are null ───────
  it('falls back to last timeline timestamp when query_end and event_start are null', async () => {
    const raw = makeRawResponse();
    raw.time_window.query_end = null;
    raw.time_window.event_start = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.queryEndMs).toBe(2000);
  });

  // ── E-09: queryEndMs fallback when query_end, event_start null and no timeline ─
  it('falls back to query_start + buffer when no timeline and no event_start', async () => {
    const raw = makeRawResponse();
    raw.time_window.query_end = null;
    raw.time_window.event_start = null;
    raw.trajectories = {};
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.queryEndMs).toBe(1000 + 3 * 3_600_000);
  });

  // ── E-10: Default buffer_hours is 3 when not specified ──────────────────────
  it('uses default buffer_hours of 3 when not specified', async () => {
    const raw = makeRawResponse();
    raw.time_window.query_end = null;
    raw.time_window.event_start = 1500;
    raw.time_window.buffer_hours = undefined;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.queryEndMs).toBe(1500 + 3 * 3_600_000);
  });

  // ── E-11: eventStartMs falls back to query_start when event_start is null ───
  it('eventStartMs falls back to query_start when event_start is null', async () => {
    const raw = makeRawResponse();
    raw.time_window.event_start = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.eventStartMs).toBe(1000);
  });

  // ── E-12: eventEndMs is null when event_end is null ─────────────────────────
  it('eventEndMs is null when event_end is null', async () => {
    const raw = makeRawResponse();
    raw.time_window.event_end = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.eventEndMs).toBeNull();
  });

  // ── E-13: Extras are preserved from raw response ────────────────────────────
  it('preserves extra fields from raw response', async () => {
    const raw = makeRawResponse();
    (raw as Record<string, unknown>).geofence_polygon = { geofence_id: 'gf1', polygon: { type: 'Polygon', coordinates: [[[72, 19]]] } };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.extras.geofence_polygon).toBeDefined();
  });

  // ── E-14: constituentTypes are mapped from raw ──────────────────────────────
  it('maps constituentTypes from raw response', async () => {
    const raw = makeRawResponse();
    raw.event_details.constituent_types = ['type_a', 'type_b'];
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.constituentTypes).toEqual(['type_a', 'type_b']);
  });

  // ── E-15: constituentTypes undefined when not in raw ────────────────────────
  it('constituentTypes is undefined when not in raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.constituentTypes).toBeUndefined();
  });

  // ── E-16: Multiple vessels in a single frame ────────────────────────────────
  it('handles multiple vessels in a single timeline frame', async () => {
    const raw = makeRawResponse();
    raw.trajectories = {
      '1000': {
        '1': { latitude: 19.0, longitude: 72.8 },
        '2': { latitude: 19.5, longitude: 73.0 },
      },
    };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(Object.keys(result.current.data!.timeline[0].vessels)).toEqual(['1', '2']);
  });

  // ── E-17: Custom buffer_hours is respected ──────────────────────────────────
  it('respects custom buffer_hours', async () => {
    const raw = makeRawResponse();
    raw.time_window.query_end = null;
    raw.time_window.event_start = 1500;
    raw.time_window.buffer_hours = 1;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.queryEndMs).toBe(1500 + 1 * 3_600_000);
  });

  // ── E-18: s2_cell_id is mapped ──────────────────────────────────────────────
  it('maps s2_cell_id from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.s2CellId).toBe('cell123');
  });

  // ── E-19: temporality is mapped ─────────────────────────────────────────────
  it('maps temporality from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.temporality).toBe('bounded');
  });

  // ── E-20: eventSource is mapped ─────────────────────────────────────────────
  it('maps eventSource from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.eventSource).toBe('radar');
  });

  // ── E-21: null eventSource is mapped ────────────────────────────────────────
  it('maps null eventSource to null', async () => {
    const raw = makeRawResponse();
    raw.event_details.event_source = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.eventSource).toBeNull();
  });

  // ── E-22: null s2_cell_id is mapped ─────────────────────────────────────────
  it('maps null s2_cell_id to null', async () => {
    const raw = makeRawResponse();
    raw.event_details.s2_cell_id = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.s2CellId).toBeNull();
  });

  // ── E-23: null temporality is mapped ────────────────────────────────────────
  it('maps null temporality to null', async () => {
    const raw = makeRawResponse();
    raw.event_details.temporality = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.temporality).toBeNull();
  });

  // ── E-24: information is passed through ─────────────────────────────────────
  it('passes information through from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.information).toEqual({ geofence_id: 'gf1', geofence_name: 'Zone A', Has_exited_polygon: false });
  });

  // ── E-25: status is mapped ──────────────────────────────────────────────────
  it('maps status from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.status).toBe('active');
  });

  // ── E-26: model is mapped ───────────────────────────────────────────────────
  it('maps model from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.model).toBe('test-model');
  });

  // ── E-27: timestamp is mapped ───────────────────────────────────────────────
  it('maps timestamp from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.timestamp).toBe('2024-01-01T00:00:00Z');
  });

  // ── E-28: vessels_involved as strings are mapped ────────────────────────────
  it('maps vessels_involved as strings', async () => {
    const raw = makeRawResponse();
    raw.event_details.vessels_involved = ['v1', 'v2'];
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.vessels).toEqual(['v1', 'v2']);
  });

  // ── E-29: Single vessel in trajectory ───────────────────────────────────────
  it('handles single vessel in trajectory', async () => {
    const raw = makeRawResponse();
    raw.trajectories = { '1000': { 'v1': { latitude: 19.0, longitude: 72.8 } } };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline).toHaveLength(1);
    expect(result.current.data!.timeline[0].vessels['v1']).toBeDefined();
  });

  // ── E-30: Cache prevents duplicate fetch on re-render ───────────────────────
  it('cache prevents duplicate fetch on re-render', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { rerender } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    rerender();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // ── E-31: Different query keys for different eventIds ───────────────────────
  it('uses different cache keys for different eventIds', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { rerender } = renderHook(
      ({ eventId }) => usePlaybackData({ eventId, eventType: 'geofence_intrusion', isCompound: false }),
      { wrapper: createWrapper(), initialProps: { eventId: 'ev1' } },
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    rerender({ eventId: 'ev2' });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  // ── E-32: Different query keys for compound vs non-compound ─────────────────
  it('uses different cache keys for compound vs non-compound', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { rerender } = renderHook(
      ({ isCompound }) => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound }),
      { wrapper: createWrapper(), initialProps: { isCompound: false } },
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    rerender({ isCompound: true });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  // ── E-33: Error with empty message ──────────────────────────────────────────
  it('handles error with empty message', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockRejectedValue(new Error(''));
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.error).toBe(''));
    expect(result.current.error).toBe('');
  });

  // ── E-34: staleTime is Infinity (no refetch) ────────────────────────────────
  it('does not refetch on re-render due to staleTime Infinity', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { rerender } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    rerender();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // ── E-35: startTime null is mapped ──────────────────────────────────────────
  it('maps null startTime to null', async () => {
    const raw = makeRawResponse();
    raw.event_details.start_time = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.startTime).toBeNull();
  });

  // ── E-36: endTime null is mapped ────────────────────────────────────────────
  it('maps null endTime to null', async () => {
    const raw = makeRawResponse();
    raw.event_details.end_time = null;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.endTime).toBeNull();
  });

  // ── E-37: severity is mapped ────────────────────────────────────────────────
  it('maps severity from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.severity).toBe('high');
  });

  // ── E-38: type is mapped ────────────────────────────────────────────────────
  it('maps type from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.type).toBe('geofence_intrusion');
  });

  // ── E-39: Multiple frames with different vessels ────────────────────────────
  it('handles multiple frames with different vessels', async () => {
    const raw = makeRawResponse();
    raw.trajectories = {
      '1000': { '1': { latitude: 19.0, longitude: 72.8 } },
      '2000': { '2': { latitude: 19.5, longitude: 73.0 } },
      '3000': { '1': { latitude: 19.1, longitude: 72.9 }, '2': { latitude: 19.6, longitude: 73.1 } },
    };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline).toHaveLength(3);
    expect(Object.keys(result.current.data!.timeline[2].vessels)).toEqual(['1', '2']);
  });

  // ── E-40: Zero buffer_hours ─────────────────────────────────────────────────
  it('handles zero buffer_hours', async () => {
    const raw = makeRawResponse();
    raw.time_window.query_end = null;
    raw.time_window.event_start = 1500;
    raw.time_window.buffer_hours = 0;
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeWindow.queryEndMs).toBe(1500);
  });

  // ── E-41: Vessels with string IDs in trajectories ───────────────────────────
  it('handles string vessel IDs in trajectories', async () => {
    const raw = makeRawResponse();
    raw.trajectories = { '1000': { 'vessel-alpha': { latitude: 19.0, longitude: 72.8 } } };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline[0].vessels['vessel-alpha']).toBeDefined();
  });

  // ── E-42: Negative timestamp keys ───────────────────────────────────────────
  it('handles negative timestamp keys', async () => {
    const raw = makeRawResponse();
    raw.trajectories = {
      '-1000': { '1': { latitude: 19.0, longitude: 72.8 } },
      '1000': { '1': { latitude: 19.1, longitude: 72.9 } },
    };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.timeline[0].timestampMs).toBe(-1000);
    expect(result.current.data!.timeline[1].timestampMs).toBe(1000);
  });

  // ── E-43: Large number of vessels in single frame ───────────────────────────
  it('handles large number of vessels in single frame', async () => {
    const raw = makeRawResponse();
    const vessels: Record<string, { latitude: number; longitude: number }> = {};
    for (let i = 0; i < 100; i++) {
      vessels[`v${i}`] = { latitude: 19 + i * 0.01, longitude: 72 + i * 0.01 };
    }
    raw.trajectories = { '1000': vessels };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(Object.keys(result.current.data!.timeline[0].vessels)).toHaveLength(100);
  });

  // ── E-44: Data is undefined when disabled ───────────────────────────────────
  it('data is undefined when query is disabled', () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: null, eventType: null, isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
  });

  // ── E-45: Error is null when disabled ───────────────────────────────────────
  it('error is null when query is disabled', () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: null, eventType: null, isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.error).toBeNull();
  });

  // ── E-46: isLoading is false when disabled ──────────────────────────────────
  it('isLoading is false when query is disabled', () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: null, eventType: null, isCompound: false }), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
  });

  // ── E-47: Transition from disabled to enabled triggers fetch ────────────────
  it('transition from disabled to enabled triggers fetch', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { rerender } = renderHook(
      ({ eventId }) => usePlaybackData({ eventId, eventType: 'geofence_intrusion', isCompound: false }),
      { wrapper: createWrapper(), initialProps: { eventId: null as string | null } },
    );
    expect(spy).not.toHaveBeenCalled();
    rerender({ eventId: 'ev1' });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  });

  // ── E-48: Transition from enabled to disabled stops fetching ────────────────
  it('transition from enabled to disabled does not refetch', async () => {
    const spy = vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { rerender } = renderHook(
      ({ eventId }) => usePlaybackData({ eventId, eventType: 'geofence_intrusion', isCompound: false }),
      { wrapper: createWrapper(), initialProps: { eventId: 'ev1' as string | null } },
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    rerender({ eventId: null });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // ── E-49: Speed and course are mapped ───────────────────────────────────────
  it('maps speed_mps, course, and heading from raw', async () => {
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const pos = result.current.data!.timeline[0].vessels['1'];
    expect(pos.speedMps).toBe(5);
    expect(pos.course).toBe(90);
    expect(pos.heading).toBe(90);
  });

  // ── E-50: Duration unit is always seconds ───────────────────────────────────
  it('maps duration value to valueSeconds', async () => {
    const raw = makeRawResponse();
    raw.event_details.duration = { value: 7200, unit: 'seconds' };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.duration).toEqual({ valueSeconds: 7200 });
  });

  // ── E-51: Coordinates swapped correctly from GeoJSON ────────────────────────
  it('swaps GeoJSON [lon, lat] to {lat, lon} correctly', async () => {
    const raw = makeRawResponse();
    raw.event_details.location = { type: 'Point', coordinates: [73.123, 19.456] };
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.location).toEqual({ lat: 19.456, lon: 73.123 });
  });

  // ── E-52: Unbounded temporality is mapped ───────────────────────────────────
  it('maps unbounded temporality', async () => {
    const raw = makeRawResponse();
    raw.event_details.temporality = 'unbounded';
    vi.spyOn(playbackApi, 'fetchPlaybackData').mockResolvedValue(raw);
    const { result } = renderHook(() => usePlaybackData({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.eventDetails.temporality).toBe('unbounded');
  });
});
