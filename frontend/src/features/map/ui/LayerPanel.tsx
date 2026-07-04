import {
  Box,
  Typography,
  IconButton,
  Divider,
  FormGroup,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
} from "@mui/material";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { overlayLayers, weatherLayers, baseMaps } from "../model/config";
import type { BaseMap } from "../model/types";

interface LayerPanelProps {
  selectedBaseMap: BaseMap;
  onSelectBaseMap: (map: BaseMap) => void;
  activeLayers: Record<string, boolean>;
  onToggle: (layerId: string) => void;
  layerOrder: string[];
  onReorderLayers: (oldIndex: number, newIndex: number) => void;
  onClose?: () => void;
}

function SortableLayerItem({
  id,
  title,
  checked,
  onToggle,
}: {
  id: string;
  title: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 1,
        transition: "background-color 0.15s",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <FormControlLabel
        control={
          <Switch checked={checked} onChange={onToggle} color="primary" size="small" />
        }
        label={<Typography variant="body2">{title}</Typography>}
        sx={{ flex: 1, mr: 0 }}
      />
      <IconButton
        size="small"
        {...attributes}
        {...listeners}
        sx={{ cursor: "grab", p: 0.5, color: "text.disabled", "&:hover": { color: "text.secondary" } }}
      >
        <DragHandleIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function LayerPanel({
  selectedBaseMap,
  onSelectBaseMap,
  activeLayers,
  onToggle,
  layerOrder,
  onReorderLayers,
}: LayerPanelProps) {
  const idToLayer = new Map(overlayLayers.map((l) => [l.id, l]));
  const orderedLayers = layerOrder
    .map((id) => idToLayer.get(id))
    .filter((l) => l !== undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layerOrder.indexOf(String(active.id));
      const newIndex = layerOrder.indexOf(String(over.id));
      onReorderLayers(oldIndex, newIndex);
    }
  };

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
        overflowY: "auto",
        p: 2,
      }}
    >
        {/* Base Map */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <MapOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
            Base Map
          </Typography>
        </Box>
        <RadioGroup
          value={selectedBaseMap.id}
          onChange={(e) => {
            const selected = baseMaps.find((m) => m.id === e.target.value);
            if (selected) onSelectBaseMap(selected);
          }}
          sx={{ gap: 0.5 }}
        >
          {baseMaps.map((map) => (
            <FormControlLabel
              key={map.id}
              value={map.id}
              control={<Radio size="small" />}
              label={<Typography variant="body2">{map.title}</Typography>}
              sx={{
                m: 0,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: "action.hover" },
              }}
            />
          ))}
        </RadioGroup>

        <Divider sx={{ my: 2 }} />

        {/* Layers */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <LayersOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
            Overlay Layers
          </Typography>
        </Box>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={layerOrder}
            strategy={verticalListSortingStrategy}
          >
            <FormGroup>
              {orderedLayers.map((layer) => (
                <SortableLayerItem
                  key={layer.id}
                  id={layer.id}
                  title={layer.title}
                  checked={Boolean(activeLayers?.[layer.id])}
                  onToggle={() => onToggle(layer.id)}
                />
              ))}
            </FormGroup>
          </SortableContext>
        </DndContext>

        <Divider sx={{ my: 2 }} />

        {/* Weather */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <CloudOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
            Weather
          </Typography>
        </Box>
        <FormGroup sx={{ gap: 0.5 }}>
          {weatherLayers.map((layer) => (
            <FormControlLabel
              key={layer.id}
              control={
                <Switch
                  checked={Boolean(activeLayers?.[layer.id])}
                  onChange={() => onToggle(layer.id)}
                  color="primary"
                  size="small"
                />
              }
              label={<Typography variant="body2">{layer.title}</Typography>}
              sx={{
                m: 0,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: "action.hover" },
              }}
            />
          ))}
        </FormGroup>
    </Box>
  );
}

export default LayerPanel;
