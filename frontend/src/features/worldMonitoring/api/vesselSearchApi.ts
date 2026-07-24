import { axiosInstance } from "@/shared/api";

export interface VesselSearchMatchApiResponse {
  vessel_id: number;
  ship_name: string;
  mmsi: number | null;
  score: number;
}

export interface VesselSearchApiResponse {
  success: boolean;
  query: string;
  matches: VesselSearchMatchApiResponse[];
}

export async function searchVesselsByName(
  name: string,
  limit = 5,
): Promise<VesselSearchApiResponse> {
  const res = await axiosInstance.get<VesselSearchApiResponse>(
    "/world-monitor/vessels/search",
    { params: { name, limit } },
  );
  return res.data;
}
