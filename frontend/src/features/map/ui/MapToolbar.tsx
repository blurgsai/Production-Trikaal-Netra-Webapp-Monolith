import { useState } from "react";
import { Stack, IconButton, Tooltip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import StraightenIcon from "@mui/icons-material/Straighten";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import LayerPanel from "./LayerPanel";
import VesselConfigPanel from "./VesselConfigPanel";
import MeasureTool from "./MeasureTool";
import type { BaseMap, OverlayLayerConfig, VesselConfig } from "../model/types";

interface MapToolbarProps {
  selectedBaseMap: BaseMap;
  onSelectBaseMap: (map: BaseMap) => void;
  baseMaps: BaseMap[];
  overlayLayers: OverlayLayerConfig[];
  activeLayers: Record<string, boolean>;
  onToggleLayer: (layerId: string) => void;
  layerOrder: string[];
  onReorderLayers: (oldIndex: number, newIndex: number) => void;
  vesselConfig: VesselConfig;
  onVesselConfigApply: (config: VesselConfig) => Promise<void>;
  onFetchColumns: () => Promise<string[]>;
  onSearchColumnValues: (column: string, query: string, limit: number) => Promise<string[]>;
}

function MapToolbar({
  selectedBaseMap,
  onSelectBaseMap,
  baseMaps,
  overlayLayers,
  activeLayers,
  onToggleLayer,
  layerOrder,
  onReorderLayers,
  vesselConfig,
  onVesselConfigApply,
  onFetchColumns,
  onSearchColumnValues,
}: MapToolbarProps) {
  const theme = useTheme();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isMeasureMode, setIsMeasureMode] = useState(false);

  const openPanel = (id: string) => {
    setIsMeasureMode(false);
    setActivePanel((prev) => (prev === id ? null : id));
  };

  const handleMeasureToggle = () => {
    setActivePanel(null);
    setIsMeasureMode((prev) => !prev);
  };

  return (
    <>
      <Stack
        direction="column"
        gap={1}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        sx={{
          position: "absolute",
          p: 1,
          borderRadius: 2,
          top: 10,
          right: 10,
          bgcolor: alpha(theme.palette.background.default, 0.58),
          zIndex: 9000,
        }}
      >
        <Tooltip title="Map Config" placement="left">
          <IconButton
            size="small"
            onClick={() => openPanel("layers")}
            color={activePanel === "layers" ? "primary" : "default"}
          >
            <LayersOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Vessel Config" placement="left">
          <IconButton
            size="small"
            onClick={() => openPanel("vessel")}
            color={activePanel === "vessel" ? "primary" : "default"}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Measure Distance" placement="left">
          <IconButton
            size="small"
            onClick={handleMeasureToggle}
            color={isMeasureMode ? "primary" : "default"}
          >
            <StraightenIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {activePanel === "layers" && (
        <LayerPanel
          selectedBaseMap={selectedBaseMap}
          onSelectBaseMap={onSelectBaseMap}
          baseMaps={baseMaps}
          overlayLayers={overlayLayers}
          activeLayers={activeLayers}
          onToggle={onToggleLayer}
          layerOrder={layerOrder}
          onReorderLayers={onReorderLayers}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === "vessel" && (
        <VesselConfigPanel
          config={vesselConfig}
          onApply={onVesselConfigApply}
          onFetchColumns={onFetchColumns}
          onSearchColumnValues={onSearchColumnValues}
          onClose={() => setActivePanel(null)}
        />
      )}
      <MeasureTool enabled={isMeasureMode} />
    </>
  );
}

export default MapToolbar;
