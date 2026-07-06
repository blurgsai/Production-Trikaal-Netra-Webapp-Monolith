import 'leaflet/dist/leaflet.css';
import { useEffect, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

interface FlyToCenterProps {
  center: [number, number];
  zoom: number;
}

function FlyToCenter({ center, zoom }: FlyToCenterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

interface PlaybackMapProps {
  center?: [number, number];
  zoom?: number;
  children?: ReactNode;
}

export function PlaybackMap({
  center = [25.0, 67.0],
  zoom = 7,
  children,
}: PlaybackMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FlyToCenter center={center} zoom={zoom} />
      {children}
    </MapContainer>
  );
}
