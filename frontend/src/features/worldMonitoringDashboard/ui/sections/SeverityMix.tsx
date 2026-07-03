import { Box, Chip, Stack, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { worldMonitorPalette } from "@/shared/utils/worldMonitoringUtils";

interface SeverityMixProps {
  severityData: any[];
  severityTotal: number;
}

export const SeverityMix = ({
  severityData,
  severityTotal,
}: SeverityMixProps) => {
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
        Severity Mix
      </Typography>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={severityData}
            dataKey="value"
            nameKey="name"
            outerRadius={88}
          >
            {severityData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
        {severityData.map((entry) => (
          <Chip
            key={entry.name}
            size="small"
            label={`${entry.name} ${entry.value}${
              severityTotal
                ? ` • ${Math.round((entry.value / severityTotal) * 100)}%`
                : ""
            }`}
            sx={{
              color: entry.color,
              backgroundColor: `${entry.color}20`,
              border: `1px solid ${entry.color}55`,
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};
