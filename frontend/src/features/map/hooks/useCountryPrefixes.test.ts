import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCountryPrefixes } from "./useCountryPrefixes";
import * as api from "../api";

vi.mock("../api", () => ({
  fetchCountryPrefixes: vi.fn(),
}));

describe("useCountryPrefixes", () => {
  it("returns loading initially", () => {
    vi.mocked(api.fetchCountryPrefixes).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCountryPrefixes());
    expect(result.current.loading).toBe(true);
    expect(result.current.countries).toEqual([]);
  });

  it("loads mapped country prefixes", async () => {
    vi.mocked(api.fetchCountryPrefixes).mockResolvedValue([
      { country: "India", prefix: "419" },
      { country: "USA", prefix: "369" },
    ]);
    const { result } = renderHook(() => useCountryPrefixes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.countries).toHaveLength(2);
    expect(result.current.countries[0]).toEqual({ country: "India", prefix: "419" });
  });

  it("sets error on failure", async () => {
    vi.mocked(api.fetchCountryPrefixes).mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useCountryPrefixes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load country prefixes");
  });
});
