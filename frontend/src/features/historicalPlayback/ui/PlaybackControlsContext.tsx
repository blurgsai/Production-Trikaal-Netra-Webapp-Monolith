import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

interface PlaybackControlsContextValue {
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

const PlaybackControlsContext =
  createContext<PlaybackControlsContextValue | null>(null);

export function PlaybackControlsProvider({
  children,
  onAddSession,
  canAddSession,
}: {
  children: ReactNode;
  onAddSession?: () => void;
  canAddSession: boolean;
}) {
  const [sessions, setSessions] = useState<PlaybackSessionControls[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [labelsPanelOpen, setLabelsPanelOpen] = useState(false);

  const activeIdRef = useRef(activeSessionId);
  activeIdRef.current = activeSessionId;

  const registerSession = useCallback((controls: PlaybackSessionControls) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.sessionId === controls.sessionId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = controls;
        return next;
      }
      return [...prev, controls];
    });
  }, []);

  const unregisterSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    setActiveSessionId((prev) => (prev === sessionId ? null : prev));
    setLabelsPanelOpen((open) =>
      open && activeIdRef.current === sessionId ? false : open,
    );
  }, []);

  const toggleLabelsForSession = useCallback((sessionId: string) => {
    setLabelsPanelOpen((prev) => {
      if (prev && activeIdRef.current === sessionId) return false;
      return true;
    });
    setActiveSessionId(sessionId);
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      registerSession,
      unregisterSession,
      activeSessionId,
      setActiveSessionId,
      labelsPanelOpen,
      setLabelsPanelOpen,
      toggleLabelsForSession,
      onAddSession,
      canAddSession,
    }),
    [
      sessions,
      registerSession,
      unregisterSession,
      activeSessionId,
      labelsPanelOpen,
      toggleLabelsForSession,
      onAddSession,
      canAddSession,
    ],
  );

  return (
    <PlaybackControlsContext.Provider value={value}>
      {children}
    </PlaybackControlsContext.Provider>
  );
}
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
