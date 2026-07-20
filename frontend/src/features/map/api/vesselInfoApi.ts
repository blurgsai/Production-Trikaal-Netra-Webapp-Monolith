import L from "leaflet";
import { mapRawVesselToInfo } from "../model/mappers";
import type { VesselInfo } from "../model/types";

const GEOSERVER_WMS_URL = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${
  import.meta.env.VITE_GEOSERVER_WORKSPACE
}/wms`;

const GEOSERVER_WFS_URL = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${
  import.meta.env.VITE_GEOSERVER_WORKSPACE
}/ows`;

const LAYER_NAME = `${import.meta.env.VITE_GEOSERVER_WORKSPACE}:vessels`;

export interface RawVesselFeature {
  id?: string | number;
  vessel_id?: string | number;
  location_current_lat?: string | number;
  location_current_lon?: string | number;
  heading_current_consensusvalue?: string | number;
  speed_current_consensusvalue?: string | number;
  name?: string;
  vessel_name?: string;
  [key: string]: unknown;
}

export async function fetchVesselInfo(
  _latlng: L.LatLng,
  point: L.Point,
  size: L.Point,
  bounds: L.LatLngBounds
): Promise<RawVesselFeature | null> {
  const clickTolerance = 15;

  const url =
    `${GEOSERVER_WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
    `&LAYERS=trikaalx:vessels&QUERY_LAYERS=trikaalx:vessels&STYLES=` +
    `&BBOX=${bounds.toBBoxString()}&WIDTH=${size.x}&HEIGHT=${size.y}` +
    `&X=${Math.floor(point.x)}&Y=${Math.floor(point.y)}` +
    `&SRS=EPSG:4326&INFO_FORMAT=application/json` +
    `&FEATURE_COUNT=5&buffer=${clickTolerance}&CQL_FILTER=INCLUDE`;

  const res = await fetch(url);
  const text = await res.text();

  const data = JSON.parse(text, (key, value) =>
    key === "vessel_id" ? String(value) : value
  );

  return data?.features?.[0]?.properties ?? null;
}

export async function fetchVesselByMmsi(mmsi: string): Promise<VesselInfo | null> {
  const cql = `identification_mmsi=${mmsi}`;
  const url =
    `${GEOSERVER_WFS_URL}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&TYPENAMES=${LAYER_NAME}&OUTPUTFORMAT=application/json&CQL_FILTER=${encodeURIComponent(cql)}&MAXFEATURES=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const props = data?.features?.[0]?.properties;
    if (!props) return null;
    return mapRawVesselToInfo(props);
  } catch {
    return null;
  }
}
