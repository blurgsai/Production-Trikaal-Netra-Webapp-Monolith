import { Box, Tab, Tabs, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useState } from "react";
import { DatabaseUploadsTab } from "./DatabaseUploadsTab";
import { VesselImagesTab } from "./VesselImagesTab";

function DataManagement() {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pb: 2 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 2, color: "text.secondary" }}
        >
          Admin · Data Management
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 0.5,
          }}
        >
          <Typography variant="h5" fontWeight={600}>
            Data Management
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                minHeight: 40,
              },
            }}
          >
            <Tab label="Database Uploads" />
            <Tab label="Vessel Images" />
          </Tabs>
        </Box>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: currentTab === 0 ? "flex" : "none", flexDirection: "column" }}>
        <DatabaseUploadsTab />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: currentTab === 1 ? "flex" : "none", flexDirection: "column" }}>
        <VesselImagesTab />
      </Box>
    </Box>
  );
}

export default DataManagement;
