import { useState } from "react";
import {
  Typography,
  Box,
  Collapse,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { VesselDataUpload } from "../model/types";

const DB_COLORS: Record<string, string> = {
  Casualty: "#d32f2f",
  Inspection: "#1976d2",
  "Petrolium Trade History": "#f57c00",
  Sanction: "#7b1fa2",
  Seizure: "#e64a19",
};

const DATE_KEYS = ["timestamp_utc", "created_at"];

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDateFromUpload(upload: VesselDataUpload): string {
  for (const key of DATE_KEYS) {
    const val = upload.data[key];
    if (val) return String(val);
  }
  return upload.createdAt ?? "N/A";
}

function getFullDate(dateStr: string): string {
  if (!dateStr || dateStr === "N/A") return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

interface DatabaseTimelineProps {
  databaseName: string;
  uploads: VesselDataUpload[];
  maxItems?: number;
  onShowMore?: () => void;
}

export default function DatabaseTimeline({ databaseName, uploads, maxItems, onShowMore }: DatabaseTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...uploads].sort((a, b) => {
    const da = getDateFromUpload(a);
    const db = getDateFromUpload(b);
    return db.localeCompare(da);
  });

  const color = DB_COLORS[databaseName] ?? "#1976d2";
  const visible = maxItems ? sorted.slice(0, maxItems) : sorted;
  const hasMore = maxItems ? sorted.length > maxItems : false;

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {visible.map((upload, idx) => {
        const date = getDateFromUpload(upload);
        const isExpanded = expandedId === upload.id;
        const isLast = idx === visible.length - 1 && !hasMore;
        return (
          <Box key={upload.id} sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20 }}>
              <Box
                onClick={() => handleToggle(upload.id)}
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  bgcolor: isExpanded ? color : "background.paper",
                  border: 2,
                  borderColor: color,
                  cursor: "pointer",
                  mt: 0.75,
                  transition: "all 0.2s",
                  "&:hover": { transform: "scale(1.2)" },
                }}
              />
              {!isLast && (
                <Box sx={{ width: 2, flex: 1, bgcolor: "divider", my: 0.5 }} />
              )}
            </Box>
            <Box sx={{ flex: 1, pb: isLast ? 0 : 2, minWidth: 0 }}>
              <Box
                onClick={() => handleToggle(upload.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  py: 0.75,
                  px: 1.5,
                  borderRadius: 1.5,
                  bgcolor: isExpanded ? "action.selected" : "transparent",
                  transition: "background-color 0.2s",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Typography variant="body2" fontWeight={isExpanded ? 600 : 400}>
                  {getFullDate(date)}
                </Typography>
                <ExpandMoreIcon
                  sx={{
                    fontSize: 18,
                    color: "text.secondary",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </Box>
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Paper elevation={0} sx={{ p: 1.5, mt: 0.5, mb: 1, bgcolor: "action.hover", borderRadius: 1.5 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {Object.entries(upload.data)
                      .filter(([k]) => !DATE_KEYS.includes(k))
                      .map(([key, value]) => (
                        <Typography key={key} variant="body2" sx={{ lineHeight: 1.5 }}>
                          <b>{formatKey(key)}:</b> {String(value)}
                        </Typography>
                      ))}
                  </Box>
                </Paper>
              </Collapse>
            </Box>
          </Box>
        );
      })}
      {hasMore && onShowMore && (
        <Box
          onClick={onShowMore}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "pointer",
            pl: 5,
            py: 1,
            color: "primary.main",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          <Typography variant="body2" fontWeight={500}>
            +{sorted.length - (maxItems ?? 0)} more
          </Typography>
          <ExpandMoreIcon sx={{ fontSize: 16 }} />
        </Box>
      )}
    </Box>
  );
}
