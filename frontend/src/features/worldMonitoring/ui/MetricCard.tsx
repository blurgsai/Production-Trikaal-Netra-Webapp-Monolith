import { Box, Card, CardContent, Typography } from "@mui/material";

import { defenseColors } from "@/shared/theme";

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
        border: `1px solid ${defenseColors.border.default}`,
        background: `linear-gradient(180deg, ${defenseColors.background.surfaceAlt}, ${defenseColors.background.surface})`,
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
          background: `linear-gradient(90deg, ${defenseColors.primary.main}, ${defenseColors.status.warning})`,
        }}
      />

      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: defenseColors.text.muted }}
        >
          {label}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            color: defenseColors.text.primary,
            fontWeight: 800,
            my: 0.5,
          }}
        >
          {value}
        </Typography>

        <Typography variant="body2" sx={{ color: defenseColors.text.muted }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
};
