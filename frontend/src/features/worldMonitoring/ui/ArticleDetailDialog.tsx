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

import { defenseColors } from "@/shared/theme";
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
          backgroundColor: defenseColors.background.surface,
          border: `1px solid ${defenseColors.border.strong}`,
          color: defenseColors.text.primary,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          pr: 6,
          color: defenseColors.text.primary,
          borderBottom: `1px solid ${defenseColors.border.default}`,
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
          color: defenseColors.text.muted,
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ p: 2 }}>
        {isLoading || !article ? (
          <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
            <CircularProgress sx={{ color: defenseColors.primary.main }} />
          </Box>
        ) : (
          <Stack spacing={2} useFlexGap>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {article.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: defenseColors.text.muted, mt: 1 }}
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
                  border: `1px solid ${defenseColors.border.default}`,
                }}
              />
            )}

            <Typography
              variant="body1"
              sx={{ color: defenseColors.text.muted }}
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
                  sx={{ color: defenseColors.text.primary, mb: 1 }}
                >
                  Derived Events
                </Typography>
                <Stack spacing={1} useFlexGap>
                  {article.linkedEvents.map((event) => (
                    <Card
                      key={event.id}
                      sx={{
                        borderRadius: 2,
                        border: `1px solid ${defenseColors.border.default}`,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: defenseColors.border.strong,
                          backgroundColor: defenseColors.action.hover,
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
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography
                        sx={{
                          color: defenseColors.text.primary,
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        {event.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: defenseColors.text.muted }}
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
                  color: defenseColors.primary.main,
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
