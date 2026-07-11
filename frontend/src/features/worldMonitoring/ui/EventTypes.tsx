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

import { defenseColors } from "@/shared/theme";
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
        Event Types
      </Typography>

      {topEventType && (
        <Typography
          variant="body2"
          sx={{
            color: defenseColors.text.muted,
            mb: 1,
          }}
        >
          Most reported class:
          <Box
            component="span"
            sx={{
              color: defenseColors.text.primary,
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
            stroke={defenseColors.border.default}
            horizontal={false}
          />

          <XAxis type="number" stroke={defenseColors.text.muted} />

          <YAxis
            dataKey="label"
            type="category"
            width={150}
            stroke={defenseColors.text.muted}
          />

          <Tooltip
            contentStyle={{
              border: `1px solid ${defenseColors.border.strong}`,
              color: defenseColors.text.secondary,
            }}
            labelStyle={{
              color: defenseColors.text.secondary,
            }}
          />

          <Bar
            dataKey="value"
            fill={defenseColors.primary.main}
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};
