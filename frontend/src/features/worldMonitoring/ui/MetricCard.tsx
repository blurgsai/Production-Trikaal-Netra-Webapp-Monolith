import { Box, Card, CardContent, Typography } from "@mui/material";
import { useId } from "react";

import { defenseColors } from "@/shared/theme";

interface MetricCardProps {
  label: string;
  value: number;
  helper: string;
}

export const MetricCard = ({ label, value, helper }: MetricCardProps) => {
  const reactId = useId();
  const labelId = `${reactId}-label`;
  const helperId = `${reactId}-helper`;

  return (
    <Card
      component="article"
      aria-labelledby={labelId}
      aria-describedby={helperId}
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
          id={labelId}
          variant="caption"
          sx={{ color: defenseColors.text.muted }}
        >
          {label}
        </Typography>

        <Typography
          component="div"
          variant="h4"
          sx={{
            color: defenseColors.text.primary,
            fontWeight: 800,
            my: 0.5,
          }}
        >
          {value}
        </Typography>

        <Typography
          id={helperId}
          variant="body2"
          sx={{ color: defenseColors.text.muted }}
        >
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
};
