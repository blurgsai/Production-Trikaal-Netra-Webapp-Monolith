import { describe, it, expect } from "vitest";

import {
  getVesselColor,
  computeEaseFactor,
  lerp,
  lerpPosition,
  findIndexAtTime,
  advanceVessel,
  tickVessel,
  normalizeVessels,
  mergeMinuteData,
  seekVessel,
  runAnimationTick,
} from "../animationUtils";

import type { AnimationVessel, PlaybackPoint, VesselPoint } from "../types";

const BASE_TS = new Date("2024-12-04T16:00:00Z").getTime();

function makeVessel(
  overrides: Partial<AnimationVessel> = {},
): AnimationVessel {
  return {
    vesselId: "V0001",
    points: [
      { lat: 15.0, lng: 65.0, ts: BASE_TS, heading: 45 },
      { lat: 15.5, lng: 65.5, ts: BASE_TS + 15000, heading: 50 },
      { lat: 16.0, lng: 66.0, ts: BASE_TS + 30000, heading: 55 },
      { lat: 16.5, lng: 66.5, ts: BASE_TS + 45000, heading: 60 },
      { lat: 17.0, lng: 67.0, ts: BASE_TS + 60000, heading: 65 },
    ],
    index: 0,
    color: "#4fc3f7",
    currentPos: { lat: 0, lng: 0, heading: 0 },
    fromPos: { lat: 0, lng: 0, heading: 0 },
    toPos: { lat: 0, lng: 0, heading: 0 },
    tweenProgress: 1,
    isAnimating: false,
    ...overrides,
  };
}

function makePoints(): VesselPoint[] {
  return [
    { lat: 15.0, lng: 65.0, ts: BASE_TS, heading: 45 },
    { lat: 15.5, lng: 65.5, ts: BASE_TS + 15000, heading: 50 },
    { lat: 16.0, lng: 66.0, ts: BASE_TS + 30000, heading: 55 },
    { lat: 16.5, lng: 66.5, ts: BASE_TS + 45000, heading: 60 },
    { lat: 17.0, lng: 67.0, ts: BASE_TS + 60000, heading: 65 },
  ];
}

