import { fetchPlaybackVessels } from "../api/historicalPlaybackApi";
import { mapPlaybackChunk, mapPlaybackQuery } from "../model/mappers";
import type {
  PlaybackChunk,
  PlaybackQuery,
  TimeGranularity,
} from "../model/types";
import {
  GRANULARITY_SECONDS,
  GRANULARITY_BUFFER_SIZE,
} from "../model/types";

export class DataBufferManager {
  private baseTime: string;

  private geometry: GeoJSON.Geometry;

  private filters: Record<string, unknown>;

  private granularity: TimeGranularity;

  private buffer = new Map<number, PlaybackChunk>();

  private loadingPromises = new Map<number, Promise<PlaybackChunk>>();

  private maxBufferSize: number;

  constructor(
    baseTime: string,
    geometry: GeoJSON.Geometry,
    filters: Record<string, unknown>,
    granularity: TimeGranularity = "minute",
  ) {
    this.baseTime = baseTime;
    this.geometry = geometry;
    this.filters = filters;
    this.granularity = granularity;
    this.maxBufferSize = GRANULARITY_BUFFER_SIZE[granularity];
  }

  getChunkOffset(timeSeconds: number): number {
    const chunkSeconds = GRANULARITY_SECONDS[this.granularity];
    return Math.floor(timeSeconds / chunkSeconds);
  }

  async getChunkData(chunkOffset: number): Promise<PlaybackChunk> {
    if (this.buffer.has(chunkOffset)) {
      return this.buffer.get(chunkOffset)!;
    }

    if (this.loadingPromises.has(chunkOffset)) {
      return this.loadingPromises.get(chunkOffset)!;
    }

    const loadPromise = this.loadChunkData(chunkOffset);
    this.loadingPromises.set(chunkOffset, loadPromise);

    try {
      const data = await loadPromise;
      this.buffer.set(chunkOffset, data);
      this.loadingPromises.delete(chunkOffset);
      return data;
    } catch (error) {
      this.loadingPromises.delete(chunkOffset);
      throw error;
    }
  }

  async loadChunkData(chunkOffset: number): Promise<PlaybackChunk> {
    const query: PlaybackQuery = {
      baseTime: this.baseTime,
      chunkOffset,
      granularity: this.granularity,
      geometry: this.geometry,
      filters: this.filters,
    };

    const response = await fetchPlaybackVessels(mapPlaybackQuery(query));
    return mapPlaybackChunk(response);
  }

  cleanupBuffer(currentChunkOffset: number): void {
    const keysToRemove: number[] = [];

    for (const [chunkOffset] of this.buffer) {
      const distance = Math.abs(chunkOffset - currentChunkOffset);
      if (distance > this.maxBufferSize) {
        keysToRemove.push(chunkOffset);
      }
    }

    keysToRemove.forEach((key) => {
      this.buffer.delete(key);
    });
  }

  async handleSliderChange(timeSeconds: number): Promise<{
    chunkOffset: number;
    data: PlaybackChunk;
  }> {
    const newChunkOffset = this.getChunkOffset(timeSeconds);
    this.cleanupBuffer(newChunkOffset);
    const currentData = await this.getChunkData(newChunkOffset);
    return {
      chunkOffset: newChunkOffset,
      data: currentData,
    };
  }

  updateConfig(
    geometry: GeoJSON.Geometry,
    filters: Record<string, unknown>,
  ): void {
    this.geometry = geometry;
    this.filters = filters;
    this.buffer.clear();
    this.loadingPromises.clear();
  }

  clear(): void {
    this.buffer.clear();
    this.loadingPromises.clear();
  }
}
