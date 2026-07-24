import { useId, useMemo } from "react";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { defenseColors } from "@/shared/theme";
import type { DashboardSeverityDistribution } from "../model/types";

interface SeverityMixProps {
  severityData: (DashboardSeverityDistribution & { color: string; name: string })[];
  severityTotal: number;
}

const srOnlySx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

const CHART_CARD_HEIGHT = 420;
const DATA_TABLE_HEIGHT = 112;

export const SeverityMix = ({
  severityData,
  severityTotal,
}: SeverityMixProps) => {
  const summaryId = useId();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = !prefersReducedMotion;

  const summary = useMemo(() => {
    if (severityData.length === 0) return "No severity distribution data available.";
    const parts = severityData
      .map((entry) => {
        const pct = severityTotal
          ? Math.round((entry.value / severityTotal) * 100)
          : 0;
        return `${entry.name} ${entry.value} (${pct}%)`;
      })
      .join("; ");
    return `Severity mix of ${severityTotal} events: ${parts}.`;
  }, [severityData, severityTotal]);

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${defenseColors.border.default}`,
        backgroundColor: defenseColors.background.surface,
        height: CHART_CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: defenseColors.text.primary,
          fontWeight: 800,
          mb: 1,
          flexShrink: 0,
        }}
      >
        Severity Mix
      </Typography>

      <Typography id={summaryId} sx={srOnlySx}>
        {summary}
      </Typography>

      {severityData.length === 0 ? (
        <Typography
          variant="body2"
          sx={{ color: defenseColors.text.muted, textAlign: "center", py: 6 }}
        >
          No chart data
        </Typography>
      ) : (
        <>
          <Box
            role="img"
            aria-label="Severity mix pie chart"
            aria-describedby={summaryId}
            sx={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  isAnimationActive={animate}
                >
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            mt={1}
            mb={1}
            sx={{ flexShrink: 0 }}
          >
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

          <TableContainer
            className="wm-scrollable"
            sx={{
              flexShrink: 0,
              height: DATA_TABLE_HEIGHT,
              overflow: "auto",
              borderTop: `1px solid ${defenseColors.border.default}`,
            }}
          >
            <Table size="small" stickyHeader aria-label="Severity mix data">
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col">Severity</TableCell>
                  <TableCell component="th" scope="col" align="right">Count</TableCell>
                  <TableCell component="th" scope="col" align="right">Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {severityData.map((entry) => (
                  <TableRow key={entry.name}>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell align="right">{entry.value}</TableCell>
                    <TableCell align="right">
                      {severityTotal
                        ? `${Math.round((entry.value / severityTotal) * 100)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
};
