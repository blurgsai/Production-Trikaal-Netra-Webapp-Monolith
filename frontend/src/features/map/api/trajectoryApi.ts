import type { TrajectoryResponseApi, TrajectoryPointApi } from "./types";

export interface FetchTrajectoryParams {
  vesselId: string;
  timeSeconds?: number;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
}

function generateMockTrajectory(params: FetchTrajectoryParams): TrajectoryPointApi[] {
  const { lat, lon, heading, speed, timeSeconds = 3600 } = params;

  const speedMs = speed || 0;
  const headingRad = (heading || 0) * (Math.PI / 180);

  const now = Date.now();
  const intervalCount = Math.min(Math.max(Math.floor(timeSeconds / 60), 10), 100);
  const intervalSeconds = timeSeconds / intervalCount;

  const points: TrajectoryPointApi[] = [];
  let currentLat = lat;
  let currentLon = lon;

  for (let i = 0; i <= intervalCount; i++) {
    const timestamp = new Date(now - i * intervalSeconds * 1000).toISOString();

    if (i > 0) {
      const dt = intervalSeconds;
      const distanceM = speedMs * dt;
      const R = 6371000;
      const latRad = currentLat * (Math.PI / 180);

      const deltaLat = (distanceM * Math.cos(headingRad) / R) * (180 / Math.PI);
      const deltaLon = (distanceM * Math.sin(headingRad) / (R * Math.cos(latRad))) * (180 / Math.PI);

      const noiseLat = (Math.random() - 0.5) * 0.001;
      const noiseLon = (Math.random() - 0.5) * 0.001;

      currentLat -= deltaLat + noiseLat;
      currentLon -= deltaLon + noiseLon;
    }

    points.push({ lat: currentLat, lng: currentLon, timestamp });
  }

  points.reverse();
  return points;
}

export async function fetchVesselTrajectory(params: FetchTrajectoryParams): Promise<TrajectoryResponseApi> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const trajectory = generateMockTrajectory(params);

  return { trajectory };
}
