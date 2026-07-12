import MapIcon from "@mui/icons-material/Map";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WorldMonitoringIcon from "./icons/WorldMonitoringIcon";
import { NavRail, type NavItem } from "@/shared";

function Sidebar() {
  const items: NavItem[] = [
    { icon: <MapIcon />, label: "Map", path: "/map" },
    { icon: <EventIcon />, label: "Events", path: "/events" },
    { icon: <HistoryIcon />, label: "Historical Playback", path: "/historical-playback" },
    { icon: <WorldMonitoringIcon />, label: "World Monitoring", path: "/world-monitoring" },
  ];

  return (
    <NavRail
      items={items}
      headerIcon={<VisibilityOutlinedIcon sx={{ fontSize: 20 }} />}
    />
  );
}

export default Sidebar;
