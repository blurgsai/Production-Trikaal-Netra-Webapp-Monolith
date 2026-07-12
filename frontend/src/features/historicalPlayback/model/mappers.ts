import type {
  TrajectoryFilterApi,
  TrajectoryPointApi,
  TrajectoryResponseApi,
} from "../api/types";

import type {
  PlaybackChunk,
  PlaybackFilter,
  PlaybackPoint,
} from "./types";

const FIELD_TO_COLUMN: Record<PlaybackFilter["field"], string> = {
  vesselId: "vessel_id",
  mmsi: "mmsi",
  speed: "speed",
  heading: "heading",
  course: "course",
  navigationStatus: "status",
  latitude: "lat",
  longitude: "lon",
  kinematicsSpeed: "processing_kinematics_speed_mps",
  shipName: "shipname",
  destination: "destination",
  callsign: "callsign",
};

export function mapFiltersToApi(
  filters: PlaybackFilter[],
): TrajectoryFilterApi[] {
  return filters.map((f) => ({
    column: FIELD_TO_COLUMN[f.field],
    operator: f.operator,
    value: f.value,
    combinator: f.combinator,
  }));
}

export function mapTrajectoryPoint(point: TrajectoryPointApi): PlaybackPoint {
  return {
    timestamp: point.ts,
    latitude: point.lat,
    longitude: point.lon,
    heading: point.heading,
  };
}

export function mapTrajectoryResponse(
  response: TrajectoryResponseApi,
): PlaybackChunk {
  return {
    chunkOffset: 0,
    chunkStart: response.timestamps[0] ?? "",
    chunkEnd: response.timestamps[response.timestamps.length - 1] ?? "",
    timestamps: response.timestamps,
    vessels: Object.fromEntries(
      Object.entries(response.trajectories).map(([vesselId, points]) => [
        vesselId,
        points.map(mapTrajectoryPoint),
      ]),
    ),
  };
}
