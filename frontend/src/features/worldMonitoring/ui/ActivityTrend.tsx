import { Box, Paper, Stack, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { worldMonitorPalette } from "../model/types";
import type { DashboardTrend } from "../model/types";

interface ActivityTrendProps {
  trends: DashboardTrend[];
}

export const ActivityTrend = ({ trends }: ActivityTrendProps) => {
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
        Activity Trend
      </Typography>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={trends}>
          <CartesianGrid stroke={worldMonitorPalette.border} vertical={false} />

          <XAxis dataKey="bucket" stroke={worldMonitorPalette.textMuted} />

          <YAxis stroke={worldMonitorPalette.textMuted} />

          <Tooltip
            contentStyle={{
              border: `1px solid ${worldMonitorPalette.borderStrong}`,
              color: worldMonitorPalette.textSecondary,
            }}
            labelStyle={{
              color: worldMonitorPalette.textSecondary,
            }}
          />

          <Line
            type="monotone"
            dataKey="totalEvents"
            name="Total Events"
            stroke={worldMonitorPalette.accent}
            strokeWidth={2.5}
          />

          <Line
            type="monotone"
            dataKey="criticalHighEvents"
            name="Critical / High"
            stroke="#ff4d67"
            strokeWidth={2.5}
          />
        </LineChart>
      </ResponsiveContainer>

      <Stack direction="row" spacing={2} mt={1.5} justifyContent="center">
        {[
          { label: "Total Events", color: worldMonitorPalette.accent },
          { label: "Critical / High", color: "#ff4d67" },
        ].map((item) => (
          <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: item.color,
              }}
            />
            <Typography variant="caption" sx={{ color: worldMonitorPalette.textMuted }}>
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};
