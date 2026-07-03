import { useState, useEffect, useCallback } from "react";
import { fetchVesselImage } from "../api";
import { mapVesselImageFromApi } from "../model/mappers";
import type { VesselImage } from "../model/types";

export function useVesselImage(imo: string | undefined) {
  const [image, setImage] = useState<VesselImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!imo) {
      setImage(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchVesselImage(imo);
      setImage(mapVesselImageFromApi(data));
    } catch {
      setError("Failed to load vessel image");
    } finally {
      setLoading(false);
    }
  }, [imo]);

  useEffect(() => {
    load();
  }, [load]);

  return { image, loading, error, refresh: load };
}
