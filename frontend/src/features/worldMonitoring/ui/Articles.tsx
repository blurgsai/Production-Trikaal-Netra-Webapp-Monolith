import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";

import { useArticles } from "../hooks/useArticles";
import { useWorldMonitoringUrlParams } from "../hooks/useWorldMonitoringUrlParams";
import { ArticleDetailDialog } from "./ArticleDetailDialog";
import { ArticleFilterDialog } from "./ArticleFilterDialog";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ArticleCard } from "./ArticleCard";
import { WorldMonitorScrollbarStyles } from "./ScrollbarStyles";

import { defenseColors } from "@/shared/theme";

import type {
  ArticleProgressiveFilter,
  SavedArticleFilterSet,
} from "../model/types";
import { ARTICLE_FILTER_FIELDS } from "../model/types";
import {
  loadSavedArticleFilters,
  saveArticleFilter,
  deleteSavedArticleFilter,
} from "../model/articleFilterStorage";

const DEFAULT_FILTERS = {
  search: "",
  source: "",
  processingStatus: "",
  sort: "latest",
};

function progressiveFiltersToArticleFilters(
  progressive: ArticleProgressiveFilter[],
  sort: string,
) {
  const result = {
    search: "",
    source: "",
    processingStatus: "",
    title: "",
    author: "",
    sourceType: "",
    publishedFrom: "",
    publishedTo: "",
    ingestedFrom: "",
    ingestedTo: "",
    updatedFrom: "",
    updatedTo: "",
    tags: "",
    locationName: "",
    sort,
  };

  for (const f of progressive) {
    if (!f.field || !f.operator || !f.value) continue;

    switch (f.field) {
      case "keyword":
        if (f.operator === "contains" || f.operator === "=") {
          result.search = f.value;
        }
        break;
      case "title":
        if (f.operator === "contains" || f.operator === "=") {
          result.title = f.value;
        }
        break;
      case "author":
        if (f.operator === "contains" || f.operator === "=") {
          result.author = f.value;
        }
        break;
      case "source":
        if (f.operator === "=" || f.operator === "contains") {
          result.source = f.value;
        }
        break;
      case "source_type":
        if (f.operator === "=") {
          result.sourceType = f.value;
        }
        break;
      case "processing_status":
        if (f.operator === "=") {
          result.processingStatus = f.value;
        }
        break;
      case "published":
        if (f.operator === ">=") {
          result.publishedFrom = f.value;
        } else if (f.operator === "<=") {
          result.publishedTo = f.value;
        } else if (f.operator === "between") {
          result.publishedFrom = f.value;
          result.publishedTo = f.value2 || "";
        }
        break;
      case "ingested_at":
        if (f.operator === ">=") {
          result.ingestedFrom = f.value;
        } else if (f.operator === "<=") {
          result.ingestedTo = f.value;
        } else if (f.operator === "between") {
          result.ingestedFrom = f.value;
          result.ingestedTo = f.value2 || "";
        }
        break;
      case "updated":
        if (f.operator === ">=") {
          result.updatedFrom = f.value;
        } else if (f.operator === "<=") {
          result.updatedTo = f.value;
        } else if (f.operator === "between") {
          result.updatedFrom = f.value;
          result.updatedTo = f.value2 || "";
        }
        break;
      case "tags":
        if (f.operator === "contains" || f.operator === "=") {
          result.tags = f.value;
        }
        break;
      case "location.name":
        if (f.operator === "contains" || f.operator === "=") {
          result.locationName = f.value;
        }
        break;
    }
  }

  return result;
}

function formatFilterChipLabel(filter: ArticleProgressiveFilter): string {
  const fieldLabel =
    ARTICLE_FILTER_FIELDS.find((f) => f.value === filter.field)?.label ??
    filter.field;
  const value =
    filter.operator === "between" && filter.value2
      ? `${filter.value} – ${filter.value2}`
      : filter.value;
  const truncated =
    value.length > 28 ? `${value.slice(0, 28)}…` : value;
  return `${fieldLabel} ${filter.operator} ${truncated}`;
}

function hasActiveFilterValues(
  filters: ReturnType<typeof progressiveFiltersToArticleFilters>,
): boolean {
  return Boolean(
    filters.search ||
      filters.source ||
      filters.processingStatus ||
      filters.title ||
      filters.author ||
      filters.sourceType ||
      filters.publishedFrom ||
      filters.publishedTo ||
      filters.ingestedFrom ||
      filters.ingestedTo ||
      filters.updatedFrom ||
      filters.updatedTo ||
      filters.tags ||
      filters.locationName,
  );
}

