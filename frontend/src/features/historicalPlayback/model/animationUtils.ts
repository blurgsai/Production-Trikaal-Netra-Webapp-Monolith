import type { AnimationVessel, PlaybackPoint, VesselPoint } from "./types";

const VESSEL_COLORS = [
  "#4fc3f7",
  "#ffb74d",
  "#aed581",
  "#ff8a65",
  "#9575cd",
];

export function getVesselColor(index: number): string {
  return VESSEL_COLORS[index % VESSEL_COLORS.length];
}

export function computeEaseFactor(playbackSpeed: number): number {
  return Math.min(0.15 * playbackSpeed, 0.5);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPosition(
  current: { lat: number; lng: number; heading: number },
  target: { lat: number; lng: number; heading: number },
  t: number,
): { lat: number; lng: number; heading: number } {
  return {
    lat: lerp(current.lat, target.lat, t),
    lng: lerp(current.lng, target.lng, t),
    heading: lerp(current.heading, target.heading, t),
  };
}

export function findIndexAtTime(
  points: VesselPoint[],
  logicalGlobalMs: number,
  startIndex: number,
): number {
  let idx = startIndex;
  while (idx < points.length - 1 && points[idx + 1].ts <= logicalGlobalMs) {
    idx++;
  }
  return idx;
}

export function advanceVessel(
  vessel: AnimationVessel,
  logicalGlobalMs: number,
): void {
  if (!vessel.points.length) return;

  const idx = findIndexAtTime(vessel.points, logicalGlobalMs, vessel.index);

  if (idx !== vessel.index) {
    vessel.index = idx;
    const target = vessel.points[idx];
    vessel.fromPos = { lat: vessel.currentPos.lat, lng: vessel.currentPos.lng, heading: vessel.currentPos.heading };
    vessel.toPos = { lat: target.lat, lng: target.lng, heading: target.heading };
    vessel.tweenProgress = 0;
    vessel.isAnimating = true;
  }

  if (
    vessel.currentPos.lat === 0 &&
    vessel.currentPos.lng === 0 &&
    vessel.points[0]
  ) {
    vessel.currentPos = { lat: vessel.points[0].lat, lng: vessel.points[0].lng, heading: vessel.points[0].heading };
    vessel.fromPos = { lat: vessel.points[0].lat, lng: vessel.points[0].lng, heading: vessel.points[0].heading };
    vessel.toPos = { lat: vessel.points[0].lat, lng: vessel.points[0].lng, heading: vessel.points[0].heading };
    vessel.tweenProgress = 1;
    vessel.isAnimating = false;
  }
}

export function tickVessel(vessel: AnimationVessel, easeFactor: number): void {
  if (!vessel.isAnimating) return;

  vessel.tweenProgress = Math.min(vessel.tweenProgress + easeFactor, 1);

  vessel.currentPos = lerpPosition(
    vessel.fromPos,
    vessel.toPos,
    vessel.tweenProgress,
  );

  if (vessel.tweenProgress >= 1) {
    vessel.currentPos = { ...vessel.toPos };
    vessel.isAnimating = false;
  }
}

export function normalizeVessels(
  vesselMap: Record<string, PlaybackPoint[]> | undefined,
): AnimationVessel[] {
  const vessels: AnimationVessel[] = [];
  Object.entries(vesselMap || {}).forEach(([vesselId, points], idx) => {
    vessels.push({
      vesselId,
      points: points
        .map(
          (p): VesselPoint => ({
            lat: p.latitude,
            lng: p.longitude,
            ts:
              typeof p.timestamp === "string"
                ? new Date(p.timestamp).getTime()
                : p.timestamp,
            heading: p.heading,
          }),
        )
        .sort((a, b) => a.ts - b.ts),
      index: 0,
      color: getVesselColor(idx),
      currentPos: { lat: 0, lng: 0, heading: 0 },
      fromPos: { lat: 0, lng: 0, heading: 0 },
      toPos: { lat: 0, lng: 0, heading: 0 },
      tweenProgress: 1,
      isAnimating: false,
    });
  });
  return vessels;
}

export function mergeMinuteData(
  existing: AnimationVessel[],
  newVesselMap: Record<string, PlaybackPoint[]> | undefined,
): AnimationVessel[] {
  if (!newVesselMap) return existing;
  const newVessels = normalizeVessels(newVesselMap);
  const vesselMap = new Map(existing.map((v) => [v.vesselId, v]));

  for (const nv of newVessels) {
    const ev = vesselMap.get(nv.vesselId);
    if (ev) {
      const existingTs = new Set(ev.points.map((p) => p.ts));
      for (const p of nv.points) {
        if (!existingTs.has(p.ts)) {
          ev.points.push(p);
        }
      }
      ev.points.sort((a, b) => a.ts - b.ts);
    } else {
      vesselMap.set(nv.vesselId, nv);
    }
  }
  return Array.from(vesselMap.values());
}

export function seekVessel(
  vessel: AnimationVessel,
  logicalGlobalMs: number,
): void {
  const idx = findIndexAtTime(vessel.points, logicalGlobalMs, 0);
  vessel.index = idx;
  if (vessel.points[idx]) {
    vessel.currentPos = { lat: vessel.points[idx].lat, lng: vessel.points[idx].lng, heading: vessel.points[idx].heading };
    vessel.fromPos = { lat: vessel.points[idx].lat, lng: vessel.points[idx].lng, heading: vessel.points[idx].heading };
    vessel.toPos = { lat: vessel.points[idx].lat, lng: vessel.points[idx].lng, heading: vessel.points[idx].heading };
    vessel.tweenProgress = 1;
    vessel.isAnimating = false;
  }
}

export function runAnimationTick(
  vessels: AnimationVessel[],
  logicalGlobalMs: number,
  easeFactor: number,
): void {
  vessels.forEach((v) => {
    advanceVessel(v, logicalGlobalMs);
    tickVessel(v, easeFactor);
  });
}
