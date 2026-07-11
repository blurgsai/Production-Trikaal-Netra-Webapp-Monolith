import { Box, Tab, Tabs } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { worldMonitorPalette } from "@/features/worldMonitoring";

const TABS = [
  { label: "Dashboard", path: "/world-monitoring/dashboard" },
  { label: "Threats", path: "/world-monitoring/threats" },
  { label: "Articles", path: "/world-monitoring/articles" },
];

export function WorldMonitoringPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = TABS.findIndex((tab) =>
    location.pathname.startsWith(tab.path),
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: worldMonitorPalette.background,
      }}
    >
      <Tabs
        value={activeTab === -1 ? 0 : activeTab}
        onChange={(_, newIndex) => navigate(TABS[newIndex].path)}
        sx={{
          minHeight: 44,
          px: 2,
          borderBottom: `1px solid ${worldMonitorPalette.border}`,
          "& .MuiTab-root": {
            color: worldMonitorPalette.textMuted,
            textTransform: "none",
            fontWeight: 700,
            minHeight: 44,
            "&.Mui-selected": {
              color: worldMonitorPalette.accent,
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: worldMonitorPalette.accent,
            height: 3,
          },
        }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.path} label={tab.label} />
        ))}
      </Tabs>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          p: 2,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default WorldMonitoringPage;

