import { useRef, useEffect, useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  Chip,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import AnimationControls, { PlaybackTooltip } from "./AnimationControls";
import { usePlaybackControls } from "./PlaybackControlsContext";
import type { LabelVisibility } from "../model/types";

const ROW_HEIGHT = 68;
const MAX_VISIBLE_ROWS = 2;

const LABEL_OPTIONS: { key: keyof LabelVisibility; label: string }[] = [
  { key: "tracks", label: "Tracks" },
  { key: "names", label: "Names" },
  { key: "heading", label: "Heading" },
  { key: "speed", label: "Speed" },
  { key: "latlon", label: "Lat / Lng" },
];

export default function PlaybackControlsStack() {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltipDismissToken, setTooltipDismissToken] = useState(0);
  const {
    sessions,
    activeSessionId,
    labelsPanelOpen,
    toggleLabelsForSession,
    onAddSession,
    canAddSession,
    setActiveSessionId,
  } = usePlaybackControls();

  const visibleSessions = sessions.filter((s) => s.visible);
  const activeSession = sessions.find((s) => s.sessionId === activeSessionId);

  useEffect(() => {
    if (scrollRef.current && visibleSessions.length > MAX_VISIBLE_ROWS) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleSessions.length]);

  if (visibleSessions.length === 0) return null;

  const visibleHeight =
    Math.min(visibleSessions.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;
  const labelsBottom =
    Math.min(visibleSessions.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT + 8;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        pointerEvents: "none",
      }}
    >
      {labelsPanelOpen && activeSession && (
        <Box
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            bottom: labelsBottom,
            right: 16,
            zIndex: 1101,
            pointerEvents: "auto",
            bgcolor: alpha(theme.palette.background.default, 0.92),
            backdropFilter: "blur(8px)",
            borderRadius: 2,
            px: 1.5,
            py: 1.25,
            border: `1px solid ${alpha(activeSession.sessionColor, 0.4)}`,
            boxShadow: theme.shadows[8],
            minWidth: 280,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: activeSession.sessionColor,
              fontWeight: 700,
              mb: 1,
              display: "block",
            }}
          >
            Vessel Labels
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {LABEL_OPTIONS.map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                size="small"
                onClick={() =>
                  activeSession.onLabelVisibilityChange({
                    ...activeSession.labelVisibility,
                    [key]: !activeSession.labelVisibility[key],
                  })
                }
                icon={
                  activeSession.labelVisibility[key] ? (
                    <span style={{ fontSize: 10, marginLeft: 6 }}>✓</span>
                  ) : undefined
                }
                variant={
                  activeSession.labelVisibility[key] ? "filled" : "outlined"
                }
                sx={{
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  bgcolor: activeSession.labelVisibility[key]
                    ? alpha(activeSession.sessionColor, 0.15)
                    : "transparent",
                  borderColor: activeSession.labelVisibility[key]
                    ? activeSession.sessionColor
                    : alpha(theme.palette.divider, 0.8),
                  color: activeSession.labelVisibility[key]
                    ? activeSession.sessionColor
                    : "text.secondary",
                  "& .MuiChip-icon": {
                    color: activeSession.sessionColor,
                    ml: 0.25,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      <Box
        ref={scrollRef}
        onScroll={() => setTooltipDismissToken((t) => t + 1)}
        sx={{
          height: visibleHeight,
          maxHeight: visibleHeight,
          overflowY:
            visibleSessions.length > MAX_VISIBLE_ROWS ? "scroll" : "hidden",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
          bgcolor: theme.palette.background.default,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
          scrollbarColor: `${theme.palette.primary.main} ${theme.palette.background.default}`,
          "&::-webkit-scrollbar": {
            width: 8,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: theme.palette.background.default,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.primary.main,
            borderRadius: 4,
            border: `2px solid ${theme.palette.background.default}`,
            "&:hover": {
              backgroundColor: theme.palette.primary.light,
            },
          },
          "&::-webkit-scrollbar-corner": {
            backgroundColor: theme.palette.background.default,
          },
        }}
      >
        {visibleSessions.map((session) => (
          <Box
            key={session.sessionId}
            sx={{ height: ROW_HEIGHT, flexShrink: 0 }}
          >
            <AnimationControls
              visible={session.visible}
              isPlaying={session.isPlaying}
              currentTime={session.currentTime}
              duration={session.duration}
              playbackSpeed={session.playbackSpeed}
              startTime={session.startTime}
              isBuffering={session.isBuffering}
              sessionColor={session.sessionColor}
              isLayersActive={
                labelsPanelOpen && activeSessionId === session.sessionId
              }
              isKeyboardActive={activeSessionId === session.sessionId}
              stacked
              onPlayPause={() => session.onPlayPause()}
              onSeek={session.onSeek}
              onSpeedChange={session.onSpeedChange}
              onClose={session.onClose}
              onSliderDragStart={session.onSliderDragStart}
              onLayersToggle={(e) => {
                e.stopPropagation();
                toggleLabelsForSession(session.sessionId);
              }}
              onActivate={() => setActiveSessionId(session.sessionId)}
              tooltipDismissToken={tooltipDismissToken}
            />
          </Box>
        ))}
      </Box>

      {canAddSession && onAddSession && (
        <PlaybackTooltip dismissToken={tooltipDismissToken} title="Add another playback (up to 4)" arrow>
          <IconButton
            onClick={onAddSession}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{
              position: "absolute",
              bottom: visibleHeight + 12,
              left: 16,
              pointerEvents: "auto",
              bgcolor: alpha(theme.palette.background.default, 0.85),
              backdropFilter: "blur(8px)",
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              color: "primary.main",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.12) },
            }}
          >
            <AddIcon />
          </IconButton>
        </PlaybackTooltip>
      )}
    </Box>
  );
}
