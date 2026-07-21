import { createContext, useContext } from "react";
import type { LabelVisibility } from "../model/types";

export interface PlaybackSessionControls {
  sessionId: string;
  sessionColor: string;
  visible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  startTime: string;
  isBuffering?: boolean;
  labelVisibility: LabelVisibility;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onClose: () => void;
  onLabelVisibilityChange: (v: LabelVisibility) => void;
  onSliderDragStart?: () => void;
}

export interface PlaybackControlsContextValue {
  sessions: PlaybackSessionControls[];
  registerSession: (controls: PlaybackSessionControls) => void;
  unregisterSession: (sessionId: string) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  labelsPanelOpen: boolean;
  setLabelsPanelOpen: (open: boolean) => void;
  toggleLabelsForSession: (sessionId: string) => void;
  onAddSession?: () => void;
  canAddSession: boolean;
}

export const PlaybackControlsContext =
  createContext<PlaybackControlsContextValue | null>(null);

export function usePlaybackControls() {
  const ctx = useContext(PlaybackControlsContext);
  if (!ctx) {
    throw new Error(
      "usePlaybackControls must be used within PlaybackControlsProvider",
    );
  }
  return ctx;
}

export function usePlaybackControlsOptional() {
  return useContext(PlaybackControlsContext);
}
