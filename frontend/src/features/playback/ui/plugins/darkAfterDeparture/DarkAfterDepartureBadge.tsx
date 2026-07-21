import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { VesselPosition } from '../../../model/types';
import type { DarkAfterDepartureEvent } from '../../../model/eventTypeTypes';

const SEVERITY_PALETTE: Record<string, { bg: string; border: string }> = {
  high:     { bg: 'rgba(255, 68, 68, 0.95)',   border: '#cc0000' },
  medium:   { bg: 'rgba(255, 140, 0, 0.95)',   border: '#cc7000' },
  low:      { bg: 'rgba(100, 180, 255, 0.95)', border: '#3a9fd4' },
  resolved: { bg: 'rgba(68, 255, 68, 0.95)',   border: '#00cc00' },
};

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export interface Props {
  event: DarkAfterDepartureEvent;
  position: VesselPosition;
}

// Headline is departure-relative ("dark 2h15m after leaving port"), not the
// raw silence duration — that's the actual signal this detector is about.
export function DarkAfterDepartureBadge({ event, position }: Props) {
  const palette = SEVERITY_PALETTE[event.severity] ?? SEVERITY_PALETTE.high;
  const label   = `Dark ${formatDuration(event.timeSinceDepartureSec)} after departure`;

  const icon = L.divIcon({
    className: 'dark-after-departure-badge-marker',
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
    iconSize: [170, 20],
    iconAnchor: [85, 30],
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
