import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
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
import type { VesselFlag, VesselFlagStatus } from "../model/types";
import { useVesselFlags } from "../hooks/useVesselFlags";

interface VesselFlagsDialogProps {
  open: boolean;
  onClose: () => void;
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

export default function VesselFlagsDialog({ open, onClose, vesselId }: VesselFlagsDialogProps) {
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FlagIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Vessel Flags
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {flags.length} flag{flags.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>
        <Button onClick={onClose} size="small">
          Close
        </Button>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Add Flag Form */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {error && (
            <Typography variant="caption" color="error.main">
              {error}
            </Typography>
          )}

          {/* Flags List */}
          {!loading && flags.length > 0 && (
            <>
              <Divider />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {flags.map((flag: VesselFlag) => (
                  <Box
                    key={flag.id}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "background.elevated",
                      border: 1,
                      borderColor: "border.default",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Chip
                        label={flag.flag}
                        size="small"
                        color={getFlagColor(flag.flag)}
                        sx={{ height: 22, fontSize: "0.6875rem", fontWeight: 600 }}
                      />
                      <IconButton
                        size="small"
                        aria-label="delete flag"
                        onClick={() => removeFlag(flag.id)}
                        sx={{ p: 0.5 }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    {flag.comment && (
                      <Typography variant="body2" sx={{ wordBreak: "break-word", lineHeight: 1.5 }}>
                        {flag.comment}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
              No flags yet for this vessel.
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
