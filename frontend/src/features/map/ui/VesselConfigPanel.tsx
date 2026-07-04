import { useState, useRef, type ComponentType } from "react";
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Button,
  Select,
  MenuItem,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadIcon from "@mui/icons-material/Upload";
import AddIcon from "@mui/icons-material/Add";
import CircleIcon from "@mui/icons-material/Circle";
import SquareIcon from "@mui/icons-material/Square";
import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import OpacityIcon from "@mui/icons-material/Opacity";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { defenseColors as c } from "@/shared/theme";
import type {
  VesselConfig,
  CustomShape,
  StyleDefinition,
  StyleRule,
  VesselTableFilter,
  FilterCombinator,
  ClusterConfig,
  TrajectoryConfig,
  DeadReckoningConfig,
  TimeUnit,
} from "../model/types";

function FilledTriangleIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 26 26">
      <path d="M12 4L20 20H4L12 4Z" fill="currentColor" />
    </SvgIcon>
  );
}

function CustomGradientShapeIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polygon
        points="12,2 20,18 12,15 4,18"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle cx="12" cy="10" r="2" fill="currentColor" opacity="0.8" />
      <line x1="12" y1="6" x2="12" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    </SvgIcon>
  );
}

const shapeIcons: Record<string, ComponentType<SvgIconProps>> = {
  triangle: FilledTriangleIcon,
  square: SquareIcon,
  circle: CircleIcon,
  custom: CustomGradientShapeIcon,
};

const TEXT_OPERATORS: VesselTableFilter["operator"][] = ["=", "!=", "startsWith", "endsWith", "contains"];
const NUMERIC_OPERATORS: VesselTableFilter["operator"][] = ["=", "!=", "<", "<=", ">", ">="];

const NUMERIC_SUFFIXES = [
  "_lat", "_lon", "_timestamp", "_value", "_count", "_rate",
  "_historylimit", "_history", "_lastobservedvalue", "_variabilityscore",
  "_consensusvalue", "_lastupdatets", "_turnrate", "_accelerationmps2",
  "_distancemeters", "_headingchangedeg", "_headingdeg", "_jerkmps3",
  "_speedovergroundmps", "_timedeltaseconds", "_windowseconds",
  "_level", "_total", "_current", "_eta", "_buildyear",
  "_epfdtype", "_maneuverindicator", "_positionaccuracy",
  "_radiostatus", "_navstatus", "_s2", "mmsi", "imo", "id",
];

function getOperatorsForColumn(column: string): VesselTableFilter["operator"][] {
  const isNumeric = NUMERIC_SUFFIXES.some((s) => column.toLowerCase().endsWith(s));
  return isNumeric ? NUMERIC_OPERATORS : TEXT_OPERATORS;
}

function isNumericColumn(column: string): boolean {
  return NUMERIC_SUFFIXES.some((s) => column.toLowerCase().endsWith(s));
}

interface VesselConfigPanelProps {
  config: VesselConfig;
  onApply: (config: VesselConfig) => Promise<void>;
  onFetchColumns: () => Promise<string[]>;
  onSearchColumnValues: (column: string, query: string, limit: number) => Promise<string[]>;
  onClose?: () => void;
}