export function Articles() {
  const urlParams = useWorldMonitoringUrlParams();
  const [filters, setFilters] = useState(() =>
    urlParams.hasParams
      ? { ...DEFAULT_FILTERS, ...urlParams.articleFilters }
      : DEFAULT_FILTERS,
  );
  const [page, setPage] = useState(1);

  const [progressiveFilters, setProgressiveFilters] = useState<
    ArticleProgressiveFilter[]
  >(() => {
    if (!urlParams.hasParams) return [];
    const progressive: ArticleProgressiveFilter[] = [];
    if (urlParams.keyword) {
      progressive.push({ field: "keyword", operator: "contains", value: urlParams.keyword, combinator: "AND" });
    }
    if (urlParams.articleFilters.title) {
      progressive.push({ field: "title", operator: "contains", value: urlParams.articleFilters.title, combinator: "AND" });
    }
    if (urlParams.articleFilters.author) {
      progressive.push({ field: "author", operator: "contains", value: urlParams.articleFilters.author, combinator: "AND" });
    }
    if (urlParams.articleFilters.source) {
      progressive.push({ field: "source", operator: "=", value: urlParams.articleFilters.source, combinator: "AND" });
    }
    if (urlParams.articleFilters.sourceType) {
      progressive.push({ field: "source_type", operator: "=", value: urlParams.articleFilters.sourceType, combinator: "AND" });
    }
    if (urlParams.articleFilters.processingStatus) {
      progressive.push({ field: "processing_status", operator: "=", value: urlParams.articleFilters.processingStatus, combinator: "AND" });
    }
    if (urlParams.articleFilters.publishedFrom) {
      progressive.push({ field: "published", operator: ">=", value: urlParams.articleFilters.publishedFrom, combinator: "AND" });
    }
    if (urlParams.articleFilters.publishedTo) {
      progressive.push({ field: "published", operator: "<=", value: urlParams.articleFilters.publishedTo, combinator: "AND" });
    }
    if (urlParams.articleFilters.tags) {
      progressive.push({ field: "tags", operator: "contains", value: urlParams.articleFilters.tags, combinator: "AND" });
    }
    if (urlParams.articleFilters.locationName) {
      progressive.push({ field: "location.name", operator: "contains", value: urlParams.articleFilters.locationName, combinator: "AND" });
    }
    return progressive;
  });
  const [savedFilters, setSavedFilters] = useState<SavedArticleFilterSet[]>(
    () => loadSavedArticleFilters(),
  );
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  const { articleId } = useParams<{ articleId?: string }>();
  const navigate = useNavigate();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!articleId) {
      setSelectedArticleId(null);
      return;
    }

    setSelectedArticleId(articleId);
  }, [articleId]);

  const { data, isLoading, error } = useArticles(filters, page, 12);
  const metadata = data?.metadata;

  const articles = data?.articles ?? [];
  const pagination = data?.pagination;

  const activeFilterChips = useMemo(
    () =>
      progressiveFilters
        .map((filter, index) => ({ filter, index }))
        .filter(({ filter }) => Boolean(filter.field && filter.value)),
    [progressiveFilters],
  );

  const hasActiveFilters =
    activeFilterChips.length > 0 || hasActiveFilterValues(filters as ReturnType<typeof progressiveFiltersToArticleFilters>);

  const handleAddProgressiveFilter = useCallback(() => {
    setProgressiveFilters((prev) => [
      ...prev,
      {
        field: "keyword",
        operator: "contains",
        value: "",
        combinator: "AND",
      },
    ]);
  }, []);

  const handleUpdateProgressiveFilter = useCallback(
    (index: number, update: Partial<ArticleProgressiveFilter>) => {
      setProgressiveFilters((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...update };
        return updated;
      });
    },
    [],
  );

  const handleRemoveProgressiveFilter = useCallback((index: number) => {
    setProgressiveFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleResetProgressiveFilters = useCallback(() => {
    setProgressiveFilters([]);
    setFilters((prev) => ({
      ...DEFAULT_FILTERS,
      sort: prev.sort,
    }));
    setPage(1);
  }, []);

  const handleApplyProgressiveFilters = useCallback(() => {
    const newFilters = progressiveFiltersToArticleFilters(
      progressiveFilters,
      filters.sort,
    );
    setFilters(newFilters);
    setPage(1);
  }, [progressiveFilters, filters.sort]);

  const handleRemoveFilterChip = useCallback(
    (index: number) => {
      setProgressiveFilters((prev) => {
        const next = prev.filter((_, i) => i !== index);
        setFilters(
          progressiveFiltersToArticleFilters(next, filters.sort),
        );
        setPage(1);
        return next;
      });
    },
    [filters.sort],
  );

  const handleSaveFilter = useCallback((name: string) => {
    const updated = saveArticleFilter(name, progressiveFilters);
    setSavedFilters(updated);
  }, [progressiveFilters]);

  const handleLoadSavedFilter = useCallback((name: string) => {
    const saved = savedFilters.find((s) => s.name === name);
    if (saved) {
      setProgressiveFilters(saved.filters.map((f) => ({ ...f })));
    }
  }, [savedFilters]);

  const handleDeleteSavedFilter = useCallback((name: string) => {
    const updated = deleteSavedArticleFilter(name);
    setSavedFilters(updated);
  }, []);

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpen(true);
  }, []);

  const handleCloseFilterDialog = useCallback(() => {
    setFilterDialogOpen(false);
  }, []);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        gap: 2,
        pr: 0.5,
        pb: 1,
      }}
    >
      <Paper
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          p: 1.5,
          borderRadius: 3,
          border: `1px solid ${defenseColors.border.default}`,
          background: `linear-gradient(180deg, ${defenseColors.background.surfaceAlt}, ${defenseColors.background.surface})`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
            Source Intelligence
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {activeFilterChips.length > 0 && (
              <Button
                size="small"
                variant="text"
                onClick={handleResetProgressiveFilters}
                sx={{
                  textTransform: "none",
                  color: defenseColors.text.muted,
                  fontWeight: 600,
                }}
              >
                Clear Filters
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={handleOpenFilterDialog}
              aria-label={
                activeFilterChips.length > 0
                  ? `Filters, ${activeFilterChips.length} active`
                  : "Filters"
              }
            >
              Filters
              {activeFilterChips.length > 0 && (
                <Chip
                  label={activeFilterChips.length}
                  size="small"
                  color="primary"
                  sx={{
                    ml: 0.75,
                    height: 18,
                    fontSize: "0.65rem",
                    minWidth: 18,
                  }}
                />
              )}
            </Button>
          </Box>
        </Box>

        {activeFilterChips.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            aria-label="Active article filters"
          >
            {activeFilterChips.map(({ filter, index }) => (
              <Chip
                key={`${filter.field}-${filter.operator}-${filter.value}-${index}`}
                size="small"
                label={formatFilterChipLabel(filter)}
                onDelete={() => handleRemoveFilterChip(index)}
                sx={{
                  maxWidth: "100%",
                  color: defenseColors.text.primary,
                  backgroundColor: defenseColors.border.soft,
                  border: `1px solid ${defenseColors.border.default}`,
                  "& .MuiChip-label": {
                    overflowWrap: "anywhere",
                  },
                }}
              />
            ))}
          </Stack>
        )}
      </Paper>

      {error && (
        <Alert severity="error">Failed to load source intelligence.</Alert>
      )}

      <Box
        className="wm-scrollable"
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isLoading ? (
          <Box sx={{ display: "grid", placeItems: "center", flex: 1 }}>
            <CircularProgress sx={{ color: defenseColors.primary.main }} />
          </Box>
        ) : articles.length === 0 ? (
          <Box
            role="status"
            aria-live="polite"
            sx={{
              display: "grid",
              placeItems: "center",
              flex: 1,
              py: 6,
              px: 2,
              textAlign: "center",
            }}
          >
            <Stack spacing={1.5} alignItems="center" maxWidth={400}>
              <Typography
                sx={{ color: defenseColors.text.primary, fontWeight: 600 }}
              >
                {hasActiveFilters
                  ? "No articles match your current search or filters."
                  : "No articles to display."}
              </Typography>
              {hasActiveFilters ? (
                <>
                  <Typography
                    variant="body2"
                    sx={{ color: defenseColors.text.muted }}
                  >
                    Try adjusting keywords, source, or date range.
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleResetProgressiveFilters}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      color: defenseColors.text.primary,
                      borderColor: defenseColors.border.strong,
                      "&:hover": {
                        borderColor: defenseColors.primary.main,
                        backgroundColor: defenseColors.primary.soft,
                      },
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ color: defenseColors.text.muted }}
                >
                  Articles will appear here when available for the current view.
                </Typography>
              )}
            </Stack>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
                xl: "repeat(3, 1fr)",
              },
              gap: 2,
              pb: 2,
            }}
          >
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onOpen={(id) => navigate(`/world-monitoring/articles/${id}`)}
              />
            ))}
          </Box>
        )}

        {(pagination?.totalPages ?? 1) > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", pb: 1 }}>
            <Pagination
              count={pagination?.totalPages ?? 1}
              page={pagination?.page ?? 1}
              onChange={(_, p) => setPage(p)}
              color="primary"
            />
          </Box>
        )}
      </Box>

      <ArticleDetailDialog
        articleId={selectedArticleId}
        onClose={() => {
          setSelectedArticleId(null);
          navigate("/world-monitoring/articles");
        }}
        onOpenEventInThreats={(eventId) => {
          setSelectedArticleId(null);
          navigate(`/world-monitoring/threats/${eventId}`);
        }}
      />

      <ArticleFilterDialog
        open={filterDialogOpen}
        onClose={handleCloseFilterDialog}
        filters={progressiveFilters}
        savedFilters={savedFilters}
        metadata={metadata}
        onAddFilter={handleAddProgressiveFilter}
        onUpdateFilter={handleUpdateProgressiveFilter}
        onRemoveFilter={handleRemoveProgressiveFilter}
        onResetFilters={handleResetProgressiveFilters}
        onApplyFilters={handleApplyProgressiveFilters}
        onSaveFilter={handleSaveFilter}
        onLoadSavedFilter={handleLoadSavedFilter}
        onDeleteSavedFilter={handleDeleteSavedFilter}
      />

      <WorldMonitorScrollbarStyles />
    </Box>
  );
}
