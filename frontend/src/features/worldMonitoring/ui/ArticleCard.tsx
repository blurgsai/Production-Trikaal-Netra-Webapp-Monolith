import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { defenseColors } from "@/shared/theme";
import { formatDateTime } from "../model/mappers";

import { ArticleMetadataChips } from "./ArticleMetadataChips";

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

  const ariaParts = [`View article: ${article.title}`];
  if (article.source) ariaParts.push(`Source ${article.source}`);
  if (article.published) {
    ariaParts.push(`Published ${formatDateTime(article.published)}`);
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${defenseColors.border.default}`,
        background: `linear-gradient(180deg, ${defenseColors.background.surfaceAlt}, ${defenseColors.background.surface})`,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <CardActionArea
        onClick={() => onOpen(article.id)}
        aria-label={ariaParts.join(". ")}
        sx={{
          height: "100%",
          alignItems: "stretch",
          "&:focus-visible": {
            outline: `2px solid ${defenseColors.primary.main}`,
            outlineOffset: 2,
          },
        }}
      >
        {article.imageUrl && (
          <CardMedia
            component="img"
            image={article.imageUrl}
            alt=""
            sx={{
              height: 180,
              objectFit: "cover",
              borderBottom: `1px solid ${defenseColors.border.default}`,
            }}
          />
        )}

        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
            <Chip
              size="small"
              label={`${article.linkedEventCount} linked events`}
              sx={{
                backgroundColor: defenseColors.border.soft,
                color: defenseColors.text.muted,
              }}
            />

            {article.processingStatus && (
              <Chip
                size="small"
                label={article.processingStatus}
                sx={{
                  backgroundColor: defenseColors.border.soft,
                  color: defenseColors.text.muted,
                }}
              />
            )}
          </Stack>

          <Typography
            variant="h6"
            sx={{
              color: defenseColors.text.primary,
              fontWeight: 800,
              mb: 1,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {article.title}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: defenseColors.text.muted,
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
                color: defenseColors.text.muted,
                display: "block",
                mb: 1.5,
              }}
            >
              Published {formatDateTime(article.published)}
            </Typography>
          )}

          <ArticleMetadataChips article={metaArticle} compact />

          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              color: defenseColors.primary.main,
              mt: 1.5,
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
            aria-hidden
          >
            <Typography
              component="span"
              sx={{ color: "inherit", fontWeight: 600, fontSize: "inherit" }}
            >
              View Article
            </Typography>
            <OpenInNewIcon sx={{ fontSize: 18 }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
