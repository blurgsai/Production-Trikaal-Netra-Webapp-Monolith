import { Card, CardContent, Chip, Paper, Stack, Typography } from "@mui/material";

import type { DashboardHotspot } from "../model/types";
import { defenseColors } from "@/shared/theme";
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
        Operational Hotspots
      </Typography>

      <Stack
        spacing={1.25}
        className="wm-scrollable"
        role="list"
        aria-label="Operational hotspots"
        sx={{
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          pr: 0.5,
          "& > *": { flexShrink: 0 },
        }}
      >
        {hotspots.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: defenseColors.text.muted,
              textAlign: "center",
              py: 4,
            }}
          >
            No operational hotspots.
          </Typography>
        ) : (
          hotspots.map((spot) => (
            <Card
              key={spot.locationName}
              role="listitem"
              sx={{
                borderRadius: 2,
                border: `1px solid ${defenseColors.border.default}`,
                backgroundColor: defenseColors.border.soft,
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
                      color: defenseColors.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    {spot.locationName}
                  </Typography>

                  <Chip
                    size="small"
                    label={`${spot.eventCount} events`}
                    sx={{
                      color: defenseColors.text.muted,
                      backgroundColor: defenseColors.border.soft,
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
                        color: defenseColors.primary.main,
                        backgroundColor: defenseColors.primary.soft,
                      }}
                    />
                  )}

                  <Chip
                    size="small"
                    label={`${spot.criticalHighCount} high priority`}
                    sx={{
                      color: defenseColors.status.warning,
                      backgroundColor: `${defenseColors.status.warning}24`,
                    }}
                  />
                </Stack>

                <Typography
                  variant="caption"
                  sx={{
                    color: defenseColors.text.muted,
                    mt: 1,
                    display: "block",
                  }}
                >
                  Last seen {formatRelative(spot.lastSeen)}
                </Typography>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
    </Paper>
  );
};
