import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { VesselPosition } from '../../../model/types';
import type { SignalLostEvent } from '../../../model/eventTypeTypes';

// Neutral slate palette (not dark_ship's purple) — signal_lost makes no
// assumption of intent, so it shouldn't read as visually "suspicious".
const SEVERITY_PALETTE: Record<string, { bg: string; border: string }> = {
  high:     { bg: 'rgba(120, 144, 156, 0.95)', border: '#546e7a' },
  medium:   { bg: 'rgba(144, 164, 174, 0.95)', border: '#607d8b' },
  low:      { bg: 'rgba(176, 190, 197, 0.95)', border: '#78909c' },
  resolved: { bg: 'rgba(68, 255, 68, 0.95)',   border: '#00cc00' },
};

function formatSilentDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m no signal` : `${minutes}m no signal`;
}

export interface Props {
  event: SignalLostEvent;
  position: VesselPosition;
}

export function SignalLostBadge({ event, position }: Props) {
  const palette = SEVERITY_PALETTE[event.severity] ?? SEVERITY_PALETTE.high;
  const label   = formatSilentDuration(event.silentDurationSec);

  const icon = L.divIcon({
    className: 'signal-lost-badge-marker',
    html: `<div style="
      background-color: ${palette.bg};
      color: #000;
      border: 2px solid ${palette.border};
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      text-align: center;
      pointer-events: none;
    ">${label}</div>`,
    iconSize: [100, 20],
    iconAnchor: [50, 30],
  });

  return (
    <Marker
      position={[position.lat, position.lon]}
      icon={icon}
      interactive={false}
      zIndexOffset={1000}
    />
  );
}
