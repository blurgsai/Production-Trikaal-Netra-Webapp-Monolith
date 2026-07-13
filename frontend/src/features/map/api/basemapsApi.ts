import tileserverInstance from "@/shared/api/tileserverClient";
import type { BaseMap } from "./types";

export interface BaseMapApiResponse {
  id: string;
  name: string;
  type: string;
  source_type: string;
  tile_url: string;
  attribution: string;
  created_at: string;
}

export async function fetchCustomBaseMaps(): Promise<BaseMap[]> {
  try {
    const res = await tileserverInstance.get<BaseMapApiResponse[]>("/basemaps");
    const tileserverUrl = import.meta.env.VITE_TILESERVER_URL;
    return res.data.map((item) => ({
      id: item.id,
      title: item.name,
      url: item.type === "file"
        ? `${tileserverUrl}${item.tile_url}`
        : item.tile_url,
      attribution: item.attribution || "",
    }));
  } catch {
    return [];
  }
}
