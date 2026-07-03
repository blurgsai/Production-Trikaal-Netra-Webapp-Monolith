import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface DatabaseUploadsDialogProps {
  open: boolean;
  onClose: () => void;
  mmsi?: string;
}

function DatabaseUploadsDialog({ open, onClose, mmsi }: DatabaseUploadsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Database Uploads</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Database uploads for vessel with MMSI: {mmsi || "N/A"}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          This feature is under development.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default DatabaseUploadsDialog;
