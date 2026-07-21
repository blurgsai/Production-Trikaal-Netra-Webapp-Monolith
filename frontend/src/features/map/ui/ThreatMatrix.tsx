import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Typography,
  Tooltip,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { Theme } from "@mui/material/styles";

export interface ThreatSource {
  id: string;
  name: string;
  category: string;
  score: number;
  scoreExplanation: string;
  positionConfidence: number;
  positionConfidenceExplanation: string;
  confidence: string;
  lastUpdated: string;
}

export interface ThreatMatrixData {
  vesselId: string;
  overallScore: number;
  riskLevel: string;
  sources: ThreatSource[];
}

interface ThreatMatrixProps {
  vesselId: string;
}

function getScoreColor(score: number): "error" | "warning" | "success" {
  if (score >= 70) return "error";
  if (score >= 40) return "warning";
  return "success";
}

function getRiskChipColor(riskLevel: string): "error" | "warning" | "success" | "default" {
  const level = riskLevel.toUpperCase();
  if (level === "CRITICAL" || level === "HIGH") return "error";
  if (level === "MEDIUM") return "warning";
  if (level === "LOW") return "success";
  return "default";
}

function formatLastUpdated(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ThreatMatrix({ vesselId }: ThreatMatrixProps) {
  const [data, setData] = useState<ThreatMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadThreatMatrix() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/mock/vessel-threat-matrix.json");
        if (!res.ok) {
          throw new Error(`Failed to load threat matrix: ${res.status}`);
        }
        const json = (await res.json()) as ThreatMatrixData;
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadThreatMatrix();

    return () => {
      cancelled = true;
    };
  }, [vesselId]);

  if (loading) {
    return (
      <Accordion disableGutters square elevation={0} defaultExpanded={false} sx={{ "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 40, "&.Mui-expanded": { minHeight: 40 } }}>
          <Typography variant="subtitle2" fontWeight={600}>Threat Matrix</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1.5, py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">Loading threat matrix...</Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  if (error || !data) {
    return (
      <Accordion disableGutters square elevation={0} defaultExpanded={false} sx={{ "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 40, "&.Mui-expanded": { minHeight: 40 } }}>
          <Typography variant="subtitle2" fontWeight={600}>Threat Matrix</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1.5, py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, px: 1, borderRadius: 1, bgcolor: (theme: Theme) => theme.palette.action.hover }}>
            <WarningAmberIcon fontSize="small" color="warning" />
            <Typography variant="caption" color="text.secondary">{error ?? "Threat matrix unavailable"}</Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Accordion disableGutters square elevation={0} defaultExpanded={false} sx={{ "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 40, "&.Mui-expanded": { minHeight: 40 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, width: "100%", pr: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>Threat Matrix</Typography>
          <Chip
            label={`${data.riskLevel} · ${data.overallScore}`}
            color={getRiskChipColor(data.riskLevel)}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, py: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {data.sources.map((source) => (
          <Box key={source.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 0.5,
              }}
            >
              <Typography variant="caption" fontWeight={600}>
                {source.name}
              </Typography>
              <Chip
                label={source.category}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.65rem" }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={source.score}
                  color={getScoreColor(source.score)}
                  sx={{
                    height: 6,
                    borderRadius: 1,
                    bgcolor: (theme: Theme) => theme.palette.action.hover,
                  }}
                />
              </Box>
              <Tooltip title={source.scoreExplanation} arrow>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    minWidth: 28,
                    textAlign: "right",
                    cursor: "help",
                    borderBottom: "1px dotted",
                    borderColor: "text.secondary",
                  }}
                >
                  {source.score}
                </Typography>
              </Tooltip>
            </Box>

            <Box sx={{ mt: 0.75 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 0.25,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Position confidence
                </Typography>
                <Tooltip title={source.positionConfidenceExplanation} arrow>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="info.main"
                    sx={{
                      cursor: "help",
                      borderBottom: "1px dotted",
                      borderColor: "info.main",
                    }}
                  >
                    {source.positionConfidence}
                  </Typography>
                </Tooltip>
              </Box>
              <LinearProgress
                variant="determinate"
                value={source.positionConfidence}
                color="info"
                sx={{
                  height: 4,
                  borderRadius: 1,
                  bgcolor: (theme: Theme) => theme.palette.action.hover,
                }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mt: 0.75,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Confidence: {source.confidence}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatLastUpdated(source.lastUpdated)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </AccordionDetails>
  </Accordion>
  );
}

export default ThreatMatrix;
