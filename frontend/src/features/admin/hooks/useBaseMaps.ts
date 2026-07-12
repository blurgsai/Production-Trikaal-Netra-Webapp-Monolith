import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminBaseMaps,
  uploadBaseMapFile,
  addUrlBaseMap,
  deleteBaseMap,
} from "../api/basemapsApi";
import type { BaseMapAdminApiResponse } from "../api/basemapsApi";

const BASEMAPS_QUERY_KEY = ["admin", "basemaps"];

export function useAdminBaseMaps() {
  return useQuery<BaseMapAdminApiResponse[]>({
    queryKey: BASEMAPS_QUERY_KEY,
    queryFn: fetchAdminBaseMaps,
  });
}

export function useUploadBaseMap() {
  const queryClient = useQueryClient();
  return useMutation<
    BaseMapAdminApiResponse,
    Error,
    { name: string; file: File; attribution: string }
  >({
    mutationFn: ({ name, file, attribution }) =>
      uploadBaseMapFile(name, file, attribution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASEMAPS_QUERY_KEY });
    },
  });
}

export function useAddUrlBaseMap() {
  const queryClient = useQueryClient();
  return useMutation<
    BaseMapAdminApiResponse,
    Error,
    { name: string; tileUrl: string; attribution: string }
  >({
    mutationFn: ({ name, tileUrl, attribution }) =>
      addUrlBaseMap(name, tileUrl, attribution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASEMAPS_QUERY_KEY });
    },
  });
}

export function useDeleteBaseMap() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteBaseMap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASEMAPS_QUERY_KEY });
    },
  });
}
