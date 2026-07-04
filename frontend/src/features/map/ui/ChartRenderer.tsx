import { useMemo } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  XAxis, YAxis,
} from "recharts";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import type { ChartConfig, ChartDataPoint } from "../model/chartTypes";

const CHART_COLORS = [
  "#4cc9f0", "#3fb950", "#d29922", "#f85149", "#58a6ff",
  "#a371f7", "#f778ba", "#56d4dd", "#7ee787", "#ffa657",
  "#79c0ff", "#56d364", "#ff7b72", "#d2a8ff", "#8b949e",
];

interface ChartRendererProps {
  config: ChartConfig;
  data: ChartDataPoint[];
  loading?: boolean;
  error?: string | null;
}

function ChartRenderer({ config, data, loading, error }: ChartRendererProps) {
  const theme = useTheme();
  const chartData = useMemo(
    () => data.map((p) => ({ name: p.label, value: p.value })),
    [data]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.5 }}>
        <CircularProgress size={28} sx={{ color: "primary.main" }} />
        <Typography variant="body2" color="text.secondary">Loading chart data…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1 }}>
        <ErrorOutlineIcon sx={{ fontSize: 32, color: "error.main" }} />
        <Typography variant="body2" color="error">{error}</Typography>
      </Box>
    );
  }

  if (chartData.length === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1 }}>
        <InboxOutlinedIcon sx={{ fontSize: 32, color: "text.disabled" }} />
        <Typography variant="body2" color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const textColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;
  const primaryColor = CHART_COLORS[0];
  const tooltipStyle = {
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
  };

  const commonAxisProps = {
    dataKey: "name",
    tick: { fontSize: 11, fill: textColor },
    axisLine: { stroke: gridColor },
    tickLine: { stroke: gridColor },
    interval: 0,
    angle: -20,
    textAnchor: "end" as const,
    height: 60,
  };

  const valueAxisProps = {
    tick: { fontSize: 11, fill: textColor },
    axisLine: { stroke: gridColor },
    tickLine: { stroke: gridColor },
  };

  switch (config.chartType) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis {...commonAxisProps} />
            <YAxis {...valueAxisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis {...commonAxisProps} />
            <YAxis {...valueAxisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={primaryColor} strokeWidth={2} dot={{ r: 3, fill: primaryColor }} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis {...commonAxisProps} />
            <YAxis {...valueAxisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke={primaryColor} fill={`${primaryColor}66`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={(entry: { name?: string }) => entry.name ?? ""}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: textColor }} />
          </PieChart>
        </ResponsiveContainer>
      );

    case "scatter": {
      const scatterData = data.map((p) => ({ x: p.label, y: p.value }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
            <YAxis dataKey="y" tick={{ fontSize: 11, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
            <Tooltip cursor={{ strokeDasharray: "3 3", stroke: gridColor }} contentStyle={tooltipStyle} />
            <Scatter data={scatterData} fill={primaryColor} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    default:
      return null;
  }
}

export default ChartRenderer;
