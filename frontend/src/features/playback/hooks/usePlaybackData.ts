import { useQuery } from '@tanstack/react-query';
import { fetchPlaybackData } from '../api/playbackApi';
import { mapPlaybackFromApi } from '../model/mappers';
import type { PlaybackData } from '../model/types';

interface UsePlaybackDataOptions {
  eventId: string | null;
  eventType: string | null;
  isCompound: boolean;
}

export interface UsePlaybackDataReturn {
  data: PlaybackData | undefined;
  isLoading: boolean;
  error: string | null;
}

// The "fetch + map + cache" hook (design_pattern.md Layer 3). It owns the ONLY
// call to mapPlaybackFromApi, so a hook test that leaves the mapper unmocked
// covers the whole anti-corruption layer (queryEnd fallback, buffer, sort).
// usePlayback isolates its timer logic by mocking THIS hook — never the mapper.
export function usePlaybackData({
  eventId,
  eventType,
  isCompound,
}: UsePlaybackDataOptions): UsePlaybackDataReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['playback', eventId, isCompound],
    queryFn: () => fetchPlaybackData(eventId!, eventType!, isCompound),
    enabled: !!eventId && !!eventType,
    select: mapPlaybackFromApi,
    staleTime: Infinity,
  });

  return {
    data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
