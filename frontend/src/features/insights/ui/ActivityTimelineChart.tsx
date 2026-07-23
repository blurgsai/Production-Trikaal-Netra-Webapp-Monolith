import {
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
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

import type { InsightsTimelinePoint, InsightsTimelineRange } from "../model/types";

const TIMELINE_RANGE_OPTIONS: { value: InsightsTimelineRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "1y", label: "Past 1 year" },
  { value: "6m", label: "Past 6 months" },
  { value: "3m", label: "Past 3 months" },
  { value: "1m", label: "Past 1 month" },
  { value: "1w", label: "Past 1 week" },
];

interface ActivityTimelineChartProps {
  timeline: InsightsTimelinePoint[];
  timelineRange: InsightsTimelineRange;
  onTimelineRangeChange: (range: InsightsTimelineRange) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: boolean;
}

export function ActivityTimelineChart({
  timeline,
  timelineRange,
  onTimelineRangeChange,
  isLoading = false,
  isFetching = false,
  error = false,
}: ActivityTimelineChartProps) {
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
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography
          variant="h6"
          sx={{ color: defenseColors.text.primary, fontWeight: 800 }}
        >
          Activity Timeline (Events)
        </Typography>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            value={timelineRange}
            onChange={(e) =>
              onTimelineRangeChange(e.target.value as InsightsTimelineRange)
            }
            sx={{
              color: defenseColors.text.primary,
              ".MuiOutlinedInput-notchedOutline": {
                borderColor: defenseColors.border.default,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: defenseColors.border.strong,
              },
              ".MuiSvgIcon-root": { color: defenseColors.text.secondary },
            }}
          >
            {TIMELINE_RANGE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ position: "relative", height: 240 }}>
        {isLoading && timeline.length === 0 ? (
          <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
            <CircularProgress size={28} sx={{ color: defenseColors.primary.main }} />
          </Box>
        ) : error ? (
          <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
            <Typography variant="body2" sx={{ color: defenseColors.text.muted }}>
              Failed to load timeline.
            </Typography>
          </Box>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <CartesianGrid
                  stroke={defenseColors.border.default}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke={defenseColors.text.muted}
                  tick={{ fontSize: 11 }}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke={defenseColors.text.muted}
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: defenseColors.background.elevated,
                    border: `1px solid ${defenseColors.border.strong}`,
                    color: defenseColors.text.primary,
                  }}
                  labelStyle={{ color: defenseColors.text.secondary }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Events"
                  stroke={defenseColors.primary.main}
                  strokeWidth={2.5}
                  dot={
                    timeline.length <= 31
                      ? { fill: defenseColors.primary.dark, r: 3 }
                      : false
                  }
                  activeDot={{ r: 5, fill: defenseColors.primary.hover }}
                />
              </LineChart>
            </ResponsiveContainer>
            {isFetching && (
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  pointerEvents: "none",
                }}
              >
                <CircularProgress
                  size={18}
                  sx={{ color: defenseColors.primary.main }}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
}
