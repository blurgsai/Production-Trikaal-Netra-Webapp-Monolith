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
        bgcolor: "#1a1a2e",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        zIndex: 1000,
        flexShrink: 0,
        minHeight: 40,
      }}
    >
      {/* ── Vessel count chip ── */}
      <Chip
        icon={
          loading ? (
            <CircularProgress size={14} sx={{ color: "#8b8b9e" }} />
          ) : (
            <DirectionsBoatIcon sx={{ fontSize: 16, color: "#8b8b9e" }} />
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
              color: "#8b8b9e",
              transform: catAnchor ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
            }}
          />
        }
        size="small"
        sx={{
          bgcolor: "rgba(255,255,255,0.06)",
          color: "#e0e0e8",
          fontWeight: 500,
          fontSize: "0.8rem",
          height: 28,
          "& .MuiChip-icon": { ml: 0.75 },
          "& .MuiChip-deleteIcon": { mr: 0.5 },
          "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
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
              bgcolor: "#1a1a2e",
              border: "1px solid rgba(255,255,255,0.08)",
              p: 1.5,
              minWidth: 240,
              maxHeight: 280,
              overflowY: "auto",
              borderRadius: 1.5,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            },
          },
        }}
      >
        <Typography variant="caption" sx={{ color: "#8b8b9e", fontWeight: 600, mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Vessel Categories
        </Typography>
        {error ? (
          <Typography variant="body2" sx={{ color: "#ff6b6b" }}>
            {error}
          </Typography>
        ) : categories.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#8b8b9e" }}>
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
                "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
              }}
            >
              <Typography variant="body2" sx={{ color: "#c0c0d0" }}>
                {item.category || "Unknown"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#e0e0e8", fontWeight: 600 }}>
                {item.count.toLocaleString()}
              </Typography>
            </Box>
          ))
        )}
      </Popover>

      <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* ── Coordinates ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <MyLocationIcon sx={{ fontSize: 15, color: "#8b8b9e" }} />
        <Typography variant="body2" sx={{ color: "#8b8b9e", fontSize: "0.75rem" }}>
          Lat
        </Typography>
        <Typography variant="body2" sx={{ color: "#e0e0e8", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", minWidth: 120 }}>
          {latFormatted}
        </Typography>
        <Typography variant="body2" sx={{ color: "#8b8b9e", fontSize: "0.75rem", ml: 0.5 }}>
          Lng
        </Typography>
        <Typography variant="body2" sx={{ color: "#e0e0e8", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", minWidth: 120 }}>
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
          color: "#8b8b9e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          fontSize: "0.72rem",
          fontWeight: 600,
          gap: 0.5,
          display: "flex",
          "&:hover": { bgcolor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.2)" },
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
              bgcolor: "#1a1a2e",
              border: "1px solid rgba(255,255,255,0.08)",
              p: 0.5,
              borderRadius: 1.5,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
              bgcolor: format === opt.value ? "rgba(255,255,255,0.08)" : "transparent",
              "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
            }}
          >
            <Typography variant="body2" sx={{ color: "#e0e0e8", fontWeight: 500 }}>
              {opt.label}
            </Typography>
            {format === opt.value && (
              <Typography variant="caption" sx={{ color: "#6c9eff" }}>
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
