import { useMemo } from 'react';
import type { TimelineFrame, TrajectoryOverrideRule, TrajectorySegmentStyle } from '../model/types';

export interface VesselTrajectoryRender {
  vesselId: string;
  coords: [number, number][];
  // null means "render one uniformly-styled polyline" — segments only exist
  // where trajectory overrides actually colour a portion of the path.
  segmentStyles: TrajectorySegmentStyle[] | null;
}

export const DEFAULT_TRAJECTORY_STYLE: TrajectorySegmentStyle = {
  color: '#90caf9',
  weight: 2,
  opacity: 0.6,
};

// Builds each vessel's path up to currentTimestampMs and, where trajectory
// overrides apply, splits it into per-segment styled pieces by matching each
// segment's start timestamp against the override's [start, end) window.
export function useVesselTrajectorySegments(
  timeline: TimelineFrame[],
  currentTimestampMs: number,
  trajectoryOverrides: Record<string, TrajectoryOverrideRule[]> | null,
): VesselTrajectoryRender[] {
  return useMemo(() => {
    const relevant = timeline.filter(f => f.timestampMs <= currentTimestampMs);
    if (!relevant.length) return [];

    const vesselIds = Array.from(new Set(relevant.flatMap(f => Object.keys(f.vessels))));

    return vesselIds
      .map((vesselId): VesselTrajectoryRender => {
        const frames = relevant.filter(f => f.vessels[vesselId]);
        const coords = frames.map(f => [f.vessels[vesselId].lat, f.vessels[vesselId].lon] as [number, number]);

        const overrides = trajectoryOverrides?.[vesselId];
        if (!overrides?.length) {
          return { vesselId, coords, segmentStyles: null };
        }

        const segmentStyles = coords.slice(0, -1).map((_, i) => {
          const segmentTs = frames[i]?.timestampMs ?? 0;
          const rule = overrides.find(r => segmentTs >= r.start && segmentTs < r.end);
          return rule ? rule.style : DEFAULT_TRAJECTORY_STYLE;
        });

        return { vesselId, coords, segmentStyles };
      })
      .filter(v => v.coords.length >= 2);
  }, [timeline, currentTimestampMs, trajectoryOverrides]);
}
