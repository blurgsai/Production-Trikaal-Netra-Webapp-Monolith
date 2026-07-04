import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { defenseColors } from "@/shared/theme";

interface MiniMapControlOptions {
  position?: L.ControlPosition;
  tileUrl: string;
  tileAttribution: string;
  width?: number;
  height?: number;
  zoomOffset?: number;
}

const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 130;
const DEFAULT_ZOOM_OFFSET = -4;

function MiniMapControl({
  position = "bottomright",
  tileUrl,
  tileAttribution,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  zoomOffset = DEFAULT_ZOOM_OFFSET,
}: MiniMapControlOptions) {
  const parentMap = useMap();
  const miniRef = useRef<L.Map | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!parentMap || miniRef.current) return;

    const container = L.DomUtil.create("div", "leaflet-minimap-container") as HTMLDivElement;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.border = `2px solid ${defenseColors.border.strong}`;
    container.style.borderRadius = "4px";
    container.style.boxShadow = defenseColors.shadow;
    container.style.overflow = "hidden";
    container.style.cursor = "pointer";
    container.style.backgroundColor = defenseColors.background.page;
    containerRef.current = container;

    const control = new L.Control({ position });
    control.onAdd = () => container;
    control.onRemove = () => {
      if (miniRef.current) {
        miniRef.current.remove();
        miniRef.current = null;
      }
    };
    control.addTo(parentMap);

    const miniMap = L.map(container, {
      attributionControl: false,
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      worldCopyJump: true,
    });
    miniRef.current = miniMap;

    L.tileLayer(tileUrl, { attribution: tileAttribution }).addTo(miniMap);

    const rect = L.rectangle(parentMap.getBounds(), {
      weight: 2,
      color: defenseColors.primary.main,
      fillColor: defenseColors.primary.main,
      fillOpacity: 0.15,
      interactive: false,
    }).addTo(miniMap);
    rectRef.current = rect;

    const syncMiniMap = () => {
      const parentZoom = parentMap.getZoom();
      const parentCenter = parentMap.getCenter();
      const miniZoom = Math.max(0, parentZoom + zoomOffset);

      miniMap.setView(parentCenter, miniZoom, { animate: false });
      rect.setBounds(parentMap.getBounds());
    };

    syncMiniMap();
    parentMap.on("move zoom zoomend moveend", syncMiniMap);

    const onMiniClick = (e: L.LeafletMouseEvent) => {
      parentMap.setView(e.latlng, parentMap.getZoom(), { animate: true });
    };
    miniMap.on("click", onMiniClick);

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return () => {
      parentMap.off("move zoom zoomend moveend", syncMiniMap);
      miniMap.off("click", onMiniClick);
      control.remove();
    };
  }, [parentMap, position, tileUrl, tileAttribution, width, height, zoomOffset]);

  return null;
}

export default MiniMapControl;
