import {
  Box,
  Button,
  ButtonBase,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useArticleDetail } from "../hooks/useArticles"
import { ArticleMetadataChips } from "@/shared/ui/world-monitoring/ArticleMetadataChips";

import {
  formatDateTime,
  getArticleImage,
  worldMonitorPalette,
} from "@/shared/utils/worldMonitoringUtils";

// ── Props 

export interface ArticleDetailDialogProps {
  articleId: string | null;
  onClose: () => void;
  onOpenEventInThreats?: (eventId: string) => void;
}

// ── Component

export function ArticleDetailDialog({
  articleId,
  onClose,
  onOpenEventInThreats,
}: ArticleDetailDialogProps) {
  const { data: article, isLoading } = useArticleDetail(articleId ?? undefined);

  const open = isLoading || Boolean(article);

  const metaArticle = article

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          backgroundColor: worldMonitorPalette.panel,
          border: `1px solid ${worldMonitorPalette.borderStrong}`,
          color: worldMonitorPalette.text,
        },
      }}
    >
      <DialogContent>
        {isLoading || !article ? (
          <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
            <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Title + source line */}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {article.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: worldMonitorPalette.textMuted, mt: 1 }}
              >
                {article.source ?? "Unknown source"}
                {article.published
                  ? ` | ${formatDateTime(article.published)}`
                  : ""}
              </Typography>
            </Box>

            {/* Hero image */}
            {getArticleImage({
              imageUrl: article.imageUrl,
            }) && (
              <CardMedia
                component="img"
                image={
                  getArticleImage({ imageUrl: article.imageUrl }) as string
                }
                alt={article.title}
                sx={{
                  height: 260,
                  borderRadius: 2,
                  objectFit: "cover",
                  border: `1px solid ${worldMonitorPalette.border}`,
                }}
              />
            )}

            {/* Body text */}
            <Typography
              variant="body1"
              sx={{ color: worldMonitorPalette.textMuted }}
            >
              {article.summary ??
                article.processedContent ??
                article.rawContent}
            </Typography>

            {/* Metadata chips */}
            {metaArticle && <ArticleMetadataChips article={metaArticle} />}

            {/* Linked / derived events */}
            {!!article.linkedEvents?.length && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ color: worldMonitorPalette.text, mb: 1 }}
                >
                  Derived Events
                </Typography>
                <Stack spacing={1}>
                  {article.linkedEvents.map((event) => (
                    <ButtonBase
                      key={event.id}
                      onClick={() => {
                        onClose();
                        onOpenEventInThreats?.(event.id);
                      }}
                      sx={{
                        display: "block",
                        textAlign: "left",
                        width: "100%",
                        p: 1.25,
                        borderRadius: 2,
                        border: `1px solid ${worldMonitorPalette.border}`,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: worldMonitorPalette.borderStrong,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          color: worldMonitorPalette.text,
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        {event.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: worldMonitorPalette.textMuted }}
                      >
                        {event.summary}
                      </Typography>
                    </ButtonBase>
                  ))}
                </Stack>
              </Box>
            )}

            {/* External link */}
            {article.link && (
              <Button
                component="a"
                href={article.link}
                target="_blank"
                rel="noreferrer"
                endIcon={<OpenInNewIcon />}
                sx={{
                  alignSelf: "flex-start",
                  color: worldMonitorPalette.accent,
                }}
              >
                Open Source Site
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
