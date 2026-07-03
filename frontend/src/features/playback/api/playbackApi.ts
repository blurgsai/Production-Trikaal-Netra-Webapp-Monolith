import type { PlaybackApiResponse } from './types';

export async function fetchPlaybackData(
  _eventId: string,
  eventType: string,
  _isCompound: boolean,
): Promise<PlaybackApiResponse> {
  // TODO: swap to real API when backend data is ready:
  // const isCompound = _isCompound;
  // const url = isCompound
  //   ? `/api/compound-events/playback?id=${_eventId}`
  //   : `/api/mongo-events/${_eventId}/playback`;
  // const { data } = await axiosInstance.get(url);
  // return data;

  const res = await fetch(`/mock/playback/${eventType}.json`);
  if (!res.ok) throw new Error(`Mock not found for event type: ${eventType}`);
  return res.json() as Promise<PlaybackApiResponse>;
}
