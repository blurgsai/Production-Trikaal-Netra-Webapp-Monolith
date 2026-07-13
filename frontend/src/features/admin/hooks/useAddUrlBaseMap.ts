import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addUrlBaseMap } from "../api/basemapsApi";
import type { BaseMapAdminApiResponse } from "../api/basemapsApi";

const BASEMAPS_QUERY_KEY = ["admin", "basemaps"];

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
