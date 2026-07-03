import { useState, useEffect, useCallback } from "react";
import { fetchVesselDetails } from "../api";
import { mapVesselDetailsFromApi } from "../model/mappers";
import type { VesselDetails } from "../model/types";

export function useVesselDetails(vesselId: string | undefined) {
  const [details, setDetails] = useState<VesselDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!vesselId) {
      setDetails(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchVesselDetails(vesselId);
      setDetails(mapVesselDetailsFromApi(data));
    } catch {
      setError("Failed to load vessel details");
    } finally {
      setLoading(false);
    }
  }, [vesselId]);

  useEffect(() => {
    load();
  }, [load]);

  return { details, loading, error, refresh: load };
}
