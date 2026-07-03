import { fetchDistinctValues } from "../api/lloydsTableApi";

export const useLloydsDistinctValues = () => {
  return async (field: string, search?: string): Promise<string[]> => {
    const response = await fetchDistinctValues(field, search);

    return response.values ?? [];
  };
};
