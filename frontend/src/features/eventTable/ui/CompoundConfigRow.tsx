import { TableRow, TableCell, Chip, Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { SeverityChip } from '@/shared/ui/SeverityChip';
import { formatEventDateShort } from '@/shared/utils/datetime';
import type { CompoundConfig } from '../model/types';

interface Props {
  config:     CompoundConfig;
  isSelected: boolean;
  onSelect:   (config: CompoundConfig) => void;
}

export function CompoundConfigRow({ config, isSelected, onSelect }: Props) {
  const theme = useTheme();

  return (
    <TableRow
      hover
      onClick={() => onSelect(config)}
      sx={{
        cursor: 'pointer',
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, 0.08)
          : 'inherit',
        transition: 'background-color 0.15s ease',
      }}
    >
      <TableCell sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
        {config.type.replaceAll('_', ' ')}
      </TableCell>

      <TableCell>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {config.constituentTypes.map(t => (
            <Chip
              key={t}
              label={t.replaceAll('_', ' ')}
              size="small"
              sx={{
                textTransform: 'capitalize',
                fontSize: '0.68rem',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            />
          ))}
        </Box>
      </TableCell>

      <TableCell>
        <SeverityChip severity={config.severity} />
      </TableCell>

      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        {formatEventDateShort(config.timestamp)}
      </TableCell>
    </TableRow>
  );
}
