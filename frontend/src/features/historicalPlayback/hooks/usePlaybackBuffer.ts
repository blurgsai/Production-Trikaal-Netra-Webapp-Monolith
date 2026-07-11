import { useState, useEffect, useRef, useCallback } from "react";

import { DataBufferManager } from "../model/DataBufferManager";

import type { PlaybackChunk, TimeGranularity } from "../model/types";

interface SliderChangeResult {
  chunkOffset: number;
  data: PlaybackChunk;
}

export interface UsePlaybackBufferResult {
  bufferManager: DataBufferManager | null;
  currentChunk: number;
  isBuffering: boolean;
  bufferError: Error | null;
  initializeBuffer: (
    baseTime: string,
    geometry: GeoJSON.Geometry,
    filters: Record<string, unknown>,
    granularity: TimeGranularity,
  ) => DataBufferManager;
  handleSliderChange: (
    timeSeconds: number,
  ) => Promise<SliderChangeResult | null>;
  getChunkData: (chunkOffset: number) => Promise<PlaybackChunk>;
  updateBufferConfig: (
    geometry: GeoJSON.Geometry,
    filters: Record<string, unknown>,
  ) => void;
  clearBuffer: () => void;
}

export function usePlaybackBuffer(): UsePlaybackBufferResult {
  const [bufferManager, setBufferManager] =
    useState<DataBufferManager | null>(null);

  const [currentChunk, setCurrentChunk] = useState(0);

  const [isBuffering, setIsBuffering] = useState(false);

  const [bufferError, setBufferError] = useState<Error | null>(null);

  const lastChunkRef = useRef(-1);

  const bufferManagerRef = useRef<DataBufferManager | null>(null);

  const initializeBuffer = useCallback(
    (
      baseTime: string,
      geometry: GeoJSON.Geometry,
      filters: Record<string, unknown>,
      granularity: TimeGranularity,
    ) => {
      const manager = new DataBufferManager(
        baseTime,
        geometry,
        filters,
        granularity,
      );
      setBufferManager(manager);
      bufferManagerRef.current = manager;
      setBufferError(null);
      return manager;
    },
    [],
  );

  const handleSliderChange = useCallback(
    async (timeSeconds: number): Promise<SliderChangeResult | null> => {
      if (!bufferManagerRef.current) return null;

      const newChunkOffset =
        bufferManagerRef.current.getChunkOffset(timeSeconds);

      if (newChunkOffset === lastChunkRef.current) return null;

      lastChunkRef.current = newChunkOffset;
      setCurrentChunk(newChunkOffset);
      setIsBuffering(true);
      setBufferError(null);

      try {
        const result =
          await bufferManagerRef.current.handleSliderChange(timeSeconds);
        setIsBuffering(false);
        return result;
      } catch (error) {
        setBufferError(error as Error);
        setIsBuffering(false);
        throw error;
      }
    },
    [],
  );

  const getChunkData = useCallback(
    async (chunkOffset: number): Promise<PlaybackChunk> => {
      if (!bufferManagerRef.current) {
        throw new Error("Buffer manager not initialized");
      }

      setIsBuffering(true);
      setBufferError(null);

      try {
        const data =
          await bufferManagerRef.current.getChunkData(chunkOffset);
        setIsBuffering(false);
        return data;
      } catch (error) {
        setBufferError(error as Error);
        setIsBuffering(false);
        throw error;
      }
    },
    [],
  );

  const updateBufferConfig = useCallback(
    (geometry: GeoJSON.Geometry, filters: Record<string, unknown>) => {
      if (bufferManagerRef.current) {
        bufferManagerRef.current.updateConfig(geometry, filters);
        setBufferError(null);
      }
    },
    [],
  );

  const clearBuffer = useCallback(() => {
    if (bufferManagerRef.current) {
      bufferManagerRef.current.clear();
      setCurrentChunk(0);
      lastChunkRef.current = -1;
      setBufferError(null);
    }
    setBufferManager(null);
    bufferManagerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      bufferManagerRef.current?.clear();
    };
  }, []);

  return {
    bufferManager,
    currentChunk,
    isBuffering,
    bufferError,
    initializeBuffer,
    handleSliderChange,
    getChunkData,
    updateBufferConfig,
    clearBuffer,
  };
}
