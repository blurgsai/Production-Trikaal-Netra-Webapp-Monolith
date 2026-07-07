import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { fetchPlaybackData } from '../api/playbackApi';
import { mapPlaybackFromApi } from '../model/mappers';
import { PLAYBACK_STEP_MS, TICK_INTERVAL_MS } from '../model/playbackUtils';
import type { PlaybackData, VesselPosition } from '../model/types';

vi.mock('../api/playbackApi');
vi.mock('../model/mappers');

const mockFetchPlaybackData = vi.mocked(fetchPlaybackData);
const mockMapPlaybackFromApi = vi.mocked(mapPlaybackFromApi);

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const posA = { lat: 10, lon: 20 } as VesselPosition;
const posB = { lat: 11, lon: 21 } as VesselPosition;

// Mapped (post-mapper) playback data
const basePlaybackData: PlaybackData = {
  eventDetails: {} as PlaybackData['eventDetails'],
  extras: {},
  timeline: [
    { timestampMs: 0, vessels: { v1: posA } },
    { timestampMs: 5000, vessels: { v1: posB } },
  ],
  timeWindow: { queryStartMs: 0, queryEndMs: 10_000, eventStartMs: 0, eventEndMs: null },
};

// Wide window so ticks are never clamped by queryEndMs
const longPlaybackData: PlaybackData = {
  ...basePlaybackData,
  timeWindow: { ...basePlaybackData.timeWindow, queryEndMs: 10_000_000 },
};

// Raw API response — contents are irrelevant because the mapper is mocked
const rawResponse = {} as Awaited<ReturnType<typeof fetchPlaybackData>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface HookProps {
  eventId: string | null;
  eventType: string | null;
  isCompound: boolean;
}

const defaultProps: HookProps = { eventId: '1', eventType: 'type', isCompound: false };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderPlayback(props: HookProps = defaultProps) {
  return renderHook((p: HookProps) => usePlayback(p), {
    initialProps: props,
    wrapper: createWrapper(),
  });
}

async function renderLoaded(
  data: PlaybackData = basePlaybackData,
  props: HookProps = defaultProps,
) {
  mockMapPlaybackFromApi.mockReturnValue(data);
  const utils = renderPlayback(props);
  await waitFor(() => expect(utils.result.current.data).not.toBeNull());
  return utils;
}

function tick(times = 1) {
  act(() => {
    vi.advanceTimersByTime(TICK_INTERVAL_MS * times);
  });
}

