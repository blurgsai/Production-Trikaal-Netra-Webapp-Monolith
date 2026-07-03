import { Box, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { worldMonitorPalette } from "@/shared/utils/worldMonitoringUtils";

interface EventTypesProps {
  eventTypeData: any[];
  topEventType?: any;
}

export const EventTypes = ({
  eventTypeData,
  topEventType,
}: EventTypesProps) => {
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
    </Box>
  );
};
