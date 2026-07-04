import { useState, useEffect } from "react";
import { MapContainer, TileLayer, WMSTileLayer, useMap } from "react-leaflet";
import { Stack, IconButton, Tooltip, Box } from "@mui/material";
import StraightenIcon from "@mui/icons-material/Straighten";
import PentagonIcon from "@mui/icons-material/Pentagon";
import "leaflet/dist/leaflet.css";
import MapOverlays from "./MapOverlays";
import VesselLayer from "./VesselLayer";
import VesselClickHandler from "./VesselClickHandler";
import DeadReckoningLayer from "./DeadReckoningLayer";
import TrajectoryLayer from "./TrajectoryLayer";
import VesselPopup from "./VesselPopup";
import ScaleBar from "./ScaleBar";
import ZoomControl from "./ZoomControl";
import MeasureTool from "./MeasureTool";
import PolygonTool from "./PolygonTool";
import EezRegionsTool from "./EezRegionsTool";
import MiniMapControl from "./MiniMapControl";
import MapStatusBar from "./MapStatusBar";
import CoordinateTracker from "./CoordinateTracker";
import { indiaBoundaryLayer } from "../model/config";
import type { BaseMap as BaseMapType, OverlayLayerConfig, VesselConfig, VesselInfo, TrajectoryPoint, TrajectoryConfig, DeadReckoningConfig, Polygon, PopupFieldConfig, MapControlSettings } from "../model/types";

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    const mapContainer = map.getContainer();
    resizeObserver.observe(mapContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 3;

interface BaseMapProps {
  selectedBaseMap: BaseMapType;
  activeLayers: Record<string, boolean>;
  orderedLayers: OverlayLayerConfig[];
  vesselConfig: VesselConfig;
  refreshKey: number;
  vesselCqlFilter?: string;
  selectedVessel: VesselInfo | null;
  selectedVesselPosition: { lat: number; lng: number } | null;
  onVesselSelect: (vessel: VesselInfo | null) => void;
  trajectory: TrajectoryPoint[];
  trajectoryConfig: TrajectoryConfig;
  deadReckoningConfig: DeadReckoningConfig;
  onVesselClick?: (vessel: VesselInfo) => void;
  onPopupFieldsChange?: (fields: PopupFieldConfig) => void;
  polygonFilters?: Polygon[];
  onPolygonFiltersChange?: (polygons: Polygon[]) => void;
  mapControlSettings: MapControlSettings;
}

function BaseMap({
  selectedBaseMap,
  activeLayers,
  orderedLayers,
  vesselConfig,
  refreshKey,
  vesselCqlFilter,
  selectedVessel,
  selectedVesselPosition,
  onVesselSelect,
  trajectory,
  trajectoryConfig,
  deadReckoningConfig,
  onVesselClick,
  onPopupFieldsChange,
  polygonFilters = [],
  onPolygonFiltersChange,
  mapControlSettings,
}: BaseMapProps) {
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [isPolygonMode, setIsPolygonMode] = useState(false);
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
    {mapControlSettings.statusbar && <MapStatusBar vesselCqlFilter={vesselCqlFilter} coords={coords} />}
    <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        url={selectedBaseMap.url}
        attribution={selectedBaseMap.attribution}
        zIndex={0}
      />
      <MapOverlays activeLayers={activeLayers} orderedLayers={orderedLayers} />
      <WMSTileLayer
        url={indiaBoundaryLayer.url!}
        layers={indiaBoundaryLayer.layers!}
        styles={indiaBoundaryLayer.styles}
        format="image/png"
        transparent={true}
        opacity={indiaBoundaryLayer.opacity!}
        zIndex={indiaBoundaryLayer.zIndex!}
      />
      <VesselLayer
        opacity={vesselConfig.opacity}
        styleName={vesselConfig.styleName}
        refreshKey={refreshKey}
        cqlFilter={vesselCqlFilter}
      />
      {selectedVessel && (
        <DeadReckoningLayer vessel={selectedVessel} config={deadReckoningConfig} />
      )}
      <TrajectoryLayer trajectory={trajectory} config={trajectoryConfig} />
      {!isMeasureMode && !isPolygonMode && (
        <VesselClickHandler
          onVesselSelect={onVesselSelect}
          onVesselClick={onVesselClick}
        />
      )}
      <PolygonTool
        enabled={isPolygonMode}
        polygons={polygonFilters}
        onChange={onPolygonFiltersChange ?? (() => {})}
        onDrawComplete={() => setIsPolygonMode(false)}
      />
      <ScaleBar unit="km" />
      <CoordinateTracker onCoordsChange={(lat, lng) => setCoords({ lat, lng })} />
      {mapControlSettings.zoombar && <ZoomControl />}
      <MapResizeHandler />
      {mapControlSettings.minimap && (
        <MiniMapControl
          tileUrl={selectedBaseMap.url}
          tileAttribution={selectedBaseMap.attribution}
        />
      )}
      {mapControlSettings.toolbar && (
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
            bgcolor: "#00000093",
            zIndex: 9000,
          }}
        >
          <Tooltip title="Measure Distance" placement="left">
            <IconButton
              size="small"
              onClick={() => {
                setIsPolygonMode(false);
                setIsMeasureMode((prev) => !prev);
              }}
              color={isMeasureMode ? "primary" : "default"}
            >
              <StraightenIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Draw Polygon Filter" placement="left">
            <IconButton
              size="small"
              onClick={() => {
                setIsMeasureMode(false);
                setIsPolygonMode((prev) => !prev);
              }}
              color={isPolygonMode ? "primary" : "default"}
            >
              <PentagonIcon />
            </IconButton>
          </Tooltip>
          <EezRegionsTool />
        </Stack>
      )}
      <MeasureTool enabled={isMeasureMode} />
    </MapContainer>
      {selectedVessel && selectedVesselPosition && (
        <VesselPopup
          vessel={selectedVessel}
          latlng={selectedVesselPosition}
          popupFields={vesselConfig.popupFields}
          onClose={() => onVesselSelect(null)}
          onPopupFieldsChange={onPopupFieldsChange}
        />
      )}
    </Box>
    </Box>
  );
}

export default BaseMap;
