import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { VesselPosition } from '../../../model/types';
import type { DuplicateMmsiEvent } from '../../../model/eventTypeTypes';

interface Props {
  event: DuplicateMmsiEvent;
  position: VesselPosition;
}

// The headline signal for duplicate_mmsi: both vessels badged with the cloned MMSI they
// are broadcasting. vessels_involved are internal VESSEL IDs (unique) — a different
// namespace from MMSI — so the two flagged vessels are genuinely distinct ships that are
// both transmitting the SAME `spoofed_mmsi`. That's why the same MMSI on both is correct
// and does NOT contradict the base map tooltip (which labels a marker by its vessel id,
// not its MMSI). getMarkerEnhancement guards this to vessels_involved, so both tracks
// (and only those) carry the badge.
export function DuplicateMmsiBadge({ event, position }: Props) {
  const icon = L.divIcon({
    className: 'duplicate-mmsi-badge-marker',
    // 0×0 container anchored on the vessel; inner label floats above, centred,
    // regardless of text length (same technique as the connection distance chip).
    html: `<div style="
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, calc(-100% - 12px));
      background-color: rgba(255, 23, 68, 0.95);
      color: #fff;
      border: 2px solid #7f0018;
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      pointer-events: none;
    ">⚠ MMSI ${event.spoofedMmsi} · cloned</div>`,
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
