import { Polygon, Tooltip } from 'react-leaflet';
import type { PortIntrusionEvent } from '../../../model/eventTypeTypes';

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function formatLabel(value: string | null): string {
  if (!value) return 'Restricted Zone';
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface Props {
  event: PortIntrusionEvent;
}

// Same mechanism as GeofenceIntrusionOverlay: the polygon is fetched by the
// backend (keyed off port_id) from a separate collection and attached as the
// top-level `port_polygon` extra field — this only draws when it's present.
export function PortIntrusionOverlay({ event }: Props) {
  if (!event.polygonPositions?.length) return null;

  const repeat = event.violationCount > 1;
  const color  = repeat ? '#ff1744' : '#ff4444';

  return (
    <>
      {event.polygonPositions.map((ring, idx) => (
        <Polygon
          key={idx}
          positions={ring}
          pathOptions={{ color, weight: repeat ? 3 : 2, fillOpacity: 0.15 }}
        >
          <Tooltip sticky>
            <strong>{event.portName ?? formatLabel(event.restrictionType)}</strong>
            <br />
            {event.portName && <>{formatLabel(event.restrictionType)}<br /></>}
            Port: {event.portId ?? 'Unknown'}
            <br />
            Intrusion duration: {formatDuration(event.intrusionDurationSec)}
            <br />
            Violation count: {event.violationCount}
            {repeat && (
              <>
                <br />
                <em>Repeat offender</em>
              </>
            )}
          </Tooltip>
        </Polygon>
      ))}
    </>
  );
}
