/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { fetchPlaybackData } from '../api/playbackApi';
import { mapPlaybackFromApi } from '../model/mappers';
import type { PlaybackData } from '../model/types';

vi.mock('../api/playbackApi');
vi.mock('../model/mappers');

const mockPlaybackData: PlaybackData = {
  eventDetails: {
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
  },
  extras: {},
  timeline: [
    { timestampMs: 1704067200000, vessels: { vessel1: { lat: 12.34, lon: 56.78 } } },
    { timestampMs: 1704067230000, vessels: { vessel1: { lat: 12.35, lon: 56.79 } } },
    { timestampMs: 1704067260000, vessels: { vessel1: { lat: 12.36, lon: 56.80 } } },
  ],
  timeWindow: {
    queryStartMs: 1704067200000,
    queryEndMs: 1704070800000,
    eventStartMs: 1704067200000,
    eventEndMs: 1704070800000,
  },
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('usePlayback', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.clearAllMocks();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  // Query Tests
  describe('Query Tests', () => {
    it('Should fetch playback data when eventId and eventType are provided', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(fetchPlaybackData).toHaveBeenCalledWith('123', 'test', false);
    });

    it('Should not fetch when eventId is null', () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      renderHook(() => usePlayback({ eventId: null, eventType: 'test', isCompound: false }), { wrapper });
      expect(fetchPlaybackData).not.toHaveBeenCalled();
    });

    it('Should not fetch when eventType is null', () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      renderHook(() => usePlayback({ eventId: '123', eventType: null, isCompound: false }), { wrapper });
      expect(fetchPlaybackData).not.toHaveBeenCalled();
    });

    it('Should not fetch when both eventId and eventType are null', () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      expect(fetchPlaybackData).not.toHaveBeenCalled();
    });

    it('Should call fetchPlaybackData with correct parameters', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      renderHook(() => usePlayback({ eventId: 'event123', eventType: 'geofence_intrusion', isCompound: true }), { wrapper });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledWith('event123', 'geofence_intrusion', true));
    });

    it('Should pass isCompound=true correctly', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: true }), { wrapper });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledWith('123', 'test', true));
    });

    it('Should pass isCompound=false correctly', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledWith('123', 'test', false));
    });

    it('Should use correct query key', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      const query = queryClient.getQueryCache().find({ queryKey: ['playback', '123', false] });
      expect(query?.queryKey).toEqual(['playback', '123', false]);
    });

    it('Should map API response using mapPlaybackFromApi', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data).toEqual(mockPlaybackData));
      expect(mapPlaybackFromApi).toHaveBeenCalled();
    });

    it('Should return loading state while fetching', () => {
      vi.mocked(fetchPlaybackData).mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      expect(result.current.isLoading).toBe(true);
    });

    it('Should return fetched data after success', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data).toEqual(mockPlaybackData));
    });

    it('Should return null data before fetch completion', () => {
      vi.mocked(fetchPlaybackData).mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      expect(result.current.data).toBeNull();
    });

    it('Should handle API error', async () => {
      vi.mocked(fetchPlaybackData).mockRejectedValue(new Error('API Error'));
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.error).toBe('API Error'));
    });

    it('Should expose error message correctly', async () => {
      vi.mocked(fetchPlaybackData).mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.error).toBe('Network error'));
    });

    it('Should return null error when no error exists', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.error).toBeNull());
    });

    it('Should cache data using staleTime Infinity', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => {
        const query = queryClient.getQueryCache().find({ queryKey: ['playback', '123', false] });
        expect((query?.options as any)?.staleTime).toBe(Infinity);
      });
    });

    it('Should refetch when eventId changes', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { rerender } = renderHook(({ eventId }) => usePlayback({ eventId, eventType: 'test', isCompound: false }), { wrapper, initialProps: { eventId: '123' } });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledTimes(1));
      rerender({ eventId: '456' });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledTimes(2));
    });

    it('Should refetch when isCompound changes', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { rerender } = renderHook(({ isCompound }) => usePlayback({ eventId: '123', eventType: 'test', isCompound }), { wrapper, initialProps: { isCompound: false } });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledTimes(1));
      rerender({ isCompound: true });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledTimes(2));
    });

    it('Should refetch when eventType changes', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { rerender } = renderHook(({ eventType }) => usePlayback({ eventId: '123', eventType, isCompound: false }), { wrapper, initialProps: { eventType: 'test' } });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledTimes(1));
      rerender({ eventType: 'other' });
      await waitFor(() => expect(fetchPlaybackData).toHaveBeenCalledTimes(2));
    });

    it('Should handle empty API response', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data).toBeDefined());
    });
  });

  // Initial State Tests
  describe('Initial State Tests', () => {
    it('currentTimestampMs should initialize to 0', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      expect(result.current.currentTimestampMs).toBe(0);
    });

    it('isPlaying should initialize to false', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      expect(result.current.isPlaying).toBe(false);
    });

    it('speed should initialize to 1', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      expect(result.current.speed).toBe(1);
    });

    it('currentPositions should initialize to empty object', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      expect(result.current.currentPositions).toEqual({});
    });

    it('data should initialize to null before loading', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      expect(result.current.data).toBeNull();
    });
  });

  // Data Load Tests
  describe('Data Load Tests', () => {
    it('Should reset timestamp to queryStartMs after data load', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
    });

    it('Should stop playback after data load', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.isPlaying).toBe(false));
    });

    it('Should update timeWindowRef after data load', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data?.timeWindow).toEqual(mockPlaybackData.timeWindow));
    });

    it('Should handle data load with empty timeline', async () => {
      const emptyData = { ...mockPlaybackData, timeline: [] };
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(emptyData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data?.timeline).toEqual([]));
    });

    it('Should handle data load with single timeline point', async () => {
      const singlePointData = { ...mockPlaybackData, timeline: [{ timestampMs: 1704067200000, vessels: {} }] };
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(singlePointData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data?.timeline).toHaveLength(1));
    });

    it('Should handle data load with multiple timeline points', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data?.timeline).toHaveLength(3));
    });

    it('Should load large timeline data', async () => {
      const largeTimeline = Array.from({ length: 1000 }, (_, i) => ({ timestampMs: 1704067200000 + i * 30000, vessels: {} }));
      const largeData = { ...mockPlaybackData, timeline: largeTimeline };
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(largeData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data?.timeline).toHaveLength(1000));
    });

    it('Should load compound event playback data', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'compound', isCompound: true }), { wrapper });
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(fetchPlaybackData).toHaveBeenCalledWith('123', 'compound', true);
    });

    it('Should load non-compound event playback data', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(fetchPlaybackData).toHaveBeenCalledWith('123', 'test', false);
    });
  });

  // Play Tests
  describe('Play Tests', () => {
    it('Should start playback when play is called', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.play());
      expect(result.current.isPlaying).toBe(true);
    });

    it('Should not start playback if no data loaded', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      act(() => result.current.play());
      expect(result.current.isPlaying).toBe(true);
    });

    it('Should remain playing if play called while already playing', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.play());
      act(() => result.current.play());
      expect(result.current.isPlaying).toBe(true);
    });

    it('Should start timer when play is called', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.play());
      expect(result.current.isPlaying).toBe(true);
    });
  });

  // Pause Tests
  describe('Pause Tests', () => {
    it('Should stop playback when pause is called', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.play());
      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);
    });

    it('Should remain paused if pause called while already paused', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.pause());
      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);
    });

    it('Should stop timer when pause is called', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.play());
      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);
    });
  });

  // Seek Tests
  describe('Seek Tests', () => {
    it('Should update timestamp when seek is called', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.seek(1704067230000));
      expect(result.current.currentTimestampMs).toBe(1704067230000);
    });

    it('Should seek to the exact timestamp provided', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.seek(100));
      expect(result.current.currentTimestampMs).toBe(100);
    });

    it('Should seek to very large timestamps', async () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      vi.mocked(mapPlaybackFromApi).mockReturnValue(mockPlaybackData);
      const { result } = renderHook(() => usePlayback({ eventId: '123', eventType: 'test', isCompound: false }), { wrapper });
      await waitFor(() => expect(result.current.currentTimestampMs).toBe(mockPlaybackData.timeWindow.queryStartMs));
      act(() => result.current.seek(9999999999999));
      expect(result.current.currentTimestampMs).toBe(9999999999999);
    });

  });


  // Edge Cases
  describe('Edge Cases', () => {
    it('Should handle empty eventId', () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      renderHook(() => usePlayback({ eventId: '', eventType: 'test', isCompound: false }), { wrapper });
      expect(fetchPlaybackData).not.toHaveBeenCalled();
    });

    it('Should handle empty eventType', () => {
      vi.mocked(fetchPlaybackData).mockResolvedValue({} as any);
      renderHook(() => usePlayback({ eventId: '123', eventType: '', isCompound: false }), { wrapper });
      expect(fetchPlaybackData).not.toHaveBeenCalled();
    });

    it('Should handle play with no data', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      act(() => result.current.play());
      expect(result.current.isPlaying).toBe(true);
    });

    it('Should handle pause with no data', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      act(() => result.current.play());
      act(() => result.current.pause());
      expect(result.current.isPlaying).toBe(false);
    });

    it('Should handle seek with no data', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      act(() => result.current.seek(1000));
      expect(result.current.currentTimestampMs).toBe(1000);
    });

    it('Should handle setSpeed with no data', () => {
      const { result } = renderHook(() => usePlayback({ eventId: null, eventType: null, isCompound: false }), { wrapper });
      act(() => result.current.setSpeed(2));
      expect(result.current.speed).toBe(2);
    });
  });
});
