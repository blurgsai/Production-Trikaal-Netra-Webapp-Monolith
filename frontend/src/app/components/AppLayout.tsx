import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function AppLayout() {
  return (
    <Box display="flex">
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Header />
        <Outlet />
      </Box>
    </Box>
  );
}

export default AppLayout;
