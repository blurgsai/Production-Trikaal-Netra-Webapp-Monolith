import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChartConfigs } from "../useChartConfigs";

describe("useChartConfigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a createChartConfig function", () => {
    const { result } = renderHook(() => useChartConfigs());
    expect(typeof result.current.createChartConfig).toBe("function");
  });

  it("creates a config with a generated id", () => {
    const { result } = renderHook(() => useChartConfigs());
    const config = result.current.createChartConfig({
      title: "Test",
      chartType: "bar",
      xAxisColumn: "col1",
      yAxisColumn: "col2",
      aggregation: "count",
    });
    expect(config.id).toBeDefined();
    expect(config.id).toMatch(/^chart-/);
  });

  it("preserves all fields from the partial config", () => {
    const { result } = renderHook(() => useChartConfigs());
    const config = result.current.createChartConfig({
      title: "My Chart",
      chartType: "line",
      xAxisColumn: "x",
      yAxisColumn: "y",
      aggregation: "sum",
      maxDataPoints: 100,
    });
    expect(config.title).toBe("My Chart");
    expect(config.chartType).toBe("line");
    expect(config.xAxisColumn).toBe("x");
    expect(config.yAxisColumn).toBe("y");
    expect(config.aggregation).toBe("sum");
    expect(config.maxDataPoints).toBe(100);
  });
});
