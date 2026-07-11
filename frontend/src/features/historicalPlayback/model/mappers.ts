import type {
  PlaybackAttributeApi,
  PlaybackAttributesResponse,
  PlaybackChunkResponse,
  PlaybackPointApi,
  PlaybackQueryPayload,
} from "../api/types";

import type {
  PlaybackAttribute,
  PlaybackChunk,
  PlaybackPoint,
  PlaybackQuery,
} from "./types";

export function mapPlaybackAttribute(
  attribute: PlaybackAttributeApi,
): PlaybackAttribute {
  return {
    key: attribute.key,
    path: attribute.path,
  };
}

export function mapPlaybackAttributes(
  response: PlaybackAttributesResponse,
): PlaybackAttribute[] {
  return response.attributes.map(mapPlaybackAttribute);
}

export function mapPlaybackPoint(point: PlaybackPointApi): PlaybackPoint {
  return {
    timestamp: point.ts,
    latitude: point.lat,
    longitude: point.lon,
    heading: point.heading,
  };
}

export function mapPlaybackChunk(
  response: PlaybackChunkResponse,
): PlaybackChunk {
  return {
    chunkOffset: response.chunk_offset,
    chunkStart: response.chunk_start,
    chunkEnd: response.chunk_end,
    timestamps: response.timestamps,
    vessels: Object.fromEntries(
      Object.entries(response.vessels).map(([vesselId, points]) => [
        vesselId,
        points.map(mapPlaybackPoint),
      ]),
    ),
  };
}

export function mapPlaybackQuery(query: PlaybackQuery): PlaybackQueryPayload {
  return {
    base_time: query.baseTime,
    chunk_offset: query.chunkOffset,
    granularity: query.granularity,
    geometry: query.geometry,
    filters: query.filters,
  };
}
