import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  Popover,
  Typography,
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";

import { defenseColors } from "@/shared/theme";
import { useVesselSearch } from "../hooks/useVesselSearch";
import type { VesselSearchMatch } from "../model/types";

interface LocateVesselOnMapButtonProps {
  vesselName: string;
}

const AUTO_NAVIGATE_MIN_SCORE = 0.65;

export default function LocateVesselOnMapButton({
  vesselName,
}: LocateVesselOnMapButtonProps) {
  const navigate = useNavigate();
  const { search, matches, loading, error } = useVesselSearch();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const navigateToVessel = (mmsi: number | null) => {
    if (!mmsi) {
      return;
    }
    navigate(`/map?vessel=${mmsi}`);
  };

  const handleClick = async (event: React.MouseEvent<HTMLElement>) => {
    const name = vesselName.trim();
    if (!name) {
      return;
    }

    setAnchorEl(event.currentTarget);
    const results = await search(name);

    // Auto-navigate if single high-confidence match
    if (results.length === 1 && results[0].score >= AUTO_NAVIGATE_MIN_SCORE) {
      navigateToVessel(results[0].mmsi);
      setAnchorEl(null);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (match: VesselSearchMatch) => {
    navigateToVessel(match.mmsi);
    if (match.mmsi) {
      handleClose();
    }
  };

  const id = open ? "locate-vessel-popover" : undefined;

  return (
    <>
      <Button
        size="small"
        variant="contained"
        startIcon={<MapIcon />}
        onClick={handleClick}
        aria-label={`Locate ${vesselName} on map`}
        sx={{
          py: 0.5,
          px: 1.5,
          fontSize: "0.8rem",
          textTransform: "none",
          backgroundColor: "#0e7490",
          color: "#fff",
          boxShadow: 1,
          "&:hover": {
            backgroundColor: "#155e75",
            boxShadow: 2,
          },
        }}
      >
        Show {vesselName} on Map
      </Button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 1.5, minWidth: 280, maxWidth: 360 }}>
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
              <CircularProgress size={18} sx={{ color: defenseColors.primary.main }} />
              <Typography variant="body2">Searching vessels…</Typography>
            </Box>
          )}

          {!loading && error && (
            <Alert severity="warning" sx={{ mb: matches.length ? 1 : 0 }}>
              {error}
            </Alert>
          )}

          {!loading && matches.length > 0 && (
            <>
              <Typography variant="body2" sx={{ mb: 1, color: defenseColors.text.muted }}>
                Select a vessel to open on the map:
              </Typography>
              <List dense disablePadding>
                {matches.map((match) => (
                  <ListItemButton
                    key={match.vessel_id}
                    onClick={() => handleSelect(match)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      color: defenseColors.text.primary,
                      backgroundColor: defenseColors.border.soft,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {match.ship_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
                        {match.mmsi ? `MMSI: ${match.mmsi}` : "MMSI unavailable"}
                        {" · "}
                        {Math.round(match.score * 100)}% match
                      </Typography>
                    </Box>
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
}
