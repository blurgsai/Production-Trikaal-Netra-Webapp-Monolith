import { useState } from "react";
import { IconButton, Popover, Box, Typography, FormControlLabel, Switch } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import type { MapControlSettings } from "../model/types";

interface MapTileSettingsProps {
  settings: MapControlSettings;
  onChange: (settings: MapControlSettings) => void;
}

const SETTING_LABELS: { key: keyof MapControlSettings; label: string }[] = [
  { key: "toolbar", label: "Toolbar" },
  { key: "zoombar", label: "Zoom Control" },
  { key: "minimap", label: "Mini Map" },
  { key: "statusbar", label: "Status Bar" },
];

function MapTileSettings({ settings, onChange }: MapTileSettingsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const toggle = (key: keyof MapControlSettings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{ color: "inherit" }}
      >
        <SettingsIcon fontSize="small" />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Map Controls
          </Typography>
          {SETTING_LABELS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  size="small"
                  checked={settings[key]}
                  onChange={() => toggle(key)}
                />
              }
              label={label}
              sx={{ display: "flex", width: "100%" }}
            />
          ))}
        </Box>
      </Popover>
    </>
  );
}

export default MapTileSettings;
