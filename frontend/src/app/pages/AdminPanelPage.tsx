import { Box, Typography, Button, Paper } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

function AdminPanelPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Admin Panel
      </Typography>

      <Paper
        sx={{
          p: 4,
          bgcolor: "background.surface",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 2,
        }}
      >
        <ConstructionIcon sx={{ fontSize: 48, color: "warning.main" }} />
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Coming Soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This admin section is under development. Check back in a future release.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/admin-panel")}
        >
          Back to User Management
        </Button>
      </Paper>
    </Box>
  );
}

export default AdminPanelPage;
