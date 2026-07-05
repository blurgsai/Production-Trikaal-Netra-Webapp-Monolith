import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVesselImage } from "../useVesselImage";
import type { VesselImageApiResponse } from "../../api/types";

vi.mock("../../api", () => ({
  fetchVesselImage: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapVesselImageFromApi: vi.fn(),
}));

import { fetchVesselImage } from "../../api";
import { mapVesselImageFromApi } from "../../model/mappers";

function apiImage(url = "https://cdn.test/img.jpg"): VesselImageApiResponse {
  return { image_url: url };
}

describe("useVesselImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapVesselImageFromApi).mockImplementation((raw) => ({ imageUrl: raw.image_url }));
  });

  // ── imo guard (decision table) ────────────────────────────────────────────

  describe("imo guard", () => {
    it("undefined imo: image=null, loading=false, error='', no fetch", () => {
      const { result } = renderHook(() => useVesselImage(undefined));
      expect(result.current.image).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("");
      expect(fetchVesselImage).not.toHaveBeenCalled();
    });

    it("empty-string imo short-circuits like undefined", () => {
      const { result } = renderHook(() => useVesselImage(""));
      expect(result.current.image).toBeNull();
      expect(fetchVesselImage).not.toHaveBeenCalled();
    });

    it("valid imo triggers a fetch call with that imo", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      renderHook(() => useVesselImage("9074729"));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("9074729"));
    });

    it("imo of '0' is truthy as string and triggers a fetch", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      renderHook(() => useVesselImage("0"));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("0"));
    });
  });

  // ── Success ────────────────────────────────────────────────────────────────

  describe("success state", () => {
    it("loads and maps the image url", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage("https://cdn.test/a.jpg"));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.image).toEqual({ imageUrl: "https://cdn.test/a.jpg" });
    });

    it("clears prior error after a successful refresh", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));

      vi.mocked(fetchVesselImage).mockResolvedValueOnce(apiImage());
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("");
      expect(result.current.image).not.toBeNull();
    });

    it("handles an empty-string image url", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage(""));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe(""));
    });

    it("handles a data-URI image", async () => {
      const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage(dataUri));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe(dataUri));
    });

    it("handles very long URLs", async () => {
      const longUrl = "https://cdn.test/" + "a".repeat(2000) + ".jpg";
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage(longUrl));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe(longUrl));
    });
  });

  // ── Error / negative ─────────────────────────────────────────────────────

  describe("error state", () => {
    it("sets a generic error message on failure", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue(new Error("403 Forbidden"));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("sets loading false after failure", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("retains previous image after a failed refresh (does not null it out)", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValueOnce(apiImage());
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image).not.toBeNull());

      vi.mocked(fetchVesselImage).mockRejectedValueOnce(new Error("fail"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("Failed to load vessel image");
      expect(result.current.image).not.toBeNull();
    });

    it("handles non-Error rejection", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue("plain failure");
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("handles 404 image-not-found style rejection object", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue({ response: { status: 404 } });
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("handles the mapper throwing", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      vi.mocked(mapVesselImageFromApi).mockImplementation(() => { throw new Error("mapper error"); });
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });
  });

  // ── imo dependency changes ────────────────────────────────────────────────

  describe("imo dependency changes", () => {
    it("re-fetches when imo changes", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { rerender } = renderHook(({ imo }) => useVesselImage(imo), { initialProps: { imo: "111" } });
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("111"));
      rerender({ imo: "222" });
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("222"));
      expect(fetchVesselImage).toHaveBeenCalledTimes(2);
    });

    it("transitioning from valid imo to undefined clears image", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result, rerender } = renderHook(({ imo }) => useVesselImage(imo), {
        initialProps: { imo: "111" as string | undefined },
      });
      await waitFor(() => expect(result.current.image).not.toBeNull());
      rerender({ imo: undefined });
      await waitFor(() => expect(result.current.image).toBeNull());
      expect(result.current.error).toBe("");
    });

    it("does not re-fetch when imo is unchanged across re-renders", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { rerender } = renderHook(({ imo }) => useVesselImage(imo), { initialProps: { imo: "111" } });
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledTimes(1));
      rerender({ imo: "111" });
      expect(fetchVesselImage).toHaveBeenCalledTimes(1);
    });

    it("race condition: rapid imo switch lets a stale response overwrite fresher state (no cancellation)", async () => {
      let resolveA!: (v: VesselImageApiResponse) => void;
      let resolveB!: (v: VesselImageApiResponse) => void;
      vi.mocked(fetchVesselImage)
        .mockImplementationOnce(() => new Promise((r) => { resolveA = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveB = r; }));

      const { result, rerender } = renderHook(({ imo }) => useVesselImage(imo), { initialProps: { imo: "A" } });
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledTimes(1));
      rerender({ imo: "B" });
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledTimes(2));

      await act(async () => { resolveB(apiImage("https://cdn.test/B.jpg")); });
      expect(result.current.image?.imageUrl).toBe("https://cdn.test/B.jpg");

      await act(async () => { resolveA(apiImage("https://cdn.test/A.jpg")); });
      // Documents the bug: stale A overwrites fresh B because there's no request-id/cancellation guard.
      expect(result.current.image?.imageUrl).toBe("https://cdn.test/A.jpg");
    });
  });

  // ── refresh() ──────────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("refresh is stable while imo does not change", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result, rerender } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender();
      expect(result.current.refresh).toBe(ref1);
    });

    it("manually calling refresh triggers a re-fetch for the current imo", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledTimes(1));
      await act(async () => { await result.current.refresh(); });
      expect(fetchVesselImage).toHaveBeenCalledTimes(2);
      expect(fetchVesselImage).toHaveBeenLastCalledWith("123");
    });
  });

  // ── Cleanup / unmount ──────────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmount during pending fetch does not throw", async () => {
      let resolveFn: (v: VesselImageApiResponse) => void = () => {};
      vi.mocked(fetchVesselImage).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { unmount } = renderHook(() => useVesselImage("123"));
      expect(() => unmount()).not.toThrow();
      await act(async () => { resolveFn(apiImage()); await Promise.resolve(); });
    });

    it("unmount during pending rejection does not throw", async () => {
      let rejectFn: (e: unknown) => void = () => {};
      vi.mocked(fetchVesselImage).mockImplementation(() => new Promise((_r, rej) => { rejectFn = rej; }));
      const { unmount } = renderHook(() => useVesselImage("123"));
      unmount();
      await act(async () => { rejectFn(new Error("late")); await Promise.resolve().catch(() => {}); });
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("imo with non-numeric characters is passed through as-is", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      renderHook(() => useVesselImage("IMO-9074729"));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("IMO-9074729"));
    });

    it("sequential refreshes reflect the latest resolved data", async () => {
      vi.mocked(fetchVesselImage)
        .mockResolvedValueOnce(apiImage("https://cdn.test/1.jpg"))
        .mockResolvedValueOnce(apiImage("https://cdn.test/2.jpg"));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe("https://cdn.test/1.jpg"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.image?.imageUrl).toBe("https://cdn.test/2.jpg");
    });
  });

  // ── Additional edge cases / State Transition / Error Guessing ────────────

  describe("additional edge cases", () => {
    it("return object has exactly the expected keys", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(Object.keys(result.current).sort()).toEqual(["error", "image", "loading", "refresh"]);
    });

    it("image is replaced (not merged) on a subsequent successful load", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValueOnce(apiImage("https://cdn.test/a.jpg"));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe("https://cdn.test/a.jpg"));
      vi.mocked(fetchVesselImage).mockResolvedValueOnce(apiImage("https://cdn.test/b.jpg"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.image?.imageUrl).toBe("https://cdn.test/b.jpg");
    });

    it("error is cleared at the start of a new load (before resolution)", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
      let resolveFn!: (v: VesselImageApiResponse) => void;
      vi.mocked(fetchVesselImage).mockImplementationOnce(() => new Promise((r) => { resolveFn = r; }));
      let p!: Promise<void>;
      act(() => { p = result.current.refresh(); });
      expect(result.current.error).toBe("");
      await act(async () => { resolveFn(apiImage()); await p; });
    });

    it("loading is true while a refresh is pending, then false after resolution", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValueOnce(apiImage());
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      let resolveFn!: (v: VesselImageApiResponse) => void;
      vi.mocked(fetchVesselImage).mockImplementationOnce(() => new Promise((r) => { resolveFn = r; }));
      let p!: Promise<void>;
      act(() => { p = result.current.refresh(); });
      expect(result.current.loading).toBe(true);
      await act(async () => { resolveFn(apiImage()); await p; });
      expect(result.current.loading).toBe(false);
    });

    it("handles rejection with null", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue(null);
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("handles rejection with undefined", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue(undefined);
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("handles rejection with a number", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue(42);
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("handles rejection with a boolean", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue(true);
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("handles rejection with a plain object", async () => {
      vi.mocked(fetchVesselImage).mockRejectedValue({ code: 500, msg: "server error" });
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel image"));
    });

    it("handles whitespace-only imo (truthy, triggers fetch)", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      renderHook(() => useVesselImage("   "));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("   "));
    });

    it("transitioning from valid imo to empty string clears image and error", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result, rerender } = renderHook(({ imo }) => useVesselImage(imo), {
        initialProps: { imo: "111" as string | undefined },
      });
      await waitFor(() => expect(result.current.image).not.toBeNull());
      rerender({ imo: "" });
      await waitFor(() => expect(result.current.image).toBeNull());
      expect(result.current.error).toBe("");
    });

    it("transitioning from undefined to a valid imo triggers a fetch", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { rerender } = renderHook(({ imo }) => useVesselImage(imo), {
        initialProps: { imo: undefined as string | undefined },
      });
      expect(fetchVesselImage).not.toHaveBeenCalled();
      rerender({ imo: "999" });
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("999"));
    });

    it("concurrent refresh calls resolve without throwing (Promise.all)", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await Promise.all([result.current.refresh(), result.current.refresh()]);
      });
      expect(result.current.loading).toBe(false);
    });

    it("mapper is called with the raw API response", async () => {
      const raw = apiImage("https://cdn.test/x.jpg");
      vi.mocked(fetchVesselImage).mockResolvedValue(raw);
      renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(mapVesselImageFromApi).toHaveBeenCalledWith(raw));
    });

    it("handles a mapper returning null (defensive)", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      vi.mocked(mapVesselImageFromApi).mockReturnValue(null as unknown as { imageUrl: string });
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image).toBeNull());
    });

    it("handles a mapper returning undefined (defensive)", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      vi.mocked(mapVesselImageFromApi).mockReturnValue(undefined as unknown as { imageUrl: string });
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image).toBeUndefined());
    });

    it("handles image URL with query parameters", async () => {
      const url = "https://cdn.test/img.jpg?width=200&height=200&token=abc";
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage(url));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe(url));
    });

    it("handles image URL with fragment identifier", async () => {
      const url = "https://cdn.test/img.jpg#section";
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage(url));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe(url));
    });

    it("handles image URL with special characters", async () => {
      const url = "https://cdn.test/img?name=ship's%20image&v=2";
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage(url));
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.image?.imageUrl).toBe(url));
    });

    it("handles a very long imo (1000 chars)", async () => {
      const longImo = "9".repeat(1000);
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      renderHook(() => useVesselImage(longImo));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith(longImo));
    });

    it("handles imo with special characters", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      renderHook(() => useVesselImage("IMO/9074729?x=1"));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("IMO/9074729?x=1"));
    });

    it("handles imo with unicode characters", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      renderHook(() => useVesselImage("船舶9074729"));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledWith("船舶9074729"));
    });

    it("multiple sequential refreshes each trigger a separate API call", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledTimes(1));
      await act(async () => { await result.current.refresh(); });
      await act(async () => { await result.current.refresh(); });
      expect(fetchVesselImage).toHaveBeenCalledTimes(3);
    });

    it("does not re-fetch when imo stays the same across multiple re-renders", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { rerender } = renderHook(({ imo }) => useVesselImage(imo), { initialProps: { imo: "111" } });
      await waitFor(() => expect(fetchVesselImage).toHaveBeenCalledTimes(1));
      rerender({ imo: "111" });
      rerender({ imo: "111" });
      rerender({ imo: "111" });
      expect(fetchVesselImage).toHaveBeenCalledTimes(1);
    });

    it("refresh identity changes when imo changes", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue(apiImage());
      const { result, rerender } = renderHook(({ imo }) => useVesselImage(imo), { initialProps: { imo: "111" } });
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender({ imo: "222" });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.refresh).not.toBe(ref1);
    });

    it("handles API response with missing image_url field", async () => {
      vi.mocked(fetchVesselImage).mockResolvedValue({} as VesselImageApiResponse);
      vi.mocked(mapVesselImageFromApi).mockReturnValue({ imageUrl: undefined as unknown as string });
      const { result } = renderHook(() => useVesselImage("123"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.image?.imageUrl).toBeUndefined();
    });
  });
});
