import { Fragment, useEffect } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { ThreatMapMarker,ThreatLevel } from "../model/types";
import {
  getSeverityConfig,
  worldMonitorPalette,
} from "@/shared/utils/worldMonitoringUtils";

// ── Viewport controller

interface ThreatMapViewportProps {
  markers: ThreatMapMarker[];
  selectedMarker: ThreatMapMarker | null;
}

function ThreatMapViewport({
  markers,
  selectedMarker,
}: ThreatMapViewportProps) {
  const map = useMap();

  useEffect(() => {
    if (selectedMarker) {
      map.flyTo([selectedMarker.location.lat, selectedMarker.location.lng], 5, {
        duration: 1.1,
      });
      return;
    }

    if (!markers.length) {
      map.setView([20, 30], 2);
      return;
    }

    const bounds = markers.map(
      (m) => [m.location.lat, m.location.lng] as [number, number],
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 4 });
  }, [map, markers, selectedMarker]);

  return null;
}

// ── Public interface

export interface ThreatMapProps {
  markers: ThreatMapMarker[];
  selectedEventId: string | null;
  selectedMarker: ThreatMapMarker | null;
  isLoading: boolean;
  onMarkerClick: (eventId: string, marker: ThreatMapMarker) => void;
}

const SEVERITY_LEGEND: ThreatLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function ThreatMap({
  markers,
  selectedEventId,
  selectedMarker,
  isLoading,
  onMarkerClick,
}: ThreatMapProps) {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: 540,
        borderRadius: 4,
        overflow: "hidden",
        border: `1px solid ${worldMonitorPalette.borderStrong}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
      }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(7,17,31,0.55)",
          }}
        />
      )}

      <MapContainer
        center={[20, 30]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        <ThreatMapViewport markers={markers} selectedMarker={selectedMarker} />

        {markers.map((marker) => {
          const severity = getSeverityConfig(marker.threatLevel);
          const isSelected = marker.eventId === selectedEventId;
          const isPrimary = selectedMarker?.markerId === marker.markerId;

          return (
            <Fragment key={marker.markerId}>
              {/* Halo ring for selected markers */}
              {isSelected && (
                <CircleMarker
                  center={[marker.location.lat, marker.location.lng]}
                  radius={isPrimary ? 20 : 16}
                  pathOptions={{
                    color: severity.color,
                    fillColor: severity.color,
                    fillOpacity: 0.08,
                    weight: 2,
                    opacity: 0.9,
                  }}
                />
              )}

              {/* Main dot */}
              <CircleMarker
                center={[marker.location.lat, marker.location.lng]}
                radius={isPrimary ? 12 : isSelected ? 10 : 8}
                pathOptions={{
                  color: isPrimary ? "#ffffff" : severity.border,
                  fillColor: severity.color,
                  fillOpacity: selectedEventId
                    ? isSelected
                      ? 0.92
                      : 0.35
                    : 0.7,
                  weight: isPrimary ? 4 : isSelected ? 3 : 2,
                  opacity: selectedEventId && !isSelected ? 0.45 : 1,
                }}
                eventHandlers={{
                  click: () => onMarkerClick(marker.eventId, marker),
                }}
              >
                <Tooltip permanent={isPrimary} direction="top" offset={[0, -8]}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {marker.title}
                    </Typography>
                    <Typography variant="caption">
                      {marker.location.name} | {marker.threatLevel}
                    </Typography>
                  </Box>
                </Tooltip>
              </CircleMarker>

              {/* Centre pip for primary selected */}
              {isPrimary && (
                <CircleMarker
                  center={[marker.location.lat, marker.location.lng]}
                  radius={4}
                  pathOptions={{
                    color: "#ffffff",
                    fillColor: "#ffffff",
                    fillOpacity: 1,
                    weight: 1,
                  }}
                />
              )}
            </Fragment>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          left: 16,
          bottom: 16,
          zIndex: 500,
          p: 1,
          borderRadius: 999,
          backgroundColor: "rgba(7,17,31,0.84)",
          border: `1px solid ${worldMonitorPalette.border}`,
        }}
      >
        {SEVERITY_LEGEND.map((level) => {
          const severity = getSeverityConfig(level);
          return (
            <Chip
              key={level}
              size="small"
              label={level}
              sx={{
                color: severity.color,
                backgroundColor: severity.bg,
                border: `1px solid ${severity.border}`,
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
