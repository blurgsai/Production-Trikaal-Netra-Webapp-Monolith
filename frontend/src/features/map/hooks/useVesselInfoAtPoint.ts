import { useCallback } from "react";
import { useMapEvents } from "react-leaflet";
import L from "leaflet";
import { fetchVesselInfo } from "../api/vesselInfoApi";
import { mapRawVesselToInfo } from "../model/mappers";
import type { VesselInfo } from "../model/types";

interface UseVesselInfoAtPointOptions {
  onVesselSelect: (vessel: VesselInfo | null, latlng?: { lat: number; lng: number }) => void;
  onVesselClick?: (vessel: VesselInfo) => void;
}

export function useVesselInfoAtPoint({ onVesselSelect, onVesselClick }: UseVesselInfoAtPointOptions) {
  const handleClick = useCallback(
    async (e: L.LeafletMouseEvent) => {
      const map = e.target as L.Map;
      const latlng = e.latlng;
      const point = map.latLngToContainerPoint(latlng);
      const size = map.getSize();
      const bounds = map.getBounds();

      try {
        const raw = await fetchVesselInfo(latlng, point, size, bounds);
        const vesselInfo = raw ? mapRawVesselToInfo(raw) : null;
        onVesselSelect(vesselInfo, { lat: latlng.lat, lng: latlng.lng });
        if (vesselInfo && onVesselClick) {
          onVesselClick(vesselInfo);
        }
      } catch {
        onVesselSelect(null);
      }
    },
    [onVesselSelect, onVesselClick]
  );

  useMapEvents({
    click: handleClick,
  });
}
