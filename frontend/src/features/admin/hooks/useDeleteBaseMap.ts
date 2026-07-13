import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBaseMap } from "../api/basemapsApi";

const BASEMAPS_QUERY_KEY = ["admin", "basemaps"];

export function useDeleteBaseMap() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteBaseMap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASEMAPS_QUERY_KEY });
    },
  });
}
