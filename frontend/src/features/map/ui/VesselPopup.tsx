import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import type { VesselInfo, PopupFieldConfig } from "../model/types";
import { useVesselDetails } from "../hooks/useVesselDetails";
import { useVesselImage } from "../hooks/useVesselImage";
import VesselDetailsDialog from "./VesselDetailsDialog";

interface VesselPopupProps {
  vessel: VesselInfo;
  latlng: { lat: number; lng: number };
  popupFields: PopupFieldConfig;
  onClose: () => void;
  onPopupFieldsChange?: (fields: PopupFieldConfig) => void;
}

const FIELD_LABELS: Record<string, string> = {
  mmsi: "MMSI",
  imo: "IMO",
  vessel_type: "Vessel Type",
  vessel_id: "Vessel Id",
  position: "Position",
  speed: "Speed",
  heading: "Heading",
  name: "Name",
  flag: "Flag",
  length: "Length",
  width: "Width",
  gross_tonnage: "Gross Tonnage",
};

function formatLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFieldValue(field: string, vessel: VesselInfo, latlng: { lat: number; lng: number }, details?: { vesselType: string; vesselName: string; flag: string; length?: number; width?: number; grossTonnage?: number }, loading?: boolean): string {
  const raw = vessel.rawProperties;
  switch (field) {
    case "mmsi":
      return vessel.mmsi || "N/A";
    case "imo":
      return vessel.imo || "N/A";
    case "vessel_type":
      return loading ? "…" : details?.vesselType || "Unknown";
    case "vessel_id":
      return vessel.id || "N/A";
    case "position":
      return `${latlng.lat.toFixed(4)}°, ${latlng.lng.toFixed(4)}°`;
    case "speed": {
      const s = vessel.speedCurrentConsensusValue;
      return s || s === 0 ? `${s.toFixed(1)} knots` : "N/A";
    }
    case "heading": {
      const h = vessel.headingCurrentConsensusValue;
      return h || h === 0 ? `${h.toFixed(1)}°` : "N/A";
    }
    case "name":
      return vessel.name || details?.vesselName || "N/A";
    case "flag":
      return loading ? "…" : details?.flag || "N/A";
    case "length":
      return details?.length?.toString() || "N/A";
    case "width":
      return details?.width?.toString() || "N/A";
    case "gross_tonnage":
      return details?.grossTonnage?.toString() || "N/A";
    default: {
      const val = raw[field];
      if (val == null) return "N/A";
      return String(val);
    }
  }
}

function VesselPopup({ vessel, latlng, popupFields, onClose, onPopupFieldsChange }: VesselPopupProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { details, loading } = useVesselDetails(vessel.id);
  const { image, loading: imageLoading } = useVesselImage(vessel.imo);

  const availableFields = useMemo(() => {
    const rawKeys = Object.keys(vessel.rawProperties).filter(
      (k) => k !== "geom" && k !== "geometry" && k !== "the_geom"
    );
    const allFields = Array.from(new Set([...rawKeys, ...Object.keys(FIELD_LABELS)]));
    return allFields.sort();
  }, [vessel.rawProperties]);

  const toggleField = (field: string) => {
    if (!onPopupFieldsChange) return;
    const isEnabled = popupFields.enabledFields.includes(field);
    const newFields = isEnabled
      ? popupFields.enabledFields.filter((f) => f !== field)
      : [...popupFields.enabledFields, field];
    onPopupFieldsChange({ enabledFields: newFields });
  };

  return (
    <Card
      sx={{
        position: "absolute",
        top: 76,
        left: 16,
        zIndex: 1000,
        boxShadow: 6,
        borderRadius: 2,
        bgcolor: "background.paper",
        width: 380,
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" fontWeight={600}>
            {vessel.name || details?.vesselName || "Unknown Vessel"}
          </Typography>
        }
        action={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {onPopupFieldsChange && (
              <IconButton
                onClick={() => setSettingsOpen((s) => !s)}
                size="small"
                aria-label="popup-settings"
                color={settingsOpen ? "primary" : "default"}
              >
                <SettingsIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose} size="small" aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        }
        sx={{ py: 1, "& .MuiCardHeader-action": { alignSelf: "center" } }}
      />
      <Divider />

      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
        {imageLoading ? (
          <Box sx={{ width: "100%", height: 150, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1, bgcolor: "grey.100" }}>
            <CircularProgress size={32} />
          </Box>
        ) : image?.imageUrl ? (
          <Box
            component="img"
            src={image.imageUrl}
            sx={{ width: "100%", height: 150, borderRadius: 1, objectFit: "cover" }}
            alt="Vessel"
          />
        ) : (
          <Box sx={{ width: "100%", height: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 1, bgcolor: "grey.300", gap: 1 }}>
            <BrokenImageIcon sx={{ fontSize: 40, color: "grey.700" }} />
            <Typography variant="body2" color="grey.700">Image not found</Typography>
          </Box>
        )}

        {settingsOpen ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 200, overflowY: "auto" }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5 }}>
              Select fields to display
            </Typography>
            {availableFields.map((field) => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    size="small"
                    checked={popupFields.enabledFields.includes(field)}
                    onChange={() => toggleField(field)}
                  />
                }
                label={<Typography variant="body2">{formatLabel(field)}</Typography>}
              />
            ))}
            <Button size="small" onClick={() => setSettingsOpen(false)} sx={{ alignSelf: "flex-end", mt: 0.5 }}>
              Done
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="body2" display="flex" justifyContent="space-between" alignItems="end">
              <span>
                <b>MMSI:</b> {vessel.mmsi || "N/A"}
              </span>
              <IconButton aria-label="vessel-info" onClick={() => setDetailsOpen(true)}>
                <InfoOutlinedIcon sx={{ fontSize: 28 }} />
              </IconButton>
            </Typography>

            {popupFields.enabledFields
              .filter((f) => f !== "mmsi")
              .map((field) => (
                <Typography key={field} variant="body2">
                  <b>{formatLabel(field)}:</b>{" "}
                  {loading && ["vessel_type", "flag", "name"].includes(field) ? (
                    <CircularProgress size={14} />
                  ) : (
                    getFieldValue(field, vessel, latlng, details ?? undefined, loading)
                  )}
                </Typography>
              ))}
          </>
        )}
      </CardContent>

      <VesselDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        vessel={vessel}
        details={details}
        loading={loading}
      />

    </Card>
  );
}

export default VesselPopup;
