import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { VesselDataUpload } from "../model/types";
import DatabaseTimeline from "./DatabaseTimeline";

const DB_COLORS: Record<string, string> = {
  Casualty: "#d32f2f",
  Inspection: "#1976d2",
  "Petrolium Trade History": "#f57c00",
  Sanction: "#7b1fa2",
  Seizure: "#e64a19",
};

interface DatabaseRecordsDialogProps {
  open: boolean;
  onClose: () => void;
  databaseName: string;
  uploads: VesselDataUpload[];
}

export default function DatabaseRecordsDialog({ open, onClose, databaseName, uploads }: DatabaseRecordsDialogProps) {
  const color = DB_COLORS[databaseName] ?? "#1976d2";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
          <Typography variant="subtitle1" fontWeight={600}>{databaseName}</Typography>
          <Typography variant="caption" color="text.secondary">{uploads.length} records</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ maxHeight: "60vh", overflowY: "auto", px: 2, py: 2 }}>
        <DatabaseTimeline databaseName={databaseName} uploads={uploads} />
      </DialogContent>
    </Dialog>
  );
}
