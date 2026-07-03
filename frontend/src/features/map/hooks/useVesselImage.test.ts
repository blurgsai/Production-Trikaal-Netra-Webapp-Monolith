import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVesselImage } from "./useVesselImage";
import * as api from "../api";

vi.mock("../api", () => ({
  fetchVesselImage: vi.fn(),
}));

describe("useVesselImage", () => {
  it("returns null when imo is undefined", () => {
    const { result } = renderHook(() => useVesselImage(undefined));
    expect(result.current.image).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("loads and maps vessel image", async () => {
    vi.mocked(api.fetchVesselImage).mockResolvedValue({ image_url: "https://example.com/image.jpg" });
    const { result } = renderHook(() => useVesselImage("1234567"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.image?.imageUrl).toBe("https://example.com/image.jpg");
  });
});
