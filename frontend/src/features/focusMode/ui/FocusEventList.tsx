import { useEffect, useRef } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  Skeleton,
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
  loading?: boolean
  selectedEventId?: string | null
  onSelectEvent: (event: FocusEvent) => void
  onHighlightEvent?: (event: FocusEvent) => void
}

export const FocusEventList = ({
  events,
  vesselLabel,
  loading = false,
  selectedEventId = null,
  onSelectEvent,
  onHighlightEvent,
}: Props) => {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  useEffect(() => {
    if (!selectedEventId) return
    rowRefs.current[selectedEventId]?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [selectedEventId])

  return (
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
        <Box
          role="status"
          aria-live="polite"
          aria-busy="true"
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CircularProgress size={20} aria-label="Loading vessel events" />
            <Typography variant="body2" color="text.secondary">
              Loading vessel events…
            </Typography>
          </Box>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={36} />
          ))}
        </Box>
      ) : events.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No events for this vessel in the selected time range.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ flex: 1 }}>
          <Table size="small" stickyHeader aria-label="Vessel events">
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
                const selected = selectedEventId === event.id
                return (
                  <TableRow
                    key={event.id}
                    ref={(el) => {
                      rowRefs.current[event.id] = el
                    }}
                    hover
                    selected={selected}
                    tabIndex={0}
                    aria-selected={selected}
                    onClick={() => onSelectEvent(event)}
                    onFocus={() => onHighlightEvent?.(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectEvent(event)
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
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
}
