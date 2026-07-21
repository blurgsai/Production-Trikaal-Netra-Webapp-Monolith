import axiosInstance from "@/shared/api/client";

export interface VesselDataUploadApi {
  _id: string;
  database_name: string;
  mmsi: string;
  data: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface VesselDataUploadsResponseApi {
  items: VesselDataUploadApi[];
  total: number;
}

export interface LloydsVesselDataApi {
  vessel_id: number;
  snapshot_id: string;
  timestamp: string;
  vessel: {
    imo: number;
    vessel_name: string;
    year_of_build: number | null;
    flag: string | null;
    call_sign: string | null;
    mmsi: number | null;
    port_of_registry: string | null;
    gross: number | null;
    net: number | null;
    dwt: number | null;
    gen_type: string | null;
    sub_type: string | null;
    vessel_type: string | null;
    status: string | null;
    record_last_updated: string | null;
  };
  ownership: Record<string, unknown>;
  inmarsat: Record<string, unknown>;
  engines: Record<string, unknown>;
  design: Record<string, unknown>;
  propulsion_and_dimensions: Record<string, unknown>;
  capacities: Record<string, unknown>;
  casualties: Array<Record<string, unknown>>;
  vigilance_score: number | null;
  build_and_history: Record<string, unknown> | null;
  flag_history: Array<Record<string, unknown>>;
  name_history: Array<Record<string, unknown>>;
}

export async function fetchVesselDataUploads(mmsi: string): Promise<VesselDataUploadsResponseApi> {
  const res = await axiosInstance.get<VesselDataUploadsResponseApi>(
    `/vessels/${mmsi}/uploads`,
  );
  return res.data;
}

export async function fetchLloydsData(imo: string): Promise<LloydsVesselDataApi> {
  const res = await axiosInstance.get<LloydsVesselDataApi>(`/vessels/imo/${imo}/lloyds`);
  return res.data;
}
