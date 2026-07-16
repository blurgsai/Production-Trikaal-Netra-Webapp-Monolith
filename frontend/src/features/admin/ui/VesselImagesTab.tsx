import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ImageIcon from "@mui/icons-material/Image";
import SaveIcon from "@mui/icons-material/Save";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useVesselImages } from "../hooks/useVesselImages";
import { useVesselImageTypes } from "../hooks/useVesselImageTypes";
import { useCreateVesselImage } from "../hooks/useCreateVesselImage";
import { useUpdateVesselImage } from "../hooks/useUpdateVesselImage";
import { useDeleteVesselImage } from "../hooks/useDeleteVesselImage";
import { useBulkDeleteVesselImages } from "../hooks/useBulkDeleteVesselImages";
import { getVesselImageUrl } from "../api/dataManagementApi";
import type { VesselImage, VesselImageUpdateRequest } from "../model/dataManagementTypes";

const emptyUpdate: VesselImageUpdateRequest = { imo: "" };

export function VesselImagesTab() {
  const theme = useTheme();
  const { data: imageTypes = [] } = useVesselImageTypes();
  const createMutation = useCreateVesselImage();
  const updateMutation = useUpdateVesselImage();
  const deleteMutation = useDeleteVesselImage();
  const bulkDeleteMutation = useBulkDeleteVesselImages();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [mimeTypeFilter, setMimeTypeFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
      setSelectedImageIndex(null);
      setIsEditing(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, isError, refetch } = useVesselImages({
    search: debouncedSearch || undefined,
    mimeType: mimeTypeFilter !== "all" ? mimeTypeFilter : undefined,
    page,
    pageSize: rowsPerPage,
  });
  const images = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VesselImage | null>(null);
  const [editForm, setEditForm] = useState<VesselImageUpdateRequest>(emptyUpdate);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Image upload state
  const MAX_IMAGES = 50;
  const MAX_ZIP_SIZE_MB = 50;
  const [imagePreviews, setImagePreviews] = useState<{ file: File; preview: string; imo: string }[]>([]);
  const [isZipUpload, setIsZipUpload] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const PREVIEW_PAGE_SIZE = 10;
  // Image preview URL state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedImage = useMemo(
    () => (selectedImageIndex !== null ? images[selectedImageIndex] ?? null : null),
    [images, selectedImageIndex],
  );

  useEffect(() => {
    if (selectedImageIndex !== null && !selectedImage) {
      setSelectedImageIndex(null);
      setIsEditing(false);
    }
  }, [selectedImageIndex, selectedImage]);

  useEffect(() => {
    if (selectedImage && !isEditing) {
      setEditForm({ imo: selectedImage.imo });
    }
  }, [selectedImage, isEditing]);

  // Load image preview URL when selection changes
  useEffect(() => {
    let revoke: string | null = null;

    if (selectedImage) {
      // Revoke previous blob URL
      setPreviewImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewLoading(true);

      getVesselImageUrl(selectedImage.imo)
        .then((blobUrl) => {
          revoke = blobUrl;
          setPreviewImageUrl(blobUrl);
        })
        .catch((err) => {
          console.error("Failed to load image:", err);
          setPreviewImageUrl(null);
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    } else {
      setPreviewImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewLoading(false);
    }

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [selectedImage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleCreateOpen = () => {
    setImagePreviews([]);
    setIsZipUpload(false);
    setZipFile(null);
    setCreateError(null);
    setPreviewPage(0);
    setCreateOpen(true);
  };

  const handleSelectImage = (index: number, image: VesselImage) => {
    setSelectedImageIndex(index);
    setIsEditing(false);
    setEditError(null);
    setEditForm({ imo: image.imo });
  };

  const handleStartEdit = () => {
    if (!selectedImage) return;
    setEditForm({ imo: selectedImage.imo });
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    if (selectedImage) {
      setEditForm({ imo: selectedImage.imo });
    }
  };

  const handleDeleteOpen = (image: VesselImage) => {
    setDeleteError(null);
    setDeleteTarget(image);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCreateError(null);
    setPreviewPage(0);

    if (files.length === 0) return;

    // Check if a zip file is selected
    const zip = files.find((f) => f.name.toLowerCase().endsWith('.zip'));
    if (zip) {
      if (zip.size > MAX_ZIP_SIZE_MB * 1024 * 1024) {
        setCreateError(`ZIP file exceeds the ${MAX_ZIP_SIZE_MB} MB limit`);
        return;
      }
      setIsZipUpload(true);
      setZipFile(zip);
      setImagePreviews([]);
      return;
    }

    // Image files
    if (files.length > MAX_IMAGES) {
      setCreateError(`Maximum ${MAX_IMAGES} images allowed. You selected ${files.length}.`);
      return;
    }

    setIsZipUpload(false);
    setZipFile(null);

    const previews: { file: File; preview: string; imo: string }[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        const match = file.name.match(/^(\d+)\./);
        const imo = match ? match[1] : "";
        previews.push({ file, preview, imo });
        if (previews.length === files.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImoChange = (index: number, newImo: string) => {
    const updated = [...imagePreviews];
    updated[index].imo = newImo;
    setImagePreviews(updated);
  };

  const handleCreateSubmit = async () => {
    setCreateError(null);

    if (isZipUpload && zipFile) {
      // Single zip upload
      try {
        const results = await createMutation.mutateAsync({
          files: [zipFile],
          imos: [],
        });
        setCreateOpen(false);
        setImagePreviews([]);
        setZipFile(null);
        setIsZipUpload(false);
        setToast({
          open: true,
          message: `Successfully uploaded ${results.length} image${results.length !== 1 ? "s" : ""} from ZIP`,
          severity: "success",
        });
      } catch (err: any) {
        setCreateError(err?.response?.data?.detail || err?.message || "Failed to upload ZIP");
      }
      return;
    }

    if (imagePreviews.length === 0) {
      setCreateError("Please select at least one file");
      return;
    }

    // Validate that all images have an IMO
    const missing = imagePreviews.filter((p) => !p.imo.trim());
    if (missing.length > 0) {
      setCreateError(`${missing.length} image${missing.length !== 1 ? "s" : ""} missing IMO value`);
      return;
    }

    try {
      const results = await createMutation.mutateAsync({
        files: imagePreviews.map((p) => p.file),
        imos: imagePreviews.map((p) => p.imo),
      });
      setCreateOpen(false);
      setImagePreviews([]);
      setToast({
        open: true,
        message: `Successfully uploaded ${results.length} image${results.length !== 1 ? "s" : ""}`,
        severity: "success",
      });
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || err?.message || "Failed to upload images");
    }
  };

  const handleEditSubmit = () => {
    if (!selectedImage) return;
    if (!editForm.imo || editForm.imo === selectedImage.imo) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate(
      { id: selectedImage.id, data: editForm },
      {
        onSuccess: () => {
          setIsEditing(false);
          setEditForm(emptyUpdate);
          setToast({ open: true, message: "Image updated successfully", severity: "success" });
        },
        onError: (err: Error) => {
          setEditError(err.message);
          setToast({ open: true, message: err.message, severity: "error" });
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
        setToast({ open: true, message: "Image deleted successfully", severity: "success" });
      },
      onError: (err: Error) => {
        setDeleteError(err.message || "Failed to delete image. Check your connection and try again.");
      },
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
      {/* Header */}
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Vessel Images
          </Typography>
          <Chip
            icon={<ImageIcon sx={{ fontSize: 14 }} />}
            label={`${totalCount} image${totalCount !== 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="Search images"
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: "flex", alignItems: "center", pl: 1 }}>
                  <SearchIcon sx={{ fontSize: 18 }} />
                </Box>
              ),
            }}
            sx={{
              width: { xs: "100%", sm: 280 },
              "& .MuiOutlinedInput-root": {
                bgcolor: alpha(theme.palette.background.default, 0.6),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={mimeTypeFilter}
              label="Filter by Type"
              onChange={(e) => setMimeTypeFilter(e.target.value)}
              startAdornment={
                <Box sx={{ display: "flex", alignItems: "center", pl: 1 }}>
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </Box>
              }
            >
              <MenuItem value="all">All Types</MenuItem>
              {imageTypes
                .filter((type) => type !== "image/jpg")
                .map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace("image/", "").toUpperCase()}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            {selectedIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                size="small"
                disabled={bulkDeleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete ${selectedIds.size} selected image${selectedIds.size !== 1 ? "s" : ""}?`)) return;
                  bulkDeleteMutation.mutate([...selectedIds], {
                    onSuccess: (res) => {
                      setSelectedIds(new Set());
                      setSelectedImageIndex(null);
                      setIsEditing(false);
                      setToast({ open: true, message: `${res.deleted} image${res.deleted !== 1 ? "s" : ""} deleted`, severity: "success" });
                    },
                    onError: (err: Error) => {
                      setToast({ open: true, message: err.message || "Bulk delete failed", severity: "error" });
                    },
                  });
                }}
              >
                {bulkDeleteMutation.isPending ? "Deleting…" : `Delete (${selectedIds.size})`}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateOpen}
              size="small"
            >
              Upload Images
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Split: Table (left) + Details (right) */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: Table */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TableContainer sx={{ flexGrow: 1, overflow: "auto" }}>
            <Table size="small" stickyHeader aria-label="Vessel images table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      indeterminate={selectedIds.size > 0 && selectedIds.size < images.length}
                      checked={images.length > 0 && selectedIds.size === images.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(images.map((i: VesselImage) => i.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IMO</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>File Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Uploaded</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <ErrorOutlineIcon sx={{ fontSize: 40, color: "error.main" }} />
                        <Typography color="text.secondary">
                          Failed to load images. Check your connection and try again.
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={() => refetch()}
                        >
                          Retry
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : images.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <ImageIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                        <Typography color="text.secondary">
                          {debouncedSearch ? "No images match your search." : "No vessel images yet."}
                        </Typography>
                        {!debouncedSearch && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={handleCreateOpen}
                          >
                            Upload your first image
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  images.map((image: VesselImage, idx: number) => {
                    const globalIndex = idx;
                    return (
                    <TableRow
                      key={`${image.id}-${globalIndex}`}
                      hover
                      selected={selectedImageIndex === globalIndex}
                      onClick={() => handleSelectImage(globalIndex, image)}
                      sx={{
                        cursor: "pointer",
                        "&:last-child td": { border: 0 },
                        ...(selectedImageIndex === globalIndex && {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        }),
                      }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={selectedIds.has(image.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.add(image.id);
                              } else {
                                next.delete(image.id);
                              }
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 500 }}>{image.imo}</TableCell>
                      <TableCell
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 200,
                        }}
                        title={image.fileName}
                      >
                        {image.fileName}
                      </TableCell>
                      <TableCell>{formatFileSize(image.fileSize)}</TableCell>
                      <TableCell sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                        {new Date(image.uploadedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{ flexShrink: 0, "& .MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 0.5 } }}
          />
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Right: Details Panel */}
        <Box
          sx={{
            width: { xs: "100%", sm: 340, md: 380 },
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "auto",
            bgcolor: alpha(theme.palette.background.default, 0.3),
          }}
        >
          {!selectedImage ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                height: "100%",
                p: 4,
                textAlign: "center",
              }}
            >
              <ImageIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Select a vessel image from the table to view details.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Image Preview */}
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Image Preview
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "background.default",
                  }}
                >
                  <Box sx={{ height: 200, width: "100%", borderRadius: 1, overflow: "hidden" }}>
                    {previewLoading ? (
                      <Box
                        sx={{
                          height: "100%",
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "action.hover",
                        }}
                      >
                        <CircularProgress size={24} />
                      </Box>
                    ) : previewImageUrl ? (
                      <img
                        key={selectedImage.id}
                        src={previewImageUrl}
                        alt={selectedImage.fileName}
                        style={{
                          height: "100%",
                          width: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: "100%",
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "text.secondary",
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography variant="body2">Failed to load image</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box>
                <Typography variant="overline" color="text.secondary">
                  IMO
                </Typography>
                <Typography variant="body1" fontWeight={500} sx={{ fontFamily: "monospace" }}>
                  {selectedImage.imo}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  File Name
                </Typography>
                <Typography variant="body1" fontWeight={500} noWrap>
                  {selectedImage.fileName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  File Size
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatFileSize(selectedImage.fileSize)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  MIME Type
                </Typography>
                <Typography variant="body2">
                  {selectedImage.mimeType}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Uploaded
                </Typography>
                <Typography variant="body2">
                  {new Date(selectedImage.uploadedAt).toLocaleString()}
                </Typography>
              </Box>

              <Divider />

              {isEditing ? (
                <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    label="IMO"
                    value={editForm.imo ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, imo: e.target.value })
                    }
                    size="small"
                    fullWidth
                    error={Boolean(editError && editError.includes("IMO"))}
                    helperText={editError && editError.includes("IMO") ? editError : undefined}
                  />

                  {editError && !editError.includes("IMO") && (
                    <Alert severity="error">{editError}</Alert>
                  )}

                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={handleCancelEdit}
                      size="small"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleEditSubmit}
                      disabled={updateMutation.isPending}
                      size="small"
                    >
                      {updateMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleStartEdit}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteOpen(selectedImage)}
                  >
                    Delete
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="create-images-title"
      >
        <DialogTitle id="create-images-title">Upload Vessel Images</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Select Images or ZIP file"
              type="file"
              onChange={handleFileSelect}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                inputProps: {
                  accept: "image/*,.zip",
                  multiple: true,
                },
              }}
              helperText={`Select up to ${MAX_IMAGES} images or a single ZIP file (max ${MAX_ZIP_SIZE_MB} MB)`}
            />

            {isZipUpload && zipFile && (
              <Alert severity="info" sx={{ mt: 1 }}>
                ZIP file selected: <strong>{zipFile.name}</strong> ({(zipFile.size / (1024 * 1024)).toFixed(1)} MB).
                IMO values will be extracted from image filenames (e.g., 123456.jpg).
              </Alert>
            )}

            {!isZipUpload && imagePreviews.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Review images ({imagePreviews.length}):
                </Typography>
                <ImageList cols={2} gap={8}>
                  {imagePreviews
                    .slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE)
                    .map((item, idx) => {
                      const globalIdx = previewPage * PREVIEW_PAGE_SIZE + idx;
                      return (
                        <ImageListItem key={globalIdx}>
                          <img
                            src={item.preview}
                            alt={item.file.name}
                            loading="lazy"
                            style={{ height: 150, objectFit: "cover" }}
                          />
                          <ImageListItemBar
                            title={
                              <input
                                value={item.imo}
                                onChange={(e) => handleImoChange(globalIdx, e.target.value)}
                                placeholder="IMO"
                                onFocus={(e) => { e.target.style.borderBottom = "1px solid #90caf9"; }}
                                onBlur={(e) => { e.target.style.borderBottom = "1px solid transparent"; }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  borderBottom: "1px solid transparent",
                                  outline: "none",
                                  color: !item.imo.trim() ? "#f44336" : "white",
                                  fontSize: "0.875rem",
                                  width: "100%",
                                  padding: "4px 0",
                                  cursor: "text",
                                  caretColor: "#90caf9",
                                }}
                              />
                            }
                            position="below"
                            sx={{ bgcolor: "rgba(0,0,0,0.5)", px: 1 }}
                          />
                        </ImageListItem>
                      );
                    })}
                </ImageList>
                {imagePreviews.length > PREVIEW_PAGE_SIZE && (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 1 }}>
                    <Button
                      size="small"
                      disabled={previewPage === 0}
                      onClick={() => setPreviewPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {previewPage + 1} / {Math.ceil(imagePreviews.length / PREVIEW_PAGE_SIZE)}
                    </Typography>
                    <Button
                      size="small"
                      disabled={(previewPage + 1) * PREVIEW_PAGE_SIZE >= imagePreviews.length}
                      onClick={() => setPreviewPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {createError && (
              <Alert severity="error">{createError}</Alert>
            )}

            <Alert severity="info" sx={{ mt: 1 }}>
              For single images, provide IMO numbers. For ZIP files, IMO will be extracted from image filenames (e.g., 123456.jpg). Images with non-numeric filenames will be skipped.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={createMutation.isPending || (!isZipUpload && imagePreviews.length === 0) || (isZipUpload && !zipFile)}
          >
            {createMutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        maxWidth="xs"
        aria-labelledby="delete-image-title"
      >
        <DialogTitle id="delete-image-title">Delete Image</DialogTitle>
        <DialogContent>
          <Typography>
            Delete image for <strong>IMO {deleteTarget?.imo}</strong>? This action cannot
            be undone.
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
          >
            Cancel
          </Button>
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
