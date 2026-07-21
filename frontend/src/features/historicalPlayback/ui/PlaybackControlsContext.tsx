import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PlaybackControlsContext,
  type PlaybackSessionControls,
} from "./usePlaybackControls";

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
