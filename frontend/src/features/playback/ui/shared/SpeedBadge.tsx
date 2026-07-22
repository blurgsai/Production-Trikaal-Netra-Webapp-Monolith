import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { VesselPosition, TimeWindow } from '../../model/types';

// Structural — any event-specific domain type with a threshold can drive this badge.
interface ThresholdSpeedEvent {
  thresholdMps: number;
}

export interface Props {
  event: ThresholdSpeedEvent;
  vesselId: string;
  position: VesselPosition;
  currentTimestampMs: number;
  timeWindow: TimeWindow;
  // When true, alert fires above the threshold (e.g. high_speed) instead of below it
  // (the default, used by prolonged_low_speed / prolonged_stationary).
  inverted?: boolean;
}

export function SpeedBadge({ event, position, inverted = false }: Props) {
  const currentSpeed = position.speedMps;
  if (currentSpeed == null) return null;

  const threshold    = event.thresholdMps > 0 ? event.thresholdMps : null;
  const hasThreshold = threshold !== null;
  const isAlert      = hasThreshold && (inverted ? currentSpeed > threshold : currentSpeed < threshold);

  const bgColor = !hasThreshold
    ? 'rgba(100, 180, 255, 0.95)'
    : isAlert
    ? 'rgba(255, 68, 68, 0.95)'
    : 'rgba(68, 255, 68, 0.95)';

  const bdColor = !hasThreshold ? '#3a9fd4' : isAlert ? '#cc0000' : '#00cc00';

  // 0×0-anchored icon, auto-width label — a fixed iconSize is unsafe here
  // since nowrap content can exceed whatever width was assumed for it.
  const icon = L.divIcon({
    className: 'speed-badge-marker',
    html: `<div style="
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, calc(-100% - 15px));
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
    iconSize: [0, 0],
    iconAnchor: [0, 0],
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
