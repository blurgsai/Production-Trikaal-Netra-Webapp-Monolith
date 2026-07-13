import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import MapIcon from "@mui/icons-material/Map";
import StorageIcon from "@mui/icons-material/Storage";
import EventIcon from "@mui/icons-material/Event";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { NavRail, type NavItem } from "@/shared";

function AdminSidebar() {
  const items: NavItem[] = [
    { icon: <PeopleAltIcon />, label: "User Management", path: "/admin-panel" },
    { icon: <MapIcon />, label: "Map Management", path: "/admin-panel/map" },
    { icon: <StorageIcon />, label: "Data Management", path: "/admin-panel/data" },
    { icon: <EventIcon />, label: "Events Management", path: "/admin-panel/events" },
  ];

  return (
    <NavRail
      items={items}
      label="Admin"
      headerIcon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
    />
  );
}

export default AdminSidebar;
