import { CircleMarker, Tooltip } from 'react-leaflet';
import type { DarkShipEvent } from '../../../model/eventTypeTypes';

function formatDarkDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

interface Props {
  event: DarkShipEvent;
}

// Two concentric circles at the vessel's last known position — marks the
// "AIS dark zone" where transmissions stopped or dropped off sharply.
export function DarkShipOverlay({ event }: Props) {
  if (!event.location) return null;

  const { lat, lon } = event.location;
  const { updateRatePerHour, areaAverageRatePerHour } = event;
  const suppressionPct = areaAverageRatePerHour > 0
    ? Math.round((1 - updateRatePerHour / areaAverageRatePerHour) * 100)
    : null;

  return (
    <>
      {/* Outer dashed ring — dark-zone boundary */}
      <CircleMarker
        center={[lat, lon]}
        radius={32}
        pathOptions={{
          color: '#9c27b0',
          weight: 2,
          opacity: 0.45,
          fillColor: '#9c27b0',
          fillOpacity: 0.06,
          dashArray: '8, 8',
        }}
      />

      {/* Inner solid dot — precise last known position */}
      <CircleMarker
        center={[lat, lon]}
        radius={9}
        pathOptions={{
          color: '#ce93d8',
          weight: 2,
          opacity: 0.95,
          fillColor: '#9c27b0',
          fillOpacity: 0.85,
        }}
      >
        <Tooltip sticky>
          <strong>AIS Dark Zone</strong>
          <br />
          Last known position
          <br />
          Vessel rate: {updateRatePerHour}/hr
          {areaAverageRatePerHour > 0 && ` · Area avg: ${areaAverageRatePerHour}/hr`}
          {suppressionPct != null && suppressionPct > 0 && (
            <>
              <br />
              Suppressed by ~{suppressionPct}%
            </>
          )}
          <br />
          Silent for: {formatDarkDuration(event.timeSinceLastUpdateSec)}
        </Tooltip>
      </CircleMarker>
    </>
  );
}
