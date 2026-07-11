import { Box, IconButton, Tooltip } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WorldMonitoringIcon from "./icons/WorldMonitoringIcon";

import { useNavigate, useLocation } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <MapIcon />, label: "Map", path: "/map" },
    { icon: <EventIcon />, label: "Events", path: "/events" },
    { icon: <HistoryIcon />, label: "Historical Playback", path: "/historical-playback" },
    { icon: <WorldMonitoringIcon />, label: "World Monitoring", path: "/world-monitoring" },
  ];

  return (
    <Box
      width={60}
      py={1.5}
      bgcolor="background.surface"
      borderRight={1}
      borderColor="divider"
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={1.5}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          mb: 1,
          boxShadow: (theme) => theme.shadows[4],
        }}
      >
        <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
      </Box>

      {menuItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Tooltip key={item.path} title={item.label} placement="right">
            <IconButton
              size="large"
              onClick={() => navigate(item.path)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                color: isActive ? "primary.main" : "text.secondary",
                bgcolor: isActive ? "rgba(76,201,240,0.12)" : "transparent",
                border: isActive ? "1px solid rgba(76,201,240,0.3)" : "1px solid transparent",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: isActive ? "rgba(76,201,240,0.16)" : "action.hover",
                  color: isActive ? "primary.main" : "text.primary",
                },
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export default Sidebar;
