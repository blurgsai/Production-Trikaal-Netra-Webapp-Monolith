import { useState, useEffect, useCallback } from "react";
import { loadMapConfig, saveMapConfig, applyVesselStyle, validateStyleExists } from "../api";
import { mapApiToDomain, mapDomainToApi } from "../model/mappers";
import { baseMaps, overlayLayers, weatherLayers } from "../model/config";
import type { BaseMap, OverlayLayerConfig, VesselConfig, VesselInfo, ClusterConfig, TrajectoryConfig, DeadReckoningConfig, PopupFieldConfig, MapControlSettings } from "../model/types";

const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  cellSize: 50,
  smallClusterMax: 10,
  smallClusterColor: "#FFA500",
  smallClusterSize: 40,
  largeClusterColor: "#FF0000",
  largeClusterSize: 40,
  clusterLabelColor: "#FFFFFF",
  minScaleDenominator: 18500000,
};

const DEFAULT_TRAJECTORY_CONFIG: TrajectoryConfig = {
  timeSeconds: 3600,
  lineColor: "#00BFFF",
  lineWeight: 3,
  lineOpacity: 0.7,
  dotColor: "#FF0000",
  dotFillColor: "#FF0000",
  dotFillOpacity: 0.8,
  dotRadius: 4,
};

const DEFAULT_DEAD_RECKONING_CONFIG: DeadReckoningConfig = {
  intervals: [
    { value: 15, unit: "minutes" },
    { value: 30, unit: "minutes" },
    { value: 60, unit: "minutes" },
  ],
  lineColor: "#FFFF00",
  lineWeight: 2,
  pointColor: "#FF7800",
};

const DEFAULT_POPUP_FIELD_CONFIG: PopupFieldConfig = {
  enabledFields: ["mmsi", "imo", "vessel_type", "vessel_id", "position", "speed", "heading"],
};

const DEFAULT_VESSEL_CONFIG: VesselConfig = {
  opacity: 1,
  styleName: "",
  defaultStyle: { shape: "custom", color: "#04a3ff", size: 30 },
  cluster: DEFAULT_CLUSTER_CONFIG,
  trajectory: DEFAULT_TRAJECTORY_CONFIG,
  deadReckoning: DEFAULT_DEAD_RECKONING_CONFIG,
  popupFields: DEFAULT_POPUP_FIELD_CONFIG,
  rules: [],
  customShapes: [],
};

const DEFAULT_MAP_CONTROL_SETTINGS: MapControlSettings = {
  toolbar: true,
  zoombar: true,
  minimap: true,
  statusbar: true,
};

export function useMapConfig() {
  const [selectedBaseMap, setSelectedBaseMap] = useState<BaseMap>(() => {
    const api = loadMapConfig();
    const domain = mapApiToDomain(api);
    return domain.selectedBaseMap;
  });

  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(
    () => {
      const api = loadMapConfig();
      const domain = mapApiToDomain(api);
      return domain.activeLayers;
    }
  );

  const [layerOrder, setLayerOrder] = useState<string[]>(() => {
    const api = loadMapConfig();
    const domain = mapApiToDomain(api);
    return domain.layerOrder;
  });

  const [vesselConfig, setVesselConfig] = useState<VesselConfig>(() => {
    const api = loadMapConfig();
    const domain = mapApiToDomain(api);
    return domain.vesselConfig ?? DEFAULT_VESSEL_CONFIG;
  });

  const [mapControlSettings, setMapControlSettings] = useState<MapControlSettings>(() => {
    const api = loadMapConfig();
    const domain = mapApiToDomain(api);
    return domain.mapControlSettings ?? DEFAULT_MAP_CONTROL_SETTINGS;
  });

  const [selectedVessel, setSelectedVessel] = useState<VesselInfo | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!vesselConfig.styleName) return;
    let cancelled = false;
    validateStyleExists(vesselConfig.styleName).then((exists) => {
      if (!exists && !cancelled) {
        setVesselConfig((prev) => ({ ...prev, styleName: "" }));
      }
    });
    return () => { cancelled = true; };
  }, [vesselConfig.styleName]);

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  const reorderLayers = useCallback(
    (oldIndex: number, newIndex: number) => {
      setLayerOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);
        return next;
      });
    },
    []
  );

  const getOrderedLayers = useCallback((): OverlayLayerConfig[] => {
    const idToLayer = new Map(overlayLayers.map((l) => [l.id, l]));
    return layerOrder
      .map((id) => idToLayer.get(id))
      .filter((l): l is OverlayLayerConfig => l !== undefined)
      .map((layer, index) => ({
        ...layer,
        zIndex: 1 + index,
      }));
  }, [layerOrder]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const applyVesselStyleCallback = useCallback(async (draft: VesselConfig) => {
    const styleName = await applyVesselStyle(draft);
    setVesselConfig({ ...draft, styleName });
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    saveMapConfig(
      mapDomainToApi({
        selectedBaseMap,
        activeLayers,
        layerOrder,
        vesselConfig,
        mapControlSettings,
      })
    );
  }, [selectedBaseMap, activeLayers, layerOrder, vesselConfig, mapControlSettings]);

  return {
    baseMaps,
    selectedBaseMap,
    setSelectedBaseMap,
    activeLayers,
    toggleLayer,
    layerOrder,
    reorderLayers,
    getOrderedLayers,
    vesselConfig,
    setVesselConfig,
    selectedVessel,
    setSelectedVessel,
    applyVesselStyle: applyVesselStyleCallback,
    refreshKey,
    overlayLayers,
    weatherLayers,
    mapControlSettings,
    setMapControlSettings,
  };
}
