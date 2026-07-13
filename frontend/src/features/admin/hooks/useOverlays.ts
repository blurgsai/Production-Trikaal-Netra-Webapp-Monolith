import { useQuery } from "@tanstack/react-query";
import { fetchAdminOverlays } from "../api/overlaysApi";
import { mapOverlaysFromApi } from "../model/mappers";
import type { Overlay } from "../model/types";

export { useUploadOverlay } from "./useUploadOverlay";
export { useAddUrlOverlay } from "./useAddUrlOverlay";
export { useDeleteOverlay } from "./useDeleteOverlay";

const OVERLAYS_QUERY_KEY = ["admin", "overlays"];

export function useAdminOverlays() {
  return useQuery<Overlay[]>({
    queryKey: OVERLAYS_QUERY_KEY,
    queryFn: async () => mapOverlaysFromApi(await fetchAdminOverlays()),
  });
}
