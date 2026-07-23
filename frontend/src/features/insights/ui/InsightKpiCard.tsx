import { Box, Card, CardContent, Typography } from "@mui/material";

import { defenseColors } from "@/shared/theme";

import type { InsightsKpi } from "../model/types";

interface InsightKpiCardProps {
  kpi: InsightsKpi;
}

export function InsightKpiCard({ kpi }: InsightKpiCardProps) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${defenseColors.border.default}`,
        background: `linear-gradient(180deg, ${defenseColors.background.surfaceAlt}, ${defenseColors.background.surface})`,
        position: "relative",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${defenseColors.primary.main}, ${defenseColors.status.info})`,
        }}
      />

      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography
          variant="h4"
          sx={{
            color: defenseColors.text.primary,
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {kpi.value.toLocaleString()}
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: defenseColors.text.muted, mt: 0.75 }}
        >
          {kpi.label}
        </Typography>
      </CardContent>
    </Card>
  );
}
