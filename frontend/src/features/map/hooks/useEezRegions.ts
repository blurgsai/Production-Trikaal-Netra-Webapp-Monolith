import { useState, useEffect, useCallback } from "react";
import { fetchEezRegions } from "../api/eezRegionsApi";
import type { EezRegion } from "../model/types";
import { mapEezRegionFromApi } from "../model/mappers";

export function useEezRegions() {
  const [regions, setRegions] = useState<EezRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await fetchEezRegions();
      setRegions(raw.map(mapEezRegionFromApi));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load EEZ regions";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { regions, loading, error, refresh: load };
}
