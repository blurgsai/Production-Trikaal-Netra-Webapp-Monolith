import { Box } from "@mui/material";

import { HistoricalPlayback } from "@/features/historicalPlayback";

export default function HistoricalPlaybackPage() {
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <HistoricalPlayback />
    </Box>
  );
}
