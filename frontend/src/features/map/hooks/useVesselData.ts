import { useState, useEffect, useCallback } from "react";
import { fetchVesselDataUploads } from "../api";
import { mapVesselDataUploadsFromApi } from "../model/mappers";
import type { VesselDataUpload } from "../model/types";

export function useVesselData(mmsi: string | undefined) {
  const [uploads, setUploads] = useState<VesselDataUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!mmsi) {
      setUploads([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchVesselDataUploads(mmsi);
      setUploads(mapVesselDataUploadsFromApi(data.items));
    } catch {
      setUploads([]);
      setError("Failed to load vessel data");
    } finally {
      setLoading(false);
    }
  }, [mmsi]);

  useEffect(() => {
    load();
  }, [load]);

  return { uploads, loading, error, refresh: load };
}
