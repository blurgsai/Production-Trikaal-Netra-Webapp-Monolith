import { useState } from 'react';
import {
  Box, Divider, IconButton, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow,
  Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCompoundInstances } from '../hooks/useCompoundInstances';
import { CompoundInstanceRow }  from './CompoundInstanceRow';
import type { CompoundConfig, CompoundInstance } from '../model/types';

interface Props {
  config:          CompoundConfig;
  selectedInstance: CompoundInstance | null;
  onSelectInstance: (instance: CompoundInstance) => void;
  onBack:           () => void;
}

export function CompoundInstanceList({
  config,
  selectedInstance,
  onSelectInstance,
  onBack,
}: Props) {
  const theme = useTheme();
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { data, isFetching } = useCompoundInstances({
    configId:   config.id,
    pagination: { page, rowsPerPage },
  });

  const instances = data?.instances ?? [];
  const total     = data?.total     ?? 0;

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Tooltip title="Back to configs">
            <IconButton size="small" onClick={onBack} aria-label="Back to configs">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="overline" sx={{ letterSpacing: 2, color: 'text.secondary' }}>
            Compound Instances
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={600}>{config.type.replaceAll('_', ' ')}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {config.constituentTypes.map(t => t.replaceAll('_', ' ')).join(' + ')}
        </Typography>
      </Box>

      <Divider />

      <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader aria-label="Compound event instances">
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
            Compound event instances list
          </caption>
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">Vessel</TableCell>
              <TableCell component="th" scope="col">Event Types</TableCell>
              <TableCell component="th" scope="col">Severity</TableCell>
              <TableCell component="th" scope="col">Start Time</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading…</TableCell>
              </TableRow>
            ) : instances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No instances found</TableCell>
              </TableRow>
            ) : (
              instances.map(instance => (
                <CompoundInstanceRow
                  key={instance.id}
                  instance={instance}
                  isSelected={selectedInstance?.id === instance.id}
                  onSelect={onSelectInstance}
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
