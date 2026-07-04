import { useState } from "react";
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
} from "@mui/material";
import { useAuth } from "@/features/auth";

function Header() {
  const { logoutUser, username, role } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
          <Chip
            label={displayName}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, borderRadius: 1.5, height: 30 }}
          />

          <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
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
            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
