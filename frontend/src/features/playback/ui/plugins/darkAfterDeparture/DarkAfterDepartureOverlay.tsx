import { CircleMarker, Polygon, Tooltip } from 'react-leaflet';
import { formatPlaybackTimestamp } from '../../../model/playbackUtils';
import type { DarkAfterDepartureEvent } from '../../../model/eventTypeTypes';

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

interface Props {
  event: DarkAfterDepartureEvent;
}

// Two concentric circles at the vessel's last known position — indigo theme,
// distinct from dark_ship's purple and signal_lost's slate, so the three
// "went quiet" event types stay visually distinguishable as a family.
export function DarkAfterDepartureOverlay({ event }: Props) {
  if (!event.location) return null;

  const { lat, lon } = event.location;
  const {
    portId, portDepartureMs, timeSinceDepartureSec, departureToDarkThresholdSec,
    updateRatePerHour, areaAverageRatePerHour, timeSinceLastUpdateSec,
  } = event;

  const windowPct = departureToDarkThresholdSec > 0
    ? Math.round((timeSinceDepartureSec / departureToDarkThresholdSec) * 100)
    : null;
  const suppressionPct = areaAverageRatePerHour > 0
    ? Math.round((1 - updateRatePerHour / areaAverageRatePerHour) * 100)
    : null;

  return (
    <>
      {/* Departure-port boundary (from backend `port_polygon`) — green, so it
          reads as the "origin" the vessel left, distinct from the indigo
          dark-zone circles below. */}
      {event.portPolygonPositions?.map((ring, idx) => (
        <Polygon
          key={`port-${idx}`}
          positions={ring}
          pathOptions={{ color: '#26a69a', weight: 2, fillOpacity: 0.12 }}
        >
          <Tooltip sticky>
            <strong>{event.portName ?? event.portId ?? 'Departure Port'}</strong>
            <br />
            Departure port
          </Tooltip>
        </Polygon>
      ))}

      <CircleMarker
        center={[lat, lon]}
        radius={32}
        pathOptions={{
          color: '#5c6bc0',
          weight: 2,
          opacity: 0.45,
          fillColor: '#5c6bc0',
          fillOpacity: 0.06,
          dashArray: '8, 8',
        }}
      />

      <CircleMarker
        center={[lat, lon]}
        radius={9}
        pathOptions={{
          color: '#9fa8da',
          weight: 2,
          opacity: 0.95,
          fillColor: '#5c6bc0',
          fillOpacity: 0.85,
        }}
      >
        <Tooltip sticky>
          <strong>Dark After Departure</strong>
          <br />
          {portId && (
            <>
              Departed: {portId}
              {portDepartureMs != null && ` at ${formatPlaybackTimestamp(portDepartureMs)}`}
              <br />
            </>
          )}
          Went dark {formatDuration(timeSinceDepartureSec)} after departure
          {windowPct != null && ` (${windowPct}% of the ${formatDuration(departureToDarkThresholdSec)} window)`}
          <br />
          Vessel rate: {updateRatePerHour}/hr
          {areaAverageRatePerHour > 0 && ` · Area avg: ${areaAverageRatePerHour}/hr`}
          {suppressionPct != null && suppressionPct > 0 && ` (↓${suppressionPct}%)`}
          <br />
          Silent for: {formatDuration(timeSinceLastUpdateSec)}
        </Tooltip>
      </CircleMarker>
    </>
  );
}
