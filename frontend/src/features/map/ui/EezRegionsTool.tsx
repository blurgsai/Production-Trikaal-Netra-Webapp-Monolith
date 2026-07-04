import { useState } from "react";
import {
  Autocomplete,
  TextField,
  Popover,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
} from "@mui/material";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useEezRegions } from "../hooks/useEezRegions";
import type { EezRegion } from "../model/types";

function EezRegionsTool() {
  const map = useMap();
  const { regions, loading, error } = useEezRegions();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (_event: React.SyntheticEvent, value: EezRegion | null) => {
    if (!value || !map) return;
    const [minLng, minLat, maxLng, maxLat] = value.bounds;
    const bounds = L.latLngBounds(
      L.latLng(minLat, minLng),
      L.latLng(maxLat, maxLng)
    );
    map.flyToBounds(bounds, { animate: true, duration: 1.5 });
    handleClose();
  };

  return (
    <>
      <Tooltip title="EEZ Regions" placement="left">
        <IconButton size="small" onClick={handleOpen} color={open ? "primary" : "default"}>
          <TravelExploreIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "center", horizontal: "left" }}
        transformOrigin={{ vertical: "center", horizontal: "right" }}
        PaperProps={{ sx: { width: 280, p: 2 } }}
      >
        <Stack>
          <Autocomplete
            options={regions}
            getOptionLabel={(option) => option.name}
            loading={loading}
            disabled={loading || !!error}
            onChange={handleSelect}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search EEZ region"
                size="small"
                error={!!error}
                helperText={error || "Select a region to fly to"}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Stack>
      </Popover>
    </>
  );
}

export default EezRegionsTool;
