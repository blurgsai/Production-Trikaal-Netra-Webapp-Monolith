import { useQuery } from "@tanstack/react-query";
import { fetchAdminOverlays } from "../api/overlaysApi";
import type { OverlayAdminApiResponse } from "../api/overlaysApi";

export { useUploadOverlay } from "./useUploadOverlay";
export { useAddUrlOverlay } from "./useAddUrlOverlay";
export { useDeleteOverlay } from "./useDeleteOverlay";

const OVERLAYS_QUERY_KEY = ["admin", "overlays"];

export function useAdminOverlays() {
  return useQuery<OverlayAdminApiResponse[]>({
    queryKey: OVERLAYS_QUERY_KEY,
    queryFn: fetchAdminOverlays,
  });
}
