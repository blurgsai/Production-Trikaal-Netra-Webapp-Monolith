import axiosInstance from "@/shared/api/client";
import type { TrajectoryResponseApi } from "./types";

export interface FetchTrajectoryParams {
  vesselId: string;
  timeSeconds?: number;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
}

export async function fetchVesselTrajectory(params: FetchTrajectoryParams): Promise<TrajectoryResponseApi> {
  const { vesselId, timeSeconds = 3600 } = params;
  
  const res = await axiosInstance.get<TrajectoryResponseApi>(
    `/vessels/trajectory/${vesselId}`,
    { params: { time: timeSeconds } }
  );
  
  return res.data;
}
