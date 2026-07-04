import { useVesselInfoAtPoint } from "../hooks/useVesselInfoAtPoint";
import type { VesselInfo } from "../model/types";

interface VesselClickHandlerProps {
  onVesselSelect: (vessel: VesselInfo | null, latlng?: { lat: number; lng: number }) => void;
  onVesselClick?: (vessel: VesselInfo) => void;
}

function VesselClickHandler({ onVesselSelect, onVesselClick }: VesselClickHandlerProps) {
  useVesselInfoAtPoint({ onVesselSelect, onVesselClick });

  return null;
}

export default VesselClickHandler;
