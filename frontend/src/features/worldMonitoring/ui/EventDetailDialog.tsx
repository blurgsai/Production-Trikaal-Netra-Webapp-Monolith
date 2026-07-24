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
import { useId } from "react";

import type {
  EventDetailDialogProps,
  Location,
  StructuredField,
} from "../model/types";
import { defenseColors } from "@/shared/theme";
import {
  formatDateTime,
  formatEventTypeLabel,
  getSeverityConfig,
} from "../model/mappers";

import { ArticleMetadataChips } from "./ArticleMetadataChips";
import LocateVesselOnMapButton from "./LocateVesselOnMapButton";

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
  const reactId = useId();
  const dialogTitleId = `${reactId}-dialog-title`;
  const eventTitleId = `${reactId}-event-title`;
  const eventSummaryId = `${reactId}-event-summary`;
  const severity = getSeverityConfig(eventDetail?.threatLevel);

  const labelledBy =
    eventDetail && !loading ? eventTitleId : dialogTitleId;
  const describedBy =
    eventDetail && !loading ? eventSummaryId : undefined;

  const isInline = variant === "inline";

  const content = (
    <DialogContent
      sx={{
        p: 0,
        overflow: isInline ? "visible" : undefined,
        // DialogContent defaults can introduce a second scrollport.
        ...(isInline ? { flex: "none" } : null),
      }}
    >
      {loading || !eventDetail ? (
        <Box
          role="status"
          aria-live="polite"
          aria-busy="true"
          sx={{ minHeight: 320, display: "grid", placeItems: "center" }}
        >
          <CircularProgress
            aria-label="Loading event detail"
            sx={{ color: defenseColors.primary.main }}
          />
        </Box>
      ) : (
        <Stack
          spacing={0}
          sx={{
            // Dialog: constrain height so only the body scrolls.
            // Inline: grow naturally; parent panel owns the single scrollbar.
            ...(isInline ? { maxHeight: "none" } : { maxHeight: "78vh" }),
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          {/* ── Header ── */}
          <Box sx={{ p: 3, minWidth: 0, overflowX: "hidden" }}>
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
                  maxWidth: "100%",
                  color: defenseColors.primary.main,
                  backgroundColor: defenseColors.primary.soft,
                  "& .MuiChip-label": {
                    overflowWrap: "anywhere",
                    whiteSpace: "normal",
                  },
                }}
              />
              {eventDetail.primaryLocation?.name && (
                <Chip
                  size="small"
                  label={eventDetail.primaryLocation.name}
                  sx={{
                    maxWidth: "100%",
                    color: defenseColors.text.muted,
                    backgroundColor: defenseColors.border.soft,
                    "& .MuiChip-label": {
                      overflowWrap: "anywhere",
                      whiteSpace: "normal",
                    },
                  }}
                />
              )}
            </Stack>

            <Typography
              id={eventTitleId}
              variant={isInline ? "h5" : "h4"}
              sx={{
                fontWeight: 900,
                letterSpacing: "-0.03em",
                mb: 1,
                minWidth: 0,
                maxWidth: "100%",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {eventDetail.title}
            </Typography>

            <Typography
              id={eventSummaryId}
              variant="body1"
              sx={{
                color: defenseColors.text.muted,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {eventDetail.summary}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: defenseColors.border.default }} />

          {/* ── Body: scrolls only in dialog; inline scrolls with outer panel ── */}
          <Box
            sx={{
              p: 3,
              minWidth: 0,
              overflowX: "hidden",
              ...(isInline
                ? { overflowY: "visible" }
                : { overflowY: "auto", minHeight: 0 }),
            }}
          >
            <Stack spacing={2.5} sx={{ minWidth: 0 }}>
              {/* Structured Intelligence */}
              {(eventDetail.structuredFields ?? []).length > 0 && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: defenseColors.text.primary }}
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
                            color: defenseColors.text.primary,
                            backgroundColor: defenseColors.border.soft,
                            border: `1px solid ${defenseColors.border.default}`,
                            "& .MuiChip-label": {
                              overflowWrap: "anywhere",
                              whiteSpace: "normal",
                            },
                          }}
                        />
                      ),
                    )}
                  </Stack>
                  {(eventDetail.structuredFields as StructuredField[])
                    .find((f) => f.key === "vessel_name" && typeof f.value === "string" && f.value.trim().length > 0)
                    ?.value && (
                    <Box sx={{ mt: 1.5 }}>
                      <LocateVesselOnMapButton
                        vesselName={
                          (eventDetail.structuredFields as StructuredField[]).find(
                            (f) => f.key === "vessel_name"
                          )!.value as string
                        }
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* AI Assessment */}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: defenseColors.text.primary }}
                >
                  AI Assessment
                </Typography>
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: `1px solid ${defenseColors.border.default}`,
                    backgroundColor: defenseColors.primary.soft,
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: defenseColors.text.muted,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {eventDetail.reasoning ?? "No AI reasoning available."}
                  </Typography>
                </Box>
              </Box>

              {/* Location Context */}
              {(eventDetail.locations ?? []).length > 0 && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: defenseColors.text.primary }}
                  >
                    Location Context
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(eventDetail.locations as Location[]).map((location) => (
                      <Chip
                        key={`${location.name}-${location.lat}-${location.lng}`}
                        label={`${location.name}${location.role ? ` (${location.role})` : ""}`}
                        sx={{
                          maxWidth: "100%",
                          color:
                            location.role === "primary"
                              ? defenseColors.primary.main
                              : defenseColors.text.muted,
                          backgroundColor:
                            location.role === "primary"
                              ? defenseColors.primary.soft
                              : defenseColors.border.soft,
                          border: `1px solid ${defenseColors.border.default}`,
                          "& .MuiChip-label": {
                            overflowWrap: "anywhere",
                            whiteSpace: "normal",
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Linked Article Preview */}
              {eventDetail.linkedArticlePreview && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: defenseColors.text.primary }}
                  >
                    Linked Article
                  </Typography>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      border: `1px solid ${defenseColors.border.default}`,
                      backgroundColor: defenseColors.border.soft,
                      minWidth: 0,
                      overflowX: "hidden",
                    }}
                  >
                    {eventDetail.linkedArticlePreview.imageUrl && (
                      <CardMedia
                        component="img"
                        image={eventDetail.linkedArticlePreview.imageUrl}
                        alt={eventDetail.linkedArticlePreview.title}
                        sx={{
                          height: 180,
                          width: "100%",
                          maxWidth: "100%",
                          borderRadius: 2,
                          mb: 1.5,
                          objectFit: "cover",
                          border: `1px solid ${defenseColors.border.default}`,
                        }}
                      />
                    )}
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        mb: 0.5,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {eventDetail.linkedArticlePreview.title}
                    </Typography>
                    {eventDetail.linkedArticlePreview.published && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: defenseColors.text.muted,
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
                      sx={{
                        color: defenseColors.text.muted,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
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
                        sx={{ color: defenseColors.primary.main }}
                      >
                        Open Article
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              )}

              {/* Metadata */}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: defenseColors.text.primary }}
                >
                  Metadata
                </Typography>
                <Stack spacing={0.75}>
                  {eventDetail.enrichedAt && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: defenseColors.text.muted,
                        overflowWrap: "anywhere",
                      }}
                    >
                      Enriched At: {formatDateTime(eventDetail.enrichedAt)}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    sx={{ color: defenseColors.text.muted }}
                  >
                    Relevance Score:{" "}
                    {eventDetail.relevanceScore ?? "Not scored"}
                  </Typography>
                </Stack>
              </Box>

              {/* Full Article Detail (when loaded separately) */}
              {articleDetail && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: defenseColors.text.primary }}
                  >
                    Article Preview
                  </Typography>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      border: `1px solid ${defenseColors.border.default}`,
                      backgroundColor: defenseColors.border.soft,
                      minWidth: 0,
                      overflowX: "hidden",
                    }}
                  >
                    {articleDetail.imageUrl && (
                      <CardMedia
                        component="img"
                        image={articleDetail.imageUrl}
                        alt={articleDetail.title}
                        sx={{
                          height: 220,
                          width: "100%",
                          maxWidth: "100%",
                          borderRadius: 2,
                          mb: 1.5,
                          objectFit: "cover",
                          border: `1px solid ${defenseColors.border.default}`,
                        }}
                      />
                    )}
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        mb: 0.5,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {articleDetail.title}
                    </Typography>
                    {articleDetail.published && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: defenseColors.text.muted,
                          display: "block",
                          mb: 1,
                        }}
                      >
                        Published {formatDateTime(articleDetail.published)}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        color: defenseColors.text.muted,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
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

  if (isInline) {
    return (
      <Box
        className="wm-scrollable"
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: "auto",
          overflowX: "hidden",
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
      disableEnforceFocus={false}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      PaperProps={{
        sx: {
          backgroundColor: defenseColors.background.surface,
          border: `1px solid ${defenseColors.border.strong}`,
          color: defenseColors.text.primary,
          backgroundImage:
            `radial-gradient(circle at top right, ${defenseColors.primary.soft}, transparent 35%)`,
        },
      }}
    >
      <DialogTitle
        id={dialogTitleId}
        sx={{
          m: 0,
          p: 2,
          pr: 6,
          color: defenseColors.text.primary,
          borderBottom: `1px solid ${defenseColors.border.default}`,
        }}
      >
        {eventDetail?.title
          ? `Event Detail: ${eventDetail.title}`
          : "Event Detail"}
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
      {content}
    </Dialog>
  );
}
