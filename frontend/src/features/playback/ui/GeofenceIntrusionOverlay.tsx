import { Polygon, Tooltip } from 'react-leaflet';
import type { GeofenceEvent } from '../model/geofenceIntrusionTypes';
import type { TimeWindow } from '../model/types';

interface Props {
  event: GeofenceEvent;
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

export function GeofenceIntrusionOverlay({ event }: Props) {
  if (!event.polygonPositions?.length) return null;

  const color = event.hasExitedPolygon ? '#ff8c00' : '#ff4444';

  return (
    <>
      {event.polygonPositions.map((ring, idx) => (
        <Polygon
          key={idx}
          positions={ring}
          pathOptions={{ color, weight: 2, fillOpacity: 0.15 }}
        >
          <Tooltip sticky>
            <strong>{event.geofenceName}</strong>
            <br />
            {event.hasExitedPolygon ? 'Vessel exited polygon' : 'Vessel inside polygon'}
          </Tooltip>
        </Polygon>
      ))}
    </>
  );
}
