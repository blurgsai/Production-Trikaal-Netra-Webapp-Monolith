import { Box, Tab, Tabs, Typography } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { worldMonitorPalette } from "@/shared/utils/worldMonitoringUtils";

const tabs = [
  { value: "dashboard", label: "Dashboard" },
  { value: "threats", label: "Threats" },
  { value: "articles", label: "Articles" },
];

export default function WorldMonitoringPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.split("/").pop() ?? "dashboard";

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        background:
          "radial-gradient(circle at top left, rgba(78,195,255,0.08), transparent 26%), linear-gradient(180deg, #050c16 0%, #07111f 100%)",
        color: worldMonitorPalette.text,
      }}
    >
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          gap: 2,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: "-0.03em",
            }}
          >
            World Monitoring
          </Typography>

          <Box
            sx={{
              borderRadius: 999,
              border: `1px solid ${worldMonitorPalette.border}`,
              backgroundColor: "rgba(13,26,44,0.72)",
              width: "fit-content",
              p: 0.5,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, value) => navigate(`/world-monitoring/${value}`)}
              sx={{
                minHeight: 0,
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              {tabs.map((tab) => (
                <Tab
                  key={tab.value}
                  value={tab.value}
                  label={tab.label}
                  sx={{
                    minHeight: 0,
                    borderRadius: 999,
                    color: worldMonitorPalette.textMuted,
                    textTransform: "none",
                    fontWeight: 700,
                    "&.Mui-selected": {
                      color: worldMonitorPalette.text,
                      backgroundColor: worldMonitorPalette.accentSoft,
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
