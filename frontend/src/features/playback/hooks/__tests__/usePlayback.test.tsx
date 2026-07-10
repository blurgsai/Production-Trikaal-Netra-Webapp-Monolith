import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayback } from '../usePlayback';
import { PLAYBACK_STEP_MS, TICK_INTERVAL_MS } from '../../model/playbackUtils';
import type { PlaybackData, TimelineFrame, TimeWindow, EventDetailsBase } from '../../model/types';

vi.mock('../usePlaybackData', () => ({
  usePlaybackData: vi.fn(),
}));

import { usePlaybackData } from '../usePlaybackData';

function makeTimeWindow(overrides?: Partial<TimeWindow>): TimeWindow {
  return {
    queryStartMs: 1000,
    queryEndMs: 500000,
    eventStartMs: 31000,
    eventEndMs: 400000,
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
    vessels: ['1'],
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

function makeTimeline(): TimelineFrame[] {
  return [
    { timestampMs: 1000, vessels: { '1': { lat: 19.0, lon: 72.8 } } },
    { timestampMs: 31000, vessels: { '1': { lat: 19.1, lon: 72.9 } } },
    { timestampMs: 61000, vessels: { '1': { lat: 19.2, lon: 73.0 } } },
    { timestampMs: 91000, vessels: { '1': { lat: 19.3, lon: 73.1 } } },
    { timestampMs: 121000, vessels: { '1': { lat: 19.4, lon: 73.2 } } },
  ];
}

function makePlaybackData(overrides?: Partial<PlaybackData>): PlaybackData {
  return {
    eventDetails: makeEventDetails(),
    extras: {},
    timeline: makeTimeline(),
    timeWindow: makeTimeWindow(),
    ...overrides,
  };
}

function mockPlaybackData(overrides?: Partial<PlaybackData>) {
  vi.mocked(usePlaybackData).mockReturnValue({
    data: makePlaybackData(overrides),
    isLoading: false,
    error: null,
  });
}

function mockPlaybackDataLoading() {
  vi.mocked(usePlaybackData).mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  });
}

function mockPlaybackDataError(msg: string) {
  vi.mocked(usePlaybackData).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: msg,
  });
}

