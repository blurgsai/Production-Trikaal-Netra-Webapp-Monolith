import { Divider, TextField, Button, Stack, Typography, CircularProgress } from '@mui/material'
import { Search as SearchIcon, DirectionsBoat as VesselIcon } from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import type { Dayjs } from 'dayjs'

interface Props {
  mmsi: string
  formStart: Dayjs | null
  formEnd: Dayjs | null
  loading: boolean
  onMmsiChange(v: string): void
  onStartChange(v: Dayjs): void
  onEndChange(v: Dayjs): void
  onSearch(): void
}

export const VesselSearchForm = ({
  mmsi, formStart, formEnd, loading,
  onMmsiChange, onStartChange, onEndChange, onSearch,
}: Props) => {
  const mmsiTrimmed = mmsi.trim()
  const mmsiError = mmsiTrimmed.length > 0 && !/^\d+$/.test(mmsiTrimmed)
  const rangeError = formStart?.isValid() && formEnd?.isValid() && !formEnd.isAfter(formStart)
    ? 'End time must be after start time'
    : ''
  const canSubmit = !loading && mmsiTrimmed.length > 0 && !mmsiError && formStart?.isValid() && formEnd?.isValid() && !rangeError

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <VesselIcon color="primary" />
        <Typography variant="h6" fontWeight={600}>Load Vessel Trajectory</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Enter an MMSI and select a time range, then click Load.
      </Typography>

      <TextField
        label="MMSI"
        value={mmsi}
        onChange={(e) => onMmsiChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && canSubmit && onSearch()}
        fullWidth
        placeholder="e.g. 366168522"
        autoFocus
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        error={mmsiError}
        helperText={mmsiError ? 'MMSI must contain only numbers' : ''}
      />

      <Divider />

      <Stack direction="row" spacing={2} alignItems="flex-start">
        <DateTimePicker
          label="Start"
          value={formStart}
          onChange={(v) => v?.isValid() && onStartChange(v)}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              helperText: rangeError || '',
              error: Boolean(rangeError),
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, mt: 1 }}>→</Typography>
        <DateTimePicker
          label="End"
          value={formEnd}
          onChange={(v) => v?.isValid() && onEndChange(v)}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              error: Boolean(rangeError),
            },
          }}
        />
      </Stack>

      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
        onClick={onSearch}
        disabled={!canSubmit}
      >
        {loading ? 'Loading…' : 'Load Trajectory'}
      </Button>
    </Stack>
  )
}
