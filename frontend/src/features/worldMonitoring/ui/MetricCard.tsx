import { Box, Card, CardContent, Typography } from "@mui/material";

import { worldMonitorPalette } from "../model/types";

interface MetricCardProps {
  label: string;
  value: number;
  helper: string;
}

export const MetricCard = ({ label, value, helper }: MetricCardProps) => {
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${worldMonitorPalette.border}`,
        background:
          "linear-gradient(180deg, rgba(18,35,59,0.96), rgba(9,22,37,0.98))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            "linear-gradient(90deg, rgba(78,195,255,0.9), rgba(255,138,61,0.85))",
        }}
      />

      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: worldMonitorPalette.textMuted }}
        >
          {label}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            color: worldMonitorPalette.text,
            fontWeight: 800,
            my: 0.5,
          }}
        >
          {value}
        </Typography>

        <Typography variant="body2" sx={{ color: worldMonitorPalette.textMuted }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
};
