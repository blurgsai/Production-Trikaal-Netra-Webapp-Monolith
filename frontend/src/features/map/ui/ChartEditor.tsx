import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Stack,
  IconButton,
  Typography,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import type { ChartConfig, ChartType, ChartAggregation } from "../model/chartTypes";
import { formatColumnName } from "@/shared/utils";

interface ChartEditorProps {
  charts: ChartConfig[];
  columns: string[];
  onCreateChart: (config: Omit<ChartConfig, "id">) => void;
  onUpdateChart: (id: string, config: ChartConfig) => void;
  onDeleteChart: (id: string) => void;
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "area", label: "Area Chart" },
  { value: "scatter", label: "Scatter Chart" },
];

const AGGREGATIONS: { value: ChartAggregation; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

function ChartEditor({
  charts,
  columns,
  onCreateChart,
  onUpdateChart,
  onDeleteChart,
}: ChartEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<ChartConfig, "id">>({
    title: "",
    chartType: "bar",
    xAxisColumn: columns[0] ?? "",
    yAxisColumn: columns[0] ?? "",
    aggregation: "count",
    maxDataPoints: 50,
  });

  useEffect(() => {
    if (columns.length > 0 && !draft.xAxisColumn) {
      setDraft((prev) => ({ ...prev, xAxisColumn: columns[0], yAxisColumn: columns[0] }));
    }
  }, [columns, draft.xAxisColumn]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setDraft({
      title: "",
      chartType: "bar",
      xAxisColumn: columns[0] ?? "",
      yAxisColumn: columns[0] ?? "",
      aggregation: "count",
      maxDataPoints: 50,
    });
  };

  const handleConfirmCreate = () => {
    if (!draft.title.trim()) return;
    onCreateChart(draft);
    setIsCreating(false);
  };

  const handleStartEdit = (chart: ChartConfig) => {
    setEditingId(chart.id);
    setIsCreating(false);
    setDraft({
      title: chart.title,
      chartType: chart.chartType,
      xAxisColumn: chart.xAxisColumn,
      yAxisColumn: chart.yAxisColumn,
      aggregation: chart.aggregation,
      maxDataPoints: chart.maxDataPoints ?? 50,
    });
  };

  const handleConfirmEdit = () => {
    if (!editingId || !draft.title.trim()) return;
    const existing = charts.find((c) => c.id === editingId);
    if (existing) {
      onUpdateChart(editingId, { ...draft, id: editingId });
    }
    setEditingId(null);
  };

  const showYAxis = draft.aggregation !== "count";

  return (
    <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <InsertChartOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
              Chart Configurations
            </Typography>
          </Box>
          {!isCreating && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleStartCreate}
              variant="outlined"
              sx={{ textTransform: "none", borderRadius: 1.5 }}
            >
              New Chart
            </Button>
          )}
        </Stack>

        {isCreating && (
          <Box sx={{ border: 1, borderColor: "primary.main", borderRadius: 1.5, p: 2, bgcolor: "primary.soft" }}>
            <Typography variant="caption" color="primary.main" sx={{ mb: 1, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              New Chart
            </Typography>
            <ChartConfigForm
              draft={draft}
              columns={columns}
              showYAxis={showYAxis}
              onChange={setDraft}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" startIcon={<CheckIcon />} variant="contained" onClick={handleConfirmCreate} sx={{ borderRadius: 1.5 }}>
                Create
              </Button>
              <Button size="small" startIcon={<CloseIcon />} onClick={() => setIsCreating(false)} sx={{ borderRadius: 1.5 }}>
                Cancel
              </Button>
            </Stack>
          </Box>
        )}

        <Divider />

        {charts.length === 0 && !isCreating && (
          <Box sx={{ textAlign: "center", py: 4, border: "1px dashed", borderColor: "divider", borderRadius: 1.5 }}>
            <InsertChartOutlinedIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No charts configured.
            </Typography>
            <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={handleStartCreate} sx={{ borderRadius: 1.5 }}>
              Create First Chart
            </Button>
          </Box>
        )}

        {charts.map((chart) => (
          <Box key={chart.id}>
            {editingId === chart.id ? (
              <Box sx={{ border: 1, borderColor: "primary.main", borderRadius: 1.5, p: 2, bgcolor: "primary.soft" }}>
                <Typography variant="caption" color="primary.main" sx={{ mb: 1, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Editing: {chart.title}
                </Typography>
                <ChartConfigForm
                  draft={draft}
                  columns={columns}
                  showYAxis={showYAxis}
                  onChange={setDraft}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" startIcon={<CheckIcon />} variant="contained" onClick={handleConfirmEdit} sx={{ borderRadius: 1.5 }}>
                    Save
                  </Button>
                  <Button size="small" startIcon={<CloseIcon />} onClick={() => setEditingId(null)} sx={{ borderRadius: 1.5 }}>
                    Cancel
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1.5,
                p: 1.5,
                transition: "border-color 0.2s, background-color 0.2s",
                "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{chart.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.3, fontSize: "0.65rem" }}>
                      {chart.chartType} · {chart.aggregation} of{" "}
                      {chart.aggregation === "count"
                        ? formatColumnName(chart.xAxisColumn)
                        : formatColumnName(chart.yAxisColumn)}
                      {" by "}
                      {formatColumnName(chart.xAxisColumn)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => handleStartEdit(chart)} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDeleteChart(chart.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

interface ChartConfigFormProps {
  draft: Omit<ChartConfig, "id">;
  columns: string[];
  showYAxis: boolean;
  onChange: (draft: Omit<ChartConfig, "id">) => void;
}

function ChartConfigForm({ draft, columns, showYAxis, onChange }: ChartConfigFormProps) {
  return (
    <Stack spacing={1.5}>
      <TextField
        label="Chart Title"
        size="small"
        fullWidth
        value={draft.title}
        onChange={(e) => onChange({ ...draft, title: e.target.value })}
      />
      <FormControl size="small" fullWidth>
        <InputLabel>Chart Type</InputLabel>
        <Select
          value={draft.chartType}
          label="Chart Type"
          onChange={(e) => onChange({ ...draft, chartType: e.target.value as ChartType })}
        >
          {CHART_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" fullWidth>
        <InputLabel>X Axis (Category)</InputLabel>
        <Select
          value={draft.xAxisColumn}
          label="X Axis (Category)"
          onChange={(e) => onChange({ ...draft, xAxisColumn: e.target.value })}
        >
          {columns.map((col) => (
            <MenuItem key={col} value={col}>{formatColumnName(col)}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" fullWidth>
        <InputLabel>Aggregation</InputLabel>
        <Select
          value={draft.aggregation}
          label="Aggregation"
          onChange={(e) => onChange({ ...draft, aggregation: e.target.value as ChartAggregation })}
        >
          {AGGREGATIONS.map((a) => (
            <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {showYAxis && (
        <FormControl size="small" fullWidth>
          <InputLabel>Y Axis (Value)</InputLabel>
          <Select
            value={draft.yAxisColumn}
            label="Y Axis (Value)"
            onChange={(e) => onChange({ ...draft, yAxisColumn: e.target.value })}
          >
            {columns.map((col) => (
              <MenuItem key={col} value={col}>{formatColumnName(col)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Stack>
  );
}

export default ChartEditor;
