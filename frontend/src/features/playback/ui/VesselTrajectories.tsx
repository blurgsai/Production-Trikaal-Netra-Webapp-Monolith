import { Polyline } from 'react-leaflet';
import { useVesselTrajectorySegments } from '../hooks/useVesselTrajectorySegments';
import type { TimelineFrame, TrajectoryOverrideRule } from '../model/types';

interface VesselTrajectoriesProps {
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  trajectoryOverrides: Record<string, TrajectoryOverrideRule[]> | null;
}

export function VesselTrajectories({
  timeline,
  currentTimestampMs,
  trajectoryOverrides,
}: VesselTrajectoriesProps) {
  const vessels = useVesselTrajectorySegments(timeline, currentTimestampMs, trajectoryOverrides);

  return (
    <>
      {vessels.map(({ vesselId, coords, segmentStyles }) => {
        if (!segmentStyles) {
          return (
            <Polyline
              key={vesselId}
              positions={coords}
              pathOptions={{ color: '#90caf9', weight: 2, opacity: 0.6 }}
            />
          );
        }

        return coords.slice(0, -1).map((_, i) => {
          const style = segmentStyles[i];
          return (
            <Polyline
              key={`${vesselId}-${i}`}
              positions={[coords[i], coords[i + 1]]}
              pathOptions={{
                color: style.color,
                weight: style.weight ?? 2,
                opacity: style.opacity ?? 0.6,
                dashArray: style.dashArray,
              }}
            />
          );
        });
      })}
    </>
  );
}
