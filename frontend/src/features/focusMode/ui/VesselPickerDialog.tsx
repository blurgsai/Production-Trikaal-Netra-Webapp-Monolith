import {
  Dialog, DialogTitle, DialogContent,
  DialogActions, Button,
  List, ListItemButton, ListItemText, Typography,
} from '@mui/material'
import type { Vessel } from '../model/types'

interface Props {
  open: boolean
  mmsi: string
  vessels: Vessel[]
  onSelect(vessel: Vessel): void
  onClose(): void
}

export const VesselPickerDialog = ({ open, mmsi, vessels, onSelect, onClose }: Props) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Select Vessel for MMSI {mmsi}</DialogTitle>
    <DialogContent dividers sx={{ p: 0 }}>
      {vessels.length === 0 ? (
        <Typography sx={{ p: 2 }} color="text.secondary">No vessels found.</Typography>
      ) : (
        <List disablePadding>
          {vessels.map((v) => (
            <ListItemButton key={v.id} onClick={() => onSelect(v)}>
              <ListItemText primary={v.name} secondary={`Vessel ID: ${v.id}`} />
            </ListItemButton>
          ))}
        </List>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="inherit">
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
)
