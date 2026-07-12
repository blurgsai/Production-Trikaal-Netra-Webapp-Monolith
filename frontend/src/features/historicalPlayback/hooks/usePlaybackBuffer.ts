import { useState, useEffect, useRef, useCallback } from "react";

import { fetchVesselTrajectories } from "../api/historicalPlaybackApi";
import { mapTrajectoryRequestToApi, mapTrajectoryResponse } from "../model/mappers";
import { TrajectoryBufferManager } from "../model/dataBufferManager";

import type { PlaybackChunk, PlaybackFilter, TimeGranularity, TrajectoryRequest } from "../model/types";

interface SliderChangeResult {
  chunkOffset: number;
  data: PlaybackChunk;
}

export interface UsePlaybackBufferResult {
  bufferManager: TrajectoryBufferManager | null;
  currentChunk: number;
  isBuffering: boolean;
  bufferError: Error | null;
  initializeBuffer: (
    baseTime: string,
    endTime: string,
    geometry: GeoJSON.Geometry,
    granularity: TimeGranularity,
    filters: PlaybackFilter[],
  ) => TrajectoryBufferManager;
  handleSliderChange: (
    timeSeconds: number,
  ) => Promise<SliderChangeResult | null>;
  getChunkData: (chunkOffset: number) => Promise<PlaybackChunk>;
  updateBufferConfig: (
    geometry: GeoJSON.Geometry,
  ) => void;
  clearBuffer: () => void;
}

export function usePlaybackBuffer(): UsePlaybackBufferResult {
  const [bufferManager, setBufferManager] =
    useState<TrajectoryBufferManager | null>(null);

  const [currentChunk, setCurrentChunk] = useState(0);

  const [isBuffering, setIsBuffering] = useState(false);

  const [bufferError, setBufferError] = useState<Error | null>(null);

  const lastChunkRef = useRef(-1);

  const bufferManagerRef = useRef<TrajectoryBufferManager | null>(null);

  const initializeBuffer = useCallback(
    (
      baseTime: string,
      endTime: string,
      geometry: GeoJSON.Geometry,
      granularity: TimeGranularity,
      filters: PlaybackFilter[],
    ) => {
      const manager = new TrajectoryBufferManager(
        baseTime,
        endTime,
        geometry,
        granularity,
        filters,
        (payload: TrajectoryRequest) =>
          fetchVesselTrajectories(mapTrajectoryRequestToApi(payload)).then(
            mapTrajectoryResponse,
          ),
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
    (geometry: GeoJSON.Geometry) => {
      if (bufferManagerRef.current) {
        bufferManagerRef.current.updateConfig(geometry);
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
