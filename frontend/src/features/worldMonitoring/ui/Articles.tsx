import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
  Pagination,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { useArticles } from "../hooks/useArticles";
import { ArticleDetailDialog } from "./ArticleDetailDialog";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ArticleCard } from "./ArticleCard";
import { WorldMonitorScrollbarStyles } from "./ScrollbarStyles";

import { worldMonitorPalette } from "../model/types";

const filterInputSx = {
  pt: 0.5,
  "& .MuiOutlinedInput-root": {
    color: worldMonitorPalette.text,
    backgroundColor: "rgba(255,255,255,0.03)",
    "& fieldset": { borderColor: worldMonitorPalette.borderStrong },
    "&:hover fieldset": { borderColor: worldMonitorPalette.textMuted },
  },
};

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

  const { data, isLoading, error } = useArticles(filters, page, 12);
  const metadata = data?.metadata;

  const articles = data?.articles ?? [];
  const pagination = data?.pagination;

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

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
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" },
          gap: 1.5,
          p: 1.5,
          borderRadius: 3,
          border: `1px solid ${worldMonitorPalette.border}`,
          background:
            "linear-gradient(180deg, rgba(18,35,59,0.95), rgba(9,22,37,0.98))",
        }}
      >
        <TextField
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          size="small"
          placeholder="Search title, summary, source, author"
          sx={filterInputSx}
        />

        <Autocomplete
          size="small"
          options={metadata?.sources ?? []}
          value={filters.source || null}
          onChange={(_, value) => setFilter("source", value ?? "")}
          renderInput={(params) => (
            <TextField {...params} placeholder="All sources" sx={filterInputSx} />
          )}
          sx={{ minWidth: 0 }}
        />

        <Autocomplete
          size="small"
          options={metadata?.processingStatuses ?? []}
          value={filters.processingStatus || null}
          onChange={(_, value) => setFilter("processingStatus", value ?? "")}
          renderInput={(params) => (
            <TextField {...params} placeholder="All statuses" sx={filterInputSx} />
          )}
          sx={{ minWidth: 0 }}
        />
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
            <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
          </Box>
        ) : articles.length === 0 ? (
          <Box sx={{ display: "grid", placeItems: "center", flex: 1, py: 6 }}>
            <Typography sx={{ color: worldMonitorPalette.textMuted }}>
              No articles found matching the current filters.
            </Typography>
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

      <WorldMonitorScrollbarStyles />
    </Box>
  );
}
