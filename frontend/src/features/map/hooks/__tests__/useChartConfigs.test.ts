import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChartConfigs } from "../useChartConfigs";
import type { ChartConfig } from "../../model/chartTypes";

const baseConfig: Omit<ChartConfig, "id"> = {
  title: "Test",
  chartType: "bar",
  xAxisColumn: "col1",
  yAxisColumn: "col2",
  aggregation: "count",
};

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
    const config = result.current.createChartConfig(baseConfig);
    expect(config.id).toBeDefined();
    expect(config.id).toMatch(/^chart-/);
  });

  it("preserves all fields from the partial config", () => {
    const { result } = renderHook(() => useChartConfigs());
    const config = result.current.createChartConfig({
      ...baseConfig,
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

  // ── ID Generation ───────────────────────────────────────────────────────

  describe("ID generation", () => {
    it("generates unique IDs on consecutive calls", () => {
      const { result } = renderHook(() => useChartConfigs());
      const id1 = result.current.createChartConfig(baseConfig).id;
      const id2 = result.current.createChartConfig(baseConfig).id;
      expect(id1).not.toBe(id2);
    });

    it("generates unique IDs across multiple hook instances", () => {
      const { result: r1 } = renderHook(() => useChartConfigs());
      const { result: r2 } = renderHook(() => useChartConfigs());
      const id1 = r1.current.createChartConfig(baseConfig).id;
      const id2 = r2.current.createChartConfig(baseConfig).id;
      expect(id1).not.toBe(id2);
    });

    it("ID starts with 'chart-' prefix", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig(baseConfig);
      expect(config.id.startsWith("chart-")).toBe(true);
    });

    it("ID contains a timestamp component", () => {
      const before = Date.now();
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig(baseConfig);
      const after = Date.now();
      const timestampPart = parseInt(config.id.split("-")[1], 10);
      expect(timestampPart).toBeGreaterThanOrEqual(before - 1000);
      expect(timestampPart).toBeLessThanOrEqual(after + 1000);
    });

    it("ID contains a random component (base36)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig(baseConfig);
      const parts = config.id.split("-");
      expect(parts).toHaveLength(3);
      expect(parts[2]).toMatch(/^[a-z0-9]+$/);
    });
  });

  // ── Field Preservation ──────────────────────────────────────────────────

  describe("field preservation", () => {
    it("preserves title field", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, title: "Unique Title" });
      expect(config.title).toBe("Unique Title");
    });

    it("preserves chartType field (bar)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, chartType: "bar" });
      expect(config.chartType).toBe("bar");
    });

    it("preserves chartType field (line)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, chartType: "line" });
      expect(config.chartType).toBe("line");
    });

    it("preserves chartType field (pie)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, chartType: "pie" });
      expect(config.chartType).toBe("pie");
    });

    it("preserves chartType field (area)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, chartType: "area" });
      expect(config.chartType).toBe("area");
    });

    it("preserves chartType field (scatter)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, chartType: "scatter" });
      expect(config.chartType).toBe("scatter");
    });

    it("preserves xAxisColumn field", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, xAxisColumn: "x_col" });
      expect(config.xAxisColumn).toBe("x_col");
    });

    it("preserves yAxisColumn field", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, yAxisColumn: "y_col" });
      expect(config.yAxisColumn).toBe("y_col");
    });

    it("preserves aggregation field (count)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, aggregation: "count" });
      expect(config.aggregation).toBe("count");
    });

    it("preserves aggregation field (sum)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, aggregation: "sum" });
      expect(config.aggregation).toBe("sum");
    });

    it("preserves aggregation field (avg)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, aggregation: "avg" });
      expect(config.aggregation).toBe("avg");
    });

    it("preserves aggregation field (min)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, aggregation: "min" });
      expect(config.aggregation).toBe("min");
    });

    it("preserves aggregation field (max)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, aggregation: "max" });
      expect(config.aggregation).toBe("max");
    });

    it("preserves maxDataPoints when provided", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, maxDataPoints: 500 });
      expect(config.maxDataPoints).toBe(500);
    });

    it("maxDataPoints is undefined when not provided", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig(baseConfig);
      expect(config.maxDataPoints).toBeUndefined();
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty string title", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, title: "" });
      expect(config.title).toBe("");
    });

    it("handles empty string xAxisColumn", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, xAxisColumn: "" });
      expect(config.xAxisColumn).toBe("");
    });

    it("handles empty string yAxisColumn", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, yAxisColumn: "" });
      expect(config.yAxisColumn).toBe("");
    });

    it("handles very long title (1000 chars)", () => {
      const longTitle = "T".repeat(1000);
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, title: longTitle });
      expect(config.title).toBe(longTitle);
    });

    it("handles title with special characters", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, title: "Chart's \"Special\" <Name>" });
      expect(config.title).toBe("Chart's \"Special\" <Name>");
    });

    it("handles title with unicode characters", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, title: "図表データ" });
      expect(config.title).toBe("図表データ");
    });

    it("handles maxDataPoints of 0", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, maxDataPoints: 0 });
      expect(config.maxDataPoints).toBe(0);
    });

    it("handles maxDataPoints of 1 (boundary)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, maxDataPoints: 1 });
      expect(config.maxDataPoints).toBe(1);
    });

    it("handles negative maxDataPoints (no validation)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, maxDataPoints: -10 });
      expect(config.maxDataPoints).toBe(-10);
    });

    it("handles very large maxDataPoints", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, maxDataPoints: Number.MAX_SAFE_INTEGER });
      expect(config.maxDataPoints).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("handles xAxisColumn with special characters", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, xAxisColumn: "col; DROP TABLE--" });
      expect(config.xAxisColumn).toBe("col; DROP TABLE--");
    });

    it("handles yAxisColumn with unicode", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({ ...baseConfig, yAxisColumn: "列" });
      expect(config.yAxisColumn).toBe("列");
    });
  });

  // ── Callback Stability ──────────────────────────────────────────────────

  describe("callback stability", () => {
    it("createChartConfig identity is stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useChartConfigs());
      const ref1 = result.current.createChartConfig;
      rerender();
      expect(result.current.createChartConfig).toBe(ref1);
    });

    it("createChartConfig identity is stable across multiple re-renders", () => {
      const { result, rerender } = renderHook(() => useChartConfigs());
      const ref1 = result.current.createChartConfig;
      rerender();
      rerender();
      rerender();
      expect(result.current.createChartConfig).toBe(ref1);
    });

    it("return object has exactly the expected key", () => {
      const { result } = renderHook(() => useChartConfigs());
      expect(Object.keys(result.current)).toEqual(["createChartConfig"]);
    });
  });

  // ── Multiple Hook Instances ─────────────────────────────────────────────

  describe("multiple hook instances", () => {
    it("two instances produce different IDs for the same config", () => {
      const { result: r1 } = renderHook(() => useChartConfigs());
      const { result: r2 } = renderHook(() => useChartConfigs());
      const id1 = r1.current.createChartConfig(baseConfig).id;
      const id2 = r2.current.createChartConfig(baseConfig).id;
      expect(id1).not.toBe(id2);
    });

    it("two instances' createChartConfig are different function references", () => {
      const { result: r1 } = renderHook(() => useChartConfigs());
      const { result: r2 } = renderHook(() => useChartConfigs());
      expect(r1.current.createChartConfig).not.toBe(r2.current.createChartConfig);
    });
  });

  // ── Unmount / Lifecycle ─────────────────────────────────────────────────

  describe("lifecycle", () => {
    it("unmount does not throw", () => {
      const { unmount } = renderHook(() => useChartConfigs());
      expect(() => unmount()).not.toThrow();
    });

    it("createChartConfig works after a re-render", () => {
      const { result, rerender } = renderHook(() => useChartConfigs());
      rerender();
      const config = result.current.createChartConfig(baseConfig);
      expect(config.id).toBeDefined();
    });
  });

  // ── Object Spread Semantics ─────────────────────────────────────────────

  describe("object spread semantics", () => {
    it("does not modify the input partial config", () => {
      const { result } = renderHook(() => useChartConfigs());
      const input = { ...baseConfig };
      result.current.createChartConfig(input);
      expect(input).toEqual(baseConfig);
      expect("id" in input).toBe(false);
    });

    it("returned config is a new object (not the same reference as input)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const input = { ...baseConfig };
      const config = result.current.createChartConfig(input);
      expect(config).not.toBe(input);
    });

    it("returned config has id property that input does not have", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig(baseConfig);
      expect(config).toHaveProperty("id");
      expect(baseConfig).not.toHaveProperty("id");
    });

    it("spreading the same partial twice produces two configs with different IDs", () => {
      const { result } = renderHook(() => useChartConfigs());
      const partial = { ...baseConfig };
      const c1 = result.current.createChartConfig(partial);
      const c2 = result.current.createChartConfig(partial);
      expect(c1.id).not.toBe(c2.id);
      expect(c1.title).toBe(c2.title);
    });
  });

  // ── Rapid Successive Calls ──────────────────────────────────────────────

  describe("rapid successive calls", () => {
    it("100 rapid calls produce 100 unique IDs", () => {
      const { result } = renderHook(() => useChartConfigs());
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(result.current.createChartConfig(baseConfig).id);
      }
      expect(ids.size).toBe(100);
    });

    it("rapid calls with different configs preserve their respective fields", () => {
      const { result } = renderHook(() => useChartConfigs());
      const configs: ChartConfig[] = [];
      for (let i = 0; i < 10; i++) {
        configs.push(result.current.createChartConfig({ ...baseConfig, title: `Chart ${i}` }));
      }
      configs.forEach((c, i) => expect(c.title).toBe(`Chart ${i}`));
    });

    it("rapid calls with different chartTypes preserve their respective types", () => {
      const { result } = renderHook(() => useChartConfigs());
      const types: ChartConfig["chartType"][] = ["bar", "line", "pie", "area", "scatter"];
      const configs = types.map((t) => result.current.createChartConfig({ ...baseConfig, chartType: t }));
      configs.forEach((c, i) => expect(c.chartType).toBe(types[i]));
    });

    it("rapid calls with different aggregations preserve their respective aggregations", () => {
      const { result } = renderHook(() => useChartConfigs());
      const aggs: ChartConfig["aggregation"][] = ["count", "sum", "avg", "min", "max"];
      const configs = aggs.map((a) => result.current.createChartConfig({ ...baseConfig, aggregation: a }));
      configs.forEach((c, i) => expect(c.aggregation).toBe(aggs[i]));
    });
  });
});
