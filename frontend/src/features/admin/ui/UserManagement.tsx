import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
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
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "../hooks/useUsers";
import type { User, UserCreateRequest, UserUpdateRequest } from "../model/types";

const ROLES = ["admin", "supervisor", "operator"];

const emptyCreate: UserCreateRequest = { username: "", password: "", role: "operator" };
const emptyUpdate: UserUpdateRequest = { username: "", password: "", role: "operator" };

export function UserManagement() {
  const theme = useTheme();
  const { data: users = [], isLoading, isFetching, isError, refetch } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<UserCreateRequest>(emptyCreate);
  const [editForm, setEditForm] = useState<UserUpdateRequest>(emptyUpdate);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q),
    );
  }, [users, deferredSearch]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  useEffect(() => {
    if (selectedUserId && !selectedUser) {
      setSelectedUserId(null);
      setIsEditing(false);
    }
  }, [selectedUserId, selectedUser]);

  useEffect(() => {
    if (selectedUser && !isEditing) {
      setEditForm({ username: selectedUser.username, role: selectedUser.role });
    }
  }, [selectedUser, isEditing]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleCreateOpen = () => {
    setCreateForm(emptyCreate);
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUserId(user.id);
    setIsEditing(false);
    setEditError(null);
    setEditForm({ username: user.username, role: user.role });
  };

  const handleStartEdit = () => {
    if (!selectedUser) return;
    setEditForm({ username: selectedUser.username, role: selectedUser.role });
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    if (selectedUser) {
      setEditForm({ username: selectedUser.username, role: selectedUser.role });
    }
  };

  const handleDeleteOpen = (user: User) => {
    setDeleteError(null);
    setDeleteTarget(user);
  };

  const handleCreateSubmit = () => {
    if (!createForm.username.trim()) {
      setCreateError("Username is required");
      return;
    }
    if (!createForm.password.trim()) {
      setCreateError("Password is required");
      return;
    }
    createMutation.mutate(createForm, {
      onSuccess: () => {
        setCreateOpen(false);
        setCreateForm(emptyCreate);
        setToast({ open: true, message: "User created successfully", severity: "success" });
      },
      onError: (err: Error) => {
        setCreateError(err.message);
        if (!err.message.includes("Username") && !err.message.includes("Password")) {
          setToast({ open: true, message: err.message, severity: "error" });
        }
      },
    });
  };

  const handleEditSubmit = () => {
    if (!selectedUser) return;
    const payload: UserUpdateRequest = {};
    if (editForm.username && editForm.username !== selectedUser.username)
      payload.username = editForm.username;
    if (editForm.password?.trim()) payload.password = editForm.password;
    if (editForm.role && editForm.role !== selectedUser.role) payload.role = editForm.role;

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate(
      { userId: selectedUser.id, data: payload },
      {
        onSuccess: () => {
          setIsEditing(false);
          setEditForm(emptyUpdate);
          setToast({ open: true, message: "User updated successfully", severity: "success" });
        },
        onError: (err: Error) => {
          setEditError(err.message);
          if (!err.message.includes("Username") && !err.message.includes("Password")) {
            setToast({ open: true, message: err.message, severity: "error" });
          }
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
        setToast({ open: true, message: "User deleted successfully", severity: "success" });
      },
      onError: (err: Error) => {
        setDeleteError(err.message || "Failed to delete user. Check your connection and try again.");
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
      {/* ── Header ── */}
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pb: 2 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 2, color: "text.secondary" }}
        >
          Admin · User Management
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 0.5,
          }}
        >
          <Typography variant="h5" fontWeight={600}>
            Users
          </Typography>
          <Chip
            icon={<PersonIcon sx={{ fontSize: 14 }} />}
            label={`${filtered.length} user${filtered.length !== 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="Search users"
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: "100%", sm: 280 },
              "& .MuiOutlinedInput-root": {
                bgcolor: alpha(theme.palette.background.default, 0.6),
              },
            }}
          />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? (
                    <CircularProgress size={18} />
                  ) : (
                    <RefreshIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateOpen}
              size="small"
            >
              Add User
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* ── Split: Table (left) + Details (right) ── */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ── Left: Table ── */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TableContainer sx={{ flexGrow: 1, overflow: "auto" }}>
            <Table size="small" stickyHeader aria-label="User management table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <ErrorOutlineIcon sx={{ fontSize: 40, color: "error.main" }} />
                        <Typography color="text.secondary">
                          Failed to load users. Check your connection and try again.
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
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <PersonAddIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                        <Typography color="text.secondary">
                          {deferredSearch ? "No users match your search." : "No users yet."}
                        </Typography>
                        {!deferredSearch && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={handleCreateOpen}
                          >
                            Add your first user
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((user) => (
                    <TableRow
                      key={user.id}
                      hover
                      selected={selectedUserId === user.id}
                      onClick={() => handleSelectUser(user)}
                      sx={{
                        cursor: "pointer",
                        "&:last-child td": { border: 0 },
                        ...(selectedUserId === user.id && {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        }),
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={user.username}
                      >
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          size="small"
                          color={
                            user.role === "admin"
                              ? "warning"
                              : user.role === "supervisor"
                                ? "info"
                                : "default"
                          }
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filtered.length}
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

        {/* ── Right: User Details Panel ── */}
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
          {!selectedUser ? (
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
              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 64, height: 64 }}>
                <PersonIcon sx={{ fontSize: 32, color: "text.secondary" }} />
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                Select a user from the table to view details.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 3 }}>
              {/* ── Profile header ── */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor:
                      selectedUser.role === "admin"
                        ? "warning.main"
                        : selectedUser.role === "supervisor"
                          ? "info.main"
                          : "primary.main",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                  }}
                >
                  {selectedUser.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={600} noWrap>
                    {selectedUser.username}
                  </Typography>
                  <Chip
                    label={selectedUser.role}
                    size="small"
                    color={
                      selectedUser.role === "admin"
                        ? "warning"
                        : selectedUser.role === "supervisor"
                          ? "info"
                          : "default"
                    }
                    sx={{
                      mt: 0.5,
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  />
                </Box>
              </Box>

              <Divider />

              {/* ── View / Edit fields ── */}
              {isEditing ? (
                <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    label="Username"
                    value={editForm.username ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    size="small"
                    fullWidth
                    autoComplete="username"
                    error={Boolean(editError && editError.includes("Username"))}
                    helperText={editError && editError.includes("Username") ? editError : undefined}
                  />
                  <TextField
                    label="New Password"
                    type={showEditPassword ? "text" : "password"}
                    value={editForm.password ?? ""}
                    autoComplete="new-password"
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    placeholder="Leave blank to keep current"
                    size="small"
                    fullWidth
                    helperText={
                      editForm.password && editForm.password.length > 0 && editForm.password.length < 8
                        ? "Password should be at least 8 characters"
                        : undefined
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showEditPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowEditPassword(!showEditPassword)}
                            edge="end"
                            size="small"
                          >
                            {showEditPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      label="Role"
                      value={editForm.role ?? "operator"}
                      data-testid="edit-role"
                      onChange={(e) =>
                        setEditForm({ ...editForm, role: e.target.value })
                      }
                    >
                      {ROLES.map((r) => (
                        <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {editError && !editError.includes("Username") && !editError.includes("Password") && (
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      User ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                      {selectedUser.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Username
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedUser.username}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Role
                    </Typography>
                    <Typography variant="body1" fontWeight={500} sx={{ textTransform: "capitalize" }}>
                      {selectedUser.role}
                    </Typography>
                  </Box>

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
                      onClick={() => handleDeleteOpen(selectedUser)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Create Dialog ── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        aria-labelledby="create-user-title"
      >
        <DialogTitle id="create-user-title">Add User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Username"
              value={createForm.username}
              onChange={(e) =>
                setCreateForm({ ...createForm, username: e.target.value })
              }
              autoFocus
              size="small"
              required
              autoComplete="username"
              sx={{ width: 280 }}
              error={Boolean(createError && createError.includes("Username"))}
              helperText={createError && createError.includes("Username") ? createError : undefined}
            />
            <TextField
              label="Password"
              type={showCreatePassword ? "text" : "password"}
              value={createForm.password}
              required
              autoComplete="new-password"
              onChange={(e) =>
                setCreateForm({ ...createForm, password: e.target.value })
              }
              size="small"
              sx={{ width: 320 }}
              inputProps={{ "data-testid": "create-password" }}
              error={Boolean(createError && createError.includes("Password"))}
              helperText={
                createError && createError.includes("Password")
                  ? createError
                  : createForm.password.length > 0 && createForm.password.length < 8
                    ? "Password should be at least 8 characters"
                    : undefined
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showCreatePassword ? "Hide password" : "Show password"}
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      edge="end"
                      size="small"
                    >
                      {showCreatePassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ width: 240 }}>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={createForm.role}
                data-testid="create-role"
                onChange={(e) =>
                  setCreateForm({ ...createForm, role: e.target.value })
                }
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        maxWidth="xs"
        aria-labelledby="delete-user-title"
      >
        <DialogTitle id="delete-user-title">Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.username}</strong>? This action cannot
            be undone.
          </Typography>
          {deleteTarget?.role === "admin" && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is an admin user. Ensure at least one admin account remains.
            </Alert>
          )}
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

      {/* ── Toast ── */}
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
