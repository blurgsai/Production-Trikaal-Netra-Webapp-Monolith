import { Box, ButtonBase, Chip, Stack, Typography } from "@mui/material";

import type { DashboardRecentEvent } from "../../model/types";

import {
  formatEventTypeLabel,
  formatRelative,
  getSeverityConfig,
  worldMonitorPalette,
} from "@/shared/utils/worldMonitoringUtils";

interface RecentIntelligenceProps {
  recent: DashboardRecentEvent[];
  onOpenEvent: (eventId: string) => void;
}

export const RecentIntelligence = ({
  recent,
  onOpenEvent,
}: RecentIntelligenceProps) => {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${worldMonitorPalette.border}`,
        backgroundColor: worldMonitorPalette.panel,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: worldMonitorPalette.text,
          fontWeight: 800,
          mb: 2,
        }}
      >
        Recent Intelligence
      </Typography>

      <Stack spacing={1.25}>
        {recent.map((event) => (
          <ButtonBase
            key={event.id}
            onClick={() => onOpenEvent(event.id)}
            sx={{
              display: "block",
              textAlign: "left",
              p: 1.5,
              borderRadius: 2,
              border: `1px solid ${worldMonitorPalette.border}`,
              backgroundColor: "rgba(255,255,255,0.02)",
              width: "100%",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: worldMonitorPalette.borderStrong,
                backgroundColor: "rgba(255,255,255,0.04)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
              <Chip
                size="small"
                label={event.threatLevel}
                sx={{
                  color: getSeverityConfig(event.threatLevel).color,
                  backgroundColor: getSeverityConfig(event.threatLevel).bg,
                  border: `1px solid ${
                    getSeverityConfig(event.threatLevel).border
                  }`,
                  fontWeight: 700,
                }}
              />

              <Chip
                size="small"
                label={formatEventTypeLabel(event.eventType)}
                sx={{
                  color: worldMonitorPalette.accent,
                  backgroundColor: worldMonitorPalette.accentSoft,
                }}
              />
            </Stack>

            <Typography
              sx={{
                color: worldMonitorPalette.text,
                fontWeight: 700,
                mb: 0.5,
              }}
            >
              {event.title}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: worldMonitorPalette.textMuted,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {event.summary}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              mt={1}
            >
              {event.location && (
                <Typography
                  variant="caption"
                  sx={{
                    color: worldMonitorPalette.textMuted,
                  }}
                >
                  {event.location}
                </Typography>
              )}

              {event.source && (
                <Typography
                  variant="caption"
                  sx={{
                    color: worldMonitorPalette.textMuted,
                  }}
                >
                  {event.source}
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  color: worldMonitorPalette.textMuted,
                }}
              >
                {formatRelative(event.enrichedAt)}
              </Typography>
            </Stack>
          </ButtonBase>
        ))}
      </Stack>
    </Box>
  );
};
