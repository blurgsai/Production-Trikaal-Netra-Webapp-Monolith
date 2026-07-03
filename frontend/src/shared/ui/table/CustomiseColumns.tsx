import { useState } from "react";

import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from "@mui/material";

import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

import { useTableColumns } from "@/shared/hooks/table/useTableColumns";

export interface ColumnOption {
  value: string;
  label: string;
}

interface CustomiseColumnsProps {
  options: ColumnOption[];
  initialSelected: string[];

  onApplyColumns: (columns: string[]) => void;

  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function CustomiseColumns({
  options,
  initialSelected,
  onApplyColumns,
  open,
  onOpen,
  onClose,
}: CustomiseColumnsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const {
    selected,
    searchQuery,
    setSearchQuery,
    toggleColumn,
    selectAll,
    clearAll,
    applyColumns,
    filterColumns,
    resetSearch,
  } = useTableColumns(initialSelected, onApplyColumns);

  const isOpen = open ?? Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);

    if (onOpen) {
      onOpen();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);

    resetSearch();

    onClose?.();
  };

  const handleApply = () => {
    applyColumns();
    handleClose();
  };

  const filteredOptions = filterColumns(options);

  return (
    <>
      <Button
        data-columns-button="true"
        variant="outlined"
        startIcon={<ViewColumnIcon />}
        onClick={handleOpen}
        sx={{
          textTransform: "none",
        }}
      >
        Columns ({selected.length}){" "}
      </Button>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 320,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            pb: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Customize Columns
          </Typography>

          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search columns..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        <List
          sx={{
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {filteredOptions.map((option) => (
            <ListItem
              key={option.value}
              onClick={() => toggleColumn(option.value)}
              sx={{
                cursor: "pointer",
              }}
            >
              <ListItemIcon>
                <Checkbox checked={selected.includes(option.value)} />
              </ListItemIcon>

              <ListItemText primary={option.label} />
            </ListItem>
          ))}

          {filteredOptions.length === 0 && (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No columns found
              </Typography>
            </Box>
          )}
        </List>

        <Divider />

        <Box
          sx={{
            p: 2,
            display: "flex",
            gap: 1,
          }}
        >
          <Button size="small" onClick={() => selectAll(options)}>
            Select All
          </Button>

          <Button size="small" onClick={clearAll}>
            Clear
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            size="small"
            onClick={handleApply}
            disabled={selected.length === 0}
          >
            Apply
          </Button>
        </Box>
      </Popover>
    </>
  );
}
