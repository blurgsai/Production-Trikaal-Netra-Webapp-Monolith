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

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Trikaal Netra
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography variant="h6" color="primary.main" fontWeight={600}>
            {username?.slice(0, 1).toUpperCase()}
            {username?.split(" ")[0]?.slice(1)}
          </Typography>

          <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
            <Avatar alt="User Avatar" />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{ zIndex: 10000 }}
          >
            <Typography
              p={2}
              variant="h6"
              color="primary.main"
              fontWeight={600}
            >
              {username?.slice(0, 1).toUpperCase()}
              {username?.split(" ")[0]?.slice(1)}
              {` (${role})`}
            </Typography>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
