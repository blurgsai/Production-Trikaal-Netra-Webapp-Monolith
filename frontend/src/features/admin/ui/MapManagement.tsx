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
  Tab,
  Tabs,
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
  useAdminBaseMaps,
  useUploadBaseMap,
  useAddUrlBaseMap,
  useDeleteBaseMap,
} from "../hooks/useBaseMaps";
import {
  useAdminOverlays,
  useUploadOverlay,
  useAddUrlOverlay,
  useDeleteOverlay,
} from "../hooks/useOverlays";
import type { BaseMap, Overlay } from "../model/types";

export function MapManagement() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<"basemaps" | "overlays">("basemaps");
  const isOverlaysTab = activeTab === "overlays";

  const {
    data: basemaps = [],
    isLoading: basemapsLoading,
    isFetching: basemapsFetching,
    isError: basemapsError,
    refetch: refetchBasemaps,
  } = useAdminBaseMaps();
  const baseMapUploadMutation = useUploadBaseMap();
  const baseMapAddUrlMutation = useAddUrlBaseMap();
  const baseMapDeleteMutation = useDeleteBaseMap();

  const {
    data: overlays = [],
    isLoading: overlaysLoading,
    isFetching: overlaysFetching,
    isError: overlaysError,
    refetch: refetchOverlays,
  } = useAdminOverlays();
  const overlayUploadMutation = useUploadOverlay();
  const overlayAddUrlMutation = useAddUrlOverlay();
  const overlayDeleteMutation = useDeleteOverlay();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BaseMap | Overlay | null>(null);
  const [deleteMode, setDeleteMode] = useState<"basemap" | "overlay">("basemap");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAttribution, setUploadAttribution] = useState("");
  const [uploadColor, setUploadColor] = useState("#3388ff");
  const [uploadOpacity, setUploadOpacity] = useState("1");
  const [uploadWeightCol, setUploadWeightCol] = useState("unique_mmsi_count");
  const [uploadMaxZoom, setUploadMaxZoom] = useState("18");
  const [uploadColorRamp, setUploadColorRamp] = useState<"heat" | "mono">("heat");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isParquetFile = uploadFile?.name.toLowerCase().endsWith(".parquet") ?? false;

  const [urlName, setUrlName] = useState("");
  const [urlTileUrl, setUrlTileUrl] = useState("");
  const [urlType, setUrlType] = useState("tile");
  const [urlAttribution, setUrlAttribution] = useState("");
  const [urlColor, setUrlColor] = useState("#3388ff");
  const [urlOpacity, setUrlOpacity] = useState("1");
  const [urlError, setUrlError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleUploadOpen = () => {
    setUploadName("");
    setUploadFile(null);
    setUploadAttribution("");
    setUploadColor("#3388ff");
    setUploadOpacity("1");
    setUploadWeightCol("unique_mmsi_count");
    setUploadMaxZoom("18");
    setUploadColorRamp("heat");
    setUploadError(null);
    setUploadOpen(true);
  };

  const handleUrlOpen = () => {
    setUrlName("");
    setUrlTileUrl("");
    setUrlType("tile");
    setUrlAttribution("");
    setUrlColor("#3388ff");
    setUrlOpacity("1");
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
    if (isOverlaysTab && (isNaN(opacityNum) || opacityNum < 0 || opacityNum > 1)) {
      setUploadError("Opacity must be between 0 and 1");
      return;
    }
    const density = isOverlaysTab && isParquetFile
      ? {
          weightCol: uploadWeightCol.trim() || undefined,
          maxZoom: parseInt(uploadMaxZoom, 10) || undefined,
          colorRamp: uploadColorRamp,
        }
      : undefined;
    setUploadError(null);

    if (isOverlaysTab) {
      overlayUploadMutation.mutate(
        { name: uploadName, file: uploadFile, attribution: uploadAttribution, color: uploadColor, opacity: opacityNum, density },
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
    } else {
      baseMapUploadMutation.mutate(
        { name: uploadName, file: uploadFile, attribution: uploadAttribution },
        {
          onSuccess: () => {
            setUploadOpen(false);
            setToast({ open: true, message: "Base map uploaded successfully", severity: "success" });
          },
          onError: (err: Error) => {
            setUploadError(err.message || "Failed to upload. Please try again.");
          },
        },
      );
    }
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
    if (isOverlaysTab && (isNaN(opacityNum) || opacityNum < 0 || opacityNum > 1)) {
      setUrlError("Opacity must be between 0 and 1");
      return;
    }
    setUrlError(null);

    if (isOverlaysTab) {
      overlayAddUrlMutation.mutate(
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
    } else {
      baseMapAddUrlMutation.mutate(
        { name: urlName, tileUrl: urlTileUrl, attribution: urlAttribution },
        {
          onSuccess: () => {
            setUrlOpen(false);
            setToast({ open: true, message: "URL base map added successfully", severity: "success" });
          },
          onError: (err: Error) => {
            setUrlError(err.message || "Failed to add URL base map.");
          },
        },
      );
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    const mutation = deleteMode === "overlay" ? overlayDeleteMutation : baseMapDeleteMutation;
    const successMessage = deleteMode === "overlay" ? "Overlay deleted successfully" : "Base map deleted successfully";
    mutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setDeleteError(null);
        setToast({ open: true, message: successMessage, severity: "success" });
      },
      onError: (err: Error) => {
        setDeleteError(err.message || "Failed to delete.");
      },
    });
  };

  const isLoading = isOverlaysTab ? overlaysLoading : basemapsLoading;
  const isFetching = isOverlaysTab ? overlaysFetching : basemapsFetching;
  const isError = isOverlaysTab ? overlaysError : basemapsError;
  const refetch = isOverlaysTab ? refetchOverlays : refetchBasemaps;
  const items = isOverlaysTab ? overlays : basemaps;

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
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pb: 0 }}>
        <Typography variant="overline" sx={{ letterSpacing: 2, color: "text.secondary" }}>
          Admin · Map Management
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
          <Typography variant="h5" fontWeight={600}>
            {isOverlaysTab ? "Overlay Layers" : "Base Maps"}
          </Typography>
          <Chip
            label={`${items.length} ${isOverlaysTab ? "overlay" : "custom map"}${items.length !== 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{ mt: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab value="basemaps" label="Base Maps" />
          <Tab value="overlays" label="Overlay Layers" />
        </Tabs>

        <Box sx={{ display: "flex", gap: 1, mt: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
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
            {isOverlaysTab ? "Upload Overlay" : "Upload Map File"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={handleUrlOpen}
            size="small"
          >
            {isOverlaysTab ? "Add Tile URL" : "Add Tile URL"}
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
              {isOverlaysTab && <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>}
              <TableCell sx={{ fontWeight: 700 }}>{isOverlaysTab ? "Tile URL / Data" : "Tile URL"}</TableCell>
              {isOverlaysTab && <TableCell sx={{ fontWeight: 700 }}>Color</TableCell>}
              <TableCell sx={{ fontWeight: 700 }}>Attribution</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isOverlaysTab ? 7 : 5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={isOverlaysTab ? 7 : 5} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 40, color: "error.main" }} />
                    <Typography color="text.secondary">
                      Failed to load {isOverlaysTab ? "overlays" : "base maps"}. Check tileserver connection.
                    </Typography>
                    <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => refetch()}>
                      Retry
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOverlaysTab ? 7 : 5} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <AddIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                    <Typography color="text.secondary">
                      {isOverlaysTab
                        ? "No overlay layers yet. Upload a file or add a tile URL."
                        : "No custom base maps yet. Upload a map file or add a tile URL."}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                if (isOverlaysTab) {
                  const ov = item as unknown as Overlay;
                  return (
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
                        <Chip label={ov.sourceType} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
                      </TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                        }}
                        title={ov.tileUrl}
                      >
                        {ov.tileUrl}
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
                      <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                        {ov.attribution || "—"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => { setDeleteTarget(ov); setDeleteMode("overlay"); setDeleteError(null); }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                }
                const bm = item as unknown as BaseMap;
                return (
                  <TableRow key={bm.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{bm.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={bm.sourceType}
                        size="small"
                        color={bm.type === "file" ? "info" : "default"}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase" }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                      }}
                      title={bm.tileUrl}
                    >
                      {bm.tileUrl}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                      {bm.attribution || "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => { setDeleteTarget(bm); setDeleteMode("basemap"); setDeleteError(null); }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="xs">
        <DialogTitle>{isOverlaysTab ? "Upload Overlay File" : "Upload Base Map File"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label={isOverlaysTab ? "Overlay Name" : "Base Map Name"}
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
                accept={isOverlaysTab ? ".mbtiles,.db,.sqlite,.geojson,.json,.kml,.kmz,.zip,.000,.parquet" : ".mbtiles,.db,.sqlite"}
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  if (f && !uploadName.trim()) {
                    setUploadName(f.name.replace(isOverlaysTab ? /\.(mbtiles|db|sqlite|geojson|json|kml|kmz|zip|000|parquet)$/i : /\.(mbtiles|db|sqlite)$/i, ""));
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
                {isOverlaysTab
                  ? "Supported: .mbtiles, .db, .sqlite, .geojson, .json, .kml, .kmz, .zip, .000 (ENC), .parquet (density)"
                  : "Supported: .mbtiles, .db, .sqlite"}
              </Typography>
            </Box>
            {isOverlaysTab && (
              <Box sx={{ display: "flex", gap: 2 }}>
                {!isParquetFile && (
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
                )}
                <TextField
                  label="Opacity"
                  value={uploadOpacity}
                  onChange={(e) => setUploadOpacity(e.target.value)}
                  size="small"
                  sx={{ flex: isParquetFile ? 1 : undefined, width: isParquetFile ? undefined : 100 }}
                  placeholder="0-1"
                />
              </Box>
            )}
            {isOverlaysTab && isParquetFile && (
              <>
                <TextField
                  label="Weight Column"
                  value={uploadWeightCol}
                  onChange={(e) => setUploadWeightCol(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="unique_mmsi_count"
                />
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="Max Zoom"
                    value={uploadMaxZoom}
                    onChange={(e) => setUploadMaxZoom(e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                    placeholder="18"
                    type="number"
                    inputProps={{ min: 1, max: 18 }}
                  />
                  <Select
                    value={uploadColorRamp}
                    size="small"
                    fullWidth
                    onChange={(e) => setUploadColorRamp(e.target.value as "heat" | "mono")}
                  >
                    <MenuItem value="heat">Heat</MenuItem>
                    <MenuItem value="mono">Mono</MenuItem>
                  </Select>
                </Box>
                {uploadColorRamp === "mono" && (
                  <TextField
                    label="Cell Fill Color"
                    value={uploadColor}
                    onChange={(e) => setUploadColor(e.target.value)}
                    size="small"
                    fullWidth
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
                )}
              </>
            )}
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
            disabled={isOverlaysTab ? overlayUploadMutation.isPending : baseMapUploadMutation.isPending}
          >
            {isOverlaysTab
              ? overlayUploadMutation.isPending ? "Uploading…" : "Upload"
              : baseMapUploadMutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* URL Dialog */}
      <Dialog open={urlOpen} onClose={() => setUrlOpen(false)} maxWidth="xs">
        <DialogTitle>{isOverlaysTab ? "Add Tile URL Overlay" : "Add Tile URL Base Map"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label={isOverlaysTab ? "Overlay Name" : "Base Map Name"}
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
            {isOverlaysTab && (
              <Select
                value={urlType}
                size="small"
                fullWidth
                onChange={(e) => setUrlType(e.target.value)}
              >
                <MenuItem value="tile">Tile (XYZ)</MenuItem>
                <MenuItem value="wms">WMS</MenuItem>
              </Select>
            )}
            {isOverlaysTab && (
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
            )}
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
            disabled={isOverlaysTab ? overlayAddUrlMutation.isPending : baseMapAddUrlMutation.isPending}
          >
            {isOverlaysTab
              ? overlayAddUrlMutation.isPending ? "Adding…" : "Add"
              : baseMapAddUrlMutation.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        maxWidth="xs"
      >
        <DialogTitle>{deleteMode === "overlay" ? "Delete Overlay" : "Delete Base Map"}</DialogTitle>
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
            disabled={deleteMode === "overlay" ? overlayDeleteMutation.isPending : baseMapDeleteMutation.isPending}
          >
            {deleteMode === "overlay"
              ? overlayDeleteMutation.isPending ? "Deleting…" : "Delete"
              : baseMapDeleteMutation.isPending ? "Deleting…" : "Delete"}
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
