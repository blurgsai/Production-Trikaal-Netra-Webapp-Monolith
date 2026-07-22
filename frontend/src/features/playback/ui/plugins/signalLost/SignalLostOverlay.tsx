import { CircleMarker, Tooltip } from 'react-leaflet';
import type { SignalLostEvent } from '../../../model/eventTypeTypes';

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

interface Props {
  event: SignalLostEvent;
}

// Two concentric circles at the vessel's last known position — neutral slate
// theme (not dark_ship's purple), since this event makes no assumption of intent.
export function SignalLostOverlay({ event }: Props) {
  if (!event.location) return null;

  const { lat, lon } = event.location;
  const { thresholdSec, silentDurationSec } = event;
  const multiple = thresholdSec > 0 ? (silentDurationSec / thresholdSec).toFixed(1) : null;

  return (
    <>
      <CircleMarker
        center={[lat, lon]}
        radius={32}
        pathOptions={{
          color: '#78909c',
          weight: 2,
          opacity: 0.45,
          fillColor: '#78909c',
          fillOpacity: 0.06,
          dashArray: '8, 8',
        }}
      />

      <CircleMarker
        center={[lat, lon]}
        radius={9}
        pathOptions={{
          color: '#b0bec5',
          weight: 2,
          opacity: 0.95,
          fillColor: '#546e7a',
          fillOpacity: 0.85,
        }}
      >
        <Tooltip sticky>
          <strong>Signal Lost</strong>
          <br />
          Last known position
          <br />
          Silent for: {formatDuration(silentDurationSec)}
          {thresholdSec > 0 && ` (threshold: ${formatDuration(thresholdSec)}${multiple ? `, ${multiple}×` : ''})`}
          <br />
          <em>Position beyond this point is interpolated, not observed.</em>
        </Tooltip>
      </CircleMarker>
    </>
  );
}
