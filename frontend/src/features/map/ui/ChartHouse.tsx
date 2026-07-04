import { useState, useCallback } from "react";
import { Box, Typography, Stack, Paper, ToggleButton, ToggleButtonGroup } from "@mui/material";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import EditIcon from "@mui/icons-material/Edit";
import ChartRenderer from "./ChartRenderer";
import ChartEditor from "./ChartEditor";
import { useChartData, useChartConfigs } from "../hooks/useChartData";
import type { ChartConfig } from "../model/chartTypes";
import { formatColumnName } from "@/shared/utils";

interface ChartHouseProps {
  charts: ChartConfig[];
  columns: string[];
  cqlFilter?: string;
  onCreateChart: (config: ChartConfig) => void;
  onUpdateChart: (id: string, config: ChartConfig) => void;
  onDeleteChart: (id: string) => void;
}

function ChartHouse({
  charts,
  columns,
  cqlFilter,
  onCreateChart,
  onUpdateChart,
  onDeleteChart,
}: ChartHouseProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [selectedChartId, setSelectedChartId] = useState<string | null>(
    charts[0]?.id ?? null
  );
  const { createChartConfig } = useChartConfigs();

  const selectedChart = charts.find((c) => c.id === selectedChartId) ?? charts[0] ?? null;
  const { data, loading, error } = useChartData(selectedChart, cqlFilter);

  const handleCreate = useCallback(
    (config: Omit<ChartConfig, "id">) => {
      const newChart = createChartConfig(config);
      onCreateChart(newChart);
      setSelectedChartId(newChart.id);
      setMode("view");
    },
    [createChartConfig, onCreateChart]
  );

  const handleUpdate = useCallback(
    (id: string, config: ChartConfig) => {
      onUpdateChart(id, config);
      setMode("view");
    },
    [onUpdateChart]
  );

  const handleModeChange = (_: React.MouseEvent, newMode: "view" | "edit" | null) => {
    if (newMode) setMode(newMode);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InsertChartIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>Chart House</Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          value={mode}
          exclusive
          onChange={handleModeChange}
        >
          <ToggleButton value="view" sx={{ textTransform: "none", px: 1.5 }}>View</ToggleButton>
          <ToggleButton value="edit" sx={{ textTransform: "none", px: 1.5 }}>
            <EditIcon fontSize="small" sx={{ mr: 0.5 }} /> Edit
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {mode === "edit" ? (
        <ChartEditor
          charts={charts}
          columns={columns}
          onCreateChart={handleCreate}
          onUpdateChart={handleUpdate}
          onDeleteChart={onDeleteChart}
        />
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {charts.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1 }}>
              <InsertChartIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                No charts configured.
              </Typography>
              <ToggleButton
                value="edit"
                size="small"
                onClick={() => setMode("edit")}
                sx={{ textTransform: "none", mt: 1 }}
              >
                <EditIcon fontSize="small" sx={{ mr: 0.5 }} /> Create a Chart
              </ToggleButton>
            </Box>
          ) : (
            <>
              {charts.length > 1 && (
                <Stack direction="row" spacing={0.5} sx={{ p: 1, overflowX: "auto", borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
                  {charts.map((chart) => (
                    <Paper
                      key={chart.id}
                      elevation={0}
                      onClick={() => setSelectedChartId(chart.id)}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        bgcolor: chart.id === selectedChartId ? "primary.main" : "action.hover",
                        color: chart.id === selectedChartId ? "primary.contrastText" : "text.primary",
                        borderRadius: 1,
                      }}
                    >
                      {chart.title}
                    </Paper>
                  ))}
                </Stack>
              )}
              {selectedChart && (
                <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
                  <Box sx={{ position: "absolute", top: 8, left: 8, zIndex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ bgcolor: "background.paper", px: 1, py: 0.5, borderRadius: 1, boxShadow: 1 }}>
                      {selectedChart.title} — {selectedChart.aggregation === "count"
                        ? `Count by ${formatColumnName(selectedChart.xAxisColumn)}`
                        : `${selectedChart.aggregation} of ${formatColumnName(selectedChart.yAxisColumn)} by ${formatColumnName(selectedChart.xAxisColumn)}`}
                    </Typography>
                  </Box>
                  <ChartRenderer
                    config={selectedChart}
                    data={data.points}
                    loading={loading}
                    error={error}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ChartHouse;
