import type {
  PlaybackAttributesResponse,
  PlaybackChunkResponse,
  PlaybackQueryPayload,
} from "./types";

export async function fetchPlaybackAttributes(): Promise<PlaybackAttributesResponse> {
  const res = await fetch("/mock/playback/attributes.json");
  if (!res.ok) throw new Error("Failed to fetch playback attributes");
  return res.json();
}

export async function fetchPlaybackVessels(
  payload: PlaybackQueryPayload,
): Promise<PlaybackChunkResponse> {
  const { granularity, chunk_offset } = payload;
  const res = await fetch(`/mock/playback/${granularity}-${chunk_offset}.json`);
  if (!res.ok)
    throw new Error(
      `Failed to fetch ${granularity} ${chunk_offset} playback data`,
    );
  return res.json();
}
