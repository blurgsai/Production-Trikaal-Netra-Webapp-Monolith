import { baseMaps, defaultBaseMap, overlayLayers } from "../model/config";
import type { MapConfigApiResponse, MapControlSettingsApi, CountryPrefixApi, VesselDetailsApi, VesselImageApiResponse, EezRegionApi, CustomShapeApi, StyleDefinitionApi, StyleRuleApi, StyleConditionApi, ClusterConfigApi, TrajectoryConfigApi, DeadReckoningConfigApi, PopupFieldConfigApi } from "../api/types";
import type { VesselTableResponseApi, VesselTableFeatureApi } from "../api/vesselTableApi";
import type { BaseMap, VesselConfig, VesselInfo, CountryPrefix, VesselDetails, VesselImage, EezRegion, CustomShape, StyleDefinition, StyleRule, VesselTableFilter, FilterCombinator, ClusterConfig, TrajectoryConfig, DeadReckoningConfig, PopupFieldConfig, MapControlSettings, VesselTableRow } from "./types";

export interface MapConfigDomain {
  selectedBaseMap: BaseMap;
  activeLayers: Record<string, boolean>;
  layerOrder: string[];
  vesselConfig: VesselConfig;
  mapControlSettings: MapControlSettings;
}

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

export function mapApiToDomain(api: MapConfigApiResponse): MapConfigDomain {
  const selectedBaseMap =
    baseMaps.find((m) => m.id === api.selected_base_map_id) ?? defaultBaseMap;

  const activeLayers: Record<string, boolean> = {};
  if (api.active_layer_ids) {
    api.active_layer_ids.forEach((id) => {
      activeLayers[id] = true;
    });
  }

  const validIds = new Set(overlayLayers.map((l) => l.id));
  const layerOrder =
    api.layer_order?.filter((id) => validIds.has(id)) ?? overlayLayers.map((l) => l.id);

  const vc = api.vessel_config;
  const vesselConfig: VesselConfig = {
    opacity: vc?.opacity ?? DEFAULT_VESSEL_CONFIG.opacity,
    styleName: vc?.style_name ?? DEFAULT_VESSEL_CONFIG.styleName,
    defaultStyle: mapStyleDefinitionFromApi(vc?.default_style, DEFAULT_VESSEL_CONFIG.defaultStyle),
    cluster: mapClusterConfigFromApi(vc?.cluster, DEFAULT_CLUSTER_CONFIG),
    trajectory: mapTrajectoryConfigFromApi(vc?.trajectory, DEFAULT_TRAJECTORY_CONFIG),
    deadReckoning: mapDeadReckoningConfigFromApi(vc?.dead_reckoning, DEFAULT_DEAD_RECKONING_CONFIG),
    popupFields: mapPopupFieldConfigFromApi(vc?.popup_fields, DEFAULT_POPUP_FIELD_CONFIG),
    rules: (vc?.rules ?? []).map(mapStyleRuleFromApi),
    customShapes: (vc?.custom_shapes ?? []).map(mapCustomShapeFromApi),
  };

  const mcs = api.map_control_settings;
  const mapControlSettings: MapControlSettings = {
    toolbar: mcs?.toolbar ?? DEFAULT_MAP_CONTROL_SETTINGS.toolbar,
    zoombar: mcs?.zoombar ?? DEFAULT_MAP_CONTROL_SETTINGS.zoombar,
    minimap: mcs?.minimap ?? DEFAULT_MAP_CONTROL_SETTINGS.minimap,
    statusbar: mcs?.statusbar ?? DEFAULT_MAP_CONTROL_SETTINGS.statusbar,
  };

  return { selectedBaseMap, activeLayers, layerOrder, vesselConfig, mapControlSettings };
}

export function mapDomainToApi(domain: MapConfigDomain): MapConfigApiResponse {
  return {
    selected_base_map_id: domain.selectedBaseMap.id,
    active_layer_ids: Object.entries(domain.activeLayers)
      .filter(([, v]) => v)
      .map(([k]) => k),
    layer_order: domain.layerOrder,
    map_control_settings: mapControlSettingsToApi(domain.mapControlSettings),
    vessel_config: {
      opacity: domain.vesselConfig.opacity,
      style_name: domain.vesselConfig.styleName,
      default_style: mapStyleDefinitionToApi(domain.vesselConfig.defaultStyle),
      cluster: mapClusterConfigToApi(domain.vesselConfig.cluster),
      trajectory: mapTrajectoryConfigToApi(domain.vesselConfig.trajectory),
      dead_reckoning: mapDeadReckoningConfigToApi(domain.vesselConfig.deadReckoning),
      popup_fields: mapPopupFieldConfigToApi(domain.vesselConfig.popupFields),
      rules: domain.vesselConfig.rules.map(mapStyleRuleToApi),
      custom_shapes: domain.vesselConfig.customShapes.map(mapCustomShapeToApi),
    },
  };
}

