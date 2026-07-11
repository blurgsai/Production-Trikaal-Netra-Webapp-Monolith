import { Card, CardContent, Chip, Paper, Stack, Typography } from "@mui/material";

import type { DashboardHotspot } from "../model/types";
import { worldMonitorPalette } from "../model/types";
import { formatEventTypeLabel, formatRelative } from "../model/mappers";

interface OperationalHotspotsProps {
  hotspots: DashboardHotspot[];
}

export const OperationalHotspots = ({ hotspots }: OperationalHotspotsProps) => {
  return (
    <Paper
      sx={{
        p: 2,
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        border: `1px solid ${worldMonitorPalette.border}`,
        backgroundColor: worldMonitorPalette.panel,
        overflow: "hidden",
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
        Operational Hotspots
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
        {hotspots.map((spot) => (
          <Card
            key={spot.locationName}
            sx={{
              borderRadius: 2,
              border: `1px solid ${worldMonitorPalette.border}`,
              backgroundColor: "rgba(255,255,255,0.02)",
            }}
          >
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                sx={{
                  color: worldMonitorPalette.text,
                  fontWeight: 600,
                }}
              >
                {spot.locationName}
              </Typography>

              <Chip
                size="small"
                label={`${spot.eventCount} events`}
                sx={{
                  color: worldMonitorPalette.textMuted,
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              />
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              mt={1}
              flexWrap="wrap"
              useFlexGap
            >
              {spot.dominantEventType && (
                <Chip
                  size="small"
                  label={formatEventTypeLabel(spot.dominantEventType)}
                  sx={{
                    color: worldMonitorPalette.accent,
                    backgroundColor: worldMonitorPalette.accentSoft,
                  }}
                />
              )}

              <Chip
                size="small"
                label={`${spot.criticalHighCount} high priority`}
                sx={{
                  color: "#ff8a3d",
                  backgroundColor: "rgba(255,138,61,0.14)",
                }}
              />
            </Stack>

            <Typography
              variant="caption"
              sx={{
                color: worldMonitorPalette.textMuted,
                mt: 1,
                display: "block",
              }}
            >
              Last seen {formatRelative(spot.lastSeen)}
            </Typography>
          </CardContent>
          </Card>
        ))}
      </Stack>
    </Paper>
  );
};
