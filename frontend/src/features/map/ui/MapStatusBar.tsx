import { useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Popover,
  Chip,
  IconButton,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useVesselCount } from "../hooks/useVesselCount";

// ── Coordinate format helpers ──────────────────────────────────────────────

function decimalToDM(decimal: number) {
  const abs = Math.abs(Number(decimal) || 0);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  return { degrees, minutes };
}

function decimalToDMS(decimal: number) {
  const abs = Math.abs(Number(decimal) || 0);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return { degrees, minutes, seconds };
}

function directionFromDecimal(decimal: number, isLat: boolean) {
  const num = Number(decimal);
  if (isNaN(num)) return "";
  if (isLat) return num >= 0 ? "N" : "S";
  return num >= 0 ? "E" : "W";
}

function formatDD(decimal: number, isLat: boolean) {
  const num = Number(decimal) || 0;
  const abs = Math.abs(num);
  const direction = directionFromDecimal(num, isLat);
  return `${abs.toFixed(6)}° ${direction}`;
}

function formatDM(decimal: number, isLat: boolean) {
  const num = Number(decimal) || 0;
  const { degrees, minutes } = decimalToDM(num);
  const direction = directionFromDecimal(num, isLat);
  return `${degrees}° ${minutes.toFixed(3)}' ${direction}`;
}

function formatDMS(decimal: number, isLat: boolean) {
  const num = Number(decimal) || 0;
  const { degrees, minutes, seconds } = decimalToDMS(num);
  const direction = directionFromDecimal(num, isLat);
  return `${degrees}° ${minutes}' ${seconds.toFixed(1)}" ${direction}`;
}

type FormatType = "DD" | "DM" | "DMS";

const FORMAT_OPTIONS: { label: string; value: FormatType }[] = [
  { label: "DD", value: "DD" },
  { label: "DM", value: "DM" },
  { label: "DMS", value: "DMS" },
];

// ── Status bar ─────────────────────────────────────────────────────────────

interface MapStatusBarProps {
  vesselCqlFilter?: string;
  coords: { lat: number; lng: number };
}

function MapStatusBar({ vesselCqlFilter, coords }: MapStatusBarProps) {
  const theme = useTheme();
  const { total, categories, loading, error } = useVesselCount(vesselCqlFilter);
  const [format, setFormat] = useState<FormatType>("DM");
  const [catAnchor, setCatAnchor] = useState<HTMLElement | null>(null);
  const [fmtAnchor, setFmtAnchor] = useState<HTMLElement | null>(null);

  const latFormatted =
    format === "DD"
      ? formatDD(coords.lat, true)
      : format === "DM"
        ? formatDM(coords.lat, true)
        : formatDMS(coords.lat, true);

  const lngFormatted =
    format === "DD"
      ? formatDD(coords.lng, false)
      : format === "DM"
        ? formatDM(coords.lng, false)
        : formatDMS(coords.lng, false);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 0.5,
        bgcolor: theme.palette.background.elevated,
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: 1000,
        flexShrink: 0,
        minHeight: 40,
      }}
    >
      {/* ── Vessel count chip ── */}
      <Chip
        icon={
          loading ? (
            <CircularProgress size={14} sx={{ color: theme.palette.text.secondary }} />
          ) : (
            <DirectionsBoatIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          )
        }
        label={
          loading
            ? "Fetching vessels..."
            : `${total.toLocaleString()} vessels`
        }
        onClick={(e) => {
          e.stopPropagation();
          if (!loading) setCatAnchor(e.currentTarget);
        }}
        onDelete={loading ? undefined : (e) => {
          e.stopPropagation();
          setCatAnchor(e.currentTarget);
        }}
        deleteIcon={
          <KeyboardArrowDownIcon
            sx={{
              fontSize: 18,
              color: theme.palette.text.secondary,
              transform: catAnchor ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
            }}
          />
        }
        size="small"
        sx={{
          bgcolor: theme.palette.background.surface,
          color: theme.palette.text.primary,
          fontWeight: 500,
          fontSize: "0.8rem",
          height: 28,
          border: `1px solid ${theme.palette.divider}`,
          "& .MuiChip-icon": { ml: 0.75, color: theme.palette.primary.main },
          "& .MuiChip-deleteIcon": { mr: 0.5, color: theme.palette.text.secondary },
          "&:hover": { bgcolor: theme.palette.background.surfaceAlt },
        }}
      />

      {/* Vessel categories popover */}
      <Popover
        open={Boolean(catAnchor)}
        anchorEl={catAnchor}
        onClose={() => setCatAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: theme.palette.background.surfaceAlt,
              border: `1px solid ${theme.palette.divider}`,
              p: 1.5,
              minWidth: 240,
              maxHeight: 280,
              overflowY: "auto",
              borderRadius: 1.5,
              boxShadow: theme.shadows[8],
            },
          },
        }}
      >
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Vessel Categories
        </Typography>
        {error ? (
          <Typography variant="body2" sx={{ color: theme.palette.error.main }}>
            {error}
          </Typography>
        ) : categories.length === 0 ? (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            No categories found
          </Typography>
        ) : (
          categories.map((item) => (
            <Box
              key={item.category}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 3,
                py: 0.6,
                px: 1,
                borderRadius: 1,
                "&:hover": { bgcolor: theme.palette.background.hover },
              }}
            >
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {item.category || "Unknown"}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                {item.count.toLocaleString()}
              </Typography>
            </Box>
          ))
        )}
      </Popover>

      <Divider orientation="vertical" flexItem sx={{ borderColor: alpha(theme.palette.text.primary, 0.08) }} />

      {/* ── Coordinates ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <MyLocationIcon sx={{ fontSize: 15, color: theme.palette.text.secondary }} />
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}>
          Lat
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.primary, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", minWidth: 120 }}>
          {latFormatted}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem", ml: 0.5 }}>
          Lng
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.primary, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", minWidth: 120 }}>
          {lngFormatted}
        </Typography>
      </Box>

      {/* Format selector */}
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setFmtAnchor(e.currentTarget);
        }}
        sx={{
          color: theme.palette.text.secondary,
          bgcolor: theme.palette.background.surface,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          fontSize: "0.72rem",
          fontWeight: 600,
          gap: 0.5,
          display: "flex",
          "&:hover": { bgcolor: theme.palette.background.surfaceAlt, borderColor: alpha(theme.palette.text.primary, 0.2) },
        }}
      >
        {format}
        <KeyboardArrowDownIcon
          sx={{
            fontSize: 14,
            transform: fmtAnchor ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        />
      </IconButton>

      <Popover
        open={Boolean(fmtAnchor)}
        anchorEl={fmtAnchor}
        onClose={() => setFmtAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: theme.palette.background.surfaceAlt,
              border: `1px solid ${theme.palette.divider}`,
              p: 0.5,
              borderRadius: 1.5,
              boxShadow: theme.shadows[8],
            },
          },
        }}
      >
        {FORMAT_OPTIONS.map((opt) => (
          <Box
            key={opt.value}
            onClick={() => {
              setFormat(opt.value);
              setFmtAnchor(null);
            }}
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              minWidth: 140,
              bgcolor: format === opt.value ? theme.palette.background.active : "transparent",
              "&:hover": { bgcolor: theme.palette.background.hover },
            }}
          >
            <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
              {opt.label}
            </Typography>
            {format === opt.value && (
              <Typography variant="caption" sx={{ color: theme.palette.primary.main }}>
                ●
              </Typography>
            )}
          </Box>
        ))}
      </Popover>
    </Box>
  );
}

export default MapStatusBar;
