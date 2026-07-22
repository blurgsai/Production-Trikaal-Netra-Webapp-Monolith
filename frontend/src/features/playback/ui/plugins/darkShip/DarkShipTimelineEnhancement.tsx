import { Box } from '@mui/material';
import { AisPingDensityGraph } from '../../shared/AisPingDensityGraph';
import type { DarkShipEvent } from '../../../model/eventTypeTypes';
import type { TimelineFrame, TimeWindow } from '../../../model/types';

function formatDarkDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export interface Props {
  event: DarkShipEvent;
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

export function DarkShipTimelineEnhancement({ event, timeline, currentTimestampMs, timeWindow }: Props) {
  const { updateRatePerHour, areaAverageRatePerHour } = event;
  const suppressionPct = areaAverageRatePerHour > 0
    ? Math.round((1 - updateRatePerHour / areaAverageRatePerHour) * 100)
    : null;

  return (
    <Box>
      {/* Info bar */}
      <Box
        sx={{
          mt: 1, px: 2, py: 0.5,
          backgroundColor: 'rgba(156,39,176,0.15)',
          borderLeft: '3px solid #9c27b0',
          fontSize: '0.75rem',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#ce93d8', fontWeight: 700 }}>Dark Ship</span>

        <span>
          AIS Rate:{' '}
          <span style={{ color: '#f44336', fontWeight: 700 }}>{updateRatePerHour}/hr</span>
          {suppressionPct != null && suppressionPct > 0 && (
            <span style={{ color: '#f44336' }}> ↓{suppressionPct}%</span>
          )}
          {areaAverageRatePerHour > 0 && (
            <>
              {' vs Area Avg: '}
              <span style={{ color: '#81c784', fontWeight: 700 }}>{areaAverageRatePerHour}/hr</span>
            </>
          )}
        </span>

        <span>
          Silent:{' '}
          <span style={{ color: '#ff9800', fontWeight: 700 }}>
            {formatDarkDuration(event.timeSinceLastUpdateSec)}
          </span>
        </span>
      </Box>

      <AisPingDensityGraph
        vesselIds={event.vesselIds}
        timeline={timeline}
        currentTimestampMs={currentTimestampMs}
        timeWindow={timeWindow}
        eventStartMs={event.eventStartMs}
        eventEndMs={event.eventEndMs}
        accentColor="#9c27b0"
        windowLabel="DARK"
      />
    </Box>
  );
}
