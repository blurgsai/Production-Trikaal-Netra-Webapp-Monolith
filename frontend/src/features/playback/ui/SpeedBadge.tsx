import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { ProlongedLowSpeedEvent } from '../model/prolongedLowSpeedTypes';
import type { VesselPosition, TimeWindow } from '../model/types';

interface Props {
  event: ProlongedLowSpeedEvent;
  vesselId: string;
  position: VesselPosition;
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

export function SpeedBadge({ event, position }: Props) {
  const currentSpeed = position.speedMps;
  if (currentSpeed == null) return null;

  const threshold    = event.thresholdMps > 0 ? event.thresholdMps : null;
  const hasThreshold = threshold !== null;
  const isAlert      = hasThreshold && currentSpeed < threshold;

  const bgColor = !hasThreshold
    ? 'rgba(100, 180, 255, 0.95)'
    : isAlert
    ? 'rgba(255, 68, 68, 0.95)'
    : 'rgba(68, 255, 68, 0.95)';

  const bdColor = !hasThreshold ? '#3a9fd4' : isAlert ? '#cc0000' : '#00cc00';

  const icon = L.divIcon({
    className: 'speed-badge-marker',
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
    ">${currentSpeed.toFixed(2)} m/s</div>`,
    iconSize: [80, 20],
    iconAnchor: [40, 35],
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
