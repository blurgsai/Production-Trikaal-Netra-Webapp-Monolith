import { CircleMarker, Tooltip } from 'react-leaflet';
import type { VesselPosition } from '../model/types';

interface VesselMarkersProps {
  positions: Record<string, VesselPosition>;
}

export function VesselMarkers({ positions }: VesselMarkersProps) {
  return (
    <>
      {Object.entries(positions).map(([vesselId, pos]) => (
        <CircleMarker
          key={vesselId}
          center={[pos.lat, pos.lon]}
          radius={6}
          pathOptions={{ color: '#1976d2', fillColor: '#42a5f5', fillOpacity: 0.9, weight: 2 }}
        >
          <Tooltip>
            <strong>{vesselId}</strong>
            {pos.speedMps != null && (
              <>
                <br />
                Speed: {(pos.speedMps * 1.94384).toFixed(1)} kn
              </>
            )}
            {pos.course != null && (
              <>
                <br />
                Course: {pos.course}°
              </>
            )}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
