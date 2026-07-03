import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  usePingFocusMode,
  useVesselsByMmsi,
  useVesselTrajectory,
  useVesselEvents,
  useFocusModePlayback,
  FocusModeView,
} from '@/features/focusMode'
import type { Vessel } from '@/features/focusMode'

export function FocusModePage() {
  const { vesselId: urlVesselId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Form input state
  const [mmsiInput, setMmsiInput] = useState('')
  const [formStart, setFormStart] = useState<Dayjs>(() => dayjs().startOf('day'))
  const [formEnd, setFormEnd] = useState<Dayjs>(() => dayjs().endOf('day'))

  // Query driver state — setting these triggers the data hooks
  const [searchMmsi, setSearchMmsi] = useState<number | null>(null)
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)

  // Dialog + notification state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', error: false })
  const notify = (message: string, error = false) =>
    setSnackbar({ open: true, message, error })

  // Data hooks
  const ping = usePingFocusMode()
  const vesselSearch = useVesselsByMmsi(searchMmsi)
  const trajectoryQuery = useVesselTrajectory(selectedVessel?.id ?? null, startTime, endTime)
  const eventsQuery = useVesselEvents(selectedVessel?.id ?? null, startTime, endTime)

  const trajectory = trajectoryQuery.data?.points ?? []
  const events = eventsQuery.data ?? []

  const playback = useFocusModePlayback(trajectory, `${selectedVessel?.id}-${startTime}-${endTime}`)

  // Auto-load when navigated directly to /focusmode/:vesselId?start=X&end=Y.
  // Empty deps — runs exactly once on mount. If the page mounts at /focusmode (no
  // vessel ID), the guard returns early. If it mounts at /focusmode/:id (direct link,
  // refresh, or navigate-from-table), it loads the vessel. commitVessel()'s own
  // navigate() calls never re-trigger this because the deps are empty.
  useEffect(() => {
    if (!urlVesselId) return
    const paramStart = searchParams.get('start')
    const paramEnd = searchParams.get('end')
    const start = paramStart ? Number(paramStart) : dayjs().startOf('day').unix()
    const end = paramEnd ? Number(paramEnd) : dayjs().endOf('day').unix()
    setFormStart(dayjs.unix(start))
    setFormEnd(dayjs.unix(end))
    setSelectedVessel({ id: urlVesselId, name: `Vessel ${urlVesselId}` })
    setStartTime(start)
    setEndTime(end)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify when API is unreachable
  useEffect(() => {
    if (ping.isError) notify('Could not reach Focus Mode API', true)
  }, [ping.isError])

  // React to vessel search results — UX flow: 1 result auto-selects, multiple opens dialog
  useEffect(() => {
    const vessels = vesselSearch.data
    if (!vessels) return
    if (vessels.length === 1) {
      commitVessel(vessels[0])
    } else if (vessels.length > 1) {
      setDialogOpen(true)
    } else {
      notify(`No vessels found for MMSI ${searchMmsi}`, true)
    }
  }, [vesselSearch.dataUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify when vessel search errors
  useEffect(() => {
    if (vesselSearch.isError)
      notify(`Could not look up MMSI ${searchMmsi}`, true)
  }, [vesselSearch.errorUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify + prefill MMSI when trajectory arrives
  useEffect(() => {
    const data = trajectoryQuery.data
    if (!data) return
    if (data.mmsi) setMmsiInput(String(data.mmsi))
    notify(`Loaded ${data.count} point${data.count !== 1 ? 's' : ''}`)
  }, [trajectoryQuery.dataUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify when trajectory fetch errors
  useEffect(() => {
    if (trajectoryQuery.isError)
      notify(`Could not load trajectory for vessel "${selectedVessel?.id}"`, true)
  }, [trajectoryQuery.errorUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Commits a vessel selection and navigates the URL immediately — before data arrives.
  const commitVessel = (vessel: Vessel) => {
    const start = formStart.unix()
    const end = formEnd.unix()
    setSelectedVessel(vessel)
    setStartTime(start)
    setEndTime(end)
    setDialogOpen(false)
    navigate(`/focusmode/${vessel.id}?start=${start}&end=${end}`, { replace: true })
  }

  const handleSearch = () => {
    const mmsiNum = Number(mmsiInput.trim())
    if (!mmsiNum || !formStart?.isValid() || !formEnd?.isValid()) return
    setSearchMmsi(mmsiNum)
  }

  const handleApplyTimeRange = (start: number, end: number) => {
    setStartTime(start)
    setEndTime(end)
    if (selectedVessel) {
      navigate(`/focusmode/${selectedVessel.id}?start=${start}&end=${end}`, { replace: true })
    }
  }

  const handleChangeVessel = () => {
    setSelectedVessel(null)
    setSearchMmsi(null)
    setStartTime(null)
    setEndTime(null)
    navigate('/focusmode', { replace: true })
  }

  // Derived values — presentation logic only
  const isLoaded = Boolean(selectedVessel)
  const isLoading = vesselSearch.isFetching || trajectoryQuery.isFetching
  const currentPoint = trajectory[playback.currentIndex] ?? null
  const visibleTrajectory = useMemo(
    () => trajectory.slice(0, playback.currentIndex + 1),
    [trajectory, playback.currentIndex]
  )
  const visibleEvents = useMemo(
    () => events.filter((e) => {
      if (!e.timestamp) return true
      const t = e.timestamp.getTime() / 1000
      return t >= (startTime ?? 0) && t <= (endTime ?? Infinity)
    }),
    [events, startTime, endTime]
  )
  const activeLabel = trajectoryQuery.data?.mmsi
    ? `MMSI ${trajectoryQuery.data.mmsi}`
    : selectedVessel?.name ?? ''

  return (
    <FocusModeView
      mmsiInput={mmsiInput}
      formStart={formStart}
      formEnd={formEnd}
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
      fitKey={selectedVessel?.id}
      onNavigateToEvent={(id) => navigate(`/events?id=${id}`)}
      dialogOpen={dialogOpen}
      dialogVessels={vesselSearch.data ?? []}
      onSelectVessel={commitVessel}
      onDialogClose={() => setDialogOpen(false)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar((s) => ({ ...s, open: false }))}
    />
  )
}

export default FocusModePage
