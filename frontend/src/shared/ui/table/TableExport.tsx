import { useState } from "react";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

import DownloadIcon from "@mui/icons-material/Download";

import type { TableUiTheme } from "@/shared/theme/tableUiTheme";

interface TableExportProps {
  exporting: boolean;
  disabled?: boolean;
  theme: TableUiTheme;

  exportFormats?: ("csv" | "xml" | "xls" | "kml" | "gml")[];

  onExport: (
    format: "csv" | "xml" | "xls" | "kml" | "gml",
  ) => Promise<void | { success?: boolean }>;
}

export default function TableExport({
  exporting,
  disabled = false,
  theme,
  exportFormats = ["csv", "xml", "xls"],
  onExport,
}: TableExportProps) {
  const [open, setOpen] = useState(false);

  type ExportFormat = "csv" | "xml" | "xls" | "kml" | "gml";

  const [format, setFormat] = useState<"csv" | "xml" | "xls" | "kml" | "gml">(
    exportFormats[0],
  );
  const [successOpen, setSuccessOpen] = useState(false);

  const handleExport = async () => {
    const result = await onExport(format);

    if (result?.success !== false) {
      setOpen(false);
      setSuccessOpen(true);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={
          exporting ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <DownloadIcon />
          )
        }
        onClick={() => setOpen(true)}
        disabled={disabled || exporting}
        sx={{
          backgroundColor: theme.primaryColor,
          color: theme.primaryButtonTextColor,
          textTransform: "none",
          fontWeight: 600,

          "&:hover": {
            backgroundColor: theme.primaryHoverColor,
          },
        }}
      >
        {exporting ? "Exporting..." : "Export"}
      </Button>

      <Dialog
        open={open}
        onClose={() => !exporting && setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme.tableBackgroundColor,
            color: theme.textColor,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>
          <Typography
            variant="h6"
            sx={{
              color: theme.textColor,
            }}
          >
            Select export format
          </Typography>
        </DialogTitle>

        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Format</InputLabel>

            <Select
              value={format}
              label="Format"
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              {exportFormats.map((item) => (
                <MenuItem key={item} value={item}>
                  {item.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={exporting}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exporting}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessOpen(false)}
        >
          Export completed successfully
        </Alert>
      </Snackbar>
    </>
  );
}
