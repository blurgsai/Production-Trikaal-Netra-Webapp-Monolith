import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { VesselPosition } from '../../model/types';

// Structural — any event-specific domain type exposing a signed kinematic reading
// and its bidirectional threshold band can drive this badge. `unit` and `label`
// are supplied by the plugin (presentational), never by the mapper.
export interface KinematicReading {
  value: number;             // signed detected value (e.g. deceleration -5.8)
  thresholdPositive: number; // alert when value > this
  thresholdNegative: number; // alert when value < this
}

export interface Props {
  event: KinematicReading;
  position: VesselPosition;
  unit: string;   // 'm/s²' | 'm/s³'
  label: string;  // 'Sudden Stop' | 'Accel' | 'Jerk'
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export function KinematicsBadge({ event, position, unit, label }: Props) {
  const isAlert = event.value > event.thresholdPositive || event.value < event.thresholdNegative;

  const bgColor = isAlert ? 'rgba(255, 68, 68, 0.95)' : 'rgba(100, 180, 255, 0.95)';
  const bdColor = isAlert ? '#cc0000' : '#3a9fd4';

  const icon = L.divIcon({
    className: 'kinematics-badge-marker',
    html: `<div style="
      background-color: ${bgColor};
      color: #000;
      border: 2px solid ${bdColor};
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      text-align: center;
      pointer-events: none;
    ">${label} ${formatSigned(event.value)} ${unit}</div>`,
    iconSize: [140, 20],
    iconAnchor: [70, 32],
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
