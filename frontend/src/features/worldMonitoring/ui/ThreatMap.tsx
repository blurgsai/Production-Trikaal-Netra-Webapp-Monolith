import { Fragment, useEffect, useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { ThreatMapMarker, ThreatLevel } from "../model/types";
import { defenseColors } from "@/shared/theme";
import { getSeverityConfig } from "../model/mappers";

const srOnlySx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

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
  const mapStatusText = useMemo(() => {
    if (isLoading) {
      return "Threat map loading.";
    }
    if (selectedMarker) {
      return `Map highlighting ${selectedMarker.title} at ${selectedMarker.location.name}, threat level ${selectedMarker.threatLevel}.`;
    }
    if (!markers.length) {
      return "Threat map showing no markers for the current filters.";
    }
    return `Threat map showing ${markers.length} marker${markers.length === 1 ? "" : "s"}. Use the Event Explorer list for a keyboard-accessible threat list.`;
  }, [isLoading, markers.length, selectedMarker]);

  return (
    <Box
      role="region"
      aria-label="Threat map"
      aria-describedby="threat-map-status"
      sx={{
        position: "relative",
        minHeight: 540,
        borderRadius: 4,
        overflow: "hidden",
        border: `1px solid ${defenseColors.border.strong}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
      }}
    >
      <Typography
        id="threat-map-status"
        component="p"
        role="status"
        aria-live="polite"
        sx={srOnlySx}
      >
        {mapStatusText}
      </Typography>

      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            backgroundColor: defenseColors.overlay,
          }}
        />
      )}

      <MapContainer
        center={[20, 30]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
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

              <CircleMarker
                center={[marker.location.lat, marker.location.lng]}
                radius={isPrimary ? 12 : isSelected ? 10 : 8}
                pathOptions={{
                  color: isPrimary ? defenseColors.text.primary : severity.border,
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

              {isPrimary && (
                <CircleMarker
                  center={[marker.location.lat, marker.location.lng]}
                  radius={4}
                  pathOptions={{
                    color: defenseColors.text.primary,
                    fillColor: defenseColors.text.primary,
                    fillOpacity: 1,
                    weight: 1,
                  }}
                />
              )}
            </Fragment>
          );
        })}
      </MapContainer>

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
          backgroundColor: defenseColors.overlay,
          border: `1px solid ${defenseColors.border.default}`,
        }}
      >
        {SEVERITY_LEGEND.map((level) => {
          const severity = getSeverityConfig(level);
          return (
            <Stack
              key={level}
              direction="row"
              spacing={0.75}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: severity.color,
                  border: `1px solid ${severity.border}`,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: defenseColors.text.muted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {level}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
