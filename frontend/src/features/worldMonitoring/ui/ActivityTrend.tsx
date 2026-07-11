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

import { defenseColors } from "@/shared/theme";
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
        border: `1px solid ${defenseColors.border.default}`,
        backgroundColor: defenseColors.background.surface,
        minHeight: 320,
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
        Activity Trend
      </Typography>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={trends}>
          <CartesianGrid stroke={defenseColors.border.default} vertical={false} />

          <XAxis dataKey="bucket" stroke={defenseColors.text.muted} />

          <YAxis stroke={defenseColors.text.muted} />

          <Tooltip
            contentStyle={{
              border: `1px solid ${defenseColors.border.strong}`,
              color: defenseColors.text.secondary,
            }}
            labelStyle={{
              color: defenseColors.text.secondary,
            }}
          />

          <Line
            type="monotone"
            dataKey="totalEvents"
            name="Total Events"
            stroke={defenseColors.primary.main}
            strokeWidth={2.5}
          />

          <Line
            type="monotone"
            dataKey="criticalHighEvents"
            name="Critical / High"
            stroke={defenseColors.status.error}
            strokeWidth={2.5}
          />
        </LineChart>
      </ResponsiveContainer>

      <Stack direction="row" spacing={2} mt={1.5} justifyContent="center">
        {[
          { label: "Total Events", color: defenseColors.primary.main },
          { label: "Critical / High", color: defenseColors.status.error },
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
            <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};
