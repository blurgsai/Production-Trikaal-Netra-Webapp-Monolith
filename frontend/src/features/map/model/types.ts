export interface BaseMap {
  id: string;
  title: string;
  url: string;
  attribution: string;
  preview?: string;
}

export interface OverlayLayerConfig {
  id: string;
  title: string;
  type: "wms" | "tile" | "geojson" | "kml" | "mvt";
  url?: string;
  layers?: string;
  styles?: string;
  opacity?: number;
  zIndex?: number;
  attribution?: string;
  color?: string;
  isENC?: boolean;
  bounds?: [number, number, number, number];
}

export interface CustomShape {
  id: string;
  name: string;
  svg: string;
}

export interface StyleDefinition {
  shape: string;
  color: string;
  size: number;
}

export interface ClusterConfig {
  cellSize: number;
  smallClusterMax: number;
  smallClusterColor: string;
  smallClusterSize: number;
  largeClusterColor: string;
  largeClusterSize: number;
  clusterLabelColor: string;
  minScaleDenominator: number;
}

export interface TrajectoryConfig {
  timeSeconds: number;
  lineColor: string;
  lineWeight: number;
  lineOpacity: number;
  dotColor: string;
  dotFillColor: string;
  dotFillOpacity: number;
  dotRadius: number;
}

export type TimeUnit = "minutes" | "hours" | "days";

export interface DeadReckoningInterval {
  value: number;
  unit: TimeUnit;
}

export interface DeadReckoningConfig {
  intervals: DeadReckoningInterval[];
  lineColor: string;
  lineWeight: number;
  pointColor: string;
}

export interface StyleRule {
  id: string;
  name: string;
  conditions: VesselTableFilter[];
  combinator: FilterCombinator;
  style: StyleDefinition;
}

export interface PopupFieldConfig {
  enabledFields: string[];
}

export interface VesselConfig {
  opacity: number;
  styleName: string;
  defaultStyle: StyleDefinition;
  cluster: ClusterConfig;
  trajectory: TrajectoryConfig;
  deadReckoning: DeadReckoningConfig;
  popupFields: PopupFieldConfig;
  rules: StyleRule[];
  customShapes: CustomShape[];
}

export interface CountryPrefix {
  country: string;
  prefix: string;
}

export interface EezRegion {
  id: string;
  name: string;
  bounds: [number, number, number, number];
}

export interface VesselInfo {
  id: string;
  locationCurrentLat: number;
  locationCurrentLon: number;
  headingCurrentConsensusValue: number;
  speedCurrentConsensusValue: number;
  name?: string;
  mmsi?: string;
  imo?: string;
  rawProperties: Record<string, unknown>;
}

export interface VesselDetails {
  vesselType: string;
  vesselName: string;
  flag: string;
  length?: number;
  width?: number;
  grossTonnage?: number;
}

export interface VesselImage {
  imageUrl: string;
}

export interface DrPoint {
  lat: number;
  lon: number;
  time: number; // minutes
}

export interface TrajectoryPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface VesselCountCategory {
  category: string;
  count: number;
}

export interface VesselTableFilter {
  column: string;
  operator: "=" | "!=" | "<" | "<=" | ">" | ">=" | "startsWith" | "endsWith" | "contains";
  value: string;
  combinator?: FilterCombinator;
}

export type FilterCombinator = "AND" | "OR";

export interface VesselTableRow {
  id: string | number;
  properties: Record<string, unknown>;
}

export interface VesselTableQuery {
  cqlFilter?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SavedFilterSet {
  name: string;
  filters: VesselTableFilter[];
  polygonFilters?: Polygon[];
  createdAt: string;
}

export interface Polygon {
  id: string;
  points: { lat: number; lng: number }[];
}

export interface MapControlSettings {
  toolbar: boolean;
  zoombar: boolean;
  minimap: boolean;
  statusbar: boolean;
}

export type VesselFlagStatus = "safe" | "unsafe" | "suspicious" | "neutral" | "unknown";

export interface VesselFlag {
  id: string;
  vesselId: string;
  userId: string;
  flag: VesselFlagStatus;
  comment: string;
  createdAt: string;
}

export interface VesselDataUpload {
  id: string;
  databaseName: string;
  mmsi: string;
  data: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LloydsVesselData {
  vesselId: number;
  snapshotId: string;
  timestamp: string;
  vessel: {
    imo: number;
    vesselName: string;
    yearOfBuild: number | null;
    flag: string | null;
    callSign: string | null;
    mmsi: number | null;
    portOfRegistry: string | null;
    gross: number | null;
    net: number | null;
    dwt: number | null;
    genType: string | null;
    subType: string | null;
    vesselType: string | null;
    status: string | null;
    recordLastUpdated: string | null;
  };
  ownership: {
    current: Record<string, Array<{
      startDate: string | null;
      startQualifier: string | null;
      recordLastUpdated: string | null;
      companyInfo: {
        companyId: number;
        companyName: string;
        companyFirstYear: number | null;
        companyFirstYearQualifier: string | null;
        companyStatus: string | null;
      };
    }>>;
    history: Array<{
      relationshipType: string;
      currentInd: string;
      startDate: string | null;
      startQualifier: string | null;
      endDate: string | null;
      endQualifier: string | null;
      recordLastUpdated: string | null;
      companyInfo: Record<string, unknown>;
    }>;
  };
  inmarsat: Record<string, unknown>;
  engines: Record<string, unknown>;
  design: Record<string, unknown>;
  propulsionAndDimensions: Record<string, unknown>;
  capacities: Record<string, unknown>;
  casualties: Array<Record<string, unknown>>;
  vigilanceScore: number | null;
  buildAndHistory: Record<string, unknown> | null;
  flagHistory: Array<Record<string, unknown>>;
  nameHistory: Array<Record<string, unknown>>;
}
