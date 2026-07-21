import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import FlagIcon from "@mui/icons-material/Flag";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { VesselFlag, VesselFlagStatus } from "../model/types";
import { useVesselFlags } from "../hooks/useVesselFlags";

interface VesselFlagsProps {
  vesselId: string;
}

const FLAG_OPTIONS: { value: VesselFlagStatus; label: string; color: "success" | "error" | "warning" | "default" | "info" }[] = [
  { value: "safe", label: "Safe", color: "success" },
  { value: "unsafe", label: "Unsafe", color: "error" },
  { value: "suspicious", label: "Suspicious", color: "warning" },
  { value: "neutral", label: "Neutral", color: "default" },
  { value: "unknown", label: "Unknown", color: "info" },
];

function getFlagColor(flag: string): "success" | "error" | "warning" | "default" | "info" {
  return FLAG_OPTIONS.find((o) => o.value === flag)?.color ?? "default";
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VesselFlags({ vesselId }: VesselFlagsProps) {
  const { flags, loading, error, addFlag, removeFlag } = useVesselFlags(vesselId);
  const [selectedFlag, setSelectedFlag] = useState<VesselFlagStatus>("safe");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() && selectedFlag === "unknown") return;
    setSubmitting(true);
    try {
      await addFlag(selectedFlag, comment.trim());
      setComment("");
      setSelectedFlag("safe");
    } catch {
      // error handled by hook state
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Accordion disableGutters square elevation={0} defaultExpanded={false} sx={{ "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 40, "&.Mui-expanded": { minHeight: 40 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1 }}>
          <FlagIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={600}>Vessel Flags</Typography>
          {flags.length > 0 && (
            <Chip label={flags.length} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, py: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <FormControl size="small" fullWidth>
              <Select
                value={selectedFlag}
                onChange={(e) => setSelectedFlag(e.target.value as VesselFlagStatus)}
                sx={{ fontSize: "0.8rem" }}
              >
                {FLAG_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.8rem" }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ "& .MuiInputBase-input": { fontSize: "0.8rem" } }}
            />

            <Button
              variant="contained"
              size="small"
              endIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
              onClick={handleSubmit}
              disabled={submitting}
              sx={{ alignSelf: "flex-end" }}
            >
              Submit Flag
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
              <CircularProgress size={16} />
            </Box>
          )}

          {error && (
            <Typography variant="caption" color="error.main">
              {error}
            </Typography>
          )}

          {!loading && flags.length > 0 && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {flags.map((flag: VesselFlag) => (
                  <Box
                    key={flag.id}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Chip
                        label={flag.flag}
                        size="small"
                        color={getFlagColor(flag.flag)}
                        sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600 }}
                      />
                      <IconButton
                        size="small"
                        aria-label="delete flag"
                        onClick={() => removeFlag(flag.id)}
                        sx={{ p: 0.25 }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    {flag.comment && (
                      <Typography variant="caption" sx={{ wordBreak: "break-word" }}>
                        {flag.comment}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {flag.userId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(flag.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}

          {!loading && flags.length === 0 && !error && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", py: 0.5 }}>
              No flags yet for this vessel.
            </Typography>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export default VesselFlags;
