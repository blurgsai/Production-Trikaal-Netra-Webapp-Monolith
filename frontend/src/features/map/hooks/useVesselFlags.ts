import { useState, useEffect, useCallback } from "react";
import { createVesselFlag, deleteVesselFlag, fetchVesselFlags } from "../api";
import { mapVesselFlagsFromApi } from "../model/mappers";
import type { VesselFlag, VesselFlagStatus } from "../model/types";

export function useVesselFlags(vesselId: string | undefined) {
  const [flags, setFlags] = useState<VesselFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!vesselId) {
      setFlags([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetchVesselFlags(vesselId);
      setFlags(mapVesselFlagsFromApi(res.data));
    } catch {
      setError("Failed to load flags");
    } finally {
      setLoading(false);
    }
  }, [vesselId]);

  useEffect(() => {
    load();
  }, [load]);

  const addFlag = useCallback(
    async (flag: VesselFlagStatus, comment: string) => {
      if (!vesselId) return;
      await createVesselFlag({ vessel_id: vesselId, flag, comment });
      await load();
    },
    [vesselId, load],
  );

  const removeFlag = useCallback(
    async (flagId: string) => {
      await deleteVesselFlag(flagId);
      await load();
    },
    [load],
  );

  return { flags, loading, error, addFlag, removeFlag, refresh: load };
}
