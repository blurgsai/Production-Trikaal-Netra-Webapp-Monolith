import { useEffect } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { useMap } from "react-leaflet";
import { distanceToNm, formatNmLabel } from "../model/measure";

interface MeasureToolProps {
  enabled: boolean;
}

function MeasureTool({ enabled }: MeasureToolProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !enabled) return undefined;

    let drawControl: L.Draw.Polyline | null = null;
    const drawnItems = new L.FeatureGroup();
    const labelLayer = new L.FeatureGroup();
    map.addLayer(drawnItems);
    map.addLayer(labelLayer);

    const drawMap = map as unknown as L.DrawMap;

    const cleanup = () => {
      drawMap.off(L.Draw.Event.CREATED, handleLineCreated as unknown as L.LeafletEventHandlerFn);
      if (drawControl) {
        try {
          drawControl.disable();
        } catch {
          /* already disabled */
        }
      }
      if (drawMap.hasLayer(drawnItems)) {
        drawMap.removeLayer(drawnItems);
      }
      if (drawMap.hasLayer(labelLayer)) {
        drawMap.removeLayer(labelLayer);
      }
    };

    const attachLabel = (coords: L.LatLng[], distanceNM: number) => {
      const labelLatLng = coords[Math.floor(coords.length / 2)] || coords[0];
      L.marker(labelLatLng, {
        icon: new L.DivIcon({
          className: "measure-distance-label",
          html: formatNmLabel(distanceNM),
          iconAnchor: [0, -10],
        }),
        interactive: false,
      }).addTo(labelLayer);
    };

    const handleLineCreated = (e: L.DrawEvents.Created) => {
      const layer = e.layer as L.Polyline;
      drawnItems.addLayer(layer);

      const rawLatLngs = layer.getLatLngs?.() || [];
      const coords =
        Array.isArray(rawLatLngs?.[0]) && Array.isArray((rawLatLngs as unknown as L.LatLng[][])[0])
          ? (rawLatLngs as unknown as L.LatLng[][])[0]
          : (rawLatLngs as L.LatLng[]);

      const distanceNM = distanceToNm(coords, drawMap);
      attachLabel(coords, distanceNM);
      drawControl?.enable();
    };

    drawControl = new L.Draw.Polyline(drawMap, {
      allowIntersection: false,
      showLength: true,
      maxPoints: 2,
      repeatMode: true,
      shapeOptions: { color: "#0ba5ff", weight: 3, dashArray: "6,4" },
    });
    drawMap.on(L.Draw.Event.CREATED, handleLineCreated as unknown as L.LeafletEventHandlerFn);
    drawControl.enable();

    return cleanup;
  }, [enabled, map]);

  return null;
}

export default MeasureTool;
