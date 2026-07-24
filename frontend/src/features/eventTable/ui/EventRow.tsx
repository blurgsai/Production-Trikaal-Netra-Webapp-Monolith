import { TableRow, TableCell } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { SeverityChip } from '@/shared/ui/SeverityChip';
import { formatEventDateShort } from '@/shared/utils/datetime';
import type { Event } from '../model/types';

interface Props {
  event: Event;
  isSelected: boolean;
  onSelect: (event: Event) => void;
}

export function EventRow({ event, isSelected, onSelect }: Props) {
  const theme = useTheme();

  return (
    <TableRow
      hover
      selected={isSelected}
      tabIndex={0}
      aria-selected={isSelected}
      onClick={() => onSelect(event)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(event);
        }
      }}
      sx={{
        cursor: 'pointer',
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, 0.08)
          : 'inherit',
        transition: 'background-color 0.15s ease',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: -2,
        },
      }}
    >
      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {event.id.slice(0, 8).toUpperCase()}
      </TableCell>

      <TableCell sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
        {event.type.replaceAll('_', ' ')}
      </TableCell>

      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {event.vessels[0] ?? '—'}
        {event.vessels.length > 1 && (
          <span style={{ color: theme.palette.text.secondary }}>
            {' '}+{event.vessels.length - 1}
          </span>
        )}
      </TableCell>

      <TableCell>
        <SeverityChip severity={event.severity} />
      </TableCell>

      <TableCell sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
        {formatEventDateShort(event.timestamp)}
      </TableCell>
    </TableRow>
  );
}
