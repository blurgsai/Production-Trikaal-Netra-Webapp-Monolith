import axiosInstance from '@/shared/api/client';
import type { PlaybackApiResponse } from './types';

// Toggle between the real backend and the static public/ mocks.
// Set VITE_USE_REAL_PLAYBACK=true to hit /api/playback/* on the backend;
// anything else (default) keeps the per-event-type JSON mocks.
const USE_REAL_PLAYBACK = import.meta.env.VITE_USE_REAL_PLAYBACK === 'true';

export async function fetchPlaybackData(
  eventId: string,
  eventType: string,
  isCompound: boolean,
): Promise<PlaybackApiResponse> {
  if (USE_REAL_PLAYBACK) {
    const url = isCompound
      ? `/api/playback/compound?id=${encodeURIComponent(eventId)}`
      : `/api/playback/atomic/${encodeURIComponent(eventId)}`;
    const { data } = await axiosInstance.get<PlaybackApiResponse>(url);
    return data;
  }

  const res = await fetch(`/mock/playback/${eventType}.json`);
  if (!res.ok) throw new Error(`Mock not found for event type: ${eventType}`);
  return res.json() as Promise<PlaybackApiResponse>;
}
