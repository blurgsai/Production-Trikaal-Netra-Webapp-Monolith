import { GlobalStyles } from "@mui/material";

import { worldMonitorPalette } from "../model/types";

export function WorldMonitorScrollbarStyles() {
  return (
    <GlobalStyles
      styles={{
        ".wm-scrollable": {
          scrollbarWidth: "thin",
          scrollbarColor: `${worldMonitorPalette.textMuted} transparent`,
          "&::-webkit-scrollbar": {
            width: 8,
            height: 8,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(255,255,255,0.04)",
            borderRadius: 4,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255,255,255,0.25)",
            borderRadius: 4,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.35)",
            },
          },
        },
      }}
    />
  );
}
