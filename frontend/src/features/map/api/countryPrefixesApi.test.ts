import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchCountryPrefixes } from "./countryPrefixesApi";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("countryPrefixesApi", () => {
  it("returns country prefixes", async () => {
    const data = [{ country: "India", prefix: "419" }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => data });
    const result = await fetchCountryPrefixes();
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith("/country-prefixes.json");
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(fetchCountryPrefixes()).rejects.toThrow("Failed to load country prefixes");
  });
});
