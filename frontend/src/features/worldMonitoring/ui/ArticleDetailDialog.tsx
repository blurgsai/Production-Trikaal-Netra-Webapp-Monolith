import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useArticleDetail } from "../hooks/useArticleDetail";
import { ArticleMetadataChips } from "./ArticleMetadataChips";

import { worldMonitorPalette } from "../model/types";
import {
  formatDateTime,
  getArticleImage,
} from "../model/mappers";

export interface ArticleDetailDialogProps {
  articleId: string | null;
  onClose: () => void;
  onOpenEventInThreats?: (eventId: string) => void;
}

export function ArticleDetailDialog({
  articleId,
  onClose,
  onOpenEventInThreats,
}: ArticleDetailDialogProps) {
  const { data: article, isLoading } = useArticleDetail(articleId ?? undefined);

  const open = isLoading || Boolean(article);

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
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          pr: 6,
          color: worldMonitorPalette.text,
          borderBottom: `1px solid ${worldMonitorPalette.border}`,
        }}
      >
        Article Detail
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: worldMonitorPalette.textMuted,
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent>
        {isLoading || !article ? (
          <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
            <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
          </Box>
        ) : (
          <Stack spacing={2}>
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

            {getArticleImage({ imageUrl: article.imageUrl }) && (
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

            <Typography
              variant="body1"
              sx={{ color: worldMonitorPalette.textMuted }}
            >
              {article.summary ??
                article.processedContent ??
                article.rawContent}
            </Typography>

            <ArticleMetadataChips article={article} />

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
                    <Card
                      key={event.id}
                      sx={{
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
                      <CardActionArea
                        onClick={() => {
                          onClose();
                          onOpenEventInThreats?.(event.id);
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
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
                      </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

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
