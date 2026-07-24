import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Divider, IconButton, InputAdornment, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon  from '@mui/icons-material/Search';
import { useEvents }          from '../hooks/useEvents';
import { useEventMetadata }   from '../hooks/useEventMetadata';
import { useEventFilters }    from '../hooks/useEventFilters';
import { useFieldValueLoader } from '../hooks/useFieldValueLoader';
import { EventRow }            from './EventRow';
import { AtomicEventFilters }  from './AtomicEventFilters';
import type { Event } from '../model/types';

interface Props {
  selectedEvent: Event | null;
  onSelectEvent: (event: Event | null) => void;
}

export function AtomicEventList({ selectedEvent, onSelectEvent }: Props) {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ── Search (raw input + deferred for fetch) ─────────────────────────────────
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const deferredSearch                = useDeferredValue(searchInput);

  // ── Filters from URL ────────────────────────────────────────────────────────
  const { data: columns = [], isLoading: metaLoading } = useEventMetadata();
  const metaFields = useMemo(() => columns.map(c => c.field), [columns]);

  const { appliedFilters, applyFilters } = useEventFilters(metaFields);

  // Reset page when filters change (skip on first render)
  const prevFiltersRef = useRef(appliedFilters);
  if (prevFiltersRef.current !== appliedFilters) {
    prevFiltersRef.current = appliedFilters;
    if (page !== 0) setPage(0);
  }

  // ── Event ID from URL (direct navigation) ──────────────────────────────────
  const eventIdFromUrl = searchParams.get('id') ?? undefined;

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data, isFetching, refetch } = useEvents({
    filters:     appliedFilters,
    pagination:  { page, rowsPerPage },
    searchQuery: deferredSearch,
    eventId:     eventIdFromUrl,
    enabled:     metaFields.length > 0 || !!eventIdFromUrl,
  });

  // ── Field value loader (for filter autocomplete) ────────────────────────────
  const { fieldValues, loadValues } = useFieldValueLoader();

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    setPage(0);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val.trim()) {
        next.set('q', val.trim());
      } else {
        next.delete('q');
      }
      return next;
    });
  }, [setSearchParams]);

  const handleApplyFilters = useCallback((filters: typeof appliedFilters) => {
    applyFilters(filters);
    setPage(0);
    onSelectEvent(null);
  }, [applyFilters, onSelectEvent]);

  const handlePageChange = (_: unknown, newPage: number) => setPage(newPage);

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const events = data?.events ?? [];
  const total  = data?.total  ?? 0;

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        borderRadius: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="overline" sx={{ letterSpacing: 2, color: 'text.secondary' }}>
          Event Intelligence
        </Typography>
        <Typography variant="h5" fontWeight={600}>Events</Typography>

        <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Search events"
            placeholder="e.g. dark ship"
            value={searchInput}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            }}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.background.default, 0.6) },
            }}
          />

          <AtomicEventFilters
            columns={columns}
            appliedFilters={appliedFilters}
            onApplyFilters={handleApplyFilters}
            fieldValues={fieldValues}
            onLoadValues={loadValues}
          />

          <Tooltip title="Refresh">
            <IconButton
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh events"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider />

      {/* Table */}
      <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader aria-label="Atomic events">
          <caption
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: 0,
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            Atomic events list
          </caption>
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">Event ID</TableCell>
              <TableCell component="th" scope="col">Type</TableCell>
              <TableCell component="th" scope="col">Vessel</TableCell>
              <TableCell component="th" scope="col">Severity</TableCell>
              <TableCell component="th" scope="col">Timestamp</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {metaLoading || isFetching ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading…
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              events.map(event => (
                <EventRow
                  key={event.id}
                  event={event}
                  isSelected={selectedEvent?.id === event.id}
                  onSelect={onSelectEvent}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Divider />
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        sx={{ flexShrink: 0 }}
      />
    </Paper>
  );
}