function mapStyleDefinitionFromApi(raw: StyleDefinitionApi | null | undefined, fallback: StyleDefinition): StyleDefinition {
  return {
    shape: raw?.shape ?? fallback.shape,
    color: raw?.color ?? fallback.color,
    size: raw?.size ?? fallback.size,
  };
}

function mapStyleDefinitionToApi(domain: StyleDefinition): StyleDefinitionApi {
  return { shape: domain.shape, color: domain.color, size: domain.size };
}

function mapClusterConfigFromApi(raw: ClusterConfigApi | null | undefined, fallback: ClusterConfig): ClusterConfig {
  return {
    cellSize: raw?.cell_size ?? fallback.cellSize,
    smallClusterMax: raw?.small_cluster_max ?? fallback.smallClusterMax,
    smallClusterColor: raw?.small_cluster_color ?? fallback.smallClusterColor,
    smallClusterSize: raw?.small_cluster_size ?? fallback.smallClusterSize,
    largeClusterColor: raw?.large_cluster_color ?? fallback.largeClusterColor,
    largeClusterSize: raw?.large_cluster_size ?? fallback.largeClusterSize,
    clusterLabelColor: raw?.cluster_label_color ?? fallback.clusterLabelColor,
    minScaleDenominator: raw?.min_scale_denominator ?? fallback.minScaleDenominator,
  };
}

function mapClusterConfigToApi(domain: ClusterConfig): ClusterConfigApi {
  return {
    cell_size: domain.cellSize,
    small_cluster_max: domain.smallClusterMax,
    small_cluster_color: domain.smallClusterColor,
    small_cluster_size: domain.smallClusterSize,
    large_cluster_color: domain.largeClusterColor,
    large_cluster_size: domain.largeClusterSize,
    cluster_label_color: domain.clusterLabelColor,
    min_scale_denominator: domain.minScaleDenominator,
  };
}

function mapTrajectoryConfigFromApi(raw: TrajectoryConfigApi | null | undefined, fallback: TrajectoryConfig): TrajectoryConfig {
  return {
    timeSeconds: raw?.time_seconds ?? fallback.timeSeconds,
    lineColor: raw?.line_color ?? fallback.lineColor,
    lineWeight: raw?.line_weight ?? fallback.lineWeight,
    lineOpacity: raw?.line_opacity ?? fallback.lineOpacity,
    dotColor: raw?.dot_color ?? fallback.dotColor,
    dotFillColor: raw?.dot_fill_color ?? fallback.dotFillColor,
    dotFillOpacity: raw?.dot_fill_opacity ?? fallback.dotFillOpacity,
    dotRadius: raw?.dot_radius ?? fallback.dotRadius,
  };
}

function mapTrajectoryConfigToApi(domain: TrajectoryConfig): TrajectoryConfigApi {
  return {
    time_seconds: domain.timeSeconds,
    line_color: domain.lineColor,
    line_weight: domain.lineWeight,
    line_opacity: domain.lineOpacity,
    dot_color: domain.dotColor,
    dot_fill_color: domain.dotFillColor,
    dot_fill_opacity: domain.dotFillOpacity,
    dot_radius: domain.dotRadius,
  };
}

function mapDeadReckoningConfigFromApi(raw: DeadReckoningConfigApi | null | undefined, fallback: DeadReckoningConfig): DeadReckoningConfig {
  const intervals = raw?.intervals?.map((iv) => ({
    value: iv.value ?? 0,
    unit: (iv.unit as DeadReckoningConfig["intervals"][number]["unit"]) ?? "minutes",
  })) ?? fallback.intervals;
  return {
    intervals,
    lineColor: raw?.line_color ?? fallback.lineColor,
    lineWeight: raw?.line_weight ?? fallback.lineWeight,
    pointColor: raw?.point_color ?? fallback.pointColor,
  };
}

function mapDeadReckoningConfigToApi(domain: DeadReckoningConfig): DeadReckoningConfigApi {
  return {
    intervals: domain.intervals.map((iv) => ({ value: iv.value, unit: iv.unit })),
    line_color: domain.lineColor,
    line_weight: domain.lineWeight,
    point_color: domain.pointColor,
  };
}

function mapPopupFieldConfigFromApi(raw: PopupFieldConfigApi | null | undefined, fallback: PopupFieldConfig): PopupFieldConfig {
  return {
    enabledFields: raw?.enabled_fields ?? fallback.enabledFields,
  };
}

function mapPopupFieldConfigToApi(domain: PopupFieldConfig): PopupFieldConfigApi {
  return {
    enabled_fields: domain.enabledFields,
  };
}

function mapStyleConditionFromApi(raw: StyleConditionApi): VesselTableFilter {
  return {
    column: raw.column ?? "",
    operator: (raw.operator as VesselTableFilter["operator"]) ?? "=",
    value: raw.value ?? "",
    combinator: (raw.combinator as FilterCombinator) ?? "AND",
  };
}

