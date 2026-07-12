import { mapFiltersToApi, mapTrajectoryResponse } from "./mappers";
import type {
  PlaybackChunk,
  PlaybackFilter,
  TimeGranularity,
} from "./types";
import {
  GRANULARITY_SECONDS,
  GRANULARITY_BUFFER_SIZE,
} from "./types";

import type { TrajectoryRequestApi, TrajectoryResponseApi } from "../api/types";

export type FetchTrajectoriesFn = (
  payload: TrajectoryRequestApi,
) => Promise<TrajectoryResponseApi>;

export class TrajectoryBufferManager {
  private baseTime: string;

  private endTime: string;

  private geometry: GeoJSON.Geometry;

  private granularity: TimeGranularity;

  private filters: PlaybackFilter[];

  private buffer = new Map<number, PlaybackChunk>();

  private loadingPromises = new Map<number, Promise<PlaybackChunk>>();

  private maxBufferSize: number;

  private fetchFn: FetchTrajectoriesFn;

  constructor(
    baseTime: string,
    endTime: string,
    geometry: GeoJSON.Geometry,
    granularity: TimeGranularity,
    filters: PlaybackFilter[],
    fetchFn: FetchTrajectoriesFn,
  ) {
    this.baseTime = baseTime;
    this.endTime = endTime;
    this.geometry = geometry;
    this.granularity = granularity;
    this.filters = filters;
    this.maxBufferSize = GRANULARITY_BUFFER_SIZE[granularity];
    this.fetchFn = fetchFn;
  }

  getChunkOffset(timeSeconds: number): number {
    const chunkSeconds = GRANULARITY_SECONDS[this.granularity];
    return Math.floor(timeSeconds / chunkSeconds);
  }

  private getChunkTimeWindow(chunkOffset: number): {
    startTime: string;
    endTime: string;
  } {
    const chunkSeconds = GRANULARITY_SECONDS[this.granularity];
    const baseMs = new Date(this.baseTime).getTime();
    const chunkStartMs = baseMs + chunkOffset * chunkSeconds * 1000;
    const chunkEndMs = chunkStartMs + chunkSeconds * 1000;
    const overallEndMs = new Date(this.endTime).getTime();
    const clampedEndMs = Math.min(chunkEndMs, overallEndMs);
    return {
      startTime: new Date(chunkStartMs).toISOString(),
      endTime: new Date(clampedEndMs).toISOString(),
    };
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

  private async loadChunkData(chunkOffset: number): Promise<PlaybackChunk> {
    const { startTime, endTime } = this.getChunkTimeWindow(chunkOffset);
    const payload: TrajectoryRequestApi = {
      polygon: this.geometry,
      start_time: startTime,
      end_time: endTime,
      filters: this.filters.length > 0 ? mapFiltersToApi(this.filters) : undefined,
    };
    const response = await this.fetchFn(payload);
    const chunk = mapTrajectoryResponse(response);
    return { ...chunk, chunkOffset };
  }

  private cleanupBuffer(currentChunkOffset: number): void {
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

  updateConfig(geometry: GeoJSON.Geometry): void {
    this.geometry = geometry;
    this.buffer.clear();
    this.loadingPromises.clear();
  }

  clear(): void {
    this.buffer.clear();
    this.loadingPromises.clear();
  }
}
