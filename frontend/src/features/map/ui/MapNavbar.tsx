import { AppBar, Toolbar, Typography, Button, Menu, MenuItem, Checkbox, ListItemIcon, ListItemText, Stack, Box } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useState } from "react";
import FilterDialog from "./FilterDialog";
import type { VesselTableFilter, SavedFilterSet } from "../model/types";

export type ViewTile = "map" | "table" | "layers" | "vessel" | "charts";

interface MapNavbarProps {
  visibleTiles: ViewTile[];
  effectiveVisibleTiles: ViewTile[];
  onVisibleTilesChange: (tiles: ViewTile[]) => void;
  autoHiddenSecondary?: boolean;
  filters: VesselTableFilter[];
  appliedFilters: VesselTableFilter[];
  allTableColumns: string[];
  columnOptions: Record<string, string[]>;
  savedFilters: SavedFilterSet[];
  onAddFilter: () => void;
  onUpdateFilter: (index: number, update: Partial<VesselTableFilter>) => void;
  onRemoveFilter: (index: number) => void;
  onResetFilters: () => void;
  onApplyFilters: () => void;
  onSaveFilter: (name: string) => void;
  onLoadSavedFilter: (name: string) => void;
  onDeleteSavedFilter: (name: string) => void;
  onLoadColumnOptions: (column: string) => void;
}

const VIEW_OPTIONS: { value: ViewTile; label: string; icon: React.ReactNode }[] = [
  { value: "map", label: "Map", icon: <MapIcon fontSize="small" /> },
  { value: "table", label: "Table", icon: <TableChartIcon fontSize="small" /> },
  { value: "layers", label: "Map Config", icon: <LayersOutlinedIcon fontSize="small" /> },
  { value: "vessel", label: "Vessel Config", icon: <SettingsIcon fontSize="small" /> },
  { value: "charts", label: "Chart House", icon: <InsertChartIcon fontSize="small" /> },
];

function MapNavbar({
  visibleTiles,
  effectiveVisibleTiles,
  onVisibleTilesChange,
  autoHiddenSecondary = false,
  filters,
  appliedFilters,
  allTableColumns,
  columnOptions,
  savedFilters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onResetFilters,
  onApplyFilters,
  onSaveFilter,
  onLoadSavedFilter,
  onDeleteSavedFilter,
  onLoadColumnOptions,
}: MapNavbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggleTile = (tile: ViewTile) => {
    const isEffectivelyVisible = effectiveVisibleTiles.includes(tile);

    if (isEffectivelyVisible) {
      const newTiles = visibleTiles.filter((t) => t !== tile);
      if (newTiles.length > 0) {
        onVisibleTilesChange(newTiles);
      }
      return;
    }

    // Show tile: add if missing, or re-signal to unlock auto-hidden secondary
    if (visibleTiles.includes(tile)) {
      onVisibleTilesChange([...visibleTiles]);
    } else {
      onVisibleTilesChange([...visibleTiles, tile]);
    }
  };

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar variant="dense" sx={{ justifyContent: "space-between", px: 2, minHeight: 48, gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 3, height: 20, borderRadius: 1, bgcolor: "primary.main" }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: 0.2 }}>
            Map View
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon fontSize="small" />}
            onClick={() => setFilterDialogOpen(true)}
            sx={{
              textTransform: "none",
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              borderColor: "rgba(255,255,255,0.12)",
              "&:hover": { borderColor: "primary.main", bgcolor: "rgba(76,201,240,0.08)" },
            }}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewModuleIcon fontSize="small" />}
            onClick={handleClick}
            sx={{
              textTransform: "none",
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              borderColor: "rgba(255,255,255,0.12)",
              "&:hover": { borderColor: "primary.main", bgcolor: "rgba(76,201,240,0.08)" },
            }}
          >
            View Options
          </Button>
        </Stack>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          {VIEW_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => handleToggleTile(option.value)}
              dense
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={effectiveVisibleTiles.includes(option.value)}
                  tabIndex={-1}
                  disableRipple
                  size="small"
                />
              </ListItemIcon>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {option.icon}
              </ListItemIcon>
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
          {autoHiddenSecondary && (
            <MenuItem disabled dense>
              <ListItemText
                primary="Some panels are hidden at this width. Re-enable them here."
                primaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
              />
            </MenuItem>
          )}
        </Menu>
      </Toolbar>
      <FilterDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        filters={filters}
        appliedFilters={appliedFilters}
        allTableColumns={allTableColumns}
        columnOptions={columnOptions}
        savedFilters={savedFilters}
        onAddFilter={onAddFilter}
        onUpdateFilter={onUpdateFilter}
        onRemoveFilter={onRemoveFilter}
        onResetFilters={onResetFilters}
        onApplyFilters={onApplyFilters}
        onSaveFilter={onSaveFilter}
        onLoadSavedFilter={onLoadSavedFilter}
        onDeleteSavedFilter={onDeleteSavedFilter}
        onLoadColumnOptions={onLoadColumnOptions}
      />
    </AppBar>
  );
}

export default MapNavbar;
