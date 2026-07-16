import { useCallback, useEffect, useState } from "react";
import { fetchLloydsData } from "../api/vesselDataApi";
import type { LloydsVesselData } from "../model/types";

export function useLloydsData(imo: string | undefined) {
  const [data, setData] = useState<LloydsVesselData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!imo) {
      setData(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await fetchLloydsData(imo);
      setData(result);
    } catch {
      setData(null);
      setError("Lloyds data not available for this vessel");
    } finally {
      setLoading(false);
    }
  }, [imo]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
