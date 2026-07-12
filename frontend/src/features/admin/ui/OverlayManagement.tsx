import { useState, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LinkIcon from "@mui/icons-material/Link";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  useAdminOverlays,
  useUploadOverlay,
  useAddUrlOverlay,
  useDeleteOverlay,
} from "../hooks/useOverlays";
import type { Overlay } from "../model/types";

export function OverlayManagement() {
  const theme = useTheme();
  const { data: overlays = [], isLoading, isFetching, isError, refetch } = useAdminOverlays();
  const uploadMutation = useUploadOverlay();
  const addUrlMutation = useAddUrlOverlay();
  const deleteMutation = useDeleteOverlay();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Overlay | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadColor, setUploadColor] = useState("#3388ff");
  const [uploadOpacity, setUploadOpacity] = useState("1");
  const [uploadAttribution, setUploadAttribution] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urlName, setUrlName] = useState("");
  const [urlTileUrl, setUrlTileUrl] = useState("");
  const [urlType, setUrlType] = useState("tile");
  const [urlColor, setUrlColor] = useState("#3388ff");
  const [urlOpacity, setUrlOpacity] = useState("1");
  const [urlAttribution, setUrlAttribution] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleUploadOpen = () => {
    setUploadName("");
    setUploadFile(null);
    setUploadColor("#3388ff");
    setUploadOpacity("1");
    setUploadAttribution("");
    setUploadError(null);
    setUploadOpen(true);
  };

  const handleUrlOpen = () => {
    setUrlName("");
    setUrlTileUrl("");
    setUrlType("tile");
    setUrlColor("#3388ff");
    setUrlOpacity("1");
    setUrlAttribution("");
    setUrlError(null);
    setUrlOpen(true);
  };

  const handleUploadSubmit = () => {
    if (!uploadName.trim()) {
      setUploadError("Name is required");
      return;
    }
    if (!uploadFile) {
      setUploadError("Please select a file");
      return;
    }
    const opacityNum = parseFloat(uploadOpacity);
    if (isNaN(opacityNum) || opacityNum < 0 || opacityNum > 1) {
      setUploadError("Opacity must be between 0 and 1");
      return;
    }
    setUploadError(null);
    uploadMutation.mutate(
      { name: uploadName, file: uploadFile, attribution: uploadAttribution, color: uploadColor, opacity: opacityNum },
      {
        onSuccess: () => {
          setUploadOpen(false);
          setToast({ open: true, message: "Overlay uploaded successfully", severity: "success" });
        },
        onError: (err: Error) => {
          setUploadError(err.message || "Failed to upload. Please try again.");
        },
      },
    );
  };

  const handleUrlSubmit = () => {
    if (!urlName.trim()) {
      setUrlError("Name is required");
      return;
    }
    if (!urlTileUrl.trim()) {
      setUrlError("Tile URL is required");
      return;
    }
    const opacityNum = parseFloat(urlOpacity);
    if (isNaN(opacityNum) || opacityNum < 0 || opacityNum > 1) {
      setUrlError("Opacity must be between 0 and 1");
      return;
    }
    setUrlError(null);
    addUrlMutation.mutate(
      { name: urlName, tileUrl: urlTileUrl, overlayType: urlType, attribution: urlAttribution, color: urlColor, opacity: opacityNum },
      {
        onSuccess: () => {
          setUrlOpen(false);
          setToast({ open: true, message: "URL overlay added successfully", severity: "success" });
        },
        onError: (err: Error) => {
          setUrlError(err.message || "Failed to add URL overlay.");
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setDeleteError(null);
        setToast({ open: true, message: "Overlay deleted successfully", severity: "success" });
      },
      onError: (err: Error) => {
        setDeleteError(err.message || "Failed to delete overlay.");
      },
    });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        borderRadius: 0,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pb: 2 }}>
        <Typography variant="overline" sx={{ letterSpacing: 2, color: "text.secondary" }}>
          Admin · Overlay Management
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
          <Typography variant="h5" fontWeight={600}>
            Overlay Layers
          </Typography>
          <Chip
            label={`${overlays.length} overlay${overlays.length !== 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? <CircularProgress size={18} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleUploadOpen}
            size="small"
          >
            Upload Overlay
          </Button>
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={handleUrlOpen}
            size="small"
          >
            Add Tile URL
          </Button>
        </Box>
      </Box>

      <Divider />

      <TableContainer sx={{ flexGrow: 1, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Color</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Opacity</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 40, color: "error.main" }} />
                    <Typography color="text.secondary">
                      Failed to load overlays. Check tileserver connection.
                    </Typography>
                    <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => refetch()}>
                      Retry
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : overlays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <AddIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                    <Typography color="text.secondary">
                      No overlay layers yet. Upload a file or add a tile URL.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              overlays.map((ov) => (
                <TableRow key={ov.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{ov.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={ov.type}
                      size="small"
                      color={ov.type === "file" ? "info" : "default"}
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ov.source_type}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.7rem" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "3px",
                          bgcolor: ov.color,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {ov.color}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.8rem" }}>{ov.opacity}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => { setDeleteTarget(ov); setDeleteError(null); }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="xs">
        <DialogTitle>Upload Overlay File</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Overlay Name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              autoFocus
              size="small"
              fullWidth
              required
            />
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mbtiles,.db,.sqlite,.geojson,.json,.kml,.kmz,.zip,.000"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  if (f && !uploadName.trim()) {
                    setUploadName(f.name.replace(/\.(mbtiles|db|sqlite|geojson|json|kml|kmz|zip|000)$/i, ""));
                  }
                }}
              />
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                size="small"
                fullWidth
              >
                {uploadFile ? uploadFile.name : "Choose File"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Supported: .mbtiles, .db, .sqlite, .geojson, .json, .kml, .kmz, .zip, .000 (ENC)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Color"
                value={uploadColor}
                onChange={(e) => setUploadColor(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "3px",
                          bgcolor: uploadColor,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Opacity"
                value={uploadOpacity}
                onChange={(e) => setUploadOpacity(e.target.value)}
                size="small"
                sx={{ width: 100 }}
                placeholder="0-1"
              />
            </Box>
            <TextField
              label="Attribution (optional)"
              value={uploadAttribution}
              onChange={(e) => setUploadAttribution(e.target.value)}
              size="small"
              fullWidth
            />
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* URL Dialog */}
      <Dialog open={urlOpen} onClose={() => setUrlOpen(false)} maxWidth="xs">
        <DialogTitle>Add Tile URL Overlay</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Overlay Name"
              value={urlName}
              onChange={(e) => setUrlName(e.target.value)}
              autoFocus
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Tile URL"
              value={urlTileUrl}
              onChange={(e) => setUrlTileUrl(e.target.value)}
              size="small"
              fullWidth
              required
              placeholder="https://example.com/{z}/{x}/{y}.png"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Select
              value={urlType}
              size="small"
              fullWidth
              onChange={(e) => setUrlType(e.target.value)}
            >
              <MenuItem value="tile">Tile (XYZ)</MenuItem>
              <MenuItem value="wms">WMS</MenuItem>
            </Select>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Color"
                value={urlColor}
                onChange={(e) => setUrlColor(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "3px",
                          bgcolor: urlColor,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Opacity"
                value={urlOpacity}
                onChange={(e) => setUrlOpacity(e.target.value)}
                size="small"
                sx={{ width: 100 }}
                placeholder="0-1"
              />
            </Box>
            <TextField
              label="Attribution (optional)"
              value={urlAttribution}
              onChange={(e) => setUrlAttribution(e.target.value)}
              size="small"
              fullWidth
            />
            {urlError && <Alert severity="error">{urlError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUrlOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUrlSubmit}
            disabled={addUrlMutation.isPending}
          >
            {addUrlMutation.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        maxWidth="xs"
      >
        <DialogTitle>Delete Overlay</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast({ ...toast, open: false })}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
