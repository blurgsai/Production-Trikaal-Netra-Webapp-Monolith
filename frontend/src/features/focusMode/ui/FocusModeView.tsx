import { useState } from 'react'
import type { Dayjs } from 'dayjs'
import {
  Box, Typography, Paper, Alert, Snackbar, Stack, Chip, Button, Fade,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import {
  DirectionsBoat as VesselIcon,
  Edit as EditIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Public as GlobeIcon,
} from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { FocusModeMap } from './FocusModeMap'
import { FocusModeMap3D } from './FocusModeMap3D'
import { FocusPlaybackControls } from './FocusPlaybackControls'
import { VesselPickerDialog } from './VesselPickerDialog'
import { VesselSearchForm } from './VesselSearchForm'
import type { TrajectoryPoint, FocusEvent, Vessel } from '../model/types'

interface Playback {
  currentIndex: number
  isPlaying: boolean
  playbackSpeed: number
  seek: (i: number) => void
  setSpeed: (s: number) => void
  togglePlay: () => void
}

export interface FocusModeViewProps {
  mmsiInput: string
  formStart: Dayjs
  formEnd: Dayjs
  onMmsiChange: (v: string) => void
  onStartChange: (v: Dayjs) => void
  onEndChange: (v: Dayjs) => void
  onSearch: () => void
  isLoaded: boolean
  isLoading: boolean
  activeLabel: string
  onChangeVessel: () => void
  trajectory: TrajectoryPoint[]
  visibleTrajectory: TrajectoryPoint[]
  currentPoint: TrajectoryPoint | null
  playback: Playback
  visibleEvents: FocusEvent[]
  startTime: number | null
  endTime: number | null
  onApplyTimeRange: (start: number, end: number) => void
  fitKey: string | undefined
  onNavigateToEvent: (eventId: string) => void
  dialogOpen: boolean
  dialogVessels: Vessel[]
  onSelectVessel: (vessel: Vessel) => void
  onDialogClose: () => void
  snackbar: { open: boolean; message: string; error: boolean }
  onSnackbarClose: () => void
}

export const FocusModeView = ({
  mmsiInput, formStart, formEnd,
  onMmsiChange, onStartChange, onEndChange, onSearch,
  isLoaded, isLoading, activeLabel, onChangeVessel,
  trajectory, visibleTrajectory, currentPoint, playback,
  visibleEvents, startTime, endTime, onApplyTimeRange, fitKey, onNavigateToEvent,
  dialogOpen, dialogVessels, onSelectVessel, onDialogClose,
  snackbar, onSnackbarClose,
}: FocusModeViewProps) => {
  const [mode, setMode] = useState<'2d' | '3d'>('2d')

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box sx={{ p: 2, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', gap: 2 }}>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>Focus Mode</Typography>

        {isLoaded && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip icon={<VesselIcon />} label={activeLabel} color="primary" variant="outlined" />
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon fontSize="small" />}
              onClick={onChangeVessel}
            >
              Change Vessel
            </Button>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => v && setMode(v as '2d' | '3d')}
              size="small"
              aria-label="view mode"
            >
              <ToggleButton value="2d" aria-label="2D map">
                <MapIcon fontSize="small" sx={{ mr: 0.5 }} /> 2D
              </ToggleButton>
              <ToggleButton value="3d" aria-label="3D globe">
                <GlobeIcon fontSize="small" sx={{ mr: 0.5 }} /> 3D
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        )}
      </Stack>

      {!isLoaded && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper elevation={4} sx={{ p: 4, borderRadius: 3, width: '100%', maxWidth: 540 }}>
            <VesselSearchForm
              mmsi={mmsiInput}
              formStart={formStart}
              formEnd={formEnd}
              loading={isLoading}
              onMmsiChange={onMmsiChange}
              onStartChange={onStartChange}
              onEndChange={onEndChange}
              onSearch={onSearch}
            />
          </Paper>
        </Box>
      )}

      {isLoaded && (
        <Paper elevation={3} sx={{ flex: 1, overflow: 'hidden', borderRadius: 2, position: 'relative' }}>
          {mode === '2d' ? (
            <FocusModeMap
              trajectory={visibleTrajectory}
              fullTrajectory={trajectory}
              currentPoint={currentPoint}
              playbackSpeed={playback.playbackSpeed}
              events={visibleEvents}
              fitKey={fitKey}
              onNavigateToEvent={onNavigateToEvent}
            />
          ) : (
            <FocusModeMap3D
              trajectory={visibleTrajectory}
              fullTrajectory={trajectory}
              currentPoint={currentPoint}
              playbackSpeed={playback.playbackSpeed}
              events={visibleEvents}
              fitKey={fitKey}
              onNavigateToEvent={onNavigateToEvent}
            />
          )}
          {trajectory.length === 0 && (
            <Fade in>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  bgcolor: (theme) => theme.palette.background.paper,
                  opacity: 0.95,
                  zIndex: 1300,
                  textAlign: 'center',
                  p: 4,
                }}
              >
                <TimelineIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                <Typography variant="h6" fontWeight={600}>
                  No trajectory data available
                </Typography>
                <Typography variant="body2" color="text.secondary" maxWidth={400}>
                  We could not find any trajectory points for the selected vessel and time range. Try a different MMSI or broaden the time range.
                </Typography>
                <Button variant="outlined" size="small" onClick={onChangeVessel} startIcon={<EditIcon />}>
                  Change Vessel
                </Button>
              </Box>
            </Fade>
          )}
          {trajectory.length > 0 && (
            <FocusPlaybackControls
              trajectory={trajectory}
              currentIndex={playback.currentIndex}
              isPlaying={playback.isPlaying}
              playbackSpeed={playback.playbackSpeed}
              onPlayPause={playback.togglePlay}
              onSeek={playback.seek}
              onSpeedChange={playback.setSpeed}
              startTime={startTime}
              endTime={endTime}
              onApplyTimeRange={onApplyTimeRange}
            />
          )}
        </Paper>
      )}

      <VesselPickerDialog
        open={dialogOpen}
        mmsi={mmsiInput}
        vessels={dialogVessels}
        onSelect={onSelectVessel}
        onClose={onDialogClose}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={onSnackbarClose}
      >
        <Alert
          severity={snackbar.error ? 'error' : 'success'}
          sx={{ width: '100%' }}
          onClose={onSnackbarClose}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  </LocalizationProvider>
)
}
