import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchVesselTable,
  fetchVesselCount,
  fetchVesselCategoryCounts,
  fetchUniqueColumnValues,
  fetchVesselTableColumns,
} from "./vesselTableApi";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("vesselTableApi", () => {
  it("fetchVesselTable returns parsed GeoJSON response", async () => {
    const response = {
      type: "FeatureCollection",
      totalFeatures: 100,
      numberMatched: 100,
      numberReturned: 10,
      features: [{ type: "Feature", id: "1", properties: {} }],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => response,
    });

    const result = await fetchVesselTable({ page: 0, pageSize: 10 });
    expect(result).toEqual(response);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("fetchVesselTable throws on error response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" });
    await expect(fetchVesselTable({ page: 0, pageSize: 10 })).rejects.toThrow("WFS request failed");
  });

  it("fetchVesselCount returns number", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<wfs:FeatureCollection numberMatched="42" />',
    });
    const result = await fetchVesselCount("cql = 1");
    expect(result).toBe(42);
  });

  it("fetchVesselCategoryCounts returns category counts", async () => {
    const response = {
      type: "FeatureCollection",
      totalFeatures: 2,
      numberMatched: 2,
      numberReturned: 2,
      features: [
        { type: "Feature", properties: { category: "Cargo" } },
        { type: "Feature", properties: { category: "Tanker" } },
      ],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => response,
    });
    const result = await fetchVesselCategoryCounts();
    expect(result).toEqual([
      { category: "Cargo", count: 1 },
      { category: "Tanker", count: 1 },
    ]);
  });

  it("fetchUniqueColumnValues parses XML values", async () => {
    const xml = `
      <wfs:ValueCollection xmlns:wfs="http://www.opengis.net/wfs/2.0">
        <wfs:member>201</wfs:member>
        <wfs:member>202</wfs:member>
      </wfs:ValueCollection>
    `;
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => xml,
    });
    const result = await fetchUniqueColumnValues("identification_mmsi", 10);
    expect(result).toContain("201");
    expect(result).toContain("202");
  });

  it("fetchVesselTableColumns parses XML element names", async () => {
    const xml = `
      <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <xsd:element name="mmsi" />
        <xsd:element name="geom" />
      </xsd:schema>
    `;
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => xml,
    });
    const result = await fetchVesselTableColumns();
    expect(result).toContain("mmsi");
    expect(result).not.toContain("geom");
  });
});
