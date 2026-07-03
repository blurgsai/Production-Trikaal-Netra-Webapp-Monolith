import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Pagination,
  Stack,
  TextField,
} from "@mui/material";

import { useArticles } from "../hooks/useArticles";
import { ArticleDetailDialog } from "./ArticleDetailDialog";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ArticleCard } from "./ArticleCard";

import {
  worldMonitorPalette,
} from "@/shared/utils/worldMonitoringUtils";

// ── Filter input shared style 

const filterInputSx = {
  pt: 0.5,
  "& .MuiOutlinedInput-root": {
    color: worldMonitorPalette.text,
    backgroundColor: "rgba(255,255,255,0.03)",
    "& fieldset": { borderColor: worldMonitorPalette.borderStrong },
    "&:hover fieldset": { borderColor: worldMonitorPalette.textMuted },
  },
};

// ── Main component ────────────────────────────────────────────────────────────

export function Articles() {
  const [filters, setFilters] = useState({
    search: "",
    source: "",
    processingStatus: "",
  });

  const { articleId } = useParams<{ articleId?: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
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

  // ── Data
  const { data, isLoading, error } = useArticles(filters, page, 12);
  const metadata = data?.metadata;

  const articles = data?.articles ?? [];
  const pagination = data?.pagination;

  // ── Filter helpers
  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  // ── Render
  return (
    <Stack
      spacing={2}
      sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5, pb: 1 }}
    >
      {/* Filters */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        <TextField
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          size="small"
          placeholder="Search title, summary, source, author"
          sx={filterInputSx}
        />

        <TextField
          select
          value={filters.source}
          onChange={(e) => setFilter("source", e.target.value)}
          size="small"
          SelectProps={{ native: true }}
          sx={filterInputSx}
        >
          <option value="">All sources</option>
          {(metadata?.sources ?? []).map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </TextField>

        <TextField
          select
          value={filters.processingStatus}
          onChange={(e) => setFilter("processingStatus", e.target.value)}
          size="small"
          SelectProps={{ native: true }}
          sx={filterInputSx}
        >
          <option value="">All statuses</option>
          {(metadata?.processingStatuses ?? []).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </TextField>
      </Box>

      {error && (
        <Alert severity="error">Failed to load source intelligence.</Alert>
      )}

      {/* Article grid */}
      {isLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", flex: 1 }}>
          <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
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

      {/* Pagination */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Pagination
          count={pagination?.totalPages ?? 1}
          page={pagination?.page ?? 1}
          onChange={(_, p) => setPage(p)}
          color="primary"
        />
      </Box>

      {/* Detail dialog */}
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
    </Stack>
  );
}
