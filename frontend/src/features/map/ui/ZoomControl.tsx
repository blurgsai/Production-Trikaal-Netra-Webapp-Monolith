import { useState, useEffect } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useMap } from "react-leaflet";

function ZoomControl() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#000000bb",
        borderRadius: 2,
        boxShadow: 3,
        overflow: "hidden",
        zIndex: 1000,
        p: 0.5,
      }}
    >
      <IconButton
        size="small"
        onClick={zoomIn}
        sx={{
          p: 0.25,
          "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
        }}
      >
        <AddIcon sx={{ fontSize: 16 }} />
      </IconButton>

      <Typography
        variant="caption"
        sx={{
          py: 0.25,
          fontWeight: 600,
          userSelect: "none",
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        {zoom}
      </Typography>

      <IconButton size="small" onClick={zoomOut} sx={{ p: 0.25 }}>
        <RemoveIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

export default ZoomControl;
