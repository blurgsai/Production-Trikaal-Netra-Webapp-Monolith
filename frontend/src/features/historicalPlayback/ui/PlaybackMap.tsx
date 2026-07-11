import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import type { FeatureGroup as LeafletFeatureGroup } from "leaflet";
import { Box, Fade, Skeleton, Typography } from "@mui/material";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { PlaybackDrawStyles } from "./PlaybackDrawStyles";

interface PlaybackMapProps {
  onPolygonComplete: (geoJson: GeoJSON.Feature) => void;
  onPolygonDelete?: () => void;
  onPolygonEdit?: (geoJson: GeoJSON.Feature) => void;
  onClearRequest?: MutableRefObject<(() => void) | null>;
  onDrawPolygonRequest?: MutableRefObject<(() => void) | null>;
  hideToolbar?: boolean;
  onDrawingActive?: (active: boolean) => void;
  children?: ReactNode;
}

function MapReadyListener({ onReady }: { onReady: () => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleLoad = () => onReady();
    map.on("load", handleLoad);

    const fallback = setTimeout(() => onReady(), 3000);

    return () => {
      map.off("load", handleLoad);
      clearTimeout(fallback);
    };
  }, [map, onReady]);

  return null;
}

const PlaybackMap = memo(function PlaybackMap({
  onPolygonComplete,
  onPolygonDelete,
  onPolygonEdit,
  onClearRequest,
  onDrawPolygonRequest,
  hideToolbar,
  onDrawingActive,
  children,
}: PlaybackMapProps) {
  const featureGroupRef = useRef<LeafletFeatureGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const handleDrawStart = useCallback(
    () => onDrawingActive?.(true),
    [onDrawingActive]
  );
  const handleCreated = useCallback(
    (e: { layer: { toGeoJSON: () => GeoJSON.GeoJSON } }) => {
      const geoJson = e.layer.toGeoJSON() as GeoJSON.Feature;
      onDrawingActive?.(false);
      onPolygonComplete(geoJson);
    },
    [onDrawingActive, onPolygonComplete]
  );
  const handleDeleted = useCallback(
    (e: { layers: { toGeoJSON: () => GeoJSON.GeoJSON } }) => {
      const remaining = e.layers.toGeoJSON() as GeoJSON.FeatureCollection;
      if (remaining.features.length === 0) {
        onPolygonDelete?.();
      }
    },
    [onPolygonDelete]
  );
  const handleEdited = useCallback(
    (e: { layers: { toGeoJSON: () => GeoJSON.GeoJSON } }) => {
      const edited = e.layers.toGeoJSON() as GeoJSON.FeatureCollection;
      if (edited.features.length > 0) {
        onPolygonEdit?.(edited.features[0]);
      }
    },
    [onPolygonEdit]
  );

  useEffect(() => {
    if (!onClearRequest) return;

    onClearRequest.current = () => {
      featureGroupRef.current?.clearLayers();
    };
  }, [onClearRequest]);

  useEffect(() => {
    if (!onDrawPolygonRequest) return;

    onDrawPolygonRequest.current = () => {
      setTimeout(() => {
        const btn = document.querySelector(
          ".leaflet-draw-toolbar .leaflet-draw-draw-polygon"
        ) as HTMLAnchorElement | null;
        if (btn) {
          btn.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
        }
      }, 50);
    };
  }, [onDrawPolygonRequest]);

  useEffect(() => {
    if (!onDrawingActive) return;

    const observer = new MutationObserver(() => {
      const btn = document.querySelector(
        ".leaflet-draw-toolbar .leaflet-draw-draw-polygon"
      ) as HTMLAnchorElement | null;
      if (btn?.classList.contains("leaflet-draw-toolbar-button-enabled")) {
        onDrawingActive(true);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [onDrawingActive]);

  return (
    <Box
      className={hideToolbar ? "hide-leaflet-draw" : undefined}
      sx={{ position: "relative", width: "100%", height: "100%" }}
    >
      <MapContainer
        center={[20, 78]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        whenReady={() => setMapReady(true)}
      >
        <MapReadyListener onReady={() => setMapReady(true)} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <PlaybackDrawStyles />

        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            draw={{
              rectangle: false,
              polyline: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polygon: true,
            }}
            onDrawStart={handleDrawStart}
            onCreated={handleCreated}
            onDeleted={handleDeleted}
            onEdited={handleEdited}
          />
        </FeatureGroup>

        {children}
      </MapContainer>

      <Fade in={!mapReady} timeout={500}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 500,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            bgcolor: "background.default",
          }}
        >
          <Skeleton
            variant="rectangular"
            width="80%"
            height="60%"
            sx={{ borderRadius: 2, bgcolor: "action.hover" }}
          />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Loading map tiles…
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
});

export default PlaybackMap;
