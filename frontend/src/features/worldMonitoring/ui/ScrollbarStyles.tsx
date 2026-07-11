import { GlobalStyles } from "@mui/material";

import { defenseColors } from "@/shared/theme";

export function WorldMonitorScrollbarStyles() {
  return (
    <GlobalStyles
      styles={{
        ".wm-scrollable": {
          scrollbarWidth: "thin",
          scrollbarColor: `${defenseColors.text.muted} transparent`,
          "&::-webkit-scrollbar": {
            width: 8,
            height: 8,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: defenseColors.border.soft,
            borderRadius: 4,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: defenseColors.scrollbar.thumb,
            borderRadius: 4,
            "&:hover": {
              backgroundColor: defenseColors.scrollbar.thumbHover,
            },
          },
        },
      }}
    />
  );
}
