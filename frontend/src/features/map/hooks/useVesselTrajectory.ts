import { useState, useCallback, useRef } from "react";
import { fetchVesselTrajectory } from "../api";
import type { FetchTrajectoryParams } from "../api/trajectoryApi";
import type { TrajectoryPoint } from "../model/types";

export function useVesselTrajectory() {
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const load = useCallback(async (params: FetchTrajectoryParams) => {
    if (!params.vesselId) return;
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await fetchVesselTrajectory(params);
      if (currentRequestId !== requestIdRef.current) return;
      setTrajectory(data.trajectory ?? []);
    } catch {
      if (currentRequestId !== requestIdRef.current) return;
      setError("Failed to load trajectory");
      setTrajectory([]);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const clear = useCallback(() => {
    setTrajectory([]);
    setError("");
  }, []);

  return { trajectory, loading, error, load, clear };
}
