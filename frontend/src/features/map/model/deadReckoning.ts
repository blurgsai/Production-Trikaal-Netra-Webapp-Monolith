import type { VesselInfo, DrPoint } from "./types";

const NM_TO_KM = 1.852;
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculate destination point given start, distance (nautical miles), and bearing (degrees).
 * Uses spherical law of cosines.
 */
function destination(
  lat: number,
  lon: number,
  distanceNm: number,
  bearingDeg: number
): { lat: number; lon: number } {
  const latRad = toRad(lat);
  const lonRad = toRad(lon);
  const bearingRad = toRad(bearingDeg);
  const distanceKm = distanceNm * NM_TO_KM;
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const destLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad)
    );

  return { lat: toDeg(destLatRad), lon: toDeg(destLonRad) };
}

export interface DeadReckoningResult {
  drPoints: DrPoint[];
  extension: { lat: number; lon: number } | null;
}

export function calculateDeadReckoning(
  vessel: VesselInfo,
  timePoints: number[] = [15, 30, 60]
): DeadReckoningResult {
  const lat = vessel.locationCurrentLat;
  const lon = vessel.locationCurrentLon;
  const heading = vessel.headingCurrentConsensusValue;
  const speed = vessel.speedCurrentConsensusValue;

  if (
    lat == null ||
    lon == null ||
    heading == null ||
    speed == null ||
    isNaN(lat) ||
    isNaN(lon) ||
    isNaN(heading) ||
    isNaN(speed)
  ) {
    return { drPoints: [], extension: null };
  }

  const points: DrPoint[] = [];

  for (const t of timePoints) {
    const hours = t / 60;
    const distanceNm = speed * hours;
    const dest = destination(lat, lon, distanceNm, heading);
    points.push({ lat: dest.lat, lon: dest.lon, time: t });
  }

  const last = points[points.length - 1];
  const extensionMinutes = 10;
  const extHours = extensionMinutes / 60;
  const extDistance = speed * extHours;
  const extDest = destination(last.lat, last.lon, extDistance, heading);

  return {
    drPoints: points,
    extension: { lat: extDest.lat, lon: extDest.lon },
  };
}
