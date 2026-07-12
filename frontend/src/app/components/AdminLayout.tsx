import { Box, Link } from "@mui/material";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import { AdminSidebar } from "@/features/admin";

function AdminLayout() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Link
        href="#admin-content"
        sx={{
          position: "absolute",
          left: -9999,
          top: 0,
          zIndex: 10000,
          "&:focus": {
            left: 8,
            top: 8,
            bgcolor: "background.elevated",
            color: "primary.main",
            px: 2,
            py: 1,
            borderRadius: 1,
          },
        }}
      >
        Skip to content
      </Link>
      <Header />
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <AdminSidebar />
        <Box id="admin-content" sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default AdminLayout;
