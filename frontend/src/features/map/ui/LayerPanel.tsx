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
    >
      <FormControlLabel
        control={
          <Switch checked={checked} onChange={onToggle} color="primary" />
        }
        label={title}
        sx={{ flex: 1, mr: 0 }}
      />
      <IconButton
        size="small"
        {...attributes}
        {...listeners}
        sx={{ cursor: "grab", p: 0.5 }}
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
        <Typography variant="subtitle2" sx={{ mb: 1.2, fontWeight: 600 }}>
          Base Map
        </Typography>
        <RadioGroup
          value={selectedBaseMap.id}
          onChange={(e) => {
            const selected = baseMaps.find((m) => m.id === e.target.value);
            if (selected) onSelectBaseMap(selected);
          }}
        >
          {baseMaps.map((map) => (
            <FormControlLabel
              key={map.id}
              value={map.id}
              control={<Radio />}
              label={map.title}
            />
          ))}
        </RadioGroup>

        <Divider sx={{ my: 2 }} />

        {/* Layers */}
        <Typography variant="subtitle2" sx={{ mb: 1.2, fontWeight: 600 }}>
          Layers
        </Typography>
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
        <Typography variant="subtitle2" sx={{ mb: 1.2, fontWeight: 600 }}>
          Weather
        </Typography>
        <FormGroup>
          {weatherLayers.map((layer) => (
            <FormControlLabel
              key={layer.id}
              control={
                <Switch
                  checked={Boolean(activeLayers?.[layer.id])}
                  onChange={() => onToggle(layer.id)}
                  color="primary"
                />
              }
              label={layer.title}
            />
          ))}
        </FormGroup>
    </Box>
  );
}

export default LayerPanel;
