import { Box, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { worldMonitorPalette } from "@/shared/utils/worldMonitoringUtils";

interface ActivityTrendProps {
  trends: any[];
}

export const ActivityTrend = ({ trends }: ActivityTrendProps) => {
  return (
    <Box
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

      <ResponsiveContainer width="100%" height={240}>
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
            stroke={worldMonitorPalette.accent}
            strokeWidth={2.5}
          />

          <Line
            type="monotone"
            dataKey="criticalHighEvents"
            stroke="#ff4d67"
            strokeWidth={2.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};
