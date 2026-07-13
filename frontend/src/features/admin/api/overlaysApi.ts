import tileserverInstance from "@/shared/api/tileserverClient";

export interface OverlayAdminApiResponse {
  id: string;
  name: string;
  type: string;
  source_type: string;
  tile_url: string;
  attribution: string;
  color: string;
  opacity: number;
  created_at: string;
}

export async function fetchAdminOverlays(): Promise<OverlayAdminApiResponse[]> {
  const res = await tileserverInstance.get<OverlayAdminApiResponse[]>("/overlays");
  return res.data;
}

export async function uploadOverlayFile(
  name: string,
  file: File,
  attribution: string,
  color: string,
  opacity: number,
): Promise<OverlayAdminApiResponse> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);
  formData.append("attribution", attribution);
  formData.append("color", color);
  formData.append("opacity", String(opacity));
  const res = await tileserverInstance.post<OverlayAdminApiResponse>("/overlays/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function addUrlOverlay(
  name: string,
  tileUrl: string,
  overlayType: string,
  attribution: string,
  color: string,
  opacity: number,
): Promise<OverlayAdminApiResponse> {
  const res = await tileserverInstance.post<OverlayAdminApiResponse>("/overlays/url", {
    name,
    tile_url: tileUrl,
    overlay_type: overlayType,
    attribution,
    color,
    opacity,
  });
  return res.data;
}

export async function deleteOverlay(overlayId: string): Promise<void> {
  await tileserverInstance.delete(`/overlays/${overlayId}`);
}
