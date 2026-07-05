import { useCallback } from "react";
import type { ChartConfig } from "../model/chartTypes";

export function useChartConfigs() {
  const generateId = useCallback(() => {
    return `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const createChartConfig = useCallback(
    (partial: Omit<ChartConfig, "id">): ChartConfig => {
      return { ...partial, id: generateId() };
    },
    [generateId]
  );

  return { createChartConfig };
}
