import { Card, CardActionArea, CardContent, Chip, Paper, Stack, Typography } from "@mui/material";

import type { DashboardRecentEvent } from "../model/types";
import { defenseColors } from "@/shared/theme";
import {
  formatEventTypeLabel,
  formatRelative,
  getSeverityConfig,
} from "../model/mappers";

interface RecentIntelligenceProps {
  recent: DashboardRecentEvent[];
  onOpenEvent: (eventId: string) => void;
}

export const RecentIntelligence = ({
  recent,
  onOpenEvent,
}: RecentIntelligenceProps) => {
  return (
    <Paper
      sx={{
        p: 2,
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        border: `1px solid ${defenseColors.border.default}`,
        backgroundColor: defenseColors.background.surface,
        overflow: "hidden",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: defenseColors.text.primary,
          fontWeight: 800,
          mb: 2,
        }}
      >
        Recent Intelligence
      </Typography>

      <Stack
        spacing={1.25}
        className="wm-scrollable"
        sx={{
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          pr: 0.5,
          "& > *": { flexShrink: 0 },
        }}
      >
        {recent.map((event) => (
          <Card
            key={event.id}
            sx={{
              borderRadius: 2,
              border: `1px solid ${defenseColors.border.default}`,
              backgroundColor: defenseColors.border.soft,
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: defenseColors.border.strong,
                backgroundColor: defenseColors.action.hover,
                transform: "translateY(-1px)",
              },
            }}
          >
            <CardActionArea onClick={() => onOpenEvent(event.id)} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
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
                  color: defenseColors.primary.main,
                  backgroundColor: defenseColors.primary.soft,
                }}
              />
            </Stack>

            <Typography
              sx={{
                color: defenseColors.text.primary,
                fontWeight: 700,
                mb: 0.5,
              }}
            >
              {event.title}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: defenseColors.text.muted,
                wordBreak: "break-word",
                overflowWrap: "break-word",
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
                    color: defenseColors.text.muted,
                  }}
                >
                  {event.location}
                </Typography>
              )}

              {event.source && (
                <Typography
                  variant="caption"
                  sx={{
                    color: defenseColors.text.muted,
                  }}
                >
                  {event.source}
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  color: defenseColors.text.muted,
                }}
              >
                {formatRelative(event.enrichedAt)}
              </Typography>
            </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Paper>
  );
};
