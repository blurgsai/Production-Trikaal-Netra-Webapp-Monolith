import { Marker, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import skyblueArrow from '@/assets/skyblue-arrow.svg';
import type { VesselPosition } from '../model/types';

interface VesselMarkersProps {
  positions: Record<string, VesselPosition>;
}

// The arrow SVG points north at rest; rotating it by the vessel's heading (0° = north,
// clockwise) orients it to the direction of travel. Reuses the same skyblue-arrow asset
// the historical playback used for vessel markers.
function arrowIcon(headingDeg: number) {
  const normalized = ((headingDeg % 360) + 360) % 360;
  return L.divIcon({
    className: 'vessel-arrow-icon',
    html: `<img src="${skyblueArrow}" alt="" style="width:20px;height:20px;transform:rotate(${normalized}deg);transform-origin:center center;display:block;" />`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function VesselMarkers({ positions }: VesselMarkersProps) {
  return (
    <>
      {Object.entries(positions).map(([vesselId, pos]) => {
        // Prefer heading (bow direction); fall back to course (COG). With neither there's
        // no meaningful orientation — render a plain dot instead of a mis-pointed arrow.
        const orientation = pos.heading ?? pos.course ?? null;

        const tooltip = (
          <Tooltip direction="top" offset={[0, -12]}>
            <strong>{vesselId}</strong>
            {pos.speedMps != null && (
              <>
                <br />
                Speed: {(pos.speedMps * 1.94384).toFixed(1)} kn
              </>
            )}
            {orientation != null && (
              <>
                <br />
                Heading: {Math.round(orientation)}°
              </>
            )}
          </Tooltip>
        );

        if (orientation != null && Number.isFinite(orientation)) {
          return (
            <Marker key={vesselId} position={[pos.lat, pos.lon]} icon={arrowIcon(orientation)}>
              {tooltip}
            </Marker>
          );
        }

        return (
          <CircleMarker
            key={vesselId}
            center={[pos.lat, pos.lon]}
            radius={6}
            pathOptions={{ color: '#1976d2', fillColor: '#42a5f5', fillOpacity: 0.9, weight: 2 }}
          >
            {tooltip}
          </CircleMarker>
        );
      })}
    </>
  );
}
