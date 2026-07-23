import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

import { defenseColors } from "@/shared/theme";

import { useInsights } from "../hooks/useInsights";
import { InsightCard } from "./InsightCard";

export function InsightsPage() {
  const { data: cards, isLoading, error } = useInsights();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          flex: 1,
        }}
      >
        <CircularProgress sx={{ color: defenseColors.primary.main }} />
      </Box>
    );
  }

  return (
    <Stack
      spacing={2}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        p: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: defenseColors.text.primary, fontWeight: 700 }}
      >
        Insights
      </Typography>

      {error && (
        <Alert severity="error">Failed to load insights summary.</Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
            xl: "repeat(5, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {(cards ?? []).map((card) => (
          <InsightCard
            key={card.key}
            label={card.label}
            value={card.value}
            helper={card.helper}
          />
        ))}
      </Box>
    </Stack>
  );
}
