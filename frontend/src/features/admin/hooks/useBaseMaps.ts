import { useQuery } from "@tanstack/react-query";
import { fetchAdminBaseMaps } from "../api/basemapsApi";
import type { BaseMapAdminApiResponse } from "../api/basemapsApi";

export { useUploadBaseMap } from "./useUploadBaseMap";
export { useAddUrlBaseMap } from "./useAddUrlBaseMap";
export { useDeleteBaseMap } from "./useDeleteBaseMap";

const BASEMAPS_QUERY_KEY = ["admin", "basemaps"];

export function useAdminBaseMaps() {
  return useQuery<BaseMapAdminApiResponse[]>({
    queryKey: BASEMAPS_QUERY_KEY,
    queryFn: fetchAdminBaseMaps,
  });
}
