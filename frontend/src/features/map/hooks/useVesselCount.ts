import { useState, useEffect, useCallback } from "react";
import { fetchVesselCount, fetchVesselCategoryCounts } from "../api";
import type { VesselCountCategory } from "../model/types";

export function useVesselCount(cqlFilter?: string) {
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<VesselCountCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [count, categoryCounts] = await Promise.all([
        fetchVesselCount(cqlFilter),
        fetchVesselCategoryCounts(cqlFilter),
      ]);
      setTotal(count);
      setCategories(categoryCounts);
    } catch {
      setError("Failed to load vessel count data");
    } finally {
      setLoading(false);
    }
  }, [cqlFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return { total, categories, loading, error, refresh: load };
}
