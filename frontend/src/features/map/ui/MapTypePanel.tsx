import {
  Box,
  Typography,
  IconButton,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { baseMaps } from "../model/config";
import type { BaseMap } from "../model/types";

interface MapTypePanelProps {
  selectedBaseMap: BaseMap;
  onSelect: (map: BaseMap) => void;
  onClose: () => void;
}

function MapTypePanel({ selectedBaseMap, onSelect, onClose }: MapTypePanelProps) {
  return (
    <Box
      sx={{
        width: 340,
        bgcolor: "background.paper",
        position: "absolute",
        right: 60,
        top: 0,
        borderRadius: 2,
        boxShadow: 4,
        zIndex: 2000,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={1.5}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <MapOutlinedIcon />
          <Typography variant="h6">Map Type</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <Box p={2}>
        <RadioGroup
          value={selectedBaseMap.id}
          onChange={(e) => {
            const selected = baseMaps.find((m) => m.id === e.target.value);
            if (selected) onSelect(selected);
          }}
        >
          {baseMaps.map((map) => (
            <FormControlLabel
              key={map.id}
              value={map.id}
              control={<Radio />}
              label={map.title}
            />
          ))}
        </RadioGroup>
      </Box>
    </Box>
  );
}

export default MapTypePanel;
