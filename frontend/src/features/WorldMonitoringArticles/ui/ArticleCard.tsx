import { Box, Button, CardMedia, Chip, Stack, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { formatDateTime,worldMonitorPalette } from "@/shared/utils/worldMonitoringUtils";

import { ArticleMetadataChips } from "@/shared/ui/world-monitoring/ArticleMetadataChips";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    summary?: string;
    published?: string;
    imageUrl?: string;
    source?: string;
    sourceType?: string;
    author?: string;
    linkedEventCount: number;
    processingStatus?: string;
    tags?: string[];
    locations?: {
      name: string;
      lat?: number;
      lng?: number;
    }[];
  };
  onOpen: (id: string) => void;
}

export function ArticleCard({ article, onOpen }: ArticleCardProps) {
  const metaArticle = {
    source: article.source,
    sourceType: article.sourceType,
    author: article.author,
    locations: article.locations,
    tags: article.tags,
  };

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: `1px solid ${worldMonitorPalette.border}`,
        background:
          "linear-gradient(180deg, rgba(18,35,59,0.96), rgba(9,22,37,0.98))",
        overflow: "hidden",
      }}
    >
      {article.imageUrl && (
        <CardMedia
          component="img"
          image={article.imageUrl}
          alt={article.title}
          sx={{
            height: 180,
            objectFit: "cover",
            borderBottom: `1px solid ${worldMonitorPalette.border}`,
          }}
        />
      )}

      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
          <Chip
            size="small"
            label={`${article.linkedEventCount} linked events`}
            sx={{
              backgroundColor: "rgba(255,255,255,0.04)",
              color: worldMonitorPalette.textMuted,
            }}
          />

          {article.processingStatus && (
            <Chip
              size="small"
              label={article.processingStatus}
              sx={{
                backgroundColor: "rgba(255,255,255,0.04)",
                color: worldMonitorPalette.textMuted,
              }}
            />
          )}
        </Stack>

        <Typography
          variant="h6"
          sx={{
            color: worldMonitorPalette.text,
            fontWeight: 800,
            mb: 1,
          }}
        >
          {article.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: worldMonitorPalette.textMuted,
            mb: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {article.summary ?? "No summary available."}
        </Typography>

        {article.published && (
          <Typography
            variant="caption"
            sx={{
              color: worldMonitorPalette.textMuted,
              display: "block",
              mb: 1.5,
            }}
          >
            Published {formatDateTime(article.published)}
          </Typography>
        )}

        <ArticleMetadataChips article={metaArticle} compact />

        <Button
          onClick={() => onOpen(article.id)}
          endIcon={<OpenInNewIcon />}
          sx={{
            color: worldMonitorPalette.accent,
            p: 0,
            mt: 1.5,
          }}
        >
          View Article
        </Button>
      </Box>
    </Box>
  );
}
