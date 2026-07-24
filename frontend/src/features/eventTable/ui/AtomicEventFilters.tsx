import { useCallback, useMemo, useState } from 'react';
import {
  Box, Button, Select, MenuItem, TextField, FormControl, InputLabel,
  Popover, IconButton, Typography, Autocomplete,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon      from '@mui/icons-material/Close';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/Delete';
import ClearAllIcon   from '@mui/icons-material/ClearAll';
import {
  isValidFilterRow,
  filtersToRows,
  rowsToFilters,
  mergeUniqueValues,
} from '../model/filterHelpers';
import type { EventFilter, EventMetadataColumn, FilterOperator, FilterRow } from '../model/types';

// ── Operator options per field type ──────────────────────────────────────────

const OPERATORS: Record<string, Array<{ value: FilterOperator; label: string }>> = {
  string: [
    { value: 'eq',         label: 'Equals'       },
    { value: 'ne',         label: 'Not Equals'   },
    { value: 'contains',   label: 'Contains'     },
    { value: 'startsWith', label: 'Starts With'  },
    { value: 'endsWith',   label: 'Ends With'    },
  ],
  number: [
    { value: 'eq',      label: 'Equals'            },
    { value: 'ne',      label: 'Not Equals'        },
    { value: 'gt',      label: 'Greater Than'      },
    { value: 'gte',     label: 'Greater or Equal'  },
    { value: 'lt',      label: 'Less Than'         },
    { value: 'lte',     label: 'Less or Equal'     },
    { value: 'between', label: 'Between'           },
  ],
  timestamp: [
    { value: 'gt',      label: 'After'       },
    { value: 'gte',     label: 'On or After' },
    { value: 'lt',      label: 'Before'      },
    { value: 'lte',     label: 'On or Before'},
    { value: 'between', label: 'Between'     },
  ],
  boolean: [
    { value: 'eq', label: 'Equals' },
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  columns:         EventMetadataColumn[];
  appliedFilters:  EventFilter[];
  onApplyFilters:  (filters: EventFilter[]) => void;
  fieldValues:     Record<string, (string | number)[]>;
  onLoadValues:    (field: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AtomicEventFilters({
  columns,
  appliedFilters,
  onApplyFilters,
  fieldValues,
  onLoadValues,
}: Props) {
  const theme = useTheme();

  const panelBg   = alpha(theme.palette.background.paper, 0.98);
  const headerBg  = alpha(theme.palette.common.black, 0.12);
  const inputBg   = alpha(theme.palette.background.default, 0.72);
  const softBlue  = alpha(theme.palette.primary.main, 0.12);
  const quietBorder = 'transparent';

  const darkInputSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: inputBg,
      '& fieldset': { borderColor: quietBorder },
      '&:hover fieldset': { borderColor: alpha(theme.palette.primary.main, 0.5) },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: '1px' },
    },
    '& .MuiInputBase-input': { color: `${theme.palette.text.primary} !important` },
    '& .MuiInputLabel-root': { color: theme.palette.text.secondary },
  };

  const menuSx = {
    backgroundColor: panelBg,
    color: theme.palette.text.primary,
    border: 'none',
    boxShadow: theme.shadows[8],
    '& .MuiMenuItem-root:hover': { backgroundColor: softBlue },
    '& .Mui-selected': { backgroundColor: `${softBlue} !important` },
  };

  const createRow = (): FilterRow => ({
    id: crypto.randomUUID(),
    field: '', operator: '', value: '', value2: '',
  });

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<FilterRow[]>([]);

  const open = Boolean(anchorEl);

  const columnsByField = useMemo(
    () => Object.fromEntries(columns.map(c => [c.field, c])),
    [columns],
  );

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setRows(appliedFilters.length > 0 ? filtersToRows(appliedFilters) : []);
    setAnchorEl(e.currentTarget);
  }, [appliedFilters]);

  const handleClose = () => setAnchorEl(null);

  const updateRow = (id: string, patch: Partial<FilterRow>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const removeRow = (id: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      onApplyFilters(rowsToFilters(next));
      return next;
    });
  };

  const handleClearAll = () => {
    setRows([]);
    onApplyFilters([]);
    handleClose();
  };

  const validCount = rows.filter(isValidFilterRow).length;

  const handleApply = () => {
    onApplyFilters(rowsToFilters(rows));
    handleClose();
  };

  const FILTERS_POPOVER_ID = 'atomic-event-filters-popover';
  const FILTERS_TITLE_ID = 'atomic-event-filters-title';
  const canDeleteRows = rows.length > 1;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <span>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={handleOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? FILTERS_POPOVER_ID : undefined}
          sx={{
            border: 'none',
            textTransform: 'none',
            fontWeight: 600,
            px: 2,
            backgroundColor: inputBg,
            '&:hover': { border: 'none', bgcolor: softBlue },
          }}
        >
          Filters{appliedFilters.length > 0 ? ` (${appliedFilters.length})` : ''}
        </Button>

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          disableEnforceFocus={false}
          disableRestoreFocus={false}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              id: FILTERS_POPOVER_ID,
              role: 'dialog',
              'aria-modal': true,
              'aria-labelledby': FILTERS_TITLE_ID,
              elevation: 8,
              sx: {
                width: 'min(840px, calc(100vw - 32px))',
                bgcolor: panelBg,
                border: 'none',
                borderRadius: 2,
                mt: 1.5,
                overflow: 'hidden',
                boxShadow: theme.shadows[8],
              },
            },
          }}
        >
          {/* Header */}
          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: headerBg }}>
            <Typography id={FILTERS_TITLE_ID} variant="h6" fontWeight={600}>Advanced Filters</Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button size="small" startIcon={<ClearAllIcon />} onClick={handleClearAll} sx={{ color: theme.palette.error.light, textTransform: 'none' }}>
                Clear All
              </Button>
              <IconButton size="small" onClick={handleClose} aria-label="Close filters">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Filter rows */}
          <Box sx={{ p: 3, maxHeight: 480, overflowY: 'auto' }}>
            {columns.length === 0 ? (
              <Typography color="text.secondary" align="center" py={4}>Loading filter options…</Typography>
            ) : rows.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                <Typography color="text.secondary" align="center">
                  No filters yet. Add a filter to narrow the events list.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setRows([createRow()])}
                  sx={{ textTransform: 'none' }}
                >
                  Add Filter
                </Button>
              </Box>
            ) : (
              <>
                {rows.map(row => {
                  const col       = columnsByField[row.field];
                  const fieldType = col?.type ?? 'string';
                  const operators = OPERATORS[fieldType] ?? OPERATORS.string;
                  const isBetween = row.operator === 'between';
                  const options   = mergeUniqueValues(col?.uniqueValues ?? [], fieldValues[row.field] ?? []);

                  const datePickerSlots = {
                    textField: { fullWidth: true, sx: darkInputSx },
                    popper: { disablePortal: true },
                  } as const;

                  const selectSx = {
                    color: theme.palette.text.primary,
                    backgroundColor: inputBg,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: quietBorder },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(theme.palette.primary.main, 0.5) },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  };

                  return (
                    <Box key={row.id} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
                      {/* Field selector */}
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel>Field</InputLabel>
                        <Select
                          value={row.field}
                          label="Field"
                          onChange={e => {
                            updateRow(row.id, { field: e.target.value, operator: '', value: '', value2: '' });
                            onLoadValues(e.target.value);
                          }}
                          sx={selectSx}
                          MenuProps={{ disablePortal: true, PaperProps: { sx: menuSx } }}
                        >
                          {columns.map(c => (
                            <MenuItem key={c.field} value={c.field}>{c.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Operator selector */}
                      <FormControl sx={{ flex: 1 }} disabled={!row.field}>
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={row.operator}
                          label="Operator"
                          onChange={e => updateRow(row.id, { operator: e.target.value, value: '', value2: '' })}
                          sx={selectSx}
                          MenuProps={{ disablePortal: true, PaperProps: { sx: menuSx } }}
                        >
                          {operators.map(op => (
                            <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Value input(s) */}
                      <Box sx={{ flex: 2, display: 'flex', gap: 2 }}>
                        {row.operator && fieldType === 'timestamp' ? (
                          isBetween ? (
                            <>
                              <DateTimePicker label="From" value={row.value ? dayjs(row.value) : null} onChange={v => updateRow(row.id, { value: v?.toISOString() ?? '' })} slotProps={datePickerSlots} />
                              <DateTimePicker label="To"   value={row.value2 ? dayjs(row.value2) : null} onChange={v => updateRow(row.id, { value2: v?.toISOString() ?? '' })} slotProps={datePickerSlots} />
                            </>
                          ) : (
                            <DateTimePicker label="Date & Time" value={row.value ? dayjs(row.value) : null} onChange={v => updateRow(row.id, { value: v?.toISOString() ?? '' })} slotProps={datePickerSlots} />
                          )
                        ) : row.operator && options.length > 0 ? (
                          <Autocomplete
                            freeSolo
                            fullWidth
                            options={options.map(String)}
                            inputValue={row.value}
                            onInputChange={(_, v) => updateRow(row.id, { value: v })}
                            onChange={(_, v) => updateRow(row.id, { value: v ?? '' })}
                            disablePortal
                            renderInput={params => <TextField {...params} label="Value" sx={darkInputSx} />}
                            ListboxProps={{ sx: { backgroundColor: panelBg, color: theme.palette.text.primary } }}
                          />
                        ) : row.operator ? (
                          <>
                            <TextField fullWidth label={isBetween ? 'From' : 'Value'} type={fieldType === 'number' ? 'number' : 'text'} value={row.value} onChange={e => updateRow(row.id, { value: e.target.value })} sx={darkInputSx} />
                            {isBetween && <TextField fullWidth label="To" type={fieldType === 'number' ? 'number' : 'text'} value={row.value2} onChange={e => updateRow(row.id, { value2: e.target.value })} sx={darkInputSx} />}
                          </>
                        ) : null}
                      </Box>

                      {canDeleteRows && (
                        <IconButton
                          onClick={() => removeRow(row.id)}
                          aria-label="Remove filter"
                          sx={{ color: theme.palette.error.light, mt: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}

                <Button startIcon={<AddIcon />} onClick={() => setRows(p => [...p, createRow()])} sx={{ textTransform: 'none' }}>
                  Add Filter
                </Button>
              </>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: headerBg }}>
            <Button onClick={handleClose} sx={{ textTransform: 'none', color: theme.palette.text.secondary }}>Cancel</Button>
            <Button variant="contained" onClick={handleApply} disabled={validCount === 0} sx={{ px: 4 }}>
              Apply Filters
            </Button>
          </Box>
        </Popover>
      </span>
    </LocalizationProvider>
  );
}
