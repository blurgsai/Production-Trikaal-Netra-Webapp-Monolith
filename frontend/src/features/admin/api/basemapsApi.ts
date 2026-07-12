import tileserverInstance from "@/shared/api/tileserverClient";

export interface BaseMapAdminApiResponse {
  id: string;
  name: string;
  type: string;
  source_type: string;
  tile_url: string;
  attribution: string;
  created_at: string;
}

export async function fetchAdminBaseMaps(): Promise<BaseMapAdminApiResponse[]> {
  const res = await tileserverInstance.get<BaseMapAdminApiResponse[]>("/basemaps");
  return res.data;
}

export async function uploadBaseMapFile(
  name: string,
  file: File,
  attribution: string,
): Promise<BaseMapAdminApiResponse> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);
  formData.append("attribution", attribution);
  const res = await tileserverInstance.post<BaseMapAdminApiResponse>("/basemaps/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function addUrlBaseMap(
  name: string,
  tileUrl: string,
  attribution: string,
): Promise<BaseMapAdminApiResponse> {
  const res = await tileserverInstance.post<BaseMapAdminApiResponse>("/basemaps/url", {
    name,
    tile_url: tileUrl,
    attribution,
  });
  return res.data;
}

export async function deleteBaseMap(basemapId: string): Promise<void> {
  await tileserverInstance.delete(`/basemaps/${basemapId}`);
}
