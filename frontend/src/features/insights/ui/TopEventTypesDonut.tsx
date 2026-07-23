import { Box, Paper, Stack, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { defenseColors } from "@/shared/theme";

import type { InsightsEventTypeShare } from "../model/types";

const BLUE_RAMP = [
  defenseColors.primary.main,
  defenseColors.primary.dark,
  defenseColors.status.info,
  defenseColors.primary.hover,
  "#0891b2",
  "#155e75",
] as const;

interface TopEventTypesDonutProps {
  shares: InsightsEventTypeShare[];
  total: number;
}

export function TopEventTypesDonut({ shares, total }: TopEventTypesDonutProps) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${defenseColors.border.default}`,
        backgroundColor: defenseColors.background.surface,
        height: "100%",
        minHeight: 320,
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: defenseColors.text.primary, fontWeight: 800, mb: 2 }}
      >
        Top Event Types (by Count)
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
      >
        <Box sx={{ width: 200, height: 200, position: "relative", flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={shares}
                dataKey="count"
                nameKey="label"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
              >
                {shares.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={BLUE_RAMP[index % BLUE_RAMP.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: defenseColors.background.elevated,
                  border: `1px solid ${defenseColors.border.strong}`,
                  color: defenseColors.text.primary,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="h5"
                sx={{ color: defenseColors.text.primary, fontWeight: 800 }}
              >
                {total.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
                Total
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack spacing={1} flex={1} minWidth={0} width="100%">
          {shares.map((share, index) => (
            <Stack
              key={share.key}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: BLUE_RAMP[index % BLUE_RAMP.length],
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ color: defenseColors.text.secondary }}
                >
                  {share.label}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                sx={{ color: defenseColors.text.primary, fontWeight: 600, flexShrink: 0 }}
              >
                {share.percent}% · {share.count.toLocaleString()}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
