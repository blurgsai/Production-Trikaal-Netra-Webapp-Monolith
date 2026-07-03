import { Polyline } from 'react-leaflet';
import type { TimelineFrame, TrajectoryOverrideRule, TrajectorySegmentStyle } from '../model/types';

interface VesselTrajectoriesProps {
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  trajectoryOverrides: Record<string, TrajectoryOverrideRule[]> | null;
}

const DEFAULT_STYLE: TrajectorySegmentStyle = { color: '#90caf9', weight: 2, opacity: 0.6 };

export function VesselTrajectories({
  timeline,
  currentTimestampMs,
  trajectoryOverrides,
}: VesselTrajectoriesProps) {
  const relevant = timeline.filter(f => f.timestampMs <= currentTimestampMs);
  if (!relevant.length) return null;

  const vesselIds = Array.from(
    new Set(relevant.flatMap(f => Object.keys(f.vessels))),
  );

  return (
    <>
      {vesselIds.map(vesselId => {
        const coords = relevant
          .filter(f => f.vessels[vesselId])
          .map(f => [f.vessels[vesselId].lat, f.vessels[vesselId].lon] as [number, number]);

        if (coords.length < 2) return null;

        const overrides = trajectoryOverrides?.[vesselId];
        if (!overrides?.length) {
          return (
            <Polyline key={vesselId} positions={coords} pathOptions={DEFAULT_STYLE} />
          );
        }

        // Split trajectory into styled segments
        return (
          <SegmentedPolyline
            key={vesselId}
            vesselId={vesselId}
            coords={coords}
            frames={relevant}
            overrides={overrides}
          />
        );
      })}
    </>
  );
}

interface SegmentedPolylineProps {
  vesselId: string;
  coords: [number, number][];
  frames: TimelineFrame[];
  overrides: TrajectoryOverrideRule[];
}

function SegmentedPolyline({ vesselId, coords, frames, overrides }: SegmentedPolylineProps) {
  const vesselFrames = frames.filter(f => f.vessels[vesselId]);

  return (
    <>
      {coords.slice(0, -1).map((_, i) => {
        const segmentTs = vesselFrames[i]?.timestampMs ?? 0;
        const rule = overrides.find(r => segmentTs >= r.start && segmentTs < r.end);
        const style = rule ? rule.style : DEFAULT_STYLE;
        return (
          <Polyline
            key={i}
            positions={[coords[i], coords[i + 1]]}
            pathOptions={{ color: style.color, weight: style.weight ?? 2, opacity: style.opacity ?? 0.6, dashArray: style.dashArray }}
          />
        );
      })}
    </>
  );
}
