import { useState, type ReactNode } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  ListItemIcon,
  ListItemText,
  Stack,
  Box,
  Chip,
} from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import ListAltIcon from '@mui/icons-material/ListAlt'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat'
import EditIcon from '@mui/icons-material/Edit'
import type { FocusToggleTile } from '../model/mosaic'

const VIEW_OPTIONS: { value: FocusToggleTile; label: string; icon: ReactNode }[] = [
  { value: 'map', label: 'Map', icon: <MapIcon fontSize="small" /> },
  { value: 'events', label: 'Events', icon: <ListAltIcon fontSize="small" /> },
]

const actionButtonSx = {
  textTransform: 'none' as const,
  borderRadius: 1.5,
  px: 1.5,
  py: 0.5,
  fontWeight: 600,
  borderColor: 'rgba(255,255,255,0.12)',
  '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(76,201,240,0.08)' },
}

interface Props {
  isLoaded: boolean
  activeLabel: string
  visibleTiles: FocusToggleTile[]
  onVisibleTilesChange: (tiles: FocusToggleTile[]) => void
  onChangeVessel: () => void
}

export const FocusModeNavbar = ({
  isLoaded,
  activeLabel,
  visibleTiles,
  onVisibleTilesChange,
  onChangeVessel,
}: Props) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleToggleTile = (tile: FocusToggleTile) => {
    const isCurrentlyVisible = visibleTiles.includes(tile)
    const newTiles = isCurrentlyVisible
      ? visibleTiles.filter((t) => t !== tile)
      : [...visibleTiles, tile]

    if (newTiles.length > 0) {
      onVisibleTilesChange(newTiles)
    }
  }

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', px: 2, minHeight: 48, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 3, height: 20, borderRadius: 1, bgcolor: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: 0.2 }}>
            Focus Mode
          </Typography>
        </Box>

        {isLoaded && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<DirectionsBoatIcon />}
              label={activeLabel}
              color="primary"
              variant="outlined"
              size="small"
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={onChangeVessel}
              sx={actionButtonSx}
            >
              Change Vessel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewModuleIcon fontSize="small" />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={actionButtonSx}
            >
              View Options
            </Button>
          </Stack>
        )}

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
    </AppBar>
  )
}
