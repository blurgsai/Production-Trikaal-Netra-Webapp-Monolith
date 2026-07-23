import { useState } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

import { defenseColors } from "@/shared/theme";

import { useInsights, useInsightsTimeline } from "../hooks/useInsights";
import type { InsightsTimelineRange } from "../model/types";
import { ActivityTimelineChart } from "./ActivityTimelineChart";
import { CategoryListCard } from "./CategoryListCard";
import { InsightKpiCard } from "./InsightKpiCard";
import { TopEventTypesDonut } from "./TopEventTypesDonut";

export function InsightsPage() {
  const [timelineRange, setTimelineRange] =
    useState<InsightsTimelineRange>("1w");
  const { data, isLoading, error } = useInsights();
  const {
    data: timeline = [],
    isLoading: timelineLoading,
    isFetching: timelineFetching,
    error: timelineError,
  } = useInsightsTimeline(timelineRange);

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", flex: 1 }}>
        <CircularProgress sx={{ color: defenseColors.primary.main }} />
      </Box>
    );
  }

  const dashboard = data;

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
        <Alert severity="error">Failed to load insights dashboard.</Alert>
      )}

      {dashboard && (
        <>
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
            {dashboard.kpis.map((kpi) => (
              <InsightKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 1.5,
            }}
          >
            <TopEventTypesDonut
              shares={dashboard.eventTypeShares}
              total={dashboard.eventTypeTotal}
            />
            <ActivityTimelineChart
              timeline={timeline}
              timelineRange={timelineRange}
              onTimelineRangeChange={setTimelineRange}
              isLoading={timelineLoading}
              isFetching={timelineFetching}
              error={Boolean(timelineError)}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
                xl: "repeat(3, 1fr)",
              },
              gap: 1.5,
            }}
          >
            {dashboard.categories.map((category) => (
              <CategoryListCard key={category.id} category={category} />
            ))}
          </Box>
        </>
      )}
    </Stack>
  );
}
