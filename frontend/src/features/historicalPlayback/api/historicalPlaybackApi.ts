import { axiosInstance } from "@/shared/api";

import type {
  TrajectoryRequestApi,
  TrajectoryResponseApi,
} from "./types";

export async function fetchVesselTrajectories(
  payload: TrajectoryRequestApi,
): Promise<TrajectoryResponseApi> {
  const { data } = await axiosInstance.post<TrajectoryResponseApi>(
    "/vessels/trajectory",
    payload,
  );
  return data;
}
