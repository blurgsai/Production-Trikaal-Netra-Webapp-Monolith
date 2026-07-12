import { useState, useEffect, useCallback, useRef } from "react";
import { loadMapConfig, saveMapConfig, applyVesselStyle, validateStyleExists, fetchCustomBaseMaps, fetchDynamicOverlays, fetchOverlayBounds, setCachedOverlays } from "../api";
import { mapApiToDomain, mapDomainToApi } from "../model/mappers";
import { generateSld } from "../model/sldGenerator";
import { baseMaps as defaultBaseMaps, defaultBaseMap, overlayLayers, weatherLayers } from "../model/config";
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
  const [customBaseMaps, setCustomBaseMaps] = useState<BaseMap[]>([]);
  const [dynamicOverlays, setDynamicOverlays] = useState<OverlayLayerConfig[]>([]);
  const [selectedBaseMap, setSelectedBaseMap] = useState<BaseMap>(() => defaultBaseMap);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({});
  const [flyToBounds, setFlyToBounds] = useState<[number, number, number, number] | null>(null);
  const [layerOrder, setLayerOrder] = useState<string[]>(() => overlayLayers.map((l) => l.id));
  const [vesselConfig, setVesselConfig] = useState<VesselConfig>(DEFAULT_VESSEL_CONFIG);
  const [mapControlSettings, setMapControlSettings] = useState<MapControlSettings>(DEFAULT_MAP_CONTROL_SETTINGS);

  const [selectedVessel, setSelectedVessel] = useState<VesselInfo | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const styleRequestIdRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSaveRef = useRef(true);

  const allBaseMaps = [...defaultBaseMaps, ...customBaseMaps];
  const allOverlayLayers = [...overlayLayers, ...dynamicOverlays];

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCustomBaseMaps(), fetchDynamicOverlays()]).then(([maps, overlays]) => {
      if (cancelled) return;
      const mergedBaseMaps = [...defaultBaseMaps, ...maps];
      setCustomBaseMaps(maps);
      setDynamicOverlays(overlays);
      setCachedOverlays(overlays);
      const mergedOverlayLayers = [...overlayLayers, ...overlays];
      loadMapConfig().then((api) => {
        if (cancelled) return;
        const domain = mapApiToDomain(api, mergedBaseMaps, mergedOverlayLayers);
        setSelectedBaseMap(domain.selectedBaseMap);
        setActiveLayers(domain.activeLayers);
        setLayerOrder((prev) => {
          const saved = domain.layerOrder.length > 0 ? domain.layerOrder : prev;
          const mergedIds = new Set(mergedOverlayLayers.map((l) => l.id));
          const valid = saved.filter((id) => mergedIds.has(id));
          const existing = new Set(valid);
          const newIds = mergedOverlayLayers.map((l) => l.id).filter((id) => !existing.has(id));
          return [...valid, ...newIds];
        });
        setVesselConfig(domain.vesselConfig ?? DEFAULT_VESSEL_CONFIG);
        setMapControlSettings(domain.mapControlSettings ?? DEFAULT_MAP_CONTROL_SETTINGS);
        skipSaveRef.current = false;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setActiveLayers((prev) => {
      const turningOn = !prev[layerId];
      const next = { ...prev, [layerId]: turningOn };

      if (turningOn) {
        const layer = allOverlayLayers.find((l) => l.id === layerId);
        if (layer?.isENC) {
          if (layer.bounds) {
            setFlyToBounds(layer.bounds);
          } else {
            fetchOverlayBounds(layerId).then((bounds) => {
              if (bounds) {
                setFlyToBounds(bounds);
              }
            });
          }
        }
      }
      return next;
    });
  };

  const flyToLayer = (layerId: string) => {
    const layer = allOverlayLayers.find((l) => l.id === layerId);
    if (layer?.isENC) {
      if (layer.bounds) {
        setFlyToBounds(layer.bounds);
      } else {
        fetchOverlayBounds(layerId).then((bounds) => {
          if (bounds) {
            setFlyToBounds(bounds);
          }
        });
      }
    }
  };

  const reorderLayers = useCallback(
    (oldIndex: number, newIndex: number) => {
      setLayerOrder((prev) => {
        if (prev.length === 0) return prev;
        const clampedOld = Math.max(0, Math.min(oldIndex, prev.length - 1));
        const clampedNew = Math.max(0, Math.min(newIndex, prev.length - 1));
        const next = [...prev];
        const [moved] = next.splice(clampedOld, 1);
        next.splice(clampedNew, 0, moved);
        return next;
      });
    },
    []
  );

  const getOrderedLayers = useCallback((): OverlayLayerConfig[] => {
    const idToLayer = new Map(allOverlayLayers.map((l) => [l.id, l]));
    return layerOrder
      .map((id) => idToLayer.get(id))
      .filter((l): l is OverlayLayerConfig => l !== undefined)
      .map((layer, index) => ({
        ...layer,
        zIndex: 1 + index,
      }));
  }, [layerOrder, allOverlayLayers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const applyVesselStyleCallback = useCallback(async (draft: VesselConfig) => {
    const currentRequestId = ++styleRequestIdRef.current;
    const userId = localStorage.getItem("user_id") ?? "";
    const styleName = `user_${userId}_vessel_style`;
    const sld = generateSld(
      styleName,
      draft.defaultStyle,
      draft.rules,
      draft.customShapes,
      draft.cluster
    );
    const finalStyleName = await applyVesselStyle(userId, sld);
    if (currentRequestId !== styleRequestIdRef.current) return;
    setVesselConfig({ ...draft, styleName: finalStyleName });
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (skipSaveRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMapConfig(
        mapDomainToApi({
          selectedBaseMap,
          activeLayers,
          layerOrder,
          vesselConfig,
          mapControlSettings,
        })
      );
    }, 800);
  }, [selectedBaseMap, activeLayers, layerOrder, vesselConfig, mapControlSettings]);

  return {
    baseMaps: allBaseMaps,
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
    overlayLayers: allOverlayLayers,
    weatherLayers,
    mapControlSettings,
    setMapControlSettings,
    flyToBounds,
    setFlyToBounds,
    flyToLayer,
  };
}
