import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "@/features/auth";
import { useChatbot } from "@/features/chatbot";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser, username, role } = useAuth();
  const { toggleChatbot } = useChatbot();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isAdminPage = location.pathname.startsWith("/admin-panel");

  const handleAdminPanel = () => {
    handleMenuClose();
    navigate("/admin-panel");
  };

  const handleBackToApp = () => {
    handleMenuClose();
    navigate("/map");
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logoutUser();
  };

  const displayName = username
    ? `${username.slice(0, 1).toUpperCase()}${username.split(" ")[0]?.slice(1)}`
    : "";

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", px: 2, minHeight: 56 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
            Trikaal Netra
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Tooltip title="Chatbot">
            <IconButton
              onClick={toggleChatbot}
              sx={{ color: "primary.light" }}
              aria-label="Toggle chatbot"
            >
              <AutoAwesomeIcon />
            </IconButton>
          </Tooltip>

          <Chip
            label={displayName}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, borderRadius: 1.5, height: 30 }}
          />

          <IconButton
            onClick={handleMenuOpen}
            sx={{ p: 0 }}
            aria-label={`Open account menu for ${displayName}`}
          >
            <Avatar alt={displayName} sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText" }}>
              {displayName.slice(0, 1).toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{ zIndex: 10000 }}
          >
            <Box sx={{ px: 2, py: 1.5, minWidth: 180 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: 0.8, mb: 0.5 }}>
                Signed in as
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                {displayName}
              </Typography>
              <Chip
                label={role}
                size="small"
                color="primary"
                sx={{ mt: 1, height: 20, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}
              />
            </Box>
            {isAdminPage && (
              <MenuItem onClick={handleBackToApp}>
                <ArrowBackIcon sx={{ fontSize: 18, mr: 1 }} />
                Back to App
              </MenuItem>
            )}
            {role === "admin" && !isAdminPage && (
              <MenuItem onClick={handleAdminPanel}>
                <AdminPanelSettingsIcon sx={{ fontSize: 18, mr: 1, color: "warning.main" }} />
                Admin Panel
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              <LogoutIcon sx={{ fontSize: 18, mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
