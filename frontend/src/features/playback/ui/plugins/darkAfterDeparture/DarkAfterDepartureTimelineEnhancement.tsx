import { Box } from '@mui/material';
import { AisPingDensityGraph } from '../../shared/AisPingDensityGraph';
import type { DarkAfterDepartureEvent } from '../../../model/eventTypeTypes';
import type { TimelineFrame, TimeWindow } from '../../../model/types';

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export interface Props {
  event: DarkAfterDepartureEvent;
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

export function DarkAfterDepartureTimelineEnhancement({
  event,
  timeline,
  currentTimestampMs,
  timeWindow,
}: Props) {
  const {
    portId, timeSinceDepartureSec, departureToDarkThresholdSec,
    updateRatePerHour, areaAverageRatePerHour, timeSinceLastUpdateSec,
  } = event;

  const windowPct = departureToDarkThresholdSec > 0
    ? Math.min(100, Math.round((timeSinceDepartureSec / departureToDarkThresholdSec) * 100))
    : null;

  return (
    <Box>
      {/* Info bar */}
      <Box
        sx={{
          mt: 1, px: 2, py: 0.5,
          backgroundColor: 'rgba(92,107,192,0.15)',
          borderLeft: '3px solid #5c6bc0',
          fontSize: '0.75rem',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#9fa8da', fontWeight: 700 }}>Dark After Departure</span>

        {portId && (
          <span>
            Port: <span style={{ fontWeight: 700 }}>{portId}</span>
          </span>
        )}

        <span>
          AIS Rate:{' '}
          <span style={{ color: '#f44336', fontWeight: 700 }}>{updateRatePerHour}/hr</span>
          {areaAverageRatePerHour > 0 && (
            <>
              {' vs '}
              <span style={{ color: '#81c784', fontWeight: 700 }}>{areaAverageRatePerHour}/hr</span>
            </>
          )}
        </span>

        <span>
          Silent:{' '}
          <span style={{ color: '#ff9800', fontWeight: 700 }}>{formatDuration(timeSinceLastUpdateSec)}</span>
        </span>
      </Box>

      {/* Departure-to-dark ruler — the signal specific to this detector: how
          much of the suspicion window elapsed before the vessel went dark. */}
      {departureToDarkThresholdSec > 0 && windowPct != null && (
        <Box sx={{ mt: 0.5, px: 2, py: 1, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 1 }}>
          <Box sx={{ fontSize: '0.75rem', color: '#9fa8da', mb: 0.75 }}>
            Departed → Went Dark: {formatDuration(timeSinceDepartureSec)} later
            {' '}({windowPct}% of the {formatDuration(departureToDarkThresholdSec)} window)
          </Box>

          <Box sx={{ position: 'relative', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${windowPct}%`,
                backgroundColor: '#5c6bc0',
                borderRadius: 1,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                left: `${windowPct}%`,
                top: -4,
                width: 2,
                height: 16,
                backgroundColor: '#ffcc00',
                transform: 'translateX(-1px)',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#888', mt: 0.5 }}>
            <span>Departure</span>
            <span>{formatDuration(departureToDarkThresholdSec)} threshold</span>
          </Box>
        </Box>
      )}

      <AisPingDensityGraph
        vesselIds={event.vesselIds}
        timeline={timeline}
        currentTimestampMs={currentTimestampMs}
        timeWindow={timeWindow}
        eventStartMs={event.eventStartMs}
        eventEndMs={event.eventEndMs}
        accentColor="#5c6bc0"
        windowLabel="DARK"
      />
    </Box>
  );
}
