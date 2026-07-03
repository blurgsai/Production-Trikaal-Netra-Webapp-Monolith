import { Polyline, CircleMarker, Popup } from "react-leaflet";
import type { TrajectoryPoint, TrajectoryConfig } from "../model/types";

interface TrajectoryLayerProps {
  trajectory: TrajectoryPoint[];
  config: TrajectoryConfig;
}

function TrajectoryLayer({ trajectory, config }: TrajectoryLayerProps) {
  if (trajectory.length === 0) return null;

  return (
    <>
      <Polyline
        positions={trajectory.map((p) => [p.lat, p.lng])}
        color={config.lineColor}
        weight={config.lineWeight}
        opacity={config.lineOpacity}
      />
      {trajectory.map((point, idx) => (
        <CircleMarker
          key={idx}
          center={[point.lat, point.lng]}
          radius={config.dotRadius}
          color={config.dotColor}
          fillColor={config.dotFillColor}
          fillOpacity={config.dotFillOpacity}
          eventHandlers={{
            click: (e) => {
              e.originalEvent.stopPropagation();
            },
          }}
        >
          <Popup>
            <div>
              <b>Timestamp:</b> {point.timestamp}
              <br />
              <b>Lat:</b> {point.lat.toFixed(4)}
              <br />
              <b>Lng:</b> {point.lng.toFixed(4)}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export default TrajectoryLayer;
