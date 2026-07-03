import { useState } from "react";
import { Box, Typography, ButtonGroup, Button } from "@mui/material";
import { useMapEvents } from "react-leaflet";

// Coordinate Conversion Helpers
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

function CoordinateWidget() {
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [format, setFormat] = useState<FormatType>("DM");

  useMapEvents({
    mousemove: (e) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

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
        position: "absolute",
        bottom: 20,
        right: 70,
        bgcolor: "#000000bb",
        p: 1.5,
        borderRadius: 1,
        boxShadow: 3,
        minWidth: 200,
        pointerEvents: "auto",
        zIndex: 500,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Typography variant="body2" noWrap>
        Latitude: {latFormatted}
      </Typography>
      <Typography variant="body2" noWrap>
        Longitude: {lngFormatted}
      </Typography>

      <ButtonGroup
        fullWidth
        size="small"
        sx={{
          mt: 1,
          width: "100%",
          "& .MuiButton-root": {
            flex: 1,
            fontSize: "0.75rem",
            py: 0.4,
            textTransform: "none",
          },
        }}
      >
        <Button
          variant={format === "DD" ? "contained" : "outlined"}
          onClick={() => setFormat("DD")}
        >
          DD
        </Button>
        <Button
          variant={format === "DM" ? "contained" : "outlined"}
          onClick={() => setFormat("DM")}
        >
          DM
        </Button>
        <Button
          variant={format === "DMS" ? "contained" : "outlined"}
          onClick={() => setFormat("DMS")}
        >
          DMS
        </Button>
      </ButtonGroup>
    </Box>
  );
}

export default CoordinateWidget;
