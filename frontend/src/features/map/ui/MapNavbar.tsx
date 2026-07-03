import { AppBar, Toolbar, Typography, Button, Menu, MenuItem, Checkbox, ListItemIcon, ListItemText, Stack } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useState } from "react";
import FilterDialog from "./FilterDialog";
import type { VesselTableFilter, SavedFilterSet } from "../model/types";

export type ViewTile = "map" | "table" | "layers" | "vessel";

interface MapNavbarProps {
  visibleTiles: ViewTile[];
  onVisibleTilesChange: (tiles: ViewTile[]) => void;
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
];

function MapNavbar({
  visibleTiles,
  onVisibleTilesChange,
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
    const isCurrentlyVisible = visibleTiles.includes(tile);
    let newTiles: ViewTile[];

    if (isCurrentlyVisible) {
      newTiles = visibleTiles.filter((t) => t !== tile);
    } else {
      newTiles = [...visibleTiles, tile];
    }

    if (newTiles.length > 0) {
      onVisibleTilesChange(newTiles);
    }
  };

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar variant="dense" sx={{ justifyContent: "space-between" }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Map View
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterDialogOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewModuleIcon />}
            onClick={handleClick}
            sx={{ textTransform: "none" }}
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
                  checked={visibleTiles.includes(option.value)}
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
