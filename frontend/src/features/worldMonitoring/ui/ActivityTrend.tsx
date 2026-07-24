import { useId, useMemo } from "react";
import {
  Box,
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

export const ActivityTrend = ({ trends }: ActivityTrendProps) => {
  const summaryId = useId();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = !prefersReducedMotion;

  const summary = useMemo(() => {
    if (trends.length === 0) return "No activity trend data available.";
    const peak = trends.reduce((best, row) =>
      row.totalEvents > best.totalEvents ? row : best,
    );
    const total = trends.reduce((sum, row) => sum + row.totalEvents, 0);
    return `Activity trend across ${trends.length} buckets. Peak ${peak.totalEvents} events on ${peak.bucket}. Total ${total} events.`;
  }, [trends]);

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
        Activity Trend
      </Typography>

      <Typography id={summaryId} sx={srOnlySx}>
        {summary}
      </Typography>

      {trends.length === 0 ? (
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
            aria-label="Activity trend line chart"
            aria-describedby={summaryId}
            sx={{ width: "100%", flex: 1, minHeight: 0, minWidth: 0 }}
          >
            <ResponsiveContainer width="100%" height="100%">
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
                  isAnimationActive={animate}
                />
                <Line
                  type="monotone"
                  dataKey="criticalHighEvents"
                  name="Critical / High"
                  stroke={defenseColors.status.error}
                  strokeWidth={2.5}
                  isAnimationActive={animate}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Stack
            direction="row"
            spacing={2}
            mt={1}
            mb={1}
            justifyContent="center"
            sx={{ flexShrink: 0 }}
          >
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

          <TableContainer
            className="wm-scrollable"
            sx={{
              flexShrink: 0,
              height: DATA_TABLE_HEIGHT,
              overflow: "auto",
              borderTop: `1px solid ${defenseColors.border.default}`,
            }}
          >
            <Table size="small" stickyHeader aria-label="Activity trend data">
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col">Bucket</TableCell>
                  <TableCell component="th" scope="col" align="right">Total</TableCell>
                  <TableCell component="th" scope="col" align="right">Critical / High</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trends.map((row) => (
                  <TableRow key={row.bucket}>
                    <TableCell>{row.bucket}</TableCell>
                    <TableCell align="right">{row.totalEvents}</TableCell>
                    <TableCell align="right">{row.criticalHighEvents}</TableCell>
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
