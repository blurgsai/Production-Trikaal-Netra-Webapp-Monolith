export interface CustomShapeApi {
  id: string;
  name: string;
  svg: string;
}

export interface StyleDefinitionApi {
  shape: string | null;
  color: string | null;
  size: number | null;
}

export interface StyleConditionApi {
  column: string | null;
  operator: string | null;
  value: string | null;
  combinator: string | null;
}

export interface StyleRuleApi {
  id: string;
  name: string | null;
  conditions: StyleConditionApi[] | null;
  combinator: string | null;
  style: StyleDefinitionApi | null;
}

export interface ClusterConfigApi {
  cell_size: number | null;
  small_cluster_max: number | null;
  small_cluster_color: string | null;
  small_cluster_size: number | null;
  large_cluster_color: string | null;
  large_cluster_size: number | null;
  cluster_label_color: string | null;
  min_scale_denominator: number | null;
}

export interface TrajectoryConfigApi {
  time_seconds: number | null;
  line_color: string | null;
  line_weight: number | null;
  line_opacity: number | null;
  dot_color: string | null;
  dot_fill_color: string | null;
  dot_fill_opacity: number | null;
  dot_radius: number | null;
}

export interface DeadReckoningIntervalApi {
  value: number | null;
  unit: string | null;
}

export interface DeadReckoningConfigApi {
  intervals: DeadReckoningIntervalApi[] | null;
  line_color: string | null;
  line_weight: number | null;
  point_color: string | null;
}

export interface PopupFieldConfigApi {
  enabled_fields: string[] | null;
}

export interface VesselConfigApi {
  opacity: number | null;
  style_name: string | null;
  default_style: StyleDefinitionApi | null;
  cluster: ClusterConfigApi | null;
  trajectory: TrajectoryConfigApi | null;
  dead_reckoning: DeadReckoningConfigApi | null;
  popup_fields: PopupFieldConfigApi | null;
  rules: StyleRuleApi[] | null;
  custom_shapes: CustomShapeApi[] | null;
}

export interface MapControlSettingsApi {
  toolbar: boolean | null;
  zoombar: boolean | null;
  minimap: boolean | null;
  statusbar: boolean | null;
}

export interface MapConfigApiResponse {
  selected_base_map_id: string | null;
  active_layer_ids: string[] | null;
  layer_order: string[] | null;
  vessel_config: VesselConfigApi | null;
  map_control_settings: MapControlSettingsApi | null;
}

export interface TrajectoryPointApi {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface TrajectoryResponseApi {
  trajectory: TrajectoryPointApi[];
}

export interface CountryPrefixApi {
  country: string;
  prefix: string;
}

export type CountryPrefixResponseApi = CountryPrefixApi[];

export interface VesselDetailsApi {
  vessel?: {
    vessel_type?: string;
    vessel_name?: string;
    flag?: string;
    length?: number;
    width?: number;
    gross_tonnage?: number;
  };
}

export interface VesselImageApiResponse {
  image_url: string;
}

export interface EezRegionApi {
  id: string;
  name: string;
  bounds: [number, number, number, number];
}
