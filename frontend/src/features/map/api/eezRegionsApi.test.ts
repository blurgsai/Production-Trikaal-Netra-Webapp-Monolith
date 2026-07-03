import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchEezRegions } from "./eezRegionsApi";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("eezRegionsApi", () => {
  it("returns parsed EEZ regions", async () => {
    const data = [
      { id: "IN", name: "India", bounds: [68.0, 8.0, 97.0, 37.0] },
      { id: "US", name: "United States", bounds: [-125.0, 25.0, -66.0, 49.0] },
    ];
    mockFetch.mockResolvedValue({ ok: true, json: async () => data });
    const result = await fetchEezRegions();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("India");
    expect(mockFetch).toHaveBeenCalledWith("/eez-regions.json");
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    await expect(fetchEezRegions()).rejects.toThrow("Failed to load EEZ regions");
  });
});
