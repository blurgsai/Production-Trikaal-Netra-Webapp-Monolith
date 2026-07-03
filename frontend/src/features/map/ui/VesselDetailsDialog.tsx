import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import type { VesselInfo, VesselDetails } from "../model/types";

interface VesselDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  vessel: VesselInfo;
  details: VesselDetails | null;
  loading: boolean;
}

function VesselDetailsDialog({ open, onClose, vessel, details, loading }: VesselDetailsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Vessel Details</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={1.2}>
            <Typography variant="body1">
              <b>Name:</b> {vessel.name || details?.vesselName || "N/A"}
            </Typography>
            <Typography variant="body1">
              <b>MMSI:</b> {vessel.mmsi || "N/A"}
            </Typography>
            <Typography variant="body1">
              <b>IMO:</b> {vessel.imo || "N/A"}
            </Typography>
            <Typography variant="body1">
              <b>Vessel Type:</b> {details?.vesselType || "N/A"}
            </Typography>
            <Typography variant="body1">
              <b>Flag:</b> {details?.flag || "N/A"}
            </Typography>
            {details?.length && (
              <Typography variant="body1">
                <b>Length:</b> {details.length} m
              </Typography>
            )}
            {details?.width && (
              <Typography variant="body1">
                <b>Width:</b> {details.width} m
              </Typography>
            )}
            {details?.grossTonnage && (
              <Typography variant="body1">
                <b>Gross Tonnage:</b> {details.grossTonnage}
              </Typography>
            )}
            <Typography variant="body1">
              <b>Position:</b> {vessel.locationCurrentLat.toFixed(4)}°, {vessel.locationCurrentLon.toFixed(4)}°
            </Typography>
            <Typography variant="body1">
              <b>Speed:</b> {vessel.speedCurrentConsensusValue.toFixed(1)} knots
            </Typography>
            <Typography variant="body1">
              <b>Heading:</b> {vessel.headingCurrentConsensusValue.toFixed(1)}°
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default VesselDetailsDialog;
