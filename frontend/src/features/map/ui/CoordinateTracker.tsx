import { useMapEvents } from "react-leaflet";

interface CoordinateTrackerProps {
  onCoordsChange: (lat: number, lng: number) => void;
}

function CoordinateTracker({ onCoordsChange }: CoordinateTrackerProps) {
  useMapEvents({
    mousemove: (e) => {
      onCoordsChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default CoordinateTracker;