function VesselConfigPanel({ config, onApply, onFetchColumns, onSearchColumnValues }: VesselConfigPanelProps) {
  const [local, setLocal] = useState<VesselConfig>(config);
  const [isApplying, setIsApplying] = useState(false);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [columnOptions, setColumnOptions] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useState(() => {
    onFetchColumns()
      .then(setTableColumns)
      .catch(() => {});
  });

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadColumnOptions = (column: string, query: string = "") => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onSearchColumnValues(column, query, 10)
        .then((values) => setColumnOptions((prev) => ({ ...prev, [column]: values })))
        .catch(() => {});
    }, 300);
  };

  const update = <K extends keyof VesselConfig>(key: K, value: VesselConfig[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const updateDefaultStyle = (patch: Partial<StyleDefinition>) => {
    setLocal((prev) => ({
      ...prev,
      defaultStyle: { ...prev.defaultStyle, ...patch },
    }));
  };

  const updateCluster = (patch: Partial<ClusterConfig>) => {
    setLocal((prev) => ({
      ...prev,
      cluster: { ...prev.cluster, ...patch },
    }));
  };

  const updateTrajectory = (patch: Partial<TrajectoryConfig>) => {
    setLocal((prev) => ({
      ...prev,
      trajectory: { ...prev.trajectory, ...patch },
    }));
  };

  const updateDeadReckoning = (patch: Partial<DeadReckoningConfig>) => {
    setLocal((prev) => ({
      ...prev,
      deadReckoning: { ...prev.deadReckoning, ...patch },
    }));
  };

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".svg")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const svgText = reader.result as string;
      const id = `custom-${Date.now()}`;
      const name = file.name.replace(/\.svg$/i, "");
      const newShape: CustomShape = { id, name, svg: svgText };
      setLocal((prev) => ({
        ...prev,
        customShapes: [...prev.customShapes, newShape],
      }));
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteCustomShape = (shapeId: string) => {
    setLocal((prev) => {
      const filtered = prev.customShapes.filter((cs) => cs.id !== shapeId);
      const updateDefault =
        prev.defaultStyle.shape === shapeId
          ? { ...prev.defaultStyle, shape: "custom" }
          : prev.defaultStyle;
      const rules = prev.rules.map((r) =>
        r.style.shape === shapeId
          ? { ...r, style: { ...r.style, shape: "custom" } }
          : r
      );
      return { ...prev, customShapes: filtered, defaultStyle: updateDefault, rules };
    });
  };

  const addRule = () => {
    const newRule: StyleRule = {
      id: `rule-${Date.now()}`,
      name: `Rule ${local.rules.length + 1}`,
      conditions: [{ column: "identification_mmsi", operator: "=", value: "", combinator: "AND" }],
      combinator: "AND",
      style: { shape: "circle", color: c.status.error, size: 20 },
    };
    setLocal((prev) => ({ ...prev, rules: [...prev.rules, newRule] }));
  };

  const updateRule = (ruleId: string, patch: Partial<StyleRule>) => {
    setLocal((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
    }));
  };

  const updateRuleStyle = (ruleId: string, patch: Partial<StyleDefinition>) => {
    setLocal((prev) => ({
      ...prev,
      rules: prev.rules.map((r) =>
        r.id === ruleId ? { ...r, style: { ...r.style, ...patch } } : r
      ),
    }));
  };

  const deleteRule = (ruleId: string) => {
    setLocal((prev) => ({ ...prev, rules: prev.rules.filter((r) => r.id !== ruleId) }));
  };

  const addCondition = (ruleId: string) => {
    setLocal((prev) => ({
      ...prev,
      rules: prev.rules.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: [...r.conditions, { column: "identification_mmsi", operator: "=", value: "", combinator: r.combinator }] }
          : r
      ),
    }));
  };

  const updateCondition = (ruleId: string, index: number, patch: Partial<VesselTableFilter>) => {
    setLocal((prev) => ({
      ...prev,
      rules: prev.rules.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
          : r
      ),
    }));
  };

  const deleteCondition = (ruleId: string, index: number) => {
    setLocal((prev) => ({
      ...prev,
      rules: prev.rules.map((r) =>
        r.id === ruleId ? { ...r, conditions: r.conditions.filter((_, i) => i !== index) } : r
      ),
    }));
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(local);
    } finally {
      setIsApplying(false);
    }
  };

  const renderShapeSelector = (
    value: string,
    onChange: (shape: string) => void,
    color: string
  ) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, s) => s && onChange(s)}
        size="small"
      >
        {Object.entries(shapeIcons).map(([s, Icon]) => (
          <ToggleButton
            key={s}
            value={s}
            aria-label={s}
            sx={{ px: 1.5, py: 1, border: `1px solid ${c.border.strong}`, borderRadius: 1 }}
          >
            <Icon sx={{ color: value === s ? color : c.text.muted, fontSize: 24 }} />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {local.customShapes.map((cs) => (
        <Box key={cs.id} sx={{ position: "relative" }}>
          <ToggleButton
            value={cs.id}
            selected={value === cs.id}
            onClick={() => onChange(cs.id)}
            size="small"
            sx={{ px: 1.5, py: 1, border: `1px solid ${c.border.strong}`, borderRadius: 1 }}
          >
            <Box
              component="span"
              dangerouslySetInnerHTML={{ __html: cs.svg }}
              sx={{ width: 24, height: 24, display: "flex", "& svg": { width: "100%", height: "100%" } }}
            />
          </ToggleButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteCustomShape(cs.id)}
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: "background.paper",
              width: 18,
              height: 18,
              "& .MuiSvgIcon-root": { fontSize: 12 },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  );

  const renderColorSizeRow = (
    style: StyleDefinition,
    onStyleChange: (patch: Partial<StyleDefinition>) => void
  ) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
      <input
        type="color"
        value={style.color}
        onChange={(e) => onStyleChange({ color: e.target.value })}
        style={{ width: 36, height: 32, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
      />
      <TextField
        value={style.color}
        onChange={(e) => onStyleChange({ color: e.target.value })}
        size="small"
        sx={{ width: 80 }}
        inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
      />
      <Box sx={{ flex: 1, maxWidth: 150 }}>
        <Slider
          value={style.size}
          min={10}
          max={30}
          step={1}
          onChange={(_, val) => onStyleChange({ size: val as number })}
          size="small"
        />
      </Box>
      <Typography variant="caption">{style.size}px</Typography>
    </Stack>
  );

  const renderConditionRow = (
    ruleId: string,
    cond: VesselTableFilter,
    index: number
  ) => (
    <Box key={index} sx={{ pl: 1.5, borderLeft: "2px solid", borderColor: "divider" }}>
      {index > 0 && (
        <Select
          size="small"
          value={cond.combinator ?? "AND"}
          onChange={(e) => updateCondition(ruleId, index, { combinator: e.target.value as FilterCombinator })}
          sx={{ width: 70, mb: 0.5, mt: 0.5 }}
        >
          <MenuItem value="AND">AND</MenuItem>
          <MenuItem value="OR">OR</MenuItem>
        </Select>
      )}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Select
          size="small"
          value={cond.column}
          onChange={(e) => {
            updateCondition(ruleId, index, { column: e.target.value, value: "" });
            if (!isNumericColumn(e.target.value)) {
              setColumnOptions((prev) => ({ ...prev, [e.target.value]: [] }));
              loadColumnOptions(e.target.value, "");
            }
          }}
          sx={{ flex: 1, minWidth: 100 }}
          MenuProps={{ sx: { zIndex: 25000 }, PaperProps: { style: { maxHeight: 300 } } }}
        >
          {tableColumns.length > 0
            ? tableColumns.map((col) => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))
            : <MenuItem disabled>Loading columns…</MenuItem>}
        </Select>
        <IconButton size="small" color="error" onClick={() => deleteCondition(ruleId, index)} sx={{ flexShrink: 0 }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Select
          size="small"
          value={cond.operator}
          onChange={(e) => updateCondition(ruleId, index, { operator: e.target.value as VesselTableFilter["operator"] })}
          sx={{ width: 90, flexShrink: 0 }}
        >
          {getOperatorsForColumn(cond.column).map((op) => (
            <MenuItem key={op} value={op}>{op}</MenuItem>
          ))}
        </Select>
        {isNumericColumn(cond.column) ? (
          <TextField
            size="small"
            value={cond.value}
            onChange={(e) => updateCondition(ruleId, index, { value: e.target.value })}
            sx={{ flex: 1 }}
            placeholder="Value"
          />
        ) : (
          <Autocomplete
            freeSolo
            size="small"
            options={columnOptions[cond.column] ?? []}
            value={cond.value}
            onChange={(_, newValue) => updateCondition(ruleId, index, { value: newValue ?? "" })}
            onInputChange={(_, newInputValue) => {
              updateCondition(ruleId, index, { value: newInputValue });
              loadColumnOptions(cond.column, newInputValue);
            }}
            onOpen={() => loadColumnOptions(cond.column, "")}
            renderInput={(params) => (
              <TextField {...params} placeholder="Value" />
            )}
            sx={{ flex: 1 }}
          />
        )}
      </Stack>
    </Box>
  );

  return (
    <Box
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      sx={{
        width: "100%",
        height: "100%",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {/* Default Style Section */}
        <Box sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <PaletteOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
              Default Style
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
            Applied to vessels not matching any rule.
          </Typography>
          {renderShapeSelector(local.defaultStyle.shape, (s) => updateDefaultStyle({ shape: s }), local.defaultStyle.color)}
          {renderColorSizeRow(local.defaultStyle, updateDefaultStyle)}
          <Box sx={{ mt: 1, pt: 1, borderTop: "1px dashed", borderColor: "divider" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleSvgUpload}
              style={{ display: "none" }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload SVG Shape
            </Button>
          </Box>
        </Box>

        {/* Opacity Section */}
        <Box sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <OpacityIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
              Layer Opacity{" "}
              <Typography component="span" variant="caption" color="textSecondary" fontWeight={400}>
                ({Math.round(local.opacity * 100)}%)
              </Typography>
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2} mt={1}>
            <Typography variant="caption" color="textSecondary">0%</Typography>
            <Slider
              value={local.opacity * 100}
              onChange={(_, val) => update("opacity", (val as number) / 100)}
              min={0}
              max={100}
              step={1}
              sx={{ flex: 1 }}
            />
            <Typography variant="caption" color="textSecondary">100%</Typography>
          </Box>
        </Box>

        {/* Clustering Section */}
        <Box sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <HubOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
              Clustering
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
            GeoServer PointStacker settings for zoomed-out views.
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Cell Size</Typography>
              <Slider
                value={local.cluster.cellSize}
                onChange={(_, val) => updateCluster({ cellSize: val as number })}
                min={10}
                max={200}
                step={5}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{local.cluster.cellSize}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Small Max</Typography>
              <Slider
                value={local.cluster.smallClusterMax}
                onChange={(_, val) => updateCluster({ smallClusterMax: val as number })}
                min={2}
                max={50}
                step={1}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{local.cluster.smallClusterMax}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Min Scale</Typography>
              <TextField
                size="small"
                type="number"
                value={local.cluster.minScaleDenominator}
                onChange={(e) => updateCluster({ minScaleDenominator: Number(e.target.value) })}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Small Color</Typography>
              <input
                type="color"
                value={local.cluster.smallClusterColor}
                onChange={(e) => updateCluster({ smallClusterColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.cluster.smallClusterColor}
                onChange={(e) => updateCluster({ smallClusterColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
              <Typography variant="caption" sx={{ width: 40 }}>Size</Typography>
              <Slider
                value={local.cluster.smallClusterSize}
                onChange={(_, val) => updateCluster({ smallClusterSize: val as number })}
                min={20}
                max={80}
                step={2}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{local.cluster.smallClusterSize}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Large Color</Typography>
              <input
                type="color"
                value={local.cluster.largeClusterColor}
                onChange={(e) => updateCluster({ largeClusterColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.cluster.largeClusterColor}
                onChange={(e) => updateCluster({ largeClusterColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
              <Typography variant="caption" sx={{ width: 40 }}>Size</Typography>
              <Slider
                value={local.cluster.largeClusterSize}
                onChange={(_, val) => updateCluster({ largeClusterSize: val as number })}
                min={20}
                max={80}
                step={2}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{local.cluster.largeClusterSize}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Label Color</Typography>
              <input
                type="color"
                value={local.cluster.clusterLabelColor}
                onChange={(e) => updateCluster({ clusterLabelColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.cluster.clusterLabelColor}
                onChange={(e) => updateCluster({ clusterLabelColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
            </Stack>
          </Stack>
        </Box>

        {/* Style Rules Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <RuleOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
            Style Rules
          </Typography>
        </Box>
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
          Rules are evaluated in order; the first match wins.
        </Typography>

        {local.rules.length === 0 && (
          <Box sx={{ textAlign: "center", py: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1, mb: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              No rules defined. All vessels use the default style.
            </Typography>
            <Button
              startIcon={<AddIcon />}
              size="small"
              variant="outlined"
              onClick={addRule}
            >
              Add Rule
            </Button>
          </Box>
        )}

        {local.rules.map((rule) => (
          <Accordion key={rule.id} sx={{ mb: 1 }} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", pr: 4 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    bgcolor: rule.style.color,
                    border: `1px solid ${c.border.strong}`,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {rule.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              {/* Rule name + delete */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  value={rule.name}
                  onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                  sx={{ flex: 1 }}
                  label="Rule Name"
                />
                <IconButton size="small" color="error" onClick={() => deleteRule(rule.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* Conditions */}
              <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                Conditions
              </Typography>
              <Stack spacing={1} sx={{ mb: 1 }}>
                {rule.conditions.map((cond, idx) => (
                  <Box key={idx}>
                    {idx > 0 && (
                      <Select
                        size="small"
                        value={rule.combinator}
                        onChange={(e) => updateRule(rule.id, { combinator: e.target.value as FilterCombinator })}
                        sx={{ width: 70, mb: 0.5 }}
                      >
                        <MenuItem value="AND">AND</MenuItem>
                        <MenuItem value="OR">OR</MenuItem>
                      </Select>
                    )}
                    {renderConditionRow(rule.id, cond, idx)}
                  </Box>
                ))}
              </Stack>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addCondition(rule.id)}
                sx={{ mb: 2 }}
              >
                Add Condition
              </Button>

              {/* Rule style */}
              <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                Style
              </Typography>
              {renderShapeSelector(rule.style.shape, (s) => updateRuleStyle(rule.id, { shape: s }), rule.style.color)}
              {renderColorSizeRow(rule.style, (patch) => updateRuleStyle(rule.id, patch))}
            </AccordionDetails>
          </Accordion>
        ))}

        {local.rules.length > 0 && (
          <Button
            startIcon={<AddIcon />}
            size="small"
            variant="outlined"
            onClick={addRule}
            sx={{ alignSelf: "flex-start", mb: 2 }}
          >
            Add Rule
          </Button>
        )}

        {/* Trajectory Section */}
        <Box sx={{ mb: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <TimelineIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
              Trajectory
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
            Vessel path visualization settings on click.
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Time (s)</Typography>
              <TextField
                size="small"
                type="number"
                value={local.trajectory.timeSeconds}
                onChange={(e) => updateTrajectory({ timeSeconds: Number(e.target.value) })}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Line Color</Typography>
              <input
                type="color"
                value={local.trajectory.lineColor}
                onChange={(e) => updateTrajectory({ lineColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.trajectory.lineColor}
                onChange={(e) => updateTrajectory({ lineColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
              <Typography variant="caption" sx={{ width: 40 }}>Weight</Typography>
              <Slider
                value={local.trajectory.lineWeight}
                onChange={(_, val) => updateTrajectory({ lineWeight: val as number })}
                min={1}
                max={10}
                step={1}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{local.trajectory.lineWeight}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Line Opacity</Typography>
              <Slider
                value={local.trajectory.lineOpacity * 100}
                onChange={(_, val) => updateTrajectory({ lineOpacity: (val as number) / 100 })}
                min={0}
                max={100}
                step={5}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{Math.round(local.trajectory.lineOpacity * 100)}%</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Dot Color</Typography>
              <input
                type="color"
                value={local.trajectory.dotColor}
                onChange={(e) => updateTrajectory({ dotColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.trajectory.dotColor}
                onChange={(e) => updateTrajectory({ dotColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
              <Typography variant="caption" sx={{ width: 40 }}>Radius</Typography>
              <Slider
                value={local.trajectory.dotRadius}
                onChange={(_, val) => updateTrajectory({ dotRadius: val as number })}
                min={2}
                max={12}
                step={1}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{local.trajectory.dotRadius}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Dot Fill</Typography>
              <input
                type="color"
                value={local.trajectory.dotFillColor}
                onChange={(e) => updateTrajectory({ dotFillColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.trajectory.dotFillColor}
                onChange={(e) => updateTrajectory({ dotFillColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
              <Typography variant="caption" sx={{ width: 40 }}>Opacity</Typography>
              <Slider
                value={local.trajectory.dotFillOpacity * 100}
                onChange={(_, val) => updateTrajectory({ dotFillOpacity: (val as number) / 100 })}
                min={0}
                max={100}
                step={5}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{Math.round(local.trajectory.dotFillOpacity * 100)}%</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Dead Reckoning Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <TrendingUpIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
            Dead Reckoning
          </Typography>
        </Box>
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
          Future projection points from current position
        </Typography>
        <Box sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, mb: 2 }}>
          <Stack spacing={1}>
            {local.deadReckoning.intervals.map((iv, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ width: 50, flexShrink: 0 }}>P{idx + 1}</Typography>
                <Slider
                  value={iv.value}
                  onChange={(_, val) => {
                    const newIntervals = [...local.deadReckoning.intervals];
                    newIntervals[idx] = { ...iv, value: val as number };
                    updateDeadReckoning({ intervals: newIntervals });
                  }}
                  min={1}
                  max={iv.unit === "minutes" ? 240 : iv.unit === "hours" ? 48 : 7}
                  step={1}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Typography variant="caption" sx={{ width: 40, textAlign: "right" }}>{iv.value}</Typography>
                <Select
                  size="small"
                  value={iv.unit}
                  onChange={(e) => {
                    const newIntervals = [...local.deadReckoning.intervals];
                    newIntervals[idx] = { ...iv, unit: e.target.value as TimeUnit };
                    updateDeadReckoning({ intervals: newIntervals });
                  }}
                  sx={{ width: 90, flexShrink: 0 }}
                >
                  <MenuItem value="minutes">min</MenuItem>
                  <MenuItem value="hours">hr</MenuItem>
                  <MenuItem value="days">day</MenuItem>
                </Select>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newIntervals = local.deadReckoning.intervals.filter((_, i) => i !== idx);
                    updateDeadReckoning({ intervals: newIntervals });
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                const last = local.deadReckoning.intervals[local.deadReckoning.intervals.length - 1];
                const newInterval = last
                  ? { value: last.value + 15, unit: last.unit }
                  : { value: 15, unit: "minutes" as TimeUnit };
                updateDeadReckoning({ intervals: [...local.deadReckoning.intervals, newInterval] });
              }}
              sx={{ alignSelf: "flex-start" }}
            >
              Add Point
            </Button>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Line Color</Typography>
              <input
                type="color"
                value={local.deadReckoning.lineColor}
                onChange={(e) => updateDeadReckoning({ lineColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.deadReckoning.lineColor}
                onChange={(e) => updateDeadReckoning({ lineColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
              <Typography variant="caption" sx={{ width: 40 }}>Weight</Typography>
              <Slider
                value={local.deadReckoning.lineWeight}
                onChange={(_, val) => updateDeadReckoning({ lineWeight: val as number })}
                min={1}
                max={10}
                step={1}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 30, textAlign: "right" }}>{local.deadReckoning.lineWeight}</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 80, flexShrink: 0 }}>Point Color</Typography>
              <input
                type="color"
                value={local.deadReckoning.pointColor}
                onChange={(e) => updateDeadReckoning({ pointColor: e.target.value })}
                style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
              />
              <TextField
                size="small"
                value={local.deadReckoning.pointColor}
                onChange={(e) => updateDeadReckoning({ pointColor: e.target.value })}
                sx={{ width: 80 }}
                inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              />
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Sticky Apply */}
      <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper", flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" size="small" onClick={handleApply} disabled={isApplying} sx={{ borderRadius: 1.5, fontWeight: 700, px: 3 }}>
          {isApplying ? "Applying…" : "Apply Style"}
        </Button>
      </Box>
    </Box>
  );
}

export default VesselConfigPanel;
