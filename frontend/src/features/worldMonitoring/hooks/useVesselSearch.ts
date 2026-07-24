import { useState } from "react";
import { searchVesselsByName } from "../api/vesselSearchApi";
import type { VesselSearchMatchApiResponse } from "../model/types";

interface UseVesselSearchResult {
  search: (name: string) => Promise<VesselSearchMatchApiResponse["matches"]>;
  matches: VesselSearchMatchApiResponse["matches"];
  loading: boolean;
  error: string | null;
}

export function useVesselSearch(): UseVesselSearchResult {
  const [matches, setMatches] = useState<VesselSearchMatchApiResponse["matches"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (name: string): Promise<VesselSearchMatchApiResponse["matches"]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchVesselsByName(name);
      const results = response.matches ?? [];
      setMatches(results);
      if (results.length === 0) {
        setError(`No vessel found matching "${name}".`);
      }
      return results;
    } catch {
      setError("Failed to search for vessel. Please try again.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { search, matches, loading, error };
}
