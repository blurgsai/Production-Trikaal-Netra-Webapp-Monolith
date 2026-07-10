import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePlaybackData } from './usePlaybackData';
import { resolvePositionsAtTime, PLAYBACK_STEP_MS, TICK_INTERVAL_MS } from '../model/playbackUtils';
import type { PlaybackData, VesselPosition } from '../model/types';

interface UsePlaybackOptions {
  eventId: string | null;
  eventType: string | null;
  isCompound: boolean;
}

export interface UsePlaybackReturn {
  data: PlaybackData | null;
  isLoading: boolean;
  error: string | null;
  currentTimestampMs: number;
  currentPositions: Record<string, VesselPosition>;
  isPlaying: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  setSpeed: (s: number) => void;
}

export function usePlayback({
  eventId,
  eventType,
  isCompound,
}: UsePlaybackOptions): UsePlaybackReturn {
  const { data, isLoading, error } = usePlaybackData({ eventId, eventType, isCompound });

  const [currentTimestampMs, setCurrentTimestampMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Ref so the interval closure always reads the latest end without restarting
  const timeWindowRef = useRef(data?.timeWindow);
  timeWindowRef.current = data?.timeWindow;

  // Reset to start whenever a new event is loaded
  useEffect(() => {
    if (data) {
      setCurrentTimestampMs(data.timeWindow.queryStartMs);
      setIsPlaying(false);
    }
  }, [data]);

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || !data) return;
    const timer = setInterval(() => {
      setCurrentTimestampMs(prev => {
        const end = timeWindowRef.current?.queryEndMs ?? prev;
        if (prev >= end) {
          setIsPlaying(false);
          return prev;
        }
        return Math.min(prev + PLAYBACK_STEP_MS * speed, end);
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPlaying, speed, data]);

  const currentPositions = useMemo(
    () => (data ? resolvePositionsAtTime(data.timeline, currentTimestampMs) : {}),
    [data, currentTimestampMs],
  );

  const play  = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const seek  = useCallback((ms: number) => {
    setCurrentTimestampMs(ms);
    setIsPlaying(false);
  }, []);

  return {
    data:               data ?? null,
    isLoading,
    error,
    currentTimestampMs,
    currentPositions,
    isPlaying,
    speed,
    play,
    pause,
    seek,
    setSpeed,
  };
}
