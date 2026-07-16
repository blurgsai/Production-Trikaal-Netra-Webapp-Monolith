import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { VesselPosition } from '../../../model/types';
import type { PortIntrusionEvent } from '../../../model/eventTypeTypes';

const SEVERITY_PALETTE: Record<string, { bg: string; border: string }> = {
  high:     { bg: 'rgba(255, 68, 68, 0.95)',   border: '#cc0000' },
  medium:   { bg: 'rgba(255, 140, 0, 0.95)',   border: '#cc7000' },
  low:      { bg: 'rgba(100, 180, 255, 0.95)', border: '#3a9fd4' },
  resolved: { bg: 'rgba(68, 255, 68, 0.95)',   border: '#00cc00' },
};

function formatLabel(value: string | null): string {
  if (!value) return 'Restricted Zone';
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export interface Props {
  event: PortIntrusionEvent;
  position: VesselPosition;
}

// Repeat offenders get a thicker border regardless of severity — the
// violation count itself is a signal worth surfacing at a glance.
export function PortIntrusionBadge({ event, position }: Props) {
  const palette = SEVERITY_PALETTE[event.severity] ?? SEVERITY_PALETTE.high;
  const repeat  = event.violationCount > 1;
  const label   = `${formatLabel(event.restrictionType)}${repeat ? ` · Violation #${event.violationCount}` : ''}`;

  const icon = L.divIcon({
    className: 'port-intrusion-badge-marker',
    html: `<div style="
      background-color: ${palette.bg};
      color: #000;
      border: ${repeat ? 3 : 2}px solid ${palette.border};
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      text-align: center;
      pointer-events: none;
    ">${label}</div>`,
    iconSize: [190, 20],
    iconAnchor: [95, 30],
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
