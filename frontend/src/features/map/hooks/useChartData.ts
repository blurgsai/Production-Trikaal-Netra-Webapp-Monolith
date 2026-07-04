import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { fetchChartData } from "../api/chartDataApi";
import { mapFeaturesToChartData } from "../model/chartMappers";
import type { ChartConfig, ChartDataResult } from "../model/chartTypes";

export function useChartData(config: ChartConfig | null, cqlFilter?: string) {
  const queryKey = useMemo(
    () => ["chartData", config?.id, config?.xAxisColumn, config?.yAxisColumn, config?.aggregation, cqlFilter],
    [config?.id, config?.xAxisColumn, config?.yAxisColumn, config?.aggregation, cqlFilter]
  );

  const { data, isLoading, error } = useQuery<ChartDataResult>({
    queryKey,
    queryFn: async () => {
      if (!config) return { points: [], total: 0 };
      const propertyNames =
        config.aggregation === "count"
          ? [config.xAxisColumn]
          : [config.xAxisColumn, config.yAxisColumn];

      const response = await fetchChartData({
        propertyNames,
        cqlFilter,
        maxFeatures: 5000,
      });

      return mapFeaturesToChartData(response.features, config);
    },
    enabled: config !== null,
  });

  return {
    data: data ?? { points: [], total: 0 },
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

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
