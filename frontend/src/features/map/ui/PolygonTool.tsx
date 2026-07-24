import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { useMap } from "react-leaflet";
import { Paper, Button } from "@mui/material";
import { defenseColors } from "@/shared/theme";
import { generateUUID } from "@/shared/utils/uuid";
import type { Polygon } from "../model/types";

interface PolygonToolProps {
  enabled: boolean;
  polygons: Polygon[];
  onChange: (polygons: Polygon[]) => void;
  onDrawComplete?: () => void;
}

function extractPoints(latlngs: L.LatLng[] | L.LatLng[][]): { lat: number; lng: number }[] {
  if (latlngs.length === 0) return [];
  const ring = Array.isArray(latlngs[0])
    ? (latlngs as L.LatLng[][])[0]
    : (latlngs as L.LatLng[]);
  return ring.map((latlng) => ({ lat: latlng.lat, lng: latlng.lng }));
}

function PolygonTool({ enabled, polygons, onChange, onDrawComplete }: PolygonToolProps) {
  const map = useMap();
  const polygonsRef = useRef(polygons);
  const onChangeRef = useRef(onChange);
  const onDrawCompleteRef = useRef(onDrawComplete);

  polygonsRef.current = polygons;
  onChangeRef.current = onChange;
  onDrawCompleteRef.current = onDrawComplete;

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    polygonId: string;
  } | null>(null);

  const handleDeletePolygon = () => {
    if (contextMenu) {
      const updatedPolygons = polygonsRef.current.filter(
        (p) => p.id !== contextMenu.polygonId
      );
      onChangeRef.current(updatedPolygons);
    }
    setContextMenu(null);
  };

  useEffect(() => {
    if (!contextMenu) return undefined;

    const handleClickOutside = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  useEffect(() => {
    polygonsRef.current = polygons;
    if (!map) return undefined;

    const drawMap = map as unknown as L.DrawMap;
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const polygonLayerMap = new Map<string, L.Polygon>();

    polygonsRef.current.forEach((polygon) => {
      const latlngs = polygon.points.map((point) => [point.lat, point.lng]);
      const layer = L.polygon(latlngs as L.LatLngExpression[], {
        color: defenseColors.primary.main,
        weight: 2,
        fillOpacity: 0.15,
        bubblingMouseEvents: false,
      }).addTo(drawnItems);
      
      polygonLayerMap.set(polygon.id, layer);
      
      // Add right-click context menu to delete polygon
      layer.on("contextmenu", (e: L.LeafletMouseEvent) => {
        console.log("🖱️ Polygon contextmenu event fired", polygon.id, e);
        const mouseEvent = e.originalEvent as MouseEvent;
        if (mouseEvent) {
          mouseEvent.preventDefault();
          mouseEvent.stopPropagation();
        }
        
        setContextMenu({
          mouseX: mouseEvent.clientX + 2,
          mouseY: mouseEvent.clientY + 2,
          polygonId: polygon.id,
        });
      });
    });

    if (!enabled) {
      return () => {
        if (map.hasLayer(drawnItems)) {
          map.removeLayer(drawnItems);
        }
      };
    }

    let drawControl: L.Draw.Polygon | null = null;

    const handlePolygonCreated = (e: L.DrawEvents.Created) => {
      const layer = e.layer as L.Polygon;
      const points = extractPoints(layer.getLatLngs() as L.LatLng[] | L.LatLng[][]);
      if (points.length < 3) return;

      const newPolygon: Polygon = {
        id: generateUUID(),
        points,
      };

      onChangeRef.current([...polygonsRef.current, newPolygon]);
      onDrawCompleteRef.current?.();
    };

    drawControl = new L.Draw.Polygon(drawMap, {
      allowIntersection: false,
      repeatMode: true,
      shapeOptions: {
        color: defenseColors.primary.main,
        weight: 2,
        fillOpacity: 0.15,
      },
    });

    drawMap.on(
      L.Draw.Event.CREATED,
      handlePolygonCreated as unknown as L.LeafletEventHandlerFn
    );
    drawControl.enable();

    return () => {
      drawMap.off(
        L.Draw.Event.CREATED,
        handlePolygonCreated as unknown as L.LeafletEventHandlerFn
      );
      if (drawControl) {
        try {
          drawControl.disable();
        } catch {
          /* already disabled */
        }
      }
      if (map.hasLayer(drawnItems)) {
        map.removeLayer(drawnItems);
      }
    };
  }, [enabled, map, polygons]);

  if (!contextMenu) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: contextMenu.mouseY,
        left: contextMenu.mouseX,
        zIndex: 10000,
        minWidth: 120,
        padding: 4,
      }}
    >
      <Button
        fullWidth
        size="small"
        color="error"
        onClick={handleDeletePolygon}
        style={{ justifyContent: "flex-start" }}
      >
        Delete
      </Button>
    </Paper>
  );
}

export default PolygonTool;
