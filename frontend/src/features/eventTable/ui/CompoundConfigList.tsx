import { useState } from 'react';
import {
  Box, Divider, InputAdornment, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { useCompoundConfigs } from '../hooks/useCompoundConfigs';
import { CompoundConfigRow }  from './CompoundConfigRow';
import type { CompoundConfig } from '../model/types';

interface Props {
  onSelectConfig: (config: CompoundConfig) => void;
}

export function CompoundConfigList({ onSelectConfig }: Props) {
  const theme = useTheme();
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { data, isFetching } = useCompoundConfigs({
    pagination:  { page, rowsPerPage },
    searchQuery: search,
  });

  const configs = data?.configs ?? [];
  const total   = data?.total   ?? 0;

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
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="overline" sx={{ letterSpacing: 2, color: 'text.secondary' }}>
          Event Intelligence
        </Typography>
        <Typography variant="h5" fontWeight={600}>Compound Events</Typography>

        <TextField
          size="small"
          fullWidth
          placeholder="Search compound configs…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ mt: 2, '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.background.default, 0.6) } }}
        />
      </Box>

      <Divider />

      <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Constituent Types</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Timestamp</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading…</TableCell>
              </TableRow>
            ) : configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No compound configs found</TableCell>
              </TableRow>
            ) : (
              configs.map(config => (
                <CompoundConfigRow
                  key={config.id}
                  config={config}
                  isSelected={false}
                  onSelect={onSelectConfig}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider />
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        sx={{ flexShrink: 0 }}
      />
    </Paper>
  );
}
