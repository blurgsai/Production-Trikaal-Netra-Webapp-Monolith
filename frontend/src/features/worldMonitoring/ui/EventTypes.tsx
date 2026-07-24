import { useId, useMemo } from "react";
import {
  Box,
  Paper,
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

export const EventTypes = ({
  eventTypeData,
  topEventType,
}: EventTypesProps) => {
  const summaryId = useId();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = !prefersReducedMotion;

  const summary = useMemo(() => {
    if (eventTypeData.length === 0) return "No event type distribution data available.";
    const top = topEventType ?? eventTypeData[0];
    return `Event types across ${eventTypeData.length} classes. Most reported: ${top.label} (${top.value}).`;
  }, [eventTypeData, topEventType]);

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
          mb: 0.5,
          flexShrink: 0,
        }}
      >
        Event Types
      </Typography>

      <Typography id={summaryId} sx={srOnlySx}>
        {summary}
      </Typography>

      {topEventType && (
        <Typography
          variant="body2"
          sx={{
            color: defenseColors.text.muted,
            mb: 1,
            flexShrink: 0,
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

      {eventTypeData.length === 0 ? (
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
            aria-label="Event types bar chart"
            aria-describedby={summaryId}
            sx={{ width: "100%", flex: 1, minHeight: 0, minWidth: 0 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventTypeData} layout="vertical">
                <CartesianGrid
                  stroke={defenseColors.border.default}
                  horizontal={false}
                />
                <XAxis type="number" stroke={defenseColors.text.muted} />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={120}
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
                  isAnimationActive={animate}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <TableContainer
            className="wm-scrollable"
            sx={{
              flexShrink: 0,
              height: DATA_TABLE_HEIGHT,
              overflow: "auto",
              mt: 1,
              borderTop: `1px solid ${defenseColors.border.default}`,
            }}
          >
            <Table size="small" stickyHeader aria-label="Event types data">
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col">Type</TableCell>
                  <TableCell component="th" scope="col" align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventTypeData.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="right">{row.value}</TableCell>
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
