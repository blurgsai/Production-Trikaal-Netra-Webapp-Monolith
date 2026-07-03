import { useQuery } from "@tanstack/react-query";

import { fetchMetadata } from "../api/lloydsTableApi";
import { mapMetadata } from "../model/mappers";

export const useLloydsMetadata = () => {
  return useQuery({
    queryKey: ["lloyds-metadata"],
    queryFn: async () => {
      const response = await fetchMetadata();
      return mapMetadata(response);
    },
    staleTime: Infinity,
  });
};
