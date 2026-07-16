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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import SaveIcon from "@mui/icons-material/Save";
import { useDatabaseUploads } from "../hooks/useDatabaseUploads";
import { useDatabaseNames } from "../hooks/useDatabaseNames";
import { useCreateDatabaseUpload } from "../hooks/useCreateDatabaseUpload";
import { useUpdateDatabaseUpload } from "../hooks/useUpdateDatabaseUpload";
import { useDeleteDatabaseUpload } from "../hooks/useDeleteDatabaseUpload";
import { useBulkDeleteDatabaseUploads } from "../hooks/useBulkDeleteDatabaseUploads";
import type { DatabaseUpload, DatabaseUploadCreateRequest, DatabaseUploadUpdateRequest } from "../model/dataManagementTypes";

const emptyCreate: DatabaseUploadCreateRequest = { databaseName: "", mmsiField: "", file: new File([], "") };

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
const emptyUpdate: DatabaseUploadUpdateRequest = {};

export function DatabaseUploadsTab() {
  const theme = useTheme();
  const createMutation = useCreateDatabaseUpload();
  const updateMutation = useUpdateDatabaseUpload();
  const deleteMutation = useDeleteDatabaseUpload();
  const bulkDeleteMutation = useBulkDeleteDatabaseUploads();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
      setSelectedUploadIndex(null);
      setIsEditing(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: databaseNames = [] } = useDatabaseNames();



  const { data, isLoading, isFetching, isError, refetch } = useDatabaseUploads({
    databaseName: selectedDatabaseName || undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize: rowsPerPage,
  });
  const uploads = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUploadIndex, setSelectedUploadIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DatabaseUpload | null>(null);
  const [createForm, setCreateForm] = useState<DatabaseUploadCreateRequest>(emptyCreate);
  const [editForm, setEditForm] = useState<DatabaseUploadUpdateRequest>(emptyUpdate);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mmsiField, setMmsiField] = useState<string>("");

  // Append data state
  const [appendOpen, setAppendOpen] = useState(false);
  const [appendCsvFile, setAppendCsvFile] = useState<File | null>(null);
  const [appendCsvHeaders, setAppendCsvHeaders] = useState<string[]>([]);
  const [appendMmsiField, setAppendMmsiField] = useState<string>("");
  const [appendError, setAppendError] = useState<string | null>(null);

  const selectedUpload = useMemo(
    () => (selectedUploadIndex !== null ? uploads[selectedUploadIndex] ?? null : null),
    [uploads, selectedUploadIndex],
  );

  useEffect(() => {
    if (selectedUploadIndex !== null && !selectedUpload) {
      setSelectedUploadIndex(null);
      setIsEditing(false);
    }
  }, [selectedUploadIndex, selectedUpload]);

  useEffect(() => {
    if (selectedUpload && !isEditing) {
      setEditForm({ databaseName: selectedUpload.databaseName, mmsi: selectedUpload.mmsi });
    }
  }, [selectedUpload, isEditing]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleCreateOpen = () => {
    setCreateForm(emptyCreate);
    setCsvFile(null);
    setCsvHeaders([]);
    setMmsiField("");
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleSelectUpload = (index: number, upload: DatabaseUpload) => {
    setSelectedUploadIndex(index);
    setIsEditing(false);
    setEditError(null);
    setEditForm({ databaseName: upload.databaseName, mmsi: upload.mmsi });
  };

  const handleStartEdit = () => {
    if (!selectedUpload) return;
    setEditForm({ databaseName: selectedUpload.databaseName, mmsi: selectedUpload.mmsi });
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    if (selectedUpload) {
      setEditForm({ databaseName: selectedUpload.databaseName, mmsi: selectedUpload.mmsi });
    }
  };

  const handleDeleteOpen = (upload: DatabaseUpload) => {
    setDeleteError(null);
    setDeleteTarget(upload);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSVHeaders(file);
    }
  };

  const handleAppendCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAppendCsvFile(file);
      parseAppendCSVHeaders(file);
    }
  };

  const parseCSVHeaders = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        setCreateError("CSV file must have at least a header row and one data row");
        return;
      }

      // Preserve original case for headers
      const headers = lines[0].split(",").map((h) => h.trim());
      setCsvHeaders(headers);

      // Auto-select MMSI field if found (case-insensitive search)
      const mmsiCandidate = headers.find((h) =>
        h.toLowerCase().includes("mmsi"),
      );
      if (mmsiCandidate) {
        setMmsiField(mmsiCandidate);
      }
    };
    reader.readAsText(file);
  };

  const parseAppendCSVHeaders = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        setAppendError("CSV file must have at least a header row and one data row");
        return;
      }

      // Preserve original case for headers
      const headers = lines[0].split(",").map((h) => h.trim());
      setAppendCsvHeaders(headers);

      // Auto-select MMSI field if found (case-insensitive search)
      const mmsiCandidate = headers.find((h) =>
        h.toLowerCase().includes("mmsi"),
      );
      if (mmsiCandidate) {
        setAppendMmsiField(mmsiCandidate);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateSubmit = () => {
    if (!createForm.databaseName.trim()) {
      setCreateError("Database name is required");
      return;
    }
    if (!mmsiField.trim()) {
      setCreateError("Please select the MMSI field from the CSV");
      return;
    }
    if (!csvFile) {
      setCreateError("Please upload a CSV file");
      return;
    }

    // Check for unique database name
    const existingDatabase = databaseNames.find(
      (name: string) => name.toLowerCase() === createForm.databaseName.toLowerCase()
    );
    if (existingDatabase) {
      setCreateError(`Database "${createForm.databaseName}" already exists.`);
      return;
    }

    const payload: DatabaseUploadCreateRequest = {
      databaseName: createForm.databaseName,
      mmsiField: mmsiField,
      file: csvFile,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setSelectedDatabaseName(payload.databaseName);
        setPage(0);
        setSelectedUploadIndex(null);
        setCreateOpen(false);
        setCreateForm(emptyCreate);
        setCsvFile(null);
        setCsvHeaders([]);
        setMmsiField("");
        setToast({ open: true, message: "Database uploaded successfully", severity: "success" });
      },
      onError: (err: Error) => {
        setCreateError(err.message);
        setToast({ open: true, message: err.message, severity: "error" });
      },
    });
  };

  const handleAppendSubmit = () => {
    if (!selectedDatabaseName) return;
    if (!appendCsvFile) {
      setAppendError("Please upload a CSV file");
      return;
    }
    if (!appendMmsiField) {
      setAppendError("Please select the MMSI field from the CSV");
      return;
    }

    createMutation.mutate(
      { databaseName: selectedDatabaseName, mmsiField: appendMmsiField, file: appendCsvFile },
      {
        onSuccess: () => {
          setAppendOpen(false);
          setAppendCsvFile(null);
          setAppendCsvHeaders([]);
          setAppendMmsiField("");
          setAppendError(null);
          setToast({ open: true, message: "Data appended successfully", severity: "success" });
        },
        onError: (err: Error) => {
          setAppendError(err.message || "Failed to append data");
        },
      },
    );
  };

  const handleEditSubmit = () => {
    if (!selectedUpload) return;
    const payload: DatabaseUploadUpdateRequest = {};
    if (editForm.databaseName && editForm.databaseName !== selectedUpload.databaseName)
      payload.databaseName = editForm.databaseName;
    if (editForm.mmsi && editForm.mmsi !== selectedUpload.mmsi) payload.mmsi = editForm.mmsi;

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate(
      { id: selectedUpload.id, data: payload },
      {
        onSuccess: () => {
          setIsEditing(false);
          setEditForm(emptyUpdate);
          setToast({ open: true, message: "Database updated successfully", severity: "success" });
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
        setToast({ open: true, message: "Database deleted successfully", severity: "success" });
      },
      onError: (err: Error) => {
        setDeleteError(err.message || "Failed to delete database. Check your connection and try again.");
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
            Database Uploads
          </Typography>
          <Chip
            icon={<StorageIcon sx={{ fontSize: 14 }} />}
            label={`${totalCount} upload${totalCount !== 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Database</InputLabel>
            <Select
              label="Database"
              value={selectedDatabaseName}
              onChange={(e) => {
                setSelectedDatabaseName(e.target.value);
                setPage(0);
                setSelectedUploadIndex(null);
                setIsEditing(false);
              }}
              sx={{
                bgcolor: alpha(theme.palette.background.default, 0.6),
              }}
            >
              <MenuItem value="">All Databases</MenuItem>
              {databaseNames.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedDatabaseName && (
            <TextField
              size="small"
              label="Search uploads"
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
          )}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>
            {selectedDatabaseName && (
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? <CircularProgress size={18} /> : <RefreshIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {selectedIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                size="small"
                disabled={bulkDeleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete ${selectedIds.size} selected upload${selectedIds.size !== 1 ? "s" : ""}?`)) return;
                  bulkDeleteMutation.mutate([...selectedIds], {
                    onSuccess: (res) => {
                      setSelectedIds(new Set());
                      setSelectedUploadIndex(null);
                      setIsEditing(false);
                      setToast({ open: true, message: `${res.deleted} upload${res.deleted !== 1 ? "s" : ""} deleted`, severity: "success" });
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
            {selectedDatabaseName && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => {
                  setAppendOpen(true);
                  setAppendCsvFile(null);
                  setAppendCsvHeaders([]);
                  setAppendMmsiField("");
                  setAppendError(null);
                }}
              >
                Append Data
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateOpen}
              size="small"
            >
              Upload Database
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Split: Table (left) + Details (right) */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: Table */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {!selectedDatabaseName ? (
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
              <StorageIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Select a database from the dropdown to view its data.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ flexGrow: 1, overflow: "auto" }}>
                <Table size="small" stickyHeader aria-label="Database uploads table">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          indeterminate={selectedIds.size > 0 && selectedIds.size < uploads.length}
                          checked={uploads.length > 0 && selectedIds.size === uploads.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(uploads.map((u: DatabaseUpload) => u.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Database Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>MMSI</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6, color: "text.secondary" }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : isError ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <ErrorOutlineIcon sx={{ fontSize: 40, color: "error.main" }} />
                            <Typography color="text.secondary">
                              Failed to load uploads. Check your connection and try again.
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
                    ) : uploads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <StorageIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                            <Typography color="text.secondary">
                              {debouncedSearch ? "No uploads match your search." : "No database uploads yet."}
                            </Typography>
                            {!debouncedSearch && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={handleCreateOpen}
                              >
                                Upload your first database
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      uploads.map((upload: DatabaseUpload, idx: number) => {
                        const globalIndex = idx;
                        return (
                        <TableRow
                          key={`${upload.id}-${globalIndex}`}
                          hover
                          selected={selectedUploadIndex === globalIndex}
                          onClick={() => handleSelectUpload(globalIndex, upload)}
                          sx={{
                            cursor: "pointer",
                            "&:last-child td": { border: 0 },
                            ...(selectedUploadIndex === globalIndex && {
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                            }),
                          }}
                        >
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              size="small"
                              checked={selectedIds.has(upload.id)}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) {
                                    next.add(upload.id);
                                  } else {
                                    next.delete(upload.id);
                                  }
                                  return next;
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 500,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={upload.databaseName}
                          >
                            {upload.databaseName}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>{upload.mmsi}</TableCell>
                          <TableCell sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                            {new Date(upload.createdAt).toLocaleDateString()}
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
            </>
          )}
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
          {!selectedUpload ? (
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
              <StorageIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Select a database upload from the table to view details.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Database Name
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedUpload.databaseName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  MMSI
                </Typography>
                <Typography variant="body1" fontWeight={500} sx={{ fontFamily: "monospace" }}>
                  {selectedUpload.mmsi}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(selectedUpload.createdAt).toLocaleString()}
                </Typography>
              </Box>

              <Divider />

              {selectedUpload.data &&
                (Array.isArray(selectedUpload.data)
                  ? selectedUpload.data.flatMap((record: Record<string, any>, idx: number) =>
                      Object.entries(record).map(([key, value]) => (
                        <Box key={`${idx}-${key}`}>
                          <Typography variant="overline" color="text.secondary">
                            {formatKey(key)}
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                          </Typography>
                        </Box>
                      )),
                    )
                  : typeof selectedUpload.data === "object"
                    ? Object.entries(selectedUpload.data).map(([key, value]) => (
                        <Box key={key}>
                          <Typography variant="overline" color="text.secondary">
                            {formatKey(key)}
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                          </Typography>
                        </Box>
                      ))
                    : (
                        <Box>
                          <Typography variant="overline" color="text.secondary">
                            Data
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {String(selectedUpload.data)}
                          </Typography>
                        </Box>
                      ))}

              <Divider />

              {isEditing ? (
                <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    label="Database Name"
                    value={editForm.databaseName ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, databaseName: e.target.value })
                    }
                    size="small"
                    fullWidth
                    error={Boolean(editError && editError.includes("Database"))}
                    helperText={editError && editError.includes("Database") ? editError : undefined}
                  />
                  <TextField
                    label="MMSI"
                    value={editForm.mmsi ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, mmsi: e.target.value })
                    }
                    size="small"
                    fullWidth
                    error={Boolean(editError && editError.includes("MMSI"))}
                    helperText={editError && editError.includes("MMSI") ? editError : undefined}
                  />

                  {editError && !editError.includes("Database") && !editError.includes("MMSI") && (
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
                <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
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
                    onClick={() => handleDeleteOpen(selectedUpload)}
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
        maxWidth="sm"
        fullWidth
        aria-labelledby="create-database-title"
      >
        <DialogTitle id="create-database-title">Upload Database</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Database Name"
              value={createForm.databaseName}
              onChange={(e) =>
                setCreateForm({ ...createForm, databaseName: e.target.value })
              }
              size="small"
              fullWidth
              placeholder="Enter database name"
            />

            <TextField
              label="CSV File"
              type="file"
              onChange={handleCsvFileChange}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                inputProps: { accept: ".csv" },
              }}
            />

            {csvHeaders.length > 0 && (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>MMSI Field</InputLabel>
                  <Select
                    label="MMSI Field"
                    value={mmsiField}
                    onChange={(e) => setMmsiField(e.target.value)}
                  >
                    {csvHeaders.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Alert severity="info" sx={{ mt: 1 }}>
                  CSV file selected: {csvFile?.name}
                </Alert>
              </>
            )}

            {createError && (
              <Alert severity="error">{createError}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={createMutation.isPending || !csvFile}
          >
            {createMutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Append Data Dialog */}
      <Dialog
        open={appendOpen}
        onClose={() => setAppendOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="append-data-title"
      >
        <DialogTitle id="append-data-title">Append Data to {selectedDatabaseName}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="CSV File"
              type="file"
              onChange={handleAppendCsvFileChange}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                inputProps: { accept: ".csv" },
              }}
            />

            {appendCsvHeaders.length > 0 && (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>MMSI Field</InputLabel>
                  <Select
                    label="MMSI Field"
                    value={appendMmsiField}
                    onChange={(e) => setAppendMmsiField(e.target.value)}
                  >
                    {appendCsvHeaders.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Alert severity="info" sx={{ mt: 1 }}>
                  CSV file selected: {appendCsvFile?.name}
                </Alert>
              </>
            )}

            {appendError && (
              <Alert severity="error">{appendError}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAppendOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAppendSubmit}
            disabled={updateMutation.isPending || !appendCsvFile}
          >
            {updateMutation.isPending ? "Appending…" : "Append"}
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
        aria-labelledby="delete-database-title"
      >
        <DialogTitle id="delete-database-title">Delete Database</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.databaseName}</strong>? This action cannot
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
