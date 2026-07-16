import { useState, useEffect } from 'react'
import {
  Box, IconButton, Slider, Typography,
  Menu, MenuItem, Button, Paper, Stack,
} from '@mui/material'
import { PlayArrow, Pause, Settings } from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'
import type { TrajectoryPoint } from '../model/types'

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 4, 8]

interface Props {
  trajectory: TrajectoryPoint[]
  currentIndex: number
  isPlaying: boolean
  playbackSpeed: number
  onPlayPause(): void
  onSeek(index: number): void
  onSpeedChange(speed: number): void
  startTime: number | null
  endTime: number | null
  onApplyTimeRange(start: number, end: number): void
}

export const FocusPlaybackControls = ({
  trajectory, currentIndex, isPlaying, playbackSpeed,
  onPlayPause, onSeek, onSpeedChange,
  startTime, endTime, onApplyTimeRange,
}: Props) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [seekIndex, setSeekIndex] = useState<number | null>(null)
  const [draftStart, setDraftStart] = useState(startTime)
  const [draftEnd, setDraftEnd] = useState(endTime)

  useEffect(() => { setDraftStart(startTime) }, [startTime])
  useEffect(() => { setDraftEnd(endTime) }, [endTime])

  const isDirty = draftStart !== startTime || draftEnd !== endTime
  const displayIndex = seekIndex ?? currentIndex
  const total = trajectory.length

  const currentPoint = trajectory[displayIndex]
  const currentDayjs = currentPoint ? dayjs(currentPoint.timestamp * 1000) : null
  const endDayjs = draftEnd ? dayjs(draftEnd * 1000) : null
  const startDayjs = draftStart ? dayjs(draftStart * 1000) : null

  const durationSecs = startTime && endTime ? endTime - startTime : 0
  const hours = Math.floor(durationSecs / 3600)
  const mins = Math.floor((durationSecs % 3600) / 60)
  const secs = Math.floor(durationSecs % 60)
  const durationLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`

  return (
    <Paper
        elevation={6}
        sx={{
          position: 'absolute', bottom: 16,
          left: '50%', transform: 'translateX(-50%)',
          width: '92%', maxWidth: 1000,
          p: 1.5, borderRadius: 3, zIndex: 1200,
          display: 'flex', flexDirection: 'column', gap: 1,
          bgcolor: (theme) => theme.palette.background.paper,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.background.paper,
            opacity: 0.92,
            zIndex: -1,
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={onPlayPause} color="primary" size="large" disabled={total === 0}>
            {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
          </IconButton>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ minWidth: 150, whiteSpace: 'nowrap' }}>
              {currentDayjs ? currentDayjs.format('YYYY-MM-DD HH:mm:ss') : '—'}
            </Typography>

            <Slider
              size="small"
              min={0}
              max={Math.max(0, total - 1)}
              value={displayIndex}
              disabled={total === 0}
              onChange={(_, v) => setSeekIndex(v as number)}
              onChangeCommitted={(_, v) => { onSeek(v as number); setSeekIndex(null) }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => {
                const point = trajectory[v]
                return point ? dayjs(point.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss') : '—'
              }}
              sx={{ flex: 1 }}
            />

            <Typography variant="caption" sx={{ minWidth: 150, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {endDayjs ? endDayjs.format('YYYY-MM-DD HH:mm:ss') : '—'}
            </Typography>
          </Stack>

          <Button
            size="small" variant="outlined" startIcon={<Settings />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            {playbackSpeed}x
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            {SPEED_OPTIONS.map((s) => (
              <MenuItem
                key={s}
                selected={s === playbackSpeed}
                onClick={() => { onSpeedChange(s); setAnchorEl(null) }}
              >
                {s}x
              </MenuItem>
            ))}
          </Menu>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <DateTimePicker
            label="Start Time"
            value={startDayjs}
            onChange={(v) => v?.isValid() && setDraftStart(v.unix())}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
            sx={{ flex: 1, minWidth: 160 }}
          />
          <Typography variant="body2" color="text.secondary">to</Typography>
          <DateTimePicker
            label="End Time"
            value={endDayjs}
            onChange={(v) => v?.isValid() && setDraftEnd(v.unix())}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
            sx={{ flex: 1, minWidth: 160 }}
          />

          {isDirty && (
            <>
              <Button size="small" variant="contained" onClick={() => onApplyTimeRange(draftStart!, draftEnd!)}>
                Apply
              </Button>
              <Button size="small" variant="outlined" onClick={() => { setDraftStart(startTime); setDraftEnd(endTime) }}>
                Cancel
              </Button>
            </>
          )}

          <Box sx={{ flex: 1 }} />

          <Typography variant="body2" color="primary" fontWeight="bold">
            {durationLabel}
          </Typography>
        </Stack>
      </Paper>
  )
}