describe('usePlayback Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPlaybackData.mockResolvedValue(rawResponse);
    mockMapPlaybackFromApi.mockReturnValue(basePlaybackData);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Query function
  // -------------------------------------------------------------------------

  it('does not query without eventId and with eventType', () => {
    const { result } = renderPlayback({ eventId: null, eventType: 'type', isCompound: false });
    expect(mockFetchPlaybackData).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not query with eventId and without eventType', () => {
    const { result } = renderPlayback({ eventId: '1', eventType: null, isCompound: false });
    expect(mockFetchPlaybackData).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces error with valid eventId and invalid eventType', async () => {
    mockFetchPlaybackData.mockRejectedValueOnce(new Error('Invalid event type'));
    const { result } = renderPlayback({ eventId: '1', eventType: 'invalid', isCompound: false });
    await waitFor(() => expect(result.current.error).toBe('Invalid event type'));
    expect(result.current.data).toBeNull();
  });

  it('returns data with valid eventId and valid eventType', async () => {
    const { result } = renderPlayback();
    await waitFor(() => expect(result.current.data).toEqual(basePlaybackData));
    expect(mockFetchPlaybackData).toHaveBeenCalledWith('1', 'type', false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces error with invalid eventId and invalid eventType', async () => {
    mockFetchPlaybackData.mockRejectedValueOnce(new Error('Not found'));
    const { result } = renderPlayback({ eventId: 'bad', eventType: 'bad', isCompound: false });
    await waitFor(() => expect(result.current.error).toBe('Not found'));
    expect(result.current.data).toBeNull();
  });

  it('surfaces error with invalid eventId and valid eventType', async () => {
    mockFetchPlaybackData.mockRejectedValueOnce(new Error('Invalid event id'));
    const { result } = renderPlayback({ eventId: 'invalid', eventType: 'type', isCompound: false });
    await waitFor(() => expect(result.current.error).toBe('Invalid event id'));
    expect(result.current.data).toBeNull();
  });

  it('handles special characters in both eventId and eventType', async () => {
    const { result } = renderPlayback({ eventId: '!@#$', eventType: '%^&*', isCompound: false });
    await waitFor(() => expect(result.current.data).toEqual(basePlaybackData));
    expect(mockFetchPlaybackData).toHaveBeenCalledWith('!@#$', '%^&*', false);
  });

  it('API should be called with correct isCompound value', async () => {
    renderPlayback({ eventId: '1', eventType: 'type', isCompound: true });
    await waitFor(() =>
      expect(mockFetchPlaybackData).toHaveBeenCalledWith('1', 'type', true),
    );
  });

  it('API response should be transformed using mapPlaybackFromApi', async () => {
    const { result } = renderPlayback();
    await waitFor(() => expect(result.current.data).toEqual(basePlaybackData));
    expect(mockMapPlaybackFromApi).toHaveBeenCalledWith(rawResponse);
  });

  // -------------------------------------------------------------------------
  // Loading / error / data states
  // -------------------------------------------------------------------------

  it('isLoading should be true while query is pending', () => {
    mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderPlayback();
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading should be false after successful query completion', async () => {
    const { result } = renderPlayback();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(basePlaybackData);
  });

  it('error should be null on successful API response', async () => {
    const { result } = renderPlayback();
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.error).toBeNull();
  });

  it('Error message should be populated when API request fails', async () => {
    mockFetchPlaybackData.mockRejectedValueOnce(new Error('API Error'));
    const { result } = renderPlayback();
    await waitFor(() => expect(result.current.error).toBe('API Error'));
  });

  it('data should be null before query success', () => {
    mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderPlayback();
    expect(result.current.data).toBeNull();
  });

  it('data should contain mapped playback data after success', async () => {
    const { result } = renderPlayback();
    await waitFor(() => expect(result.current.data).toEqual(basePlaybackData));
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  it('currentTimestampMs should initialize to 0 before data loads', () => {
    mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderPlayback();
    expect(result.current.currentTimestampMs).toBe(0);
  });

  it('speed should initialize to 1', () => {
    const { result } = renderPlayback();
    expect(result.current.speed).toBe(1);
  });

  it('isPlaying should initialize to false', () => {
    const { result } = renderPlayback();
    expect(result.current.isPlaying).toBe(false);
  });

  it('currentPositions should initialize as an empty object', () => {
    mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderPlayback();
    expect(result.current.currentPositions).toEqual({});
  });

  // -------------------------------------------------------------------------
  // Data-load resets
  // -------------------------------------------------------------------------

  it('currentTimestampMs should reset to queryStartMs when data loads', async () => {
    const shifted: PlaybackData = {
      ...basePlaybackData,
      timeWindow: { ...basePlaybackData.timeWindow, queryStartMs: 2000 },
    };
    const { result } = await renderLoaded(shifted);
    expect(result.current.currentTimestampMs).toBe(2000);
  });

  it('Playback should automatically pause when new data loads', async () => {
    const { result, rerender } = await renderLoaded();
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    rerender({ ...defaultProps, eventId: '2' });
    await waitFor(() => expect(result.current.isPlaying).toBe(false));
  });

  it('Playback should reset when a different event is loaded', async () => {
    const { result, rerender } = await renderLoaded();
    act(() => result.current.seek(5000));
    expect(result.current.currentTimestampMs).toBe(5000);

    rerender({ ...defaultProps, eventId: '2' });
    await waitFor(() =>
      expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryStartMs),
    );
    expect(result.current.isPlaying).toBe(false);
  });

  it('Playback should reset when isCompound value changes', async () => {
    const { result, rerender } = await renderLoaded();
    act(() => result.current.seek(5000));

    rerender({ ...defaultProps, isCompound: true });
    await waitFor(() =>
      expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryStartMs),
    );
    expect(result.current.isPlaying).toBe(false);
  });

  it('Playback should start from queryStartMs after loading new data', async () => {
    const { result, rerender } = await renderLoaded(longPlaybackData);
    act(() => result.current.seek(60_000));

    rerender({ ...defaultProps, eventId: '2' });
    await waitFor(() =>
      expect(result.current.currentTimestampMs).toBe(longPlaybackData.timeWindow.queryStartMs),
    );
  });

  // -------------------------------------------------------------------------
  // Controls
  // -------------------------------------------------------------------------

  it('play() should set isPlaying to true', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);
  });

  it('pause() should set isPlaying to false', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.play());
    act(() => result.current.pause());
    expect(result.current.isPlaying).toBe(false);
  });

  it('seek() should update currentTimestampMs', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.seek(5000));
    expect(result.current.currentTimestampMs).toBe(5000);
  });

  it('seek() should pause playback', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.play());
    act(() => result.current.seek(5000));
    expect(result.current.isPlaying).toBe(false);
  });

  it('setSpeed() should update speed to 2x', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.setSpeed(2));
    expect(result.current.speed).toBe(2);
  });

  it('setSpeed() should update speed to 4x', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.setSpeed(4));
    expect(result.current.speed).toBe(4);
  });

  it('setSpeed() should update speed to 8x', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.setSpeed(8));
    expect(result.current.speed).toBe(8);
  });

  // -------------------------------------------------------------------------
  // Timer-driven playback (fake timers)
  // -------------------------------------------------------------------------

  describe('timer-driven playback', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    it('Timestamp should advance when playback is running', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.play());
      tick();
      expect(result.current.currentTimestampMs).toBeGreaterThan(
        longPlaybackData.timeWindow.queryStartMs,
      );
    });

    it('Timestamp should not advance when playback is paused', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.play());
      act(() => result.current.pause());
      const before = result.current.currentTimestampMs;
      tick(3);
      expect(result.current.currentTimestampMs).toBe(before);
    });

    it('Timestamp should advance by PLAYBACK_STEP_MS at speed 1', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.play());
      tick();
      expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS);
    });

    it('Timestamp should advance by PLAYBACK_STEP_MS x 2 at speed 2', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.setSpeed(2));
      act(() => result.current.play());
      tick();
      expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 2);
    });

    it('Timestamp should advance by PLAYBACK_STEP_MS x 4 at speed 4', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.setSpeed(4));
      act(() => result.current.play());
      tick();
      expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 4);
    });

    it('Timestamp should advance by PLAYBACK_STEP_MS x 8 at speed 8', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.setSpeed(8));
      act(() => result.current.play());
      tick();
      expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 8);
    });

    it('Playback should stop when timestamp reaches queryEndMs', async () => {
      const { result } = await renderLoaded(); // queryEndMs = 10 000 < one step
      act(() => result.current.play());
      tick(2); // 1st tick clamps to end, 2nd tick stops playback
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryEndMs);
    });

    it('Playback should remain paused after reaching queryEndMs', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.play());
      tick(2);
      expect(result.current.isPlaying).toBe(false);
      tick(5);
      expect(result.current.isPlaying).toBe(false);
    });

    it('Timestamp should never exceed queryEndMs', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.play());
      tick(10);
      expect(result.current.currentTimestampMs).toBeLessThanOrEqual(
        basePlaybackData.timeWindow.queryEndMs,
      );
    });

    it('Playback should continue correctly after pause and resume', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.play());
      tick();
      act(() => result.current.pause());
      act(() => result.current.play());
      tick();
      expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 2);
    });

    it('Playback should resume from the current timestamp after pause', async () => {
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.play());
      tick();
      act(() => result.current.pause());
      expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS);
      act(() => result.current.play());
      expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS);
    });

    it('Hook should return correct values after successful playback completion', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.play());
      tick(3);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryEndMs);
      expect(result.current.data).toEqual(basePlaybackData);
      expect(result.current.currentPositions).toEqual({ v1: posB });
    });

    it('Timer interval should be cleared when playback is paused', async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const { result } = await renderLoaded(longPlaybackData);
      act(() => result.current.play());
      clearIntervalSpy.mockClear();
      act(() => result.current.pause());
      expect(clearIntervalSpy).toHaveBeenCalled();
      const before = result.current.currentTimestampMs;
      tick(3);
      expect(result.current.currentTimestampMs).toBe(before);
    });

    it('Timer interval should be cleared when the hook unmounts', async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const { result, unmount } = await renderLoaded(longPlaybackData);
      act(() => result.current.play());
      clearIntervalSpy.mockClear();
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // currentPositions
  // -------------------------------------------------------------------------

  it('currentPositions should remain empty when data is unavailable', () => {
    mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderPlayback();
    expect(result.current.currentPositions).toEqual({});
  });

  it('currentPositions should be calculated when valid data exists', async () => {
    const { result } = await renderLoaded();
    expect(result.current.currentPositions).toEqual({ v1: posA });
  });

  it('currentPositions should update when timestamp changes', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.seek(5000));
    expect(result.current.currentPositions).toEqual({ v1: posB });
  });

  it('currentPositions should update after seeking to a different time', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.seek(4999));
    expect(result.current.currentPositions).toEqual({ v1: posA });
    act(() => result.current.seek(5000));
    expect(result.current.currentPositions).toEqual({ v1: posB });
  });

  // ===========================================================================
  // Extended coverage
  // ===========================================================================

  describe('extended coverage', () => {
    const posC = { lat: 12, lon: 22 } as VesselPosition;

    const emptyTimelineData: PlaybackData = {
      ...basePlaybackData,
      timeline: [],
    };

    const lateStartData: PlaybackData = {
      ...basePlaybackData,
      timeline: [{ timestampMs: 1000, vessels: { v1: posA } }],
    };

    const singleFrameData: PlaybackData = {
      ...basePlaybackData,
      timeline: [{ timestampMs: 0, vessels: { v1: posA } }],
    };

    const multiVesselData: PlaybackData = {
      ...basePlaybackData,
      timeline: [
        { timestampMs: 0, vessels: { v1: posA, v2: posC } },
        { timestampMs: 5000, vessels: { v1: posB } },
      ],
    };

    const lateVesselData: PlaybackData = {
      ...basePlaybackData,
      timeline: [
        { timestampMs: 0, vessels: { v1: posA } },
        { timestampMs: 5000, vessels: { v2: posB } },
      ],
    };

    const shiftedWindowData: PlaybackData = {
      ...basePlaybackData,
      timeWindow: { ...basePlaybackData.timeWindow, queryStartMs: 2000 },
    };

    const boundedWindowData: PlaybackData = {
      ...basePlaybackData,
      timeWindow: { queryStartMs: 0, queryEndMs: 45_000, eventStartMs: 0, eventEndMs: null },
    };

    const richData: PlaybackData = {
      ...basePlaybackData,
      extras: { geofence_polygon: [[1, 2]] },
      timeWindow: { queryStartMs: 100, queryEndMs: 9000, eventStartMs: 500, eventEndMs: 8000 },
    };

    // -------------------------------------------------------------------------
    // Query enabling / parameters
    // -------------------------------------------------------------------------

    describe('query enabling and parameters', () => {
      it('does not query with empty-string eventId', () => {
        renderPlayback({ eventId: '', eventType: 'type', isCompound: false });
        expect(mockFetchPlaybackData).not.toHaveBeenCalled();
      });

      it('does not query with empty-string eventType', () => {
        renderPlayback({ eventId: '1', eventType: '', isCompound: false });
        expect(mockFetchPlaybackData).not.toHaveBeenCalled();
      });

      it('does not query when both eventId and eventType are null', () => {
        renderPlayback({ eventId: null, eventType: null, isCompound: false });
        expect(mockFetchPlaybackData).not.toHaveBeenCalled();
      });

      it('does not query when both eventId and eventType are empty strings', () => {
        renderPlayback({ eventId: '', eventType: '', isCompound: false });
        expect(mockFetchPlaybackData).not.toHaveBeenCalled();
      });

      it('queries with whitespace eventId (truthy string)', async () => {
        renderPlayback({ eventId: ' ', eventType: 'type', isCompound: false });
        await waitFor(() => expect(mockFetchPlaybackData).toHaveBeenCalledWith(' ', 'type', false));
      });

      it('queries with "0" eventId (truthy string)', async () => {
        renderPlayback({ eventId: '0', eventType: 'type', isCompound: false });
        await waitFor(() => expect(mockFetchPlaybackData).toHaveBeenCalledWith('0', 'type', false));
      });

      it('passes a numeric-like eventId through unchanged', async () => {
        renderPlayback({ eventId: '12345', eventType: 'type', isCompound: false });
        await waitFor(() =>
          expect(mockFetchPlaybackData).toHaveBeenCalledWith('12345', 'type', false),
        );
      });

      it('passes a very long eventId through unchanged', async () => {
        const longId = 'x'.repeat(500);
        renderPlayback({ eventId: longId, eventType: 'type', isCompound: false });
        await waitFor(() =>
          expect(mockFetchPlaybackData).toHaveBeenCalledWith(longId, 'type', false),
        );
      });

      it('passes unicode eventId and eventType through unchanged', async () => {
        renderPlayback({ eventId: '事件-1', eventType: 'типа', isCompound: false });
        await waitFor(() =>
          expect(mockFetchPlaybackData).toHaveBeenCalledWith('事件-1', 'типа', false),
        );
      });

      it('calls the API exactly once for stable props', async () => {
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.data).not.toBeNull());
        expect(mockFetchPlaybackData).toHaveBeenCalledTimes(1);
      });

      it('does not refetch on rerender with identical props', async () => {
        const { result, rerender } = renderPlayback();
        await waitFor(() => expect(result.current.data).not.toBeNull());
        rerender(defaultProps);
        expect(mockFetchPlaybackData).toHaveBeenCalledTimes(1);
      });

      it('refetches when eventId changes', async () => {
        const { result, rerender } = renderPlayback();
        await waitFor(() => expect(result.current.data).not.toBeNull());
        rerender({ ...defaultProps, eventId: '2' });
        await waitFor(() => expect(mockFetchPlaybackData).toHaveBeenCalledTimes(2));
      });

      it('refetches when isCompound changes', async () => {
        const { result, rerender } = renderPlayback();
        await waitFor(() => expect(result.current.data).not.toBeNull());
        rerender({ ...defaultProps, isCompound: true });
        await waitFor(() => expect(mockFetchPlaybackData).toHaveBeenCalledTimes(2));
      });

      it('does not refetch when only eventType changes (not part of query key)', async () => {
        const { result, rerender } = renderPlayback();
        await waitFor(() => expect(result.current.data).not.toBeNull());
        rerender({ ...defaultProps, eventType: 'other' });
        expect(mockFetchPlaybackData).toHaveBeenCalledTimes(1);
      });

      it('calls the API with the latest eventId after a change', async () => {
        const { result, rerender } = renderPlayback();
        await waitFor(() => expect(result.current.data).not.toBeNull());
        rerender({ ...defaultProps, eventId: '2' });
        await waitFor(() =>
          expect(mockFetchPlaybackData).toHaveBeenLastCalledWith('2', 'type', false),
        );
      });
    });

    // -------------------------------------------------------------------------
    // Error handling
    // -------------------------------------------------------------------------

    describe('error handling', () => {
      it('surfaces a TypeError message', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new TypeError('bad input'));
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe('bad input'));
      });

      it('surfaces an empty error message as empty string', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new Error(''));
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe('');
      });

      it('isLoading is false after an error', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new Error('boom'));
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe('boom'));
        expect(result.current.isLoading).toBe(false);
      });

      it('data stays null after an error', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new Error('boom'));
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe('boom'));
        expect(result.current.data).toBeNull();
      });

      it('currentPositions stays empty after an error', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new Error('boom'));
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe('boom'));
        expect(result.current.currentPositions).toEqual({});
      });

      it('error is null while the query is still pending', () => {
        mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
        const { result } = renderPlayback();
        expect(result.current.error).toBeNull();
      });

      it('error persists on rerender with identical props', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new Error('boom'));
        const { result, rerender } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe('boom'));
        rerender(defaultProps);
        expect(result.current.error).toBe('boom');
      });

      it('error clears when a different event loads successfully', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new Error('boom'));
        const { result, rerender } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe('boom'));
        rerender({ ...defaultProps, eventId: '2' });
        await waitFor(() => expect(result.current.data).not.toBeNull());
        expect(result.current.error).toBeNull();
      });

      it('preserves a long error message', async () => {
        const longMsg = 'e'.repeat(1000);
        mockFetchPlaybackData.mockRejectedValueOnce(new Error(longMsg));
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe(longMsg));
      });

      it('preserves special characters in error messages', async () => {
        mockFetchPlaybackData.mockRejectedValueOnce(new Error('500: <error> & "quoted"'));
        const { result } = renderPlayback();
        await waitFor(() => expect(result.current.error).toBe('500: <error> & "quoted"'));
      });
    });

    // -------------------------------------------------------------------------
    // Return shape and reference stability
    // -------------------------------------------------------------------------

    describe('return shape and reference stability', () => {
      it('returns all expected keys', () => {
        const { result } = renderPlayback();
        expect(Object.keys(result.current).sort()).toEqual([
          'currentPositions',
          'currentTimestampMs',
          'data',
          'error',
          'isLoading',
          'isPlaying',
          'pause',
          'play',
          'seek',
          'setSpeed',
          'speed',
        ]);
      });

      it('play is a function', () => {
        const { result } = renderPlayback();
        expect(typeof result.current.play).toBe('function');
      });

      it('pause is a function', () => {
        const { result } = renderPlayback();
        expect(typeof result.current.pause).toBe('function');
      });

      it('seek is a function', () => {
        const { result } = renderPlayback();
        expect(typeof result.current.seek).toBe('function');
      });

      it('setSpeed is a function', () => {
        const { result } = renderPlayback();
        expect(typeof result.current.setSpeed).toBe('function');
      });

      it('play reference is stable across rerenders', async () => {
        const { result, rerender } = await renderLoaded();
        const first = result.current.play;
        rerender(defaultProps);
        expect(result.current.play).toBe(first);
      });

      it('pause reference is stable across rerenders', async () => {
        const { result, rerender } = await renderLoaded();
        const first = result.current.pause;
        rerender(defaultProps);
        expect(result.current.pause).toBe(first);
      });

      it('seek reference is stable across rerenders', async () => {
        const { result, rerender } = await renderLoaded();
        const first = result.current.seek;
        rerender(defaultProps);
        expect(result.current.seek).toBe(first);
      });

      it('data is the exact object returned by the mapper', async () => {
        const { result } = await renderLoaded();
        expect(result.current.data).toBe(basePlaybackData);
      });

      it('currentPositions reference is stable across no-op rerenders', async () => {
        const { result, rerender } = await renderLoaded();
        const first = result.current.currentPositions;
        rerender(defaultProps);
        expect(result.current.currentPositions).toBe(first);
      });
    });

    // -------------------------------------------------------------------------
    // seek() edge cases
    // -------------------------------------------------------------------------

    describe('seek() edge cases', () => {
      it('seek(0) sets timestamp to 0', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(5000));
        act(() => result.current.seek(0));
        expect(result.current.currentTimestampMs).toBe(0);
      });

      it('seek to queryEndMs is allowed', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(basePlaybackData.timeWindow.queryEndMs));
        expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryEndMs);
      });

      it('seek beyond queryEndMs is not clamped', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(99_999));
        expect(result.current.currentTimestampMs).toBe(99_999);
      });

      it('seek to a negative timestamp is not clamped', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(-500));
        expect(result.current.currentTimestampMs).toBe(-500);
      });

      it('seek accepts fractional milliseconds', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(1234.56));
        expect(result.current.currentTimestampMs).toBe(1234.56);
      });

      it('consecutive seeks keep the last value', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(3000));
        act(() => result.current.seek(7000));
        expect(result.current.currentTimestampMs).toBe(7000);
      });

      it('seek back to start after seeking forward', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(5000));
        act(() => result.current.seek(0));
        expect(result.current.currentTimestampMs).toBe(0);
        expect(result.current.currentPositions).toEqual({ v1: posA });
      });

      it('seek works before data has loaded', () => {
        mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
        const { result } = renderPlayback();
        act(() => result.current.seek(1234));
        expect(result.current.currentTimestampMs).toBe(1234);
      });

      it('seek keeps playback paused when not playing', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(5000));
        expect(result.current.isPlaying).toBe(false);
      });

      it('seek to the current value still pauses playback', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.play());
        act(() => result.current.seek(result.current.currentTimestampMs));
        expect(result.current.isPlaying).toBe(false);
      });
    });

    // -------------------------------------------------------------------------
    // setSpeed() edge cases
    // -------------------------------------------------------------------------

    describe('setSpeed() edge cases', () => {
      it('setSpeed(1) keeps speed at 1', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(1));
        expect(result.current.speed).toBe(1);
      });

      it('setSpeed(0) stores zero', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(0));
        expect(result.current.speed).toBe(0);
      });

      it('setSpeed stores negative values', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(-1));
        expect(result.current.speed).toBe(-1);
      });

      it('setSpeed stores fractional values', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(0.5));
        expect(result.current.speed).toBe(0.5);
      });

      it('setSpeed stores very large values', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(1000));
        expect(result.current.speed).toBe(1000);
      });

      it('speed persists after pause', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(4));
        act(() => result.current.play());
        act(() => result.current.pause());
        expect(result.current.speed).toBe(4);
      });

      it('speed persists after seek', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(8));
        act(() => result.current.seek(5000));
        expect(result.current.speed).toBe(8);
      });

      it('speed persists when a new event loads', async () => {
        const { result, rerender } = await renderLoaded();
        act(() => result.current.setSpeed(4));
        rerender({ ...defaultProps, eventId: '2' });
        await waitFor(() => expect(result.current.data).not.toBeNull());
        expect(result.current.speed).toBe(4);
      });
    });

    // -------------------------------------------------------------------------
    // Extended timer behavior
    // -------------------------------------------------------------------------

    describe('extended timer behavior', () => {
      beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      it('does not advance before a full tick interval elapses', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        act(() => vi.advanceTimersByTime(TICK_INTERVAL_MS / 2));
        expect(result.current.currentTimestampMs).toBe(longPlaybackData.timeWindow.queryStartMs);
      });

      it('two ticks accumulate 2 x PLAYBACK_STEP_MS', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        tick(2);
        expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 2);
      });

      it('five ticks accumulate 5 x PLAYBACK_STEP_MS', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        tick(5);
        expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 5);
      });

      it('speed 0 keeps the timestamp in place while playing', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.setSpeed(0));
        act(() => result.current.play());
        tick(3);
        expect(result.current.currentTimestampMs).toBe(longPlaybackData.timeWindow.queryStartMs);
      });

      it('speed 0 keeps playback running', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.setSpeed(0));
        act(() => result.current.play());
        tick(3);
        expect(result.current.isPlaying).toBe(true);
      });

      it('negative speed moves the timestamp backwards', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.setSpeed(-1));
        act(() => result.current.play());
        tick();
        expect(result.current.currentTimestampMs).toBe(-PLAYBACK_STEP_MS);
      });

      it('fractional speed advances by a fraction of PLAYBACK_STEP_MS', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.setSpeed(0.5));
        act(() => result.current.play());
        tick();
        expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 0.5);
      });

      it('very large speed clamps to queryEndMs in a single tick', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.setSpeed(1000));
        act(() => result.current.play());
        tick();
        expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryEndMs);
      });

      it('changing speed mid-playback applies to subsequent ticks', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        tick();
        act(() => result.current.setSpeed(2));
        tick();
        expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 3);
      });

      it('playing from a seeked position advances from there', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.seek(5000));
        act(() => result.current.play());
        tick();
        expect(result.current.currentTimestampMs).toBe(5000 + PLAYBACK_STEP_MS);
      });

      it('seek during playback stops further advancement', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        tick();
        act(() => result.current.seek(1000));
        tick(2);
        expect(result.current.currentTimestampMs).toBe(1000);
      });

      it('timestamp lands exactly on queryEndMs when a step overshoots', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.play());
        tick();
        expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryEndMs);
      });

      it('timestamp clamps exactly at a mid-step boundary', async () => {
        const { result } = await renderLoaded(boundedWindowData);
        act(() => result.current.play());
        tick(2); // 30 000, then min(60 000, 45 000)
        expect(result.current.currentTimestampMs).toBe(45_000);
      });

      it('playing when already at the end pauses without moving', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(basePlaybackData.timeWindow.queryEndMs));
        act(() => result.current.play());
        tick();
        expect(result.current.isPlaying).toBe(false);
        expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryEndMs);
      });

      it('playing from beyond the end pauses without moving', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(99_999));
        act(() => result.current.play());
        tick();
        expect(result.current.isPlaying).toBe(false);
        expect(result.current.currentTimestampMs).toBe(99_999);
      });

      it('play without data does not advance the timestamp', () => {
        mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
        const { result } = renderPlayback();
        act(() => result.current.play());
        tick(3);
        expect(result.current.currentTimestampMs).toBe(0);
      });

      it('play without data keeps isPlaying true', () => {
        mockFetchPlaybackData.mockReturnValueOnce(new Promise(() => {}));
        const { result } = renderPlayback();
        act(() => result.current.play());
        tick(3);
        expect(result.current.isPlaying).toBe(true);
      });

      it('multiple pause/resume cycles accumulate correctly', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        tick();
        act(() => result.current.pause());
        act(() => result.current.play());
        tick();
        act(() => result.current.pause());
        act(() => result.current.play());
        tick();
        expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS * 3);
      });

      it('pausing immediately after play prevents advancement', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        act(() => result.current.pause());
        tick(3);
        expect(result.current.currentTimestampMs).toBe(longPlaybackData.timeWindow.queryStartMs);
      });

      it('replaying after completion stays clamped at the end', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.play());
        tick(3);
        expect(result.current.isPlaying).toBe(false);
        act(() => result.current.play());
        tick(2);
        expect(result.current.currentTimestampMs).toBe(basePlaybackData.timeWindow.queryEndMs);
        expect(result.current.isPlaying).toBe(false);
      });

      it('ticks before play() do not advance the timestamp', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        tick(3);
        expect(result.current.currentTimestampMs).toBe(longPlaybackData.timeWindow.queryStartMs);
        act(() => result.current.play());
        tick();
        expect(result.current.currentTimestampMs).toBe(PLAYBACK_STEP_MS);
      });

      it('positions update during timer-driven playback', async () => {
        const { result } = await renderLoaded(longPlaybackData);
        act(() => result.current.play());
        tick(); // t = 30 000 ≥ 5000 → posB
        expect(result.current.currentPositions).toEqual({ v1: posB });
      });
    });

    // -------------------------------------------------------------------------
    // Position resolution
    // -------------------------------------------------------------------------

    describe('position resolution', () => {
      it('empty timeline yields no positions at start', async () => {
        const { result } = await renderLoaded(emptyTimelineData);
        expect(result.current.currentPositions).toEqual({});
      });

      it('empty timeline yields no positions after seeking', async () => {
        const { result } = await renderLoaded(emptyTimelineData);
        act(() => result.current.seek(5000));
        expect(result.current.currentPositions).toEqual({});
      });

      it('yields no positions before the first frame', async () => {
        const { result } = await renderLoaded(lateStartData);
        expect(result.current.currentPositions).toEqual({});
      });

      it('resolves positions once the first frame is reached', async () => {
        const { result } = await renderLoaded(lateStartData);
        act(() => result.current.seek(1000));
        expect(result.current.currentPositions).toEqual({ v1: posA });
      });

      it('single-frame timeline resolves its position', async () => {
        const { result } = await renderLoaded(singleFrameData);
        expect(result.current.currentPositions).toEqual({ v1: posA });
      });

      it('single-frame position persists for all later timestamps', async () => {
        const { result } = await renderLoaded(singleFrameData);
        act(() => result.current.seek(9999));
        expect(result.current.currentPositions).toEqual({ v1: posA });
      });

      it('resolves all vessels present in a frame', async () => {
        const { result } = await renderLoaded(multiVesselData);
        expect(result.current.currentPositions).toEqual({ v1: posA, v2: posC });
      });

      it('a vessel missing from later frames retains its last known position', async () => {
        const { result } = await renderLoaded(multiVesselData);
        act(() => result.current.seek(5000));
        expect(result.current.currentPositions).toEqual({ v1: posB, v2: posC });
      });

      it('a vessel appearing later is absent before its first frame', async () => {
        const { result } = await renderLoaded(lateVesselData);
        expect(result.current.currentPositions).toEqual({ v1: posA });
      });

      it('a vessel appearing later shows up from its first frame onwards', async () => {
        const { result } = await renderLoaded(lateVesselData);
        act(() => result.current.seek(5000));
        expect(result.current.currentPositions).toEqual({ v1: posA, v2: posB });
      });

      it('yields no positions for a negative timestamp', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(-1));
        expect(result.current.currentPositions).toEqual({});
      });

      it('resolves positions past the last frame using the last frame', async () => {
        const { result } = await renderLoaded();
        act(() => result.current.seek(5001));
        expect(result.current.currentPositions).toEqual({ v1: posB });
      });
    });

    // -------------------------------------------------------------------------
    // Data pass-through
    // -------------------------------------------------------------------------

    describe('data pass-through', () => {
      it('passes timeWindow through unchanged', async () => {
        const { result } = await renderLoaded(richData);
        expect(result.current.data?.timeWindow).toEqual(richData.timeWindow);
      });

      it('preserves eventStartMs', async () => {
        const { result } = await renderLoaded(richData);
        expect(result.current.data?.timeWindow.eventStartMs).toBe(500);
      });

      it('preserves a null eventEndMs', async () => {
        const { result } = await renderLoaded();
        expect(result.current.data?.timeWindow.eventEndMs).toBeNull();
      });

      it('preserves a numeric eventEndMs', async () => {
        const { result } = await renderLoaded(richData);
        expect(result.current.data?.timeWindow.eventEndMs).toBe(8000);
      });

      it('passes the timeline through unchanged', async () => {
        const { result } = await renderLoaded(richData);
        expect(result.current.data?.timeline).toBe(richData.timeline);
      });

      it('preserves extras', async () => {
        const { result } = await renderLoaded(richData);
        expect(result.current.data?.extras).toEqual({ geofence_polygon: [[1, 2]] });
      });

      it('preserves eventDetails', async () => {
        const { result } = await renderLoaded(richData);
        expect(result.current.data?.eventDetails).toBe(richData.eventDetails);
      });

      it('data for a second event replaces the first', async () => {
        const { result, rerender } = await renderLoaded();
        mockMapPlaybackFromApi.mockReturnValue(shiftedWindowData);
        rerender({ ...defaultProps, eventId: '2' });
        await waitFor(() => expect(result.current.data).toEqual(shiftedWindowData));
      });

      it('timestamp resets to the new queryStartMs of a second event', async () => {
        const { result, rerender } = await renderLoaded();
        mockMapPlaybackFromApi.mockReturnValue(shiftedWindowData);
        rerender({ ...defaultProps, eventId: '2' });
        await waitFor(() => expect(result.current.currentTimestampMs).toBe(2000));
      });

      it('speed is retained but playback is paused after a second event loads', async () => {
        const { result, rerender } = await renderLoaded();
        act(() => result.current.setSpeed(8));
        act(() => result.current.play());
        rerender({ ...defaultProps, eventId: '2' });
        await waitFor(() => expect(result.current.isPlaying).toBe(false));
        expect(result.current.speed).toBe(8);
      });
    });

    // -------------------------------------------------------------------------
    // Disabled-query state
    // -------------------------------------------------------------------------

    describe('disabled-query state', () => {
      it('isLoading is false when the query is disabled', () => {
        const { result } = renderPlayback({ eventId: null, eventType: 'type', isCompound: false });
        expect(result.current.isLoading).toBe(false);
      });

      it('currentTimestampMs is 0 when the query is disabled', () => {
        const { result } = renderPlayback({ eventId: null, eventType: 'type', isCompound: false });
        expect(result.current.currentTimestampMs).toBe(0);
      });

      it('currentPositions is empty when the query is disabled', () => {
        const { result } = renderPlayback({ eventId: null, eventType: 'type', isCompound: false });
        expect(result.current.currentPositions).toEqual({});
      });

      it('speed is 1 when the query is disabled', () => {
        const { result } = renderPlayback({ eventId: null, eventType: 'type', isCompound: false });
        expect(result.current.speed).toBe(1);
      });

      it('isPlaying is false when the query is disabled', () => {
        const { result } = renderPlayback({ eventId: null, eventType: 'type', isCompound: false });
        expect(result.current.isPlaying).toBe(false);
      });
    });
  });
});