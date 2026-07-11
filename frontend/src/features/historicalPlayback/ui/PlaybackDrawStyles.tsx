import { GlobalStyles } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";

export function PlaybackDrawStyles() {
  const theme = useTheme();

  return (
    <GlobalStyles
      styles={{
        ".leaflet-draw-toolbar": {
          background: `${alpha(theme.palette.background.paper, 0.95)} !important`,
          borderRadius: "10px !important",
          padding: "4px !important",
          boxShadow: theme.shadows[6],
          border: `1px solid ${alpha(theme.palette.divider, 0.6)} !important`,
          marginBottom: "0 !important",
          display: "flex !important",
          flexDirection: "column !important",
          gap: "2px !important",
        },
        ".leaflet-draw-toolbar-top": {
          borderRadius: "10px 10px 0 0 !important",
          marginBottom: "0 !important",
        },
        ".leaflet-draw-section:not(:first-of-type) .leaflet-draw-toolbar": {
          borderRadius: "0 0 10px 10px !important",
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)} !important`,
          marginTop: "0 !important",
        },
        ".leaflet-draw-section": {
          marginBottom: "0 !important",
        },
        ".leaflet-draw-toolbar a": {
          border: "none !important",
          backgroundColor: "transparent !important",
          color: `${theme.palette.primary.contrastText} !important`,
          width: "32px !important",
          height: "32px !important",
          margin: "0 !important",
          borderRadius: "6px !important",
          display: "flex !important",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          opacity: 0.95,
          filter: "brightness(4) contrast(1.5) !important",
        },
        ".leaflet-draw-toolbar a:hover": {
          backgroundColor: `${alpha(theme.palette.primary.main, 0.18)} !important`,
          color: `${theme.palette.primary.main} !important`,
          opacity: 1,
          filter: "brightness(4) contrast(1.5) !important",
        },
        ".leaflet-draw-toolbar a.leaflet-draw-toolbar-button-enabled": {
          backgroundColor: `${alpha(theme.palette.common.white, 0.15)} !important`,
          color: `${theme.palette.common.white} !important`,
          opacity: 1,
          boxShadow: `0 0 0 1px ${alpha(theme.palette.common.white, 0.25)} inset`,
          filter: "brightness(4) contrast(1.5) !important",
        },
        ".leaflet-top.leaflet-right": {
          marginTop: "12px",
          marginRight: "12px",
        },
        ".leaflet-top.leaflet-left .leaflet-control-zoom": {
          background: `${alpha(theme.palette.background.paper, 0.95)} !important`,
          borderRadius: "10px !important",
          border: `1px solid ${alpha(theme.palette.divider, 0.6)} !important`,
          boxShadow: theme.shadows[6],
          overflow: "hidden",
        },
        ".leaflet-control-zoom a": {
          backgroundColor: "transparent !important",
          color: `${theme.palette.text.primary} !important`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)} !important`,
          transition: "all 0.15s ease",
        },
        ".leaflet-control-zoom a:hover": {
          backgroundColor: `${alpha(theme.palette.primary.main, 0.18)} !important`,
          color: `${theme.palette.primary.main} !important`,
        },
        ".leaflet-control-zoom a:last-child": {
          borderBottom: "none !important",
        },
        ".leaflet-control-attribution": {
          background: `${alpha(theme.palette.background.paper, 0.85)} !important`,
          borderRadius: "8px 0 0 0 !important",
          padding: "4px 8px !important",
          color: `${theme.palette.text.secondary} !important`,
          fontSize: "0.65rem !important",
        },
        ".leaflet-control-attribution a": {
          color: `${theme.palette.text.secondary} !important`,
        },
        ".hide-leaflet-draw .leaflet-draw": {
          display: "none !important",
        },
        ".leaflet-draw-actions": {
          display: "none !important",
        },
      }}
    />
  );
}
