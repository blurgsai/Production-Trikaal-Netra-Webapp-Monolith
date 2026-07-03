import L from "leaflet";

const GEOSERVER_URL = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${
  import.meta.env.VITE_GEOSERVER_WORKSPACE
}/wms`;

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
    `${GEOSERVER_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
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
