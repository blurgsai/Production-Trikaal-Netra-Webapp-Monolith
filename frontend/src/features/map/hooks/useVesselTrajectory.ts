import { useState, useCallback } from "react";
import { fetchVesselTrajectory } from "../api";
import type { FetchTrajectoryParams } from "../api/trajectoryApi";
import type { TrajectoryPoint } from "../model/types";

export function useVesselTrajectory() {
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (params: FetchTrajectoryParams) => {
    if (!params.vesselId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchVesselTrajectory(params);
      setTrajectory(data.trajectory ?? []);
    } catch {
      setError("Failed to load trajectory");
      setTrajectory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setTrajectory([]);
    setError("");
  }, []);

  return { trajectory, loading, error, load, clear };
}
