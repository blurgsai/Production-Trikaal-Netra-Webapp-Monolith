import { Chip, Stack } from "@mui/material";

import { defenseColors } from "@/shared/theme";
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
            color: defenseColors.primary.main,
            backgroundColor: defenseColors.primary.soft,
          }}
        />
      )}

      {article.sourceType && (
        <Chip
          size="small"
          label={formatSourceTypeLabel(article.sourceType)}
          sx={{
            color: defenseColors.text.muted,
            backgroundColor: defenseColors.border.soft,
          }}
        />
      )}

      {article.author && (
        <Chip
          size="small"
          label={`By ${article.author}`}
          sx={{
            color: defenseColors.text.muted,
            backgroundColor: defenseColors.border.soft,
          }}
        />
      )}

      {locations.map((loc) => (
        <Chip
          key={`${loc.name}-${loc.lat}-${loc.lng}`}
          size="small"
          label={loc.name}
          sx={{
            color: defenseColors.text.primary,
            backgroundColor: defenseColors.border.soft,
            border: `1px solid ${defenseColors.border.default}`,
          }}
        />
      ))}

      {tags.map((tag) => (
        <Chip
          key={tag}
          size="small"
          label={`# ${tag}`}
          sx={{
            color: defenseColors.status.warning,
            backgroundColor: `${defenseColors.status.warning}20`,
            border: `1px solid ${defenseColors.status.warning}47`,
          }}
        />
      ))}
    </Stack>
  );
}
