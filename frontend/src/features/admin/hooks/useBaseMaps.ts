import { useQuery } from "@tanstack/react-query";
import { fetchAdminBaseMaps } from "../api/basemapsApi";
import { mapBaseMapsFromApi } from "../model/mappers";
import type { BaseMap } from "../model/types";

export { useUploadBaseMap } from "./useUploadBaseMap";
export { useAddUrlBaseMap } from "./useAddUrlBaseMap";
export { useDeleteBaseMap } from "./useDeleteBaseMap";

const BASEMAPS_QUERY_KEY = ["admin", "basemaps"];

export function useAdminBaseMaps() {
  return useQuery<BaseMap[]>({
    queryKey: BASEMAPS_QUERY_KEY,
    queryFn: async () => mapBaseMapsFromApi(await fetchAdminBaseMaps()),
  });
}
