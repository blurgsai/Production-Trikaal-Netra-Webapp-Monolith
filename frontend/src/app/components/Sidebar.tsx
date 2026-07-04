import { Box, IconButton, Tooltip } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";

import { useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const menuItems = [
    { icon: <MapIcon />, label: "Map", path: "/map" },
  ];

  return (
    <Box
      width={60}
      py={10}
      bgcolor="background.paper"
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
    >
      {menuItems.map((item) => (
        <Tooltip key={item.path} title={item.label} placement="right">
          <IconButton size="large" onClick={() => navigate(item.path)}>
            {item.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
}

export default Sidebar;
