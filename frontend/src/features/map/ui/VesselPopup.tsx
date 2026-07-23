import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import SettingsIcon from "@mui/icons-material/Settings";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import type { VesselInfo, PopupFieldConfig, VesselDataUpload } from "../model/types";
import { useVesselDetails } from "../hooks/useVesselDetails";
import { useVesselImage } from "../hooks/useVesselImage";
import { useVesselData } from "../hooks/useVesselData";
import { useLloydsData } from "../hooks/useLloydsData";
import VesselDetailsDialog from "./VesselDetailsDialog";
import DatabaseRecordsDialog from "./DatabaseRecordsDialog";
import DatabaseTimeline from "./DatabaseTimeline";
import LloydsDataDialog from "./LloydsDataDialog";
import VesselFlagsDialog from "./VesselFlagsDialog";
import ThreatMatrix from "./ThreatMatrix";
import FlagIcon from "@mui/icons-material/Flag";

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

const DATE_KEYS = ["timestamp_utc", "created_at"];

function getDateFromUpload(upload: VesselDataUpload): string {
  for (const key of DATE_KEYS) {
    const val = upload.data[key];
    if (val) return String(val);
  }
  return upload.createdAt ?? "N/A";
}

function VesselPopup({ vessel, latlng, popupFields, onClose, onPopupFieldsChange }: VesselPopupProps) {
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timelineDialog, setTimelineDialog] = useState<{ dbName: string; uploads: VesselDataUpload[] } | null>(null);
  const [lloydsOpen, setLloydsOpen] = useState(false);
  const [flagsOpen, setFlagsOpen] = useState(false);

  const { details, loading } = useVesselDetails(vessel.id);
  const { image, loading: imageLoading } = useVesselImage(vessel.imo);
  const { uploads, loading: dataLoading } = useVesselData(vessel.mmsi);
  const { data: lloydsData, loading: lloydsLoading, error: lloydsError } = useLloydsData(vessel.imo);

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

  const handleFocusMode = () => {
    if (!vessel.id) return;
    const end = Math.floor(Date.now() / 1000);
    const start = end - 7 * 24 * 60 * 60;
    navigate(
      `/focus-mode?vesselId=${encodeURIComponent(vessel.id)}&start=${start}&end=${end}`,
    );
    onClose();
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
        maxHeight: "calc(70vh - 92px)",
        overflowY: "auto",
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
            <IconButton
              onClick={handleFocusMode}
              disabled={!vessel.id}
              size="small"
              aria-label="focus-mode"
              title="Focus Mode"
            >
              <CenterFocusStrongIcon />
            </IconButton>
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
        sx={{ py: 1, px: 1.5, "& .MuiCardHeader-action": { alignSelf: "center" } }}
      />
      <Divider />

      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.2, py: 1.5, px: 1.5 }}>
        {imageLoading ? (
          <Box sx={{ width: "100%", height: 120, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1, bgcolor: "action.hover" }}>
            <CircularProgress size={32} />
          </Box>
        ) : image?.imageUrl ? (
          <Box
            component="img"
            src={image.imageUrl}
            sx={{ width: "100%", height: 120, borderRadius: 1, objectFit: "cover" }}
            alt="Vessel"
          />
        ) : (
          <Box sx={{ width: "100%", height: 120, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 1, bgcolor: "action.hover", gap: 1 }}>
            <BrokenImageIcon sx={{ fontSize: 28, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">Image not found</Typography>
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
          <Typography variant="body2" display="flex" justifyContent="space-between" alignItems="center">
            <span>
              <b>MMSI:</b> {vessel.mmsi || "N/A"}
            </span>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton aria-label="lloyds-data" onClick={() => setLloydsOpen(true)} size="small" title="Lloyds Register Data">
                <DirectionsBoatIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton aria-label="flag-vessel" onClick={() => setFlagsOpen(true)} size="small" title="Flag Vessel">
                <FlagIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Typography>
        )}
      </CardContent>

      {!settingsOpen && (
        <Accordion disableGutters square elevation={0} defaultExpanded={false} sx={{ "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 40, "&.Mui-expanded": { minHeight: 40 } }}>
            <Typography variant="subtitle2" fontWeight={600}>Details</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1.5, py: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
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
          </AccordionDetails>
        </Accordion>
      )}

      {!settingsOpen && !dataLoading && uploads.length > 0 && (
        <>
          {Array.from(new Set(uploads.map((u) => u.databaseName))).map((dbName) => {
            const dbUploads = uploads
              .filter((u) => u.databaseName === dbName)
              .sort((a, b) => getDateFromUpload(b).localeCompare(getDateFromUpload(a)));
            return (
              <Accordion key={dbName} disableGutters square elevation={0} defaultExpanded={false} sx={{ "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 40, "&.Mui-expanded": { minHeight: 40 } }}>
                  <Typography variant="subtitle2" fontWeight={600}>{dbName}</Typography>
                  {dbUploads.length > 1 && (
                    <Chip label={dbUploads.length} size="small" sx={{ ml: 1, height: 18, fontSize: "0.65rem" }} />
                  )}
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.5, py: 1 }}>
                  <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
                    <DatabaseTimeline
                      databaseName={dbName}
                      uploads={dbUploads}
                      maxItems={5}
                      onShowMore={() => setTimelineDialog({ dbName, uploads: dbUploads })}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
          <Divider />
        </>
      )}

      <ThreatMatrix vesselId={vessel.id} />

      <DatabaseRecordsDialog
        open={!!timelineDialog}
        onClose={() => setTimelineDialog(null)}
        databaseName={timelineDialog?.dbName ?? ""}
        uploads={timelineDialog?.uploads ?? []}
      />

      <VesselDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        vessel={vessel}
        details={details}
        loading={loading}
      />

      <LloydsDataDialog
        open={lloydsOpen}
        onClose={() => setLloydsOpen(false)}
        imo={vessel.imo ?? ""}
        data={lloydsData}
        loading={lloydsLoading}
        error={lloydsError}
      />

      <VesselFlagsDialog
        open={flagsOpen}
        onClose={() => setFlagsOpen(false)}
        vesselId={vessel.id}
      />

    </Card>
  );
}

export default VesselPopup;