describe("animationUtils", () => {
  // --- getVesselColor ---
  describe("getVesselColor", () => {
    it("returns first color for index 0", () => {
      expect(getVesselColor(0)).toBe("#4fc3f7");
    });

    it("returns second color for index 1", () => {
      expect(getVesselColor(1)).toBe("#ffb74d");
    });

    it("wraps around for index >= colors.length", () => {
      expect(getVesselColor(5)).toBe("#4fc3f7");
      expect(getVesselColor(6)).toBe("#ffb74d");
    });

    it("returns consistent color for same index", () => {
      expect(getVesselColor(3)).toBe(getVesselColor(3));
    });

    it("handles large indices", () => {
      expect(getVesselColor(100)).toBeDefined();
    });
  });

  // --- computeEaseFactor ---
  describe("computeEaseFactor", () => {
    it("returns 0.15 for speed 1", () => {
      expect(computeEaseFactor(1)).toBeCloseTo(0.15);
    });

    it("returns 0.30 for speed 2", () => {
      expect(computeEaseFactor(2)).toBeCloseTo(0.30);
    });

    it("returns 0.45 for speed 3", () => {
      expect(computeEaseFactor(3)).toBeCloseTo(0.45);
    });

    it("caps at 0.5 for speed >= 4", () => {
      expect(computeEaseFactor(4)).toBeCloseTo(0.5);
      expect(computeEaseFactor(10)).toBeCloseTo(0.5);
      expect(computeEaseFactor(100)).toBeCloseTo(0.5);
    });

    it("returns 0 for speed 0", () => {
      expect(computeEaseFactor(0)).toBe(0);
    });

    it("scales linearly below cap", () => {
      expect(computeEaseFactor(1.5)).toBeCloseTo(0.225);
      expect(computeEaseFactor(2.5)).toBeCloseTo(0.375);
    });

    it("cap boundary at speed 3.333...", () => {
      expect(computeEaseFactor(10 / 3)).toBeCloseTo(0.5, 5);
    });

    it("handles fractional speeds", () => {
      expect(computeEaseFactor(0.5)).toBeCloseTo(0.075);
      expect(computeEaseFactor(0.1)).toBeCloseTo(0.015);
    });
  });

  // --- lerp ---
  describe("lerp", () => {
    it("returns a when t=0", () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it("returns b when t=1", () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it("returns midpoint when t=0.5", () => {
      expect(lerp(10, 20, 0.5)).toBe(15);
    });

    it("handles negative values", () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it("handles same a and b", () => {
      expect(lerp(5, 5, 0.5)).toBe(5);
    });

    it("extrapolates when t > 1", () => {
      expect(lerp(0, 10, 2)).toBe(20);
    });

    it("extrapolates when t < 0", () => {
      expect(lerp(0, 10, -1)).toBe(-10);
    });

    it("handles floating point precision", () => {
      expect(lerp(0.1, 0.2, 0.5)).toBeCloseTo(0.15);
    });
  });

  // --- lerpPosition ---
  describe("lerpPosition", () => {
    it("interpolates lat, lng, and heading", () => {
      const result = lerpPosition(
        { lat: 15, lng: 65, heading: 45 },
        { lat: 16, lng: 66, heading: 55 },
        0.5,
      );
      expect(result.lat).toBeCloseTo(15.5);
      expect(result.lng).toBeCloseTo(65.5);
      expect(result.heading).toBeCloseTo(50);
    });

    it("returns current when t=0", () => {
      const result = lerpPosition(
        { lat: 15, lng: 65, heading: 45 },
        { lat: 16, lng: 66, heading: 55 },
        0,
      );
      expect(result).toEqual({ lat: 15, lng: 65, heading: 45 });
    });

    it("returns target when t=1", () => {
      const result = lerpPosition(
        { lat: 15, lng: 65, heading: 45 },
        { lat: 16, lng: 66, heading: 55 },
        1,
      );
      expect(result).toEqual({ lat: 16, lng: 66, heading: 55 });
    });

    it("moves partially toward target", () => {
      const result = lerpPosition(
        { lat: 10, lng: 60, heading: 0 },
        { lat: 20, lng: 70, heading: 100 },
        0.15,
      );
      expect(result.lat).toBeCloseTo(11.5);
      expect(result.lng).toBeCloseTo(61.5);
      expect(result.heading).toBeCloseTo(15);
    });

    it("handles negative coordinates", () => {
      const result = lerpPosition(
        { lat: -10, lng: -65, heading: 180 },
        { lat: 10, lng: 65, heading: 360 },
        0.5,
      );
      expect(result.lat).toBeCloseTo(0);
      expect(result.lng).toBeCloseTo(0);
      expect(result.heading).toBeCloseTo(270);
    });

    it("does not mutate inputs", () => {
      const current = { lat: 15, lng: 65, heading: 45 };
      const target = { lat: 16, lng: 66, heading: 55 };
      lerpPosition(current, target, 0.5);
      expect(current).toEqual({ lat: 15, lng: 65, heading: 45 });
      expect(target).toEqual({ lat: 16, lng: 66, heading: 55 });
    });
  });

  // --- findIndexAtTime ---
  describe("findIndexAtTime", () => {
    const points = makePoints();

    it("returns 0 when time equals first point ts", () => {
      expect(findIndexAtTime(points, BASE_TS, 0)).toBe(0);
    });

    it("returns 0 when time is before first point", () => {
      expect(findIndexAtTime(points, BASE_TS - 1000, 0)).toBe(0);
    });

    it("returns 1 when time passes second point", () => {
      expect(findIndexAtTime(points, BASE_TS + 15000, 0)).toBe(1);
    });

    it("returns 2 when time passes third point", () => {
      expect(findIndexAtTime(points, BASE_TS + 30000, 0)).toBe(2);
    });

    it("returns last index when time exceeds all points", () => {
      expect(findIndexAtTime(points, BASE_TS + 999999, 0)).toBe(4);
    });

    it("returns last index when time equals last point ts", () => {
      expect(findIndexAtTime(points, BASE_TS + 60000, 0)).toBe(4);
    });

    it("returns 0 for time between first and second point", () => {
      expect(findIndexAtTime(points, BASE_TS + 7000, 0)).toBe(0);
    });

    it("respects startIndex parameter", () => {
      expect(findIndexAtTime(points, BASE_TS + 30000, 2)).toBe(2);
    });

    it("startIndex prevents going backwards", () => {
      expect(findIndexAtTime(points, BASE_TS, 3)).toBe(3);
    });

    it("handles empty points array", () => {
      expect(findIndexAtTime([], BASE_TS, 0)).toBe(0);
    });

    it("handles single point", () => {
      expect(
        findIndexAtTime([{ lat: 15, lng: 65, ts: BASE_TS, heading: 0 }], BASE_TS, 0),
      ).toBe(0);
    });
  });

  // --- advanceVessel ---
  describe("advanceVessel", () => {
    it("initializes currentPos from first point when at 0,0", () => {
      const v = makeVessel();
      advanceVessel(v, BASE_TS);
      expect(v.currentPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });
    });

    it("initializes fromPos and toPos on first init", () => {
      const v = makeVessel();
      advanceVessel(v, BASE_TS);
      expect(v.fromPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });
      expect(v.toPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });
    });

    it("sets isAnimating=false on first init (already at position)", () => {
      const v = makeVessel();
      advanceVessel(v, BASE_TS);
      expect(v.isAnimating).toBe(false);
    });

    it("sets tweenProgress=1 on first init", () => {
      const v = makeVessel();
      advanceVessel(v, BASE_TS);
      expect(v.tweenProgress).toBe(1);
    });

    it("starts tween when index advances", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      v.fromPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      v.toPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      advanceVessel(v, BASE_TS + 15000);
      expect(v.isAnimating).toBe(true);
      expect(v.tweenProgress).toBe(0);
    });

    it("sets fromPos to currentPos when tween starts", () => {
      const v = makeVessel();
      v.currentPos = { lat: 14, lng: 64, heading: 40 };
      advanceVessel(v, BASE_TS + 15000);
      expect(v.fromPos).toEqual({ lat: 14, lng: 64, heading: 40 });
    });

    it("sets toPos to new data point when tween starts", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      advanceVessel(v, BASE_TS + 15000);
      expect(v.toPos).toEqual({ lat: 15.5, lng: 65.5, heading: 50 });
    });

    it("does not start tween when time has not advanced", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      v.index = 2;
      v.isAnimating = false;
      advanceVessel(v, BASE_TS + 7000);
      expect(v.isAnimating).toBe(false);
    });

    it("skips multiple points when time jumps far ahead", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      advanceVessel(v, BASE_TS + 45000);
      expect(v.index).toBe(3);
    });

    it("does not advance past last point", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      advanceVessel(v, BASE_TS + 999999);
      expect(v.index).toBe(4);
    });

    it("handles empty points array without crashing", () => {
      const v = makeVessel({ points: [] });
      expect(() => advanceVessel(v, BASE_TS)).not.toThrow();
    });

    it("does not change currentPos on advance (only starts tween)", () => {
      const v = makeVessel();
      v.currentPos = { lat: 14, lng: 64, heading: 40 };
      advanceVessel(v, BASE_TS + 15000);
      expect(v.currentPos).toEqual({ lat: 14, lng: 64, heading: 40 });
    });
  });

  // --- tickVessel ---
  describe("tickVessel", () => {
    it("does nothing when isAnimating is false", () => {
      const v = makeVessel();
      v.currentPos = { lat: 15, lng: 65, heading: 45 };
      v.isAnimating = false;
      tickVessel(v, 0.15);
      expect(v.currentPos).toEqual({ lat: 15, lng: 65, heading: 45 });
    });

    it("moves currentPos toward toPos based on tweenProgress", () => {
      const v = makeVessel();
      v.fromPos = { lat: 15, lng: 65, heading: 45 };
      v.toPos = { lat: 16, lng: 66, heading: 55 };
      v.tweenProgress = 0;
      v.isAnimating = true;
      tickVessel(v, 0.15);
      expect(v.currentPos.lat).toBeCloseTo(15.15);
      expect(v.currentPos.lng).toBeCloseTo(65.15);
      expect(v.currentPos.heading).toBeCloseTo(46.5);
    });

    it("increments tweenProgress by easeFactor", () => {
      const v = makeVessel();
      v.isAnimating = true;
      v.tweenProgress = 0;
      tickVessel(v, 0.15);
      expect(v.tweenProgress).toBeCloseTo(0.15);
    });

    it("snaps to toPos exactly when tweenProgress reaches 1", () => {
      const v = makeVessel();
      v.fromPos = { lat: 15, lng: 65, heading: 45 };
      v.toPos = { lat: 16, lng: 66, heading: 55 };
      v.tweenProgress = 0.9;
      v.isAnimating = true;
      tickVessel(v, 0.15);
      expect(v.tweenProgress).toBe(1);
      expect(v.currentPos).toEqual({ lat: 16, lng: 66, heading: 55 });
    });

    it("sets isAnimating=false when tween completes", () => {
      const v = makeVessel();
      v.fromPos = { lat: 15, lng: 65, heading: 45 };
      v.toPos = { lat: 16, lng: 66, heading: 55 };
      v.tweenProgress = 0.9;
      v.isAnimating = true;
      tickVessel(v, 0.15);
      expect(v.isAnimating).toBe(false);
    });

    it("does not overshoot toPos", () => {
      const v = makeVessel();
      v.fromPos = { lat: 15, lng: 65, heading: 45 };
      v.toPos = { lat: 16, lng: 66, heading: 55 };
      v.tweenProgress = 0.9;
      v.isAnimating = true;
      tickVessel(v, 0.5);
      expect(v.currentPos).toEqual({ lat: 16, lng: 66, heading: 55 });
    });

    it("halts after tween completes — subsequent ticks do nothing", () => {
      const v = makeVessel();
      v.fromPos = { lat: 15, lng: 65, heading: 45 };
      v.toPos = { lat: 16, lng: 66, heading: 55 };
      v.tweenProgress = 0.9;
      v.isAnimating = true;
      tickVessel(v, 0.15);
      const posAfterComplete = { ...v.currentPos };
      tickVessel(v, 0.15);
      expect(v.currentPos).toEqual(posAfterComplete);
    });

    it("converges over multiple ticks then halts", () => {
      const v = makeVessel();
      v.fromPos = { lat: 15, lng: 65, heading: 45 };
      v.toPos = { lat: 16, lng: 66, heading: 55 };
      v.tweenProgress = 0;
      v.isAnimating = true;
      let ticks = 0;
      while (v.isAnimating && ticks < 100) {
        tickVessel(v, 0.15);
        ticks++;
      }
      expect(v.currentPos).toEqual({ lat: 16, lng: 66, heading: 55 });
      expect(v.isAnimating).toBe(false);
    });

    it("caps tweenProgress at 1 with large easeFactor", () => {
      const v = makeVessel();
      v.isAnimating = true;
      v.tweenProgress = 0;
      tickVessel(v, 2);
      expect(v.tweenProgress).toBe(1);
    });
  });

  // --- normalizeVessels ---
  describe("normalizeVessels", () => {
    const mockVesselMap: Record<string, PlaybackPoint[]> = {
      V0001: [
        {
          timestamp: "2024-12-04T16:00:00Z",
          latitude: 15.9,
          longitude: 65.2,
          heading: 45,
        },
        {
          timestamp: "2024-12-04T16:00:15Z",
          latitude: 15.91,
          longitude: 65.21,
          heading: 46,
        },
      ],
      V0002: [
        {
          timestamp: "2024-12-04T16:00:00Z",
          latitude: 16.1,
          longitude: 65.5,
          heading: 90,
        },
      ],
    };

    it("converts vessel map to AnimationVessel array", () => {
      const result = normalizeVessels(mockVesselMap);
      expect(result).toHaveLength(2);
      expect(result[0].vesselId).toBe("V0001");
      expect(result[1].vesselId).toBe("V0002");
    });

    it("converts timestamp strings to epoch ms", () => {
      const result = normalizeVessels(mockVesselMap);
      expect(result[0].points[0].ts).toBe(
        new Date("2024-12-04T16:00:00Z").getTime(),
      );
    });

    it("maps latitude and longitude correctly", () => {
      const result = normalizeVessels(mockVesselMap);
      expect(result[0].points[0].lat).toBe(15.9);
      expect(result[0].points[0].lng).toBe(65.2);
    });

    it("preserves heading", () => {
      const result = normalizeVessels(mockVesselMap);
      expect(result[0].points[0].heading).toBe(45);
      expect(result[1].points[0].heading).toBe(90);
    });

    it("sorts points by timestamp ascending", () => {
      const unsorted: Record<string, PlaybackPoint[]> = {
        V0001: [
          {
            timestamp: "2024-12-04T16:00:15Z",
            latitude: 15.91,
            longitude: 65.21,
            heading: 46,
          },
          {
            timestamp: "2024-12-04T16:00:00Z",
            latitude: 15.9,
            longitude: 65.2,
            heading: 45,
          },
        ],
      };
      const result = normalizeVessels(unsorted);
      expect(result[0].points[0].ts).toBeLessThan(result[0].points[1].ts);
    });

    it("initializes index to 0", () => {
      const result = normalizeVessels(mockVesselMap);
      result.forEach((v) => expect(v.index).toBe(0));
    });

    it("initializes currentPos to 0,0,0", () => {
      const result = normalizeVessels(mockVesselMap);
      result.forEach((v) =>
        expect(v.currentPos).toEqual({ lat: 0, lng: 0, heading: 0 }),
      );
    });

    it("initializes isAnimating to false", () => {
      const result = normalizeVessels(mockVesselMap);
      result.forEach((v) => expect(v.isAnimating).toBe(false));
    });

    it("initializes tweenProgress to 1 (not animating)", () => {
      const result = normalizeVessels(mockVesselMap);
      result.forEach((v) => expect(v.tweenProgress).toBe(1));
    });

    it("assigns colors cyclically", () => {
      const manyVessels: Record<string, PlaybackPoint[]> = {};
      for (let i = 0; i < 7; i++) {
        manyVessels[`V${i}`] = [
          {
            timestamp: "2024-12-04T16:00:00Z",
            latitude: 15,
            longitude: 65,
            heading: 0,
          },
        ];
      }
      const result = normalizeVessels(manyVessels);
      expect(result[0].color).toBe("#4fc3f7");
      expect(result[5].color).toBe("#4fc3f7");
    });

    it("handles undefined input", () => {
      expect(normalizeVessels(undefined)).toEqual([]);
    });

    it("handles empty object", () => {
      expect(normalizeVessels({})).toEqual([]);
    });

    it("handles numeric timestamps", () => {
      const result = normalizeVessels({
        V0001: [
          {
            timestamp: BASE_TS as unknown as string,
            latitude: 15,
            longitude: 65,
            heading: 0,
          },
        ],
      });
      expect(result[0].points[0].ts).toBe(BASE_TS);
    });
  });

  // --- mergeMinuteData ---
  describe("mergeMinuteData", () => {
    const minute0: Record<string, PlaybackPoint[]> = {
      V0001: [
        {
          timestamp: "2024-12-04T16:00:00Z",
          latitude: 15.0,
          longitude: 65.0,
          heading: 45,
        },
      ],
    };
    const minute1: Record<string, PlaybackPoint[]> = {
      V0001: [
        {
          timestamp: "2024-12-04T16:01:00Z",
          latitude: 16.0,
          longitude: 66.0,
          heading: 55,
        },
      ],
      V0002: [
        {
          timestamp: "2024-12-04T16:01:00Z",
          latitude: 20.0,
          longitude: 70.0,
          heading: 90,
        },
      ],
    };

    it("merges new vessel data into existing", () => {
      const existing = normalizeVessels(minute0);
      const merged = mergeMinuteData(existing, minute1);
      expect(merged).toHaveLength(2);
    });

    it("appends new points to existing vessel", () => {
      const existing = normalizeVessels(minute0);
      const merged = mergeMinuteData(existing, minute1);
      const v1 = merged.find((v) => v.vesselId === "V0001");
      expect(v1?.points).toHaveLength(2);
    });

    it("adds new vessels not in existing", () => {
      const existing = normalizeVessels(minute0);
      const merged = mergeMinuteData(existing, minute1);
      const v2 = merged.find((v) => v.vesselId === "V0002");
      expect(v2).toBeDefined();
      expect(v2?.points).toHaveLength(1);
    });

    it("sorts merged points by timestamp", () => {
      const existing = normalizeVessels(minute1);
      const merged = mergeMinuteData(existing, minute0);
      const v1 = merged.find((v) => v.vesselId === "V0001");
      expect(v1?.points[0].ts).toBeLessThan(v1?.points[1].ts as number);
    });

    it("does not duplicate points with same timestamp", () => {
      const existing = normalizeVessels(minute0);
      const merged = mergeMinuteData(existing, minute0);
      const v1 = merged.find((v) => v.vesselId === "V0001");
      expect(v1?.points).toHaveLength(1);
    });

    it("returns existing when newVesselMap is undefined", () => {
      const existing = normalizeVessels(minute0);
      expect(mergeMinuteData(existing, undefined)).toBe(existing);
    });

    it("handles both empty", () => {
      expect(mergeMinuteData([], {})).toEqual([]);
    });

    it("handles empty existing with new data", () => {
      const merged = mergeMinuteData([], minute1);
      expect(merged).toHaveLength(2);
    });

    it("preserves existing vessel color", () => {
      const existing = normalizeVessels(minute0);
      const originalColor = existing[0].color;
      const merged = mergeMinuteData(existing, minute1);
      const v1 = merged.find((v) => v.vesselId === "V0001");
      expect(v1?.color).toBe(originalColor);
    });

    it("merges multiple minutes sequentially", () => {
      let vessels = normalizeVessels(minute0);
      vessels = mergeMinuteData(vessels, minute1);
      const minute2: Record<string, PlaybackPoint[]> = {
        V0001: [
          {
            timestamp: "2024-12-04T16:02:00Z",
            latitude: 17.0,
            longitude: 67.0,
            heading: 65,
          },
        ],
      };
      vessels = mergeMinuteData(vessels, minute2);
      const v1 = vessels.find((v) => v.vesselId === "V0001");
      expect(v1?.points).toHaveLength(3);
    });
  });

  // --- seekVessel ---
  describe("seekVessel", () => {
    it("sets index to 0 for time at start", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS);
      expect(v.index).toBe(0);
    });

    it("sets index to correct point for mid-range time", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS + 30000);
      expect(v.index).toBe(2);
    });

    it("sets index to last point for time beyond data", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS + 999999);
      expect(v.index).toBe(4);
    });

    it("sets currentPos to the point at seek time", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS + 30000);
      expect(v.currentPos).toEqual({ lat: 16.0, lng: 66.0, heading: 55 });
    });

    it("sets fromPos and toPos to same point (no tween)", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS + 30000);
      expect(v.fromPos).toEqual(v.currentPos);
      expect(v.toPos).toEqual(v.currentPos);
    });

    it("sets isAnimating=false (seek is instant)", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS + 30000);
      expect(v.isAnimating).toBe(false);
    });

    it("sets tweenProgress=1 (no animation after seek)", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS + 30000);
      expect(v.tweenProgress).toBe(1);
    });

    it("snaps to exact point (no interpolation)", () => {
      const v = makeVessel();
      v.currentPos = { lat: 99, lng: 99, heading: 99 };
      seekVessel(v, BASE_TS + 15000);
      expect(v.currentPos.lat).toBe(15.5);
      expect(v.currentPos.lng).toBe(65.5);
    });

    it("handles empty points array", () => {
      const v = makeVessel({ points: [] });
      expect(() => seekVessel(v, BASE_TS)).not.toThrow();
    });

    it("handles time before first point", () => {
      const v = makeVessel();
      seekVessel(v, BASE_TS - 10000);
      expect(v.index).toBe(0);
      expect(v.currentPos.lat).toBe(15.0);
    });

    it("resets from any previous index", () => {
      const v = makeVessel();
      v.index = 4;
      seekVessel(v, BASE_TS);
      expect(v.index).toBe(0);
    });
  });

  // --- runAnimationTick ---
  describe("runAnimationTick", () => {
    it("advances and ticks all vessels", () => {
      const v1 = makeVessel({ vesselId: "V1" });
      const v2 = makeVessel({ vesselId: "V2" });
      v1.currentPos = { lat: v1.points[0].lat, lng: v1.points[0].lng, heading: v1.points[0].heading };
      v2.currentPos = { lat: v2.points[0].lat, lng: v2.points[0].lng, heading: v2.points[0].heading };
      runAnimationTick([v1, v2], BASE_TS + 15000, 0.15);
      expect(v1.index).toBe(1);
      expect(v2.index).toBe(1);
    });

    it("starts tween on index advance", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      runAnimationTick([v], BASE_TS + 15000, 0.15);
      expect(v.isAnimating).toBe(true);
    });

    it("moves currentPos toward toPos during tween", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      runAnimationTick([v], BASE_TS + 15000, 0.15);
      expect(v.currentPos.lat).not.toBe(v.points[0].lat);
    });

    it("halts vessel when tween completes", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      runAnimationTick([v], BASE_TS + 15000, 1);
      expect(v.isAnimating).toBe(false);
      expect(v.currentPos).toEqual({ lat: 15.5, lng: 65.5, heading: 50 });
    });

    it("does not move vessel when no new point is reached", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      v.index = 0;
      v.isAnimating = false;
      runAnimationTick([v], BASE_TS + 5000, 0.15);
      expect(v.currentPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });
    });

    it("handles empty vessel array", () => {
      expect(() => runAnimationTick([], BASE_TS, 0.15)).not.toThrow();
    });

    it("handles vessel with empty points", () => {
      const v = makeVessel({ points: [] });
      expect(() => runAnimationTick([v], BASE_TS, 0.15)).not.toThrow();
    });

    it("initializes vessel on first call", () => {
      const v = makeVessel();
      runAnimationTick([v], BASE_TS, 0.15);
      expect(v.currentPos.lat).toBe(15.0);
      expect(v.isAnimating).toBe(false);
    });

    it("vessel halts at target after enough ticks", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      runAnimationTick([v], BASE_TS + 15000, 0.15);
      let ticks = 0;
      while (v.isAnimating && ticks < 100) {
        tickVessel(v, 0.15);
        ticks++;
      }
      expect(v.currentPos).toEqual({ lat: 15.5, lng: 65.5, heading: 50 });
      expect(v.isAnimating).toBe(false);
    });

    it("halted vessel does not move on subsequent ticks", () => {
      const v = makeVessel();
      v.currentPos = { lat: v.points[0].lat, lng: v.points[0].lng, heading: v.points[0].heading };
      runAnimationTick([v], BASE_TS + 15000, 1);
      const posAfter = { ...v.currentPos };
      tickVessel(v, 0.15);
      expect(v.currentPos).toEqual(posAfter);
    });

    it("processes multiple vessels independently", () => {
      const v1 = makeVessel({ vesselId: "V1" });
      const v2 = makeVessel({
        vesselId: "V2",
        points: [
          { lat: 25.0, lng: 75.0, ts: BASE_TS, heading: 10 },
          { lat: 25.5, lng: 75.5, ts: BASE_TS + 15000, heading: 20 },
        ],
      });
      v1.currentPos = { lat: v1.points[0].lat, lng: v1.points[0].lng, heading: v1.points[0].heading };
      v2.currentPos = { lat: v2.points[0].lat, lng: v2.points[0].lng, heading: v2.points[0].heading };
      runAnimationTick([v1, v2], BASE_TS + 15000, 0.15);
      expect(v1.toPos.lat).toBe(15.5);
      expect(v2.toPos.lat).toBe(25.5);
    });
  });

  // --- Integration: full animation cycle ---
  describe("full animation cycle (integration)", () => {
    it("vessel stays at point 0, then tweens to point 1, then halts", () => {
      const v = makeVessel();
      const ease = 0.15;

      // Init — vessel at point 0, not animating
      advanceVessel(v, BASE_TS);
      expect(v.currentPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });
      expect(v.isAnimating).toBe(false);

      // Tick while at point 0 — should NOT move
      tickVessel(v, ease);
      expect(v.currentPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });

      // Time advances to point 1 — tween starts
      advanceVessel(v, BASE_TS + 15000);
      expect(v.isAnimating).toBe(true);
      expect(v.tweenProgress).toBe(0);
      expect(v.fromPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });
      expect(v.toPos).toEqual({ lat: 15.5, lng: 65.5, heading: 50 });

      // Tick — vessel moves toward target
      tickVessel(v, ease);
      expect(v.currentPos.lat).toBeGreaterThan(15.0);
      expect(v.currentPos.lat).toBeLessThan(15.5);

      // Continue ticking until tween completes
      while (v.isAnimating) {
        tickVessel(v, ease);
      }

      // Vessel halted exactly at target
      expect(v.currentPos).toEqual({ lat: 15.5, lng: 65.5, heading: 50 });
      expect(v.isAnimating).toBe(false);

      // Further ticks do nothing
      tickVessel(v, ease);
      expect(v.currentPos).toEqual({ lat: 15.5, lng: 65.5, heading: 50 });
    });

    it("vessel jumps to correct position on seek (no tween)", () => {
      const v = makeVessel();
      advanceVessel(v, BASE_TS);

      seekVessel(v, BASE_TS + 30000);
      expect(v.currentPos).toEqual({ lat: 16.0, lng: 66.0, heading: 55 });
      expect(v.isAnimating).toBe(false);
      expect(v.tweenProgress).toBe(1);
    });

    it("vessel reaches final position and halts", () => {
      const v = makeVessel();
      advanceVessel(v, BASE_TS);
      advanceVessel(v, BASE_TS + 60000);
      expect(v.toPos.lat).toBe(17.0);
      expect(v.isAnimating).toBe(true);

      while (v.isAnimating) {
        tickVessel(v, 0.15);
      }
      expect(v.currentPos).toEqual({ lat: 17.0, lng: 67.0, heading: 65 });
      expect(v.isAnimating).toBe(false);
    });

    it("multi-minute merge produces continuous trajectory", () => {
      const minute0: Record<string, PlaybackPoint[]> = {
        V0001: [
          {
            timestamp: "2024-12-04T16:00:00Z",
            latitude: 15.0,
            longitude: 65.0,
            heading: 45,
          },
          {
            timestamp: "2024-12-04T16:00:30Z",
            latitude: 15.3,
            longitude: 65.3,
            heading: 48,
          },
        ],
      };
      const minute1: Record<string, PlaybackPoint[]> = {
        V0001: [
          {
            timestamp: "2024-12-04T16:01:00Z",
            latitude: 15.6,
            longitude: 65.6,
            heading: 52,
          },
          {
            timestamp: "2024-12-04T16:01:30Z",
            latitude: 16.0,
            longitude: 66.0,
            heading: 55,
          },
        ],
      };

      let vessels = normalizeVessels(minute0);
      vessels = mergeMinuteData(vessels, minute1);

      expect(vessels[0].points).toHaveLength(4);
      expect(vessels[0].points[0].ts).toBeLessThan(vessels[0].points[1].ts);
      expect(vessels[0].points[1].ts).toBeLessThan(vessels[0].points[2].ts);
      expect(vessels[0].points[2].ts).toBeLessThan(vessels[0].points[3].ts);
    });

    it("animation across minute boundary: halt → tween → halt", () => {
      const minute0: Record<string, PlaybackPoint[]> = {
        V0001: [
          {
            timestamp: "2024-12-04T16:00:00Z",
            latitude: 15.0,
            longitude: 65.0,
            heading: 45,
          },
        ],
      };
      const minute1: Record<string, PlaybackPoint[]> = {
        V0001: [
          {
            timestamp: "2024-12-04T16:01:00Z",
            latitude: 16.0,
            longitude: 66.0,
            heading: 55,
          },
        ],
      };

      let vessels = normalizeVessels(minute0);
      vessels = mergeMinuteData(vessels, minute1);

      const v = vessels[0];

      // Init at point 0
      advanceVessel(v, BASE_TS);
      expect(v.currentPos.lat).toBe(15.0);
      expect(v.isAnimating).toBe(false);

      // No movement while at point 0
      tickVessel(v, 0.15);
      expect(v.currentPos.lat).toBe(15.0);

      // Advance past minute boundary — tween starts
      advanceVessel(v, BASE_TS + 60000);
      expect(v.isAnimating).toBe(true);
      expect(v.toPos.lat).toBe(16.0);

      // Tween to completion
      while (v.isAnimating) {
        tickVessel(v, 0.15);
      }
      expect(v.currentPos).toEqual({ lat: 16.0, lng: 66.0, heading: 55 });
      expect(v.isAnimating).toBe(false);

      // Halted — no further movement
      tickVessel(v, 0.15);
      expect(v.currentPos).toEqual({ lat: 16.0, lng: 66.0, heading: 55 });
    });

    it("vessel skips intermediate point and tweens to far point", () => {
      const v = makeVessel();
      advanceVessel(v, BASE_TS);

      // Jump from point 0 to point 3 (skip 1 and 2)
      advanceVessel(v, BASE_TS + 45000);
      expect(v.index).toBe(3);
      expect(v.toPos).toEqual({ lat: 16.5, lng: 66.5, heading: 60 });
      expect(v.fromPos).toEqual({ lat: 15.0, lng: 65.0, heading: 45 });
      expect(v.isAnimating).toBe(true);

      while (v.isAnimating) {
        tickVessel(v, 0.15);
      }
      expect(v.currentPos).toEqual({ lat: 16.5, lng: 66.5, heading: 60 });
    });
  });
});
