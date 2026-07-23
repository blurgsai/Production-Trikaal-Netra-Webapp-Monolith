import {
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import type { FocusEvent } from '../model/types'

const SEVERITY_COLOR = {
  high: 'error',
  medium: 'warning',
  low: 'info',
} as const

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatLocation(event: FocusEvent): string {
  if (!event.location) return '—'
  return `${event.location.lat.toFixed(4)}°, ${event.location.lon.toFixed(4)}°`
}

interface Props {
  events: FocusEvent[]
  vesselLabel: string
  selectedEventId: string | null
  loading?: boolean
  onSelectEvent: (event: FocusEvent) => void
}

export const FocusEventList = ({
  events,
  vesselLabel,
  selectedEventId,
  loading = false,
  onSelectEvent,
}: Props) => (
  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle1" fontWeight={600}>
        Vessel Events
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {vesselLabel}
      </Typography>
    </Box>

    {loading ? (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    ) : events.length === 0 ? (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No events for this vessel in the selected time range.
        </Typography>
      </Box>
    ) : (
      <TableContainer sx={{ flex: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Location</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => {
              const selected = event.id === selectedEventId
              return (
                <TableRow
                  key={event.id}
                  hover
                  selected={selected}
                  onClick={() => onSelectEvent(event)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{formatEventType(event.type)}</TableCell>
                  <TableCell>
                    {event.severity ? (
                      <Chip
                        label={event.severity}
                        size="small"
                        color={SEVERITY_COLOR[event.severity]}
                        variant="outlined"
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{event.status ?? '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {event.timestamp ? dayjs(event.timestamp).format('YYYY-MM-DD HH:mm:ss') : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatLocation(event)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Box>
)