describe('usePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── T-01: Returns loading state initially ──────────────────────────────────
  it('returns loading state when data is loading', () => {
    mockPlaybackDataLoading();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  // ── T-02: Returns error state ───────────────────────────────────────────────
  it('returns error state when data has error', () => {
    mockPlaybackDataError('Network failed');
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.error).toBe('Network failed');
    expect(result.current.data).toBeNull();
  });

  // ── T-03: Returns data when loaded ──────────────────────────────────────────
  it('returns data when loaded', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.data).toBeDefined();
    expect(result.current.data!.timeline).toHaveLength(5);
  });

  // ── T-04: Initial currentTimestampMs is set to queryStartMs ─────────────────
  it('sets currentTimestampMs to queryStartMs on load', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.currentTimestampMs).toBe(1000);
  });

  // ── T-05: Initial isPlaying is false ────────────────────────────────────────
  it('isPlaying is false initially', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.isPlaying).toBe(false);
  });

  // ── T-06: Initial speed is 1 ────────────────────────────────────────────────
  it('speed is 1 initially', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.speed).toBe(1);
  });

  // ── T-07: play() sets isPlaying to true ─────────────────────────────────────
  it('play() sets isPlaying to true', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);
  });

  // ── T-08: pause() sets isPlaying to false ───────────────────────────────────
  it('pause() sets isPlaying to false', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => result.current.pause());
    expect(result.current.isPlaying).toBe(false);
  });

  // ── T-09: seek() sets currentTimestampMs ────────────────────────────────────
  it('seek() sets currentTimestampMs', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(3000));
    expect(result.current.currentTimestampMs).toBe(3000);
  });

  // ── T-10: seek() pauses playback ────────────────────────────────────────────
  it('seek() pauses playback', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => result.current.seek(3000));
    expect(result.current.isPlaying).toBe(false);
  });

  // ── T-11: setSpeed() changes speed ──────────────────────────────────────────
  it('setSpeed() changes speed', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.setSpeed(2));
    expect(result.current.speed).toBe(2);
  });

  // ── T-12: Timer advances currentTimestampMs by PLAYBACK_STEP_MS * speed ─────
  it('timer advances currentTimestampMs by PLAYBACK_STEP_MS * speed', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS);
  });

  // ── T-13: Timer advances with speed 2 ───────────────────────────────────────
  it('timer advances with speed 2', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.setSpeed(2));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS * 2);
  });

  // ── T-14: Timer advances with speed 0.5 ─────────────────────────────────────
  it('timer advances with speed 0.5', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.setSpeed(0.5));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS * 0.5);
  });

  // ── T-15: Timer stops at queryEndMs ─────────────────────────────────────────
  it('timer stops at queryEndMs', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(499999));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(500000);
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.isPlaying).toBe(false);
  });

  // ── T-16: Timer does not advance when paused ────────────────────────────────
  it('timer does not advance when paused', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS * 5); });
    expect(result.current.currentTimestampMs).toBe(1000);
  });

  // ── T-17: Timer does not advance when no data ───────────────────────────────
  it('timer does not advance when no data', () => {
    mockPlaybackDataLoading();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS * 5); });
    expect(result.current.currentTimestampMs).toBe(0);
  });

  // ── T-18: currentPositions resolves positions at currentTimestampMs ─────────
  it('currentPositions resolves positions at currentTimestampMs', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(35000));
    expect(result.current.currentPositions['1']).toBeDefined();
    expect(result.current.currentPositions['1'].lat).toBe(19.1);
  });

  // ── T-19: currentPositions is empty when timestamp is before first frame ────
  it('currentPositions is empty when timestamp is before first frame', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(500));
    expect(Object.keys(result.current.currentPositions)).toHaveLength(0);
  });

  // ── T-20: currentPositions updates as timer advances ────────────────────────
  it('currentPositions updates as timer advances', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentPositions['1'].lat).toBe(19.1);
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentPositions['1'].lat).toBe(19.2);
  });

  // ── T-21: Reset to start when new data loads ────────────────────────────────
  it('resets currentTimestampMs when new data loads', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(4000));
    act(() => result.current.play());
    mockPlaybackData({ timeWindow: makeTimeWindow({ queryStartMs: 2000 }) });
    const { rerender } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    rerender();
  });

  // ── T-22: play callback is stable across re-renders ─────────────────────────
  it('play callback is stable across re-renders', () => {
    mockPlaybackData();
    const { result, rerender } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    const prevPlay = result.current.play;
    rerender();
    expect(result.current.play).toBe(prevPlay);
  });

  // ── T-23: pause callback is stable across re-renders ────────────────────────
  it('pause callback is stable across re-renders', () => {
    mockPlaybackData();
    const { result, rerender } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    const prevPause = result.current.pause;
    rerender();
    expect(result.current.pause).toBe(prevPause);
  });

  // ── T-24: seek callback is stable across re-renders ─────────────────────────
  it('seek callback is stable across re-renders', () => {
    mockPlaybackData();
    const { result, rerender } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    const prevSeek = result.current.seek;
    rerender();
    expect(result.current.seek).toBe(prevSeek);
  });

  // ── T-25: Multiple ticks advance timestamp cumulatively ─────────────────────
  it('multiple ticks advance timestamp cumulatively', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS * 3); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS * 3);
  });

  // ── T-26: Changing speed during playback updates step size ──────────────────
  it('changing speed during playback updates step size', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS);
    act(() => result.current.setSpeed(3));
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS + PLAYBACK_STEP_MS * 3);
  });

  // ── T-27: Pause stops timer advancement ─────────────────────────────────────
  it('pause stops timer advancement', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    const tsAfterFirstTick = result.current.currentTimestampMs;
    act(() => result.current.pause());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS * 5); });
    expect(result.current.currentTimestampMs).toBe(tsAfterFirstTick);
  });

  // ── T-28: Seek to exact end timestamp ───────────────────────────────────────
  it('seek to queryEndMs does not cause playback', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(500000));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(500000);
    expect(result.current.isPlaying).toBe(false);
  });

  // ── T-29: Seek beyond end clamps to end ─────────────────────────────────────
  it('seek beyond queryEndMs sets timestamp beyond end', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(9999));
    expect(result.current.currentTimestampMs).toBe(9999);
  });

  // ── T-30: Seek to 0 ─────────────────────────────────────────────────────────
  it('seek to 0 sets timestamp to 0', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(0));
    expect(result.current.currentTimestampMs).toBe(0);
  });

  // ── T-31: Seek to negative value ────────────────────────────────────────────
  it('seek to negative value sets negative timestamp', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(-100));
    expect(result.current.currentTimestampMs).toBe(-100);
  });

  // ── T-32: currentPositions with empty timeline ──────────────────────────────
  it('currentPositions is empty with empty timeline', () => {
    mockPlaybackData({ timeline: [] });
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(Object.keys(result.current.currentPositions)).toHaveLength(0);
  });

  // ── T-33: currentPositions with null data ───────────────────────────────────
  it('currentPositions is empty when data is null', () => {
    mockPlaybackDataLoading();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(Object.keys(result.current.currentPositions)).toHaveLength(0);
  });

  // ── T-34: Multiple vessels in currentPositions ──────────────────────────────
  it('currentPositions resolves multiple vessels', () => {
    const timeline: TimelineFrame[] = [
      { timestampMs: 1000, vessels: { '1': { lat: 19.0, lon: 72.8 }, '2': { lat: 20.0, lon: 73.0 } } },
      { timestampMs: 31000, vessels: { '1': { lat: 19.1, lon: 72.9 } } },
    ];
    mockPlaybackData({ timeline });
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(15000));
    expect(result.current.currentPositions['1']).toBeDefined();
    expect(result.current.currentPositions['2']).toBeDefined();
    expect(result.current.currentPositions['2'].lat).toBe(20.0);
  });

  // ── T-35: data is null when loading ─────────────────────────────────────────
  it('data is null when loading', () => {
    mockPlaybackDataLoading();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.data).toBeNull();
  });

  // ── T-36: data is null when error ───────────────────────────────────────────
  it('data is null when error', () => {
    mockPlaybackDataError('fail');
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.data).toBeNull();
  });

  // ── T-37: Timer cleanup on unmount ──────────────────────────────────────────
  it('timer cleanup on unmount does not cause errors', () => {
    mockPlaybackData();
    const { result, unmount } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    unmount();
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS * 10); });
  });

  // ── T-38: Speed set to 0 ────────────────────────────────────────────────────
  it('speed set to 0 results in no advancement', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.setSpeed(0));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000);
  });

  // ── T-39: Speed set to negative ─────────────────────────────────────────────
  it('speed set to negative results in backward advancement', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.setSpeed(-1));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS * (-1));
  });

  // ── T-40: Play then pause then play resumes from current position ───────────
  it('play-pause-play resumes from current position', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    act(() => result.current.pause());
    const ts = result.current.currentTimestampMs;
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(ts + PLAYBACK_STEP_MS);
  });

  // ── T-41: Timer does not overshoot queryEndMs ───────────────────────────────
  it('timer does not overshoot queryEndMs', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(480000));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBeLessThanOrEqual(500000);
  });

  // ── T-42: currentPositions at exact frame timestamp ─────────────────────────
  it('currentPositions at exact frame timestamp returns that frame', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(61000));
    expect(result.current.currentPositions['1'].lat).toBe(19.2);
  });

  // ── T-43: currentPositions at last frame ────────────────────────────────────
  it('currentPositions at last frame returns last position', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(121000));
    expect(result.current.currentPositions['1'].lat).toBe(19.4);
  });

  // ── T-44: setSpeed to 10 ────────────────────────────────────────────────────
  it('setSpeed to 10 advances 10x per tick', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.setSpeed(10));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS * 10);
  });

  // ── T-45: data is passed through from usePlaybackData ───────────────────────
  it('data is passed through from usePlaybackData', () => {
    const customData = makePlaybackData({ extras: { custom: 'value' } });
    vi.mocked(usePlaybackData).mockReturnValue({ data: customData, isLoading: false, error: null });
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.data).toBe(customData);
  });

  // ── T-46: isLoading is passed through ───────────────────────────────────────
  it('isLoading is passed through from usePlaybackData', () => {
    mockPlaybackDataLoading();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.isLoading).toBe(true);
  });

  // ── T-47: error is passed through ───────────────────────────────────────────
  it('error is passed through from usePlaybackData', () => {
    mockPlaybackDataError('test error');
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.error).toBe('test error');
  });

  // ── T-48: error is null when no error ───────────────────────────────────────
  it('error is null when no error', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.error).toBeNull();
  });

  // ── T-49: Timer interval is cleared on pause ────────────────────────────────
  it('timer interval is cleared on pause', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => result.current.pause());
    const ts = result.current.currentTimestampMs;
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS * 10); });
    expect(result.current.currentTimestampMs).toBe(ts);
  });

  // ── T-50: Timer restarts when speed changes during playback ─────────────────
  it('timer restarts with new speed when speed changes during playback', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    act(() => result.current.setSpeed(4));
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS + PLAYBACK_STEP_MS * 4);
  });

  // ── T-51: currentTimestampMs is 0 before data loads ─────────────────────────
  it('currentTimestampMs is 0 before data loads', () => {
    mockPlaybackDataLoading();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current.currentTimestampMs).toBe(0);
  });

  // ── T-52: Return shape has all expected properties ──────────────────────────
  it('return shape has all expected properties', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('currentTimestampMs');
    expect(result.current).toHaveProperty('currentPositions');
    expect(result.current).toHaveProperty('isPlaying');
    expect(result.current).toHaveProperty('speed');
    expect(result.current).toHaveProperty('play');
    expect(result.current).toHaveProperty('pause');
    expect(result.current).toHaveProperty('seek');
    expect(result.current).toHaveProperty('setSpeed');
  });

  // ── T-53: Auto-stop at end sets isPlaying to false ──────────────────────────
  it('auto-stop at end sets isPlaying to false', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(499999));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(500000);
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.isPlaying).toBe(false);
  });

  // ── T-54: Playing after reaching end does not advance ───────────────────────
  it('playing after reaching end does not advance', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(500000));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS * 3); });
    expect(result.current.currentTimestampMs).toBe(500000);
  });

  // ── T-55: Seek to start and play works ──────────────────────────────────────
  it('seek to start and play works', () => {
    mockPlaybackData();
    const { result } = renderHook(() => usePlayback({ eventId: 'ev1', eventType: 'geofence_intrusion', isCompound: false }));
    act(() => result.current.seek(400000));
    act(() => result.current.seek(1000));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(TICK_INTERVAL_MS); });
    expect(result.current.currentTimestampMs).toBe(1000 + PLAYBACK_STEP_MS);
  });
});
