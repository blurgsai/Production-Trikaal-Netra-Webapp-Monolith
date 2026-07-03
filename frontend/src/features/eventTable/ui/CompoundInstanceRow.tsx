import { TableRow, TableCell, Chip, Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { SeverityChip } from '@/shared/ui/SeverityChip';
import { formatEventDateShort } from '@/shared/utils/datetime';
import type { CompoundInstance } from '../model/types';

interface Props {
  instance:   CompoundInstance;
  isSelected: boolean;
  onSelect:   (instance: CompoundInstance) => void;
}

export function CompoundInstanceRow({ instance, isSelected, onSelect }: Props) {
  const theme = useTheme();

  return (
    <TableRow
      hover
      onClick={() => onSelect(instance)}
      sx={{
        cursor: 'pointer',
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, 0.08)
          : 'inherit',
        transition: 'background-color 0.15s ease',
      }}
    >
      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {instance.vessels[0] ?? '—'}
      </TableCell>

      <TableCell>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {instance.constituentTypes.map(t => (
            <Chip
              key={t}
              label={t.replaceAll('_', ' ')}
              size="small"
              sx={{
                textTransform: 'capitalize',
                fontSize: '0.68rem',
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
              }}
            />
          ))}
        </Box>
      </TableCell>

      <TableCell>
        <SeverityChip severity={instance.severity} />
      </TableCell>

      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
        {formatEventDateShort(instance.startTime)}
      </TableCell>
    </TableRow>
  );
}
