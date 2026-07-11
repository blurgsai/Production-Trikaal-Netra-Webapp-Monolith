import {
  Box,
  Button,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import type {
  EventDetailDialogProps,
  Location,
  StructuredField,
} from "../model/types";
import { worldMonitorPalette } from "../model/types";
import {
  formatDateTime,
  formatEventTypeLabel,
  getSeverityConfig,
} from "../model/mappers";

import { ArticleMetadataChips } from "./ArticleMetadataChips";

// ── Main component ────────────────────────────────────────────────────────────

export default function EventDetailDialog({
  open,
  onClose,
  eventDetail,
  articleDetail,
  loading,
  onOpenArticle,
  variant = "dialog",
}: EventDetailDialogProps) {
  const severity = getSeverityConfig(eventDetail?.threatLevel);

  const content = (
    <DialogContent sx={{ p: 0 }}>
      {loading || !eventDetail ? (
        <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}>
          <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
        </Box>
      ) : (
        <Stack spacing={0} sx={{ maxHeight: "78vh" }}>
          {/* ── Header ── */}
          <Box sx={{ p: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              mb={2}
            >
              <Chip
                size="small"
                label={eventDetail.threatLevel}
                sx={{
                  color: severity.color,
                  backgroundColor: severity.bg,
                  border: `1px solid ${severity.border}`,
                  fontWeight: 700,
                }}
              />
              <Chip
                size="small"
                label={formatEventTypeLabel(eventDetail.eventType)}
                sx={{
                  color: worldMonitorPalette.accent,
                  backgroundColor: worldMonitorPalette.accentSoft,
                }}
              />
              {eventDetail.primaryLocation?.name && (
                <Chip
                  size="small"
                  label={eventDetail.primaryLocation.name}
                  sx={{
                    color: worldMonitorPalette.textMuted,
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                />
              )}
            </Stack>

            <Typography
              variant="h4"
              sx={{ fontWeight: 900, letterSpacing: "-0.03em", mb: 1 }}
            >
              {eventDetail.title}
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: worldMonitorPalette.textMuted }}
            >
              {eventDetail.summary}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: worldMonitorPalette.border }} />

          {/* ── Scrollable body ── */}
          <Box sx={{ p: 3, overflowY: "auto" }}>
            <Stack spacing={2.5}>
              {/* Structured Intelligence */}
              {(eventDetail.structuredFields ?? []).length > 0 && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: worldMonitorPalette.text }}
                  >
                    Structured Intelligence
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(eventDetail.structuredFields as StructuredField[]).map(
                      (field) => (
                        <Chip
                          key={field.key}
                          label={`${field.label}: ${field.value}`}
                          sx={{
                            maxWidth: "100%",
                            color: worldMonitorPalette.text,
                            backgroundColor: "rgba(255,255,255,0.04)",
                            border: `1px solid ${worldMonitorPalette.border}`,
                          }}
                        />
                      ),
                    )}
                  </Stack>
                </Box>
              )}

              {/* AI Assessment */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: worldMonitorPalette.text }}
                >
                  AI Assessment
                </Typography>
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: `1px solid ${worldMonitorPalette.border}`,
                    backgroundColor: "rgba(78,195,255,0.08)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: worldMonitorPalette.textMuted }}
                  >
                    {eventDetail.reasoning ?? "No AI reasoning available."}
                  </Typography>
                </Box>
              </Box>

              {/* Location Context */}
              {(eventDetail.locations ?? []).length > 0 && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: worldMonitorPalette.text }}
                  >
                    Location Context
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(eventDetail.locations as Location[]).map((location) => (
                      <Chip
                        key={`${location.name}-${location.lat}-${location.lng}`}
                        label={`${location.name}${location.role ? ` (${location.role})` : ""}`}
                        sx={{
                          color:
                            location.role === "primary"
                              ? worldMonitorPalette.accent
                              : worldMonitorPalette.textMuted,
                          backgroundColor:
                            location.role === "primary"
                              ? worldMonitorPalette.accentSoft
                              : "rgba(255,255,255,0.04)",
                          border: `1px solid ${worldMonitorPalette.border}`,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Linked Article Preview */}
              {eventDetail.linkedArticlePreview && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: worldMonitorPalette.text }}
                  >
                    Linked Article
                  </Typography>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      border: `1px solid ${worldMonitorPalette.border}`,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {eventDetail.linkedArticlePreview.imageUrl && (
                      <CardMedia
                        component="img"
                        image={eventDetail.linkedArticlePreview.imageUrl}
                        alt={eventDetail.linkedArticlePreview.title}
                        sx={{
                          height: 180,
                          borderRadius: 2,
                          mb: 1.5,
                          objectFit: "cover",
                          border: `1px solid ${worldMonitorPalette.border}`,
                        }}
                      />
                    )}
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 0.5 }}
                    >
                      {eventDetail.linkedArticlePreview.title}
                    </Typography>
                    {eventDetail.linkedArticlePreview.published && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: worldMonitorPalette.textMuted,
                          display: "block",
                          mb: 1,
                        }}
                      >
                        Published{" "}
                        {formatDateTime(
                          eventDetail.linkedArticlePreview.published,
                        )}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      sx={{ color: worldMonitorPalette.textMuted }}
                    >
                      {eventDetail.linkedArticlePreview.summary ??
                        "Open the linked article for full provenance."}
                    </Typography>
                    <ArticleMetadataChips
                      article={eventDetail.linkedArticlePreview}
                    />
                    <Stack
                      direction="row"
                      spacing={1}
                      mt={1.5}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon />}
                        onClick={() =>
                          onOpenArticle?.(eventDetail.linkedArticlePreview!.id)
                        }
                        sx={{ color: worldMonitorPalette.accent }}
                      >
                        Open Article
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              )}

              {/* Metadata */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: worldMonitorPalette.text }}
                >
                  Metadata
                </Typography>
                <Stack spacing={0.75}>
                  {eventDetail.enrichedAt && (
                    <Typography
                      variant="body2"
                      sx={{ color: worldMonitorPalette.textMuted }}
                    >
                      Enriched At: {formatDateTime(eventDetail.enrichedAt)}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    sx={{ color: worldMonitorPalette.textMuted }}
                  >
                    Relevance Score:{" "}
                    {eventDetail.relevanceScore ?? "Not scored"}
                  </Typography>
                </Stack>
              </Box>

              {/* Full Article Detail (when loaded separately) */}
              {articleDetail && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: worldMonitorPalette.text }}
                  >
                    Article Preview
                  </Typography>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      border: `1px solid ${worldMonitorPalette.border}`,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {articleDetail.imageUrl && (
                      <CardMedia
                        component="img"
                        image={articleDetail.imageUrl}
                        alt={articleDetail.title}
                        sx={{
                          height: 220,
                          borderRadius: 2,
                          mb: 1.5,
                          objectFit: "cover",
                          border: `1px solid ${worldMonitorPalette.border}`,
                        }}
                      />
                    )}
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 0.5 }}
                    >
                      {articleDetail.title}
                    </Typography>
                    {articleDetail.published && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: worldMonitorPalette.textMuted,
                          display: "block",
                          mb: 1,
                        }}
                      >
                        Published {formatDateTime(articleDetail.published)}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      sx={{ color: worldMonitorPalette.textMuted }}
                    >
                      {articleDetail.summary ??
                        articleDetail.processedContent ??
                        articleDetail.rawContent}
                    </Typography>
                    <ArticleMetadataChips article={articleDetail} />
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      )}
    </DialogContent>
  );

  if (variant === "inline") {
    return (
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {content}
      </Box>
    );
  }
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
          backgroundImage:
            "radial-gradient(circle at top right, rgba(78,195,255,0.08), transparent 35%)",
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
        Event Detail
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
      {content}
    </Dialog>
  );
}
