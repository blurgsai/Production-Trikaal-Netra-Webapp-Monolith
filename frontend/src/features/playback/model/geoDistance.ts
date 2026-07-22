// Great-circle distance between two lat/lon points, in metres.
// Used by the multi-vessel proximity family (vessel_rendezvous, parallel_movement,
// predicted_collision, coordinated_dark_activity, duplicate_mmsi) to compute the
// live separation between vessels as they animate — both on the map overlay and in
// the inter-vessel distance graph. Pure domain util; no UI, no raw API.

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLon = (b.lon - a.lon) * DEG_TO_RAD;
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
