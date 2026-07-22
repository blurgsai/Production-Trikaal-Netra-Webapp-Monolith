import { useState, useMemo, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import { useVesselsByMmsi } from '../hooks/useVesselsByMmsi'
import { useVesselTrajectory } from '../hooks/useVesselTrajectory'
import { useVesselEvents } from '../hooks/useVesselEvents'
import { useFocusModePlayback } from '../hooks/useFocusModePlayback'
import { FocusModeView } from './FocusModeView'
import type { Vessel } from '../model/types'

export const FocusModePage = () => {
  const [mmsiInput, setMmsiInput] = useState('366168522')
  const [formStart, setFormStart] = useState<dayjs.Dayjs | null>(dayjs('2024-06-15T04:00'))
  const [formEnd, setFormEnd] = useState<dayjs.Dayjs | null>(dayjs('2024-06-15T16:00'))

  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', error: false })

  const mmsiNumber = mmsiInput.trim() ? Number(mmsiInput) : null
  const vesselsQuery = useVesselsByMmsi(mmsiNumber)

  const trajectoryQuery = useVesselTrajectory(
    selectedVessel?.id ?? null,
    startTime,
    endTime,
  )

  const eventsQuery = useVesselEvents(
    selectedVessel?.id ?? null,
    startTime,
    endTime,
  )

  const trajectory = useMemo(() => trajectoryQuery.data?.points ?? [], [trajectoryQuery.data])

  const playback = useFocusModePlayback(trajectory, selectedVessel?.id)

  const currentPoint = trajectory[playback.currentIndex] ?? null

  const visibleTrajectory = useMemo(
    () => trajectory.slice(0, playback.currentIndex + 1),
    [trajectory, playback.currentIndex],
  )

  const visibleEvents = useMemo(
    () => {
      const events = eventsQuery.data ?? []
      if (!currentPoint) return events
      const currentTs = currentPoint.timestamp * 1000
      return events.filter((e) => e.timestamp && e.timestamp.getTime() <= currentTs)
    },
    [eventsQuery.data, currentPoint],
  )

  const fitKey = selectedVessel?.id + String(startTime) + String(endTime)

  const handleSearch = useCallback(() => {
    if (!mmsiInput.trim()) return
    setDialogOpen(true)
  }, [mmsiInput])

  const handleSelectVessel = useCallback(
    (vessel: Vessel) => {
      setSelectedVessel(vessel)
      setDialogOpen(false)
      setStartTime(formStart?.unix() ?? null)
      setEndTime(formEnd?.unix() ?? null)
      setSnackbar({ open: true, message: `Loaded ${vessel.name}. Trajectory ready for playback.`, error: false })
    },
    [formStart, formEnd],
  )

  const handleChangeVessel = useCallback(() => {
    setSelectedVessel(null)
    setStartTime(null)
    setEndTime(null)
  }, [])

  const handleApplyTimeRange = useCallback((start: number, end: number) => {
    setStartTime(start)
    setEndTime(end)
  }, [])

  const handleNavigateToEvent = useCallback((eventId: string) => {
    setSnackbar({ open: true, message: `Navigating to event: ${eventId}`, error: false })
  }, [])

  useEffect(() => {
    if (trajectoryQuery.isError || eventsQuery.isError) {
      const message = trajectoryQuery.isError
        ? 'Failed to load trajectory. Please check the MMSI/time range and try again.'
        : 'Failed to load vessel events. Please try again.'
      setSnackbar({ open: true, message, error: true })
    }
  }, [trajectoryQuery.isError, trajectoryQuery.error, eventsQuery.isError, eventsQuery.error])

  const isLoaded = selectedVessel !== null
  const isLoading = trajectoryQuery.isFetching || eventsQuery.isFetching
  const activeLabel = selectedVessel ? `${selectedVessel.name} (MMSI: ${mmsiInput})` : ''

  return (
    <FocusModeView
      mmsiInput={mmsiInput}
      formStart={formStart as dayjs.Dayjs}
      formEnd={formEnd as dayjs.Dayjs}
      onMmsiChange={setMmsiInput}
      onStartChange={setFormStart}
      onEndChange={setFormEnd}
      onSearch={handleSearch}
      isLoaded={isLoaded}
      isLoading={isLoading}
      activeLabel={activeLabel}
      onChangeVessel={handleChangeVessel}
      trajectory={trajectory}
      visibleTrajectory={visibleTrajectory}
      currentPoint={currentPoint}
      playback={playback}
      visibleEvents={visibleEvents}
      startTime={startTime}
      endTime={endTime}
      onApplyTimeRange={handleApplyTimeRange}
      fitKey={fitKey}
      onNavigateToEvent={handleNavigateToEvent}
      dialogOpen={dialogOpen}
      dialogVessels={vesselsQuery.data ?? []}
      onSelectVessel={handleSelectVessel}
      onDialogClose={() => setDialogOpen(false)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar((s) => ({ ...s, open: false }))}
    />
  )
}
