import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadBaseMapFile } from "../api/basemapsApi";
import type { BaseMapAdminApiResponse } from "../api/basemapsApi";

const BASEMAPS_QUERY_KEY = ["admin", "basemaps"];

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
