import { Box, Paper, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { worldMonitorPalette } from "../model/types";
import type { DashboardEventTypeDistribution } from "../model/types";

interface EventTypesProps {
  eventTypeData: (DashboardEventTypeDistribution & { label: string })[];
  topEventType?: DashboardEventTypeDistribution & { label: string };
}

export const EventTypes = ({
  eventTypeData,
  topEventType,
}: EventTypesProps) => {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${worldMonitorPalette.border}`,
        backgroundColor: worldMonitorPalette.panel,
        minHeight: 320,
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
        Event Types
      </Typography>

      {topEventType && (
        <Typography
          variant="body2"
          sx={{
            color: worldMonitorPalette.textMuted,
            mb: 1,
          }}
        >
          Most reported class:
          <Box
            component="span"
            sx={{
              color: worldMonitorPalette.text,
              fontWeight: 700,
              ml: 0.5,
            }}
          >
            {topEventType.label}
          </Box>
        </Typography>
      )}

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={eventTypeData} layout="vertical">
          <CartesianGrid
            stroke={worldMonitorPalette.border}
            horizontal={false}
          />

          <XAxis type="number" stroke={worldMonitorPalette.textMuted} />

          <YAxis
            dataKey="label"
            type="category"
            width={150}
            stroke={worldMonitorPalette.textMuted}
          />

          <Tooltip
            contentStyle={{
              border: `1px solid ${worldMonitorPalette.borderStrong}`,
              color: worldMonitorPalette.textSecondary,
            }}
            labelStyle={{
              color: worldMonitorPalette.textSecondary,
            }}
          />

          <Bar
            dataKey="value"
            fill={worldMonitorPalette.accent}
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};
