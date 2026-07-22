import { Box, Chip, Typography } from '@mui/material'
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

interface Props {
  event: FocusEvent
  vesselLabel: string
}

export const FocusEventPlaybackTile = ({ event, vesselLabel }: Props) => (
  <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      {vesselLabel}
    </Typography>

    <Typography variant="h6" fontWeight={600} gutterBottom>
      {formatEventType(event.type)}
    </Typography>

    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
      {event.severity && (
        <Chip
          label={event.severity}
          size="small"
          color={SEVERITY_COLOR[event.severity]}
          variant="outlined"
        />
      )}
      {event.status && (
        <Chip label={event.status} size="small" variant="outlined" />
      )}
    </Box>

    <Typography variant="body2" sx={{ mb: 1 }}>
      <strong>Event ID:</strong> {event.id || '—'}
    </Typography>

    <Typography variant="body2" sx={{ mb: 1 }}>
      <strong>Time:</strong>{' '}
      {event.timestamp ? dayjs(event.timestamp).format('YYYY-MM-DD HH:mm:ss') : '—'}
    </Typography>

    <Typography variant="body2">
      <strong>Location:</strong>{' '}
      {event.location
        ? `${event.location.lat.toFixed(4)}°, ${event.location.lon.toFixed(4)}°`
        : '—'}
    </Typography>

    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
      Playback has been seeked to this event on the map timeline.
    </Typography>
  </Box>
)
