import { Box, Paper, Stack, Typography } from "@mui/material";

import { defenseColors } from "@/shared/theme";

import type { InsightsCategory } from "../model/types";

interface CategoryListCardProps {
  category: InsightsCategory;
}

const listScrollSx = {
  maxHeight: 240,
  overflow: "auto",
  pr: 0.5,
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: defenseColors.scrollbar.thumb,
    borderRadius: 3,
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: defenseColors.scrollbar.thumbHover,
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: defenseColors.scrollbar.track,
  },
} as const;

export function CategoryListCard({ category }: CategoryListCardProps) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${defenseColors.border.default}`,
        backgroundColor: defenseColors.background.surface,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={1.5}
        spacing={1}
      >
        <Typography
          variant="subtitle1"
          sx={{ color: defenseColors.text.primary, fontWeight: 800 }}
        >
          {category.title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: defenseColors.primary.main,
            fontWeight: 700,
            backgroundColor: defenseColors.primary.soft,
            px: 1,
            py: 0.25,
            borderRadius: 1,
          }}
        >
          {category.total.toLocaleString()}
        </Typography>
      </Stack>

      <Stack spacing={1} sx={listScrollSx}>
        {category.items.map((item) => (
          <Stack
            key={item.key}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{
              py: 0.75,
              px: 1,
              borderRadius: 1,
              backgroundColor: defenseColors.background.surfaceAlt,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: defenseColors.primary.main,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                noWrap
                sx={{ color: defenseColors.text.secondary }}
              >
                {item.label}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{ color: defenseColors.text.primary, fontWeight: 700, flexShrink: 0 }}
            >
              {item.count.toLocaleString()}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
