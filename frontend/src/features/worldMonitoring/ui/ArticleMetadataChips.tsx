import { Chip, Stack } from "@mui/material";

import { worldMonitorPalette } from "../model/types";
import { formatSourceTypeLabel } from "../model/mappers";

interface ArticleMetadata {
  source?: string;
  sourceType?: string;
  author?: string;
  locations?: {
    name: string;
    lat?: number;
    lng?: number;
  }[];
  tags?: string[];
}

interface ArticleMetadataChipsProps {
  article: ArticleMetadata;
  locationLimit?: number;
  tagLimit?: number;
  mt?: number;
  compact?: boolean;
}

export function ArticleMetadataChips({
  article,
  locationLimit = 5,
  tagLimit = 6,
  mt,
}: ArticleMetadataChipsProps) {
  const locations = (article.locations ?? []).slice(0, locationLimit);
  const tags = (article.tags ?? []).slice(0, tagLimit);

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={mt}>
      {article.source && (
        <Chip
          size="small"
          label={article.source}
          sx={{
            color: worldMonitorPalette.accent,
            backgroundColor: worldMonitorPalette.accentSoft,
          }}
        />
      )}

      {article.sourceType && (
        <Chip
          size="small"
          label={formatSourceTypeLabel(article.sourceType)}
          sx={{
            color: worldMonitorPalette.textMuted,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />
      )}

      {article.author && (
        <Chip
          size="small"
          label={`By ${article.author}`}
          sx={{
            color: worldMonitorPalette.textMuted,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />
      )}

      {locations.map((loc) => (
        <Chip
          key={`${loc.name}-${loc.lat}-${loc.lng}`}
          size="small"
          label={loc.name}
          sx={{
            color: worldMonitorPalette.text,
            backgroundColor: "rgba(255,255,255,0.04)",
            border: `1px solid ${worldMonitorPalette.border}`,
          }}
        />
      ))}

      {tags.map((tag) => (
        <Chip
          key={tag}
          size="small"
          label={`# ${tag}`}
          sx={{
            color: "#ffb36d",
            backgroundColor: "rgba(255,179,109,0.12)",
            border: "1px solid rgba(255,179,109,0.28)",
          }}
        />
      ))}
    </Stack>
  );
}