function mapStyleConditionToApi(domain: VesselTableFilter): StyleConditionApi {
  return {
    column: domain.column,
    operator: domain.operator,
    value: domain.value,
    combinator: domain.combinator ?? "AND",
  };
}

function mapStyleRuleFromApi(raw: StyleRuleApi): StyleRule {
  return {
    id: raw.id,
    name: raw.name ?? "",
    conditions: (raw.conditions ?? []).map(mapStyleConditionFromApi),
    combinator: (raw.combinator as FilterCombinator) ?? "AND",
    style: mapStyleDefinitionFromApi(raw.style, { shape: "circle", color: "#ff0000", size: 20 }),
  };
}

function mapStyleRuleToApi(domain: StyleRule): StyleRuleApi {
  return {
    id: domain.id,
    name: domain.name,
    conditions: domain.conditions.map(mapStyleConditionToApi),
    combinator: domain.combinator,
    style: mapStyleDefinitionToApi(domain.style),
  };
}

export function mapRawVesselToInfo(raw: Record<string, unknown>): VesselInfo | null {
  const id = String(raw.id ?? raw.vessel_id ?? "");
  const lat = Number(raw.location_current_lat);
  const lon = Number(raw.location_current_lon);
  const heading = Number(raw.heading_current_consensusvalue);
  const speed = Number(raw.speed_current_consensusvalue);

  if (!id || isNaN(lat) || isNaN(lon) || isNaN(heading) || isNaN(speed)) {
    return null;
  }

  return {
    id,
    locationCurrentLat: lat,
    locationCurrentLon: lon,
    headingCurrentConsensusValue: heading,
    speedCurrentConsensusValue: speed,
    name: (raw.name ?? raw.vessel_name) as string | undefined,
    mmsi: (raw.identification_mmsi ?? raw.mmsi) as string | undefined,
    imo: (raw.identification_imo ?? raw.imo) as string | undefined,
    rawProperties: raw,
  };
}

export function mapVesselDetailsFromApi(raw: VesselDetailsApi): VesselDetails {
  return {
    vesselType: raw.vessel?.vessel_type ?? "Unknown",
    vesselName: raw.vessel?.vessel_name ?? "Unknown Vessel",
    flag: raw.vessel?.flag ?? "Unknown",
    length: raw.vessel?.length,
    width: raw.vessel?.width,
    grossTonnage: raw.vessel?.gross_tonnage,
  };
}

export function mapVesselImageFromApi(raw: VesselImageApiResponse): VesselImage {
  return {
    imageUrl: raw.image_url,
  };
}

export function mapCountryPrefixFromApi(raw: CountryPrefixApi): CountryPrefix {
  return {
    country: raw.country,
    prefix: raw.prefix,
  };
}

export function mapCountryPrefixesFromApi(raw: CountryPrefixApi[]): CountryPrefix[] {
  return raw.map(mapCountryPrefixFromApi);
}

export function mapEezRegionFromApi(raw: EezRegionApi): EezRegion {
  return {
    id: raw.id,
    name: raw.name,
    bounds: raw.bounds,
  };
}

export function mapCustomShapeFromApi(raw: CustomShapeApi): CustomShape {
  return {
    id: raw.id,
    name: raw.name,
    svg: raw.svg,
  };
}

export function mapCustomShapeToApi(domain: CustomShape): CustomShapeApi {
  return {
    id: domain.id,
    name: domain.name,
    svg: domain.svg,
  };
}

export function mapControlSettingsFromApi(raw: MapControlSettingsApi | null | undefined, fallback: MapControlSettings): MapControlSettings {
  return {
    toolbar: raw?.toolbar ?? fallback.toolbar,
    zoombar: raw?.zoombar ?? fallback.zoombar,
    minimap: raw?.minimap ?? fallback.minimap,
    statusbar: raw?.statusbar ?? fallback.statusbar,
  };
}

export function mapControlSettingsToApi(domain: MapControlSettings): MapControlSettingsApi {
  return {
    toolbar: domain.toolbar,
    zoombar: domain.zoombar,
    minimap: domain.minimap,
    statusbar: domain.statusbar,
  };
}

export interface VesselTablePage {
  rows: VesselTableRow[];
  total: number;
  returned: number;
}

export function mapVesselTableResponse(response: VesselTableResponseApi): VesselTablePage {
  return {
    rows: response.features.map(mapVesselTableFeature),
    total: response.numberMatched ?? response.totalFeatures ?? 0,
    returned: response.numberReturned ?? response.features.length,
  };
}

function mapVesselTableFeature(feature: VesselTableFeatureApi): VesselTableRow {
  return {
    id: feature.id,
    properties: feature.properties,
  };
}
