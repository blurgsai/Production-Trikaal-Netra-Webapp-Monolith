import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVesselTable } from "./useVesselTable";
import { DEFAULT_PAGE_SIZE } from "../model/config";
import * as vesselTableApi from "../api/vesselTableApi";

const mockResponse = {
  type: "FeatureCollection" as const,
  totalFeatures: 100,
  numberMatched: 100,
  numberReturned: 10,
  features: Array.from({ length: 10 }, (_, i) => ({
    type: "Feature" as const,
    id: i,
    properties: { identification_mmsi: String(i) },
  })),
};

vi.mock("../api/vesselTableApi", () => ({
  fetchVesselTable: vi.fn(),
  fetchVesselTableColumns: vi.fn(),
  fetchUniqueColumnValues: vi.fn(),
}));

vi.mock("../api/vesselFilterStorage", () => ({
  loadSavedFilters: vi.fn(() => []),
  saveFilter: vi.fn((name: string, filters: unknown[], polygonFilters?: unknown[]) => [
    { name, filters, polygonFilters, createdAt: "2024-01-01" },
  ]),
  deleteSavedFilter: vi.fn(() => []),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(vesselTableApi.fetchVesselTableColumns).mockResolvedValue(["identification_mmsi"]);
});

describe("useVesselTable", () => {
  it("initializes with default state", () => {
    const { result } = renderHook(() => useVesselTable());
    expect(result.current.page).toBe(0);
    expect(result.current.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.current.pageData.rows).toHaveLength(0);
  });

  it("loads data on mount", async () => {
    vi.mocked(vesselTableApi.fetchVesselTable).mockResolvedValue(mockResponse);
    vi.mocked(vesselTableApi.fetchVesselTableColumns).mockResolvedValue(["identification_mmsi"]);
    const { result } = renderHook(() => useVesselTable());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pageData.total).toBe(100);
  });

  it("adds and applies a filter", async () => {
    vi.mocked(vesselTableApi.fetchVesselTable).mockResolvedValue(mockResponse);
    vi.mocked(vesselTableApi.fetchVesselTableColumns).mockResolvedValue(["identification_mmsi"]);
    const { result } = renderHook(() => useVesselTable());

    act(() => result.current.addFilter());
    act(() => result.current.updateFilter(0, { value: "201" }));
    act(() => result.current.applyFilters());

    await waitFor(() => expect(result.current.appliedFilters).toHaveLength(1));
    expect(result.current.appliedFilters[0]).toMatchObject({ column: "identification_mmsi", value: "201" });
  });

  it("changes page and page size", async () => {
    vi.mocked(vesselTableApi.fetchVesselTable).mockResolvedValue(mockResponse);
    vi.mocked(vesselTableApi.fetchVesselTableColumns).mockResolvedValue(["identification_mmsi"]);
    const { result } = renderHook(() => useVesselTable());

    act(() => result.current.goToPage(2));
    expect(result.current.page).toBe(2);

    act(() => result.current.changePageSize(25));
    expect(result.current.pageSize).toBe(25);
    expect(result.current.page).toBe(0);
  });

  it("saves and loads a filter with polygon filters", async () => {
    const polygon = { id: "1", points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }] };
    const onPolygonChange = vi.fn();
    vi.mocked(vesselTableApi.fetchVesselTable).mockResolvedValue(mockResponse);
    vi.mocked(vesselTableApi.fetchVesselTableColumns).mockResolvedValue(["identification_mmsi"]);

    const { result } = renderHook(() => useVesselTable({ polygonFilters: [polygon], onPolygonFiltersChange: onPolygonChange }));
    act(() => result.current.addFilter());
    act(() => result.current.updateFilter(0, { value: "201" }));
    act(() => result.current.applyFilters());
    act(() => result.current.saveCurrentFilter("poly-test"));

    expect(result.current.savedFilters[0].polygonFilters).toEqual([polygon]);
  });
});
