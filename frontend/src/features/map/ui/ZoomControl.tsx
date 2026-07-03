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
        bottom: 20,
        right: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#000000bb",
        borderRadius: 2,
        boxShadow: 3,
        overflow: "hidden",
        zIndex: 1000,
        p: 1,
      }}
    >
      <IconButton
        size="small"
        onClick={zoomIn}
        sx={{
          "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>

      <Typography
        variant="body2"
        sx={{
          py: 0.5,
          fontWeight: 600,
          userSelect: "none",
        }}
      >
        {zoom}
      </Typography>

      <IconButton size="small" onClick={zoomOut}>
        <RemoveIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default ZoomControl;
