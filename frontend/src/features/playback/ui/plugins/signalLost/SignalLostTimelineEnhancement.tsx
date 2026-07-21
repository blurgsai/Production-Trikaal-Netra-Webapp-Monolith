import { Box } from '@mui/material';
import { AisPingDensityGraph } from '../../shared/AisPingDensityGraph';
import type { SignalLostEvent } from '../../../model/eventTypeTypes';
import type { TimelineFrame, TimeWindow } from '../../../model/types';

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export interface Props {
  event: SignalLostEvent;
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

export function SignalLostTimelineEnhancement({ event, timeline, currentTimestampMs, timeWindow }: Props) {
  const { thresholdSec, silentDurationSec } = event;
  const multiple = thresholdSec > 0 ? (silentDurationSec / thresholdSec).toFixed(1) : null;

  return (
    <Box>
      {/* Info bar — neutral slate, not dark_ship's purple: no suspicion implied */}
      <Box
        sx={{
          mt: 1, px: 2, py: 0.5,
          backgroundColor: 'rgba(96,125,139,0.15)',
          borderLeft: '3px solid #607d8b',
          fontSize: '0.75rem',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#b0bec5', fontWeight: 700 }}>Signal Lost</span>

        <span>
          Silent:{' '}
          <span style={{ color: '#ffb74d', fontWeight: 700 }}>{formatDuration(silentDurationSec)}</span>
          {multiple != null && (
            <span style={{ color: '#90a4ae' }}> ({multiple}× the {formatDuration(thresholdSec)} threshold)</span>
          )}
        </span>
      </Box>

      <AisPingDensityGraph
        vesselIds={event.vesselIds}
        timeline={timeline}
        currentTimestampMs={currentTimestampMs}
        timeWindow={timeWindow}
        eventStartMs={event.eventStartMs}
        eventEndMs={event.eventEndMs}
        accentColor="#607d8b"
        windowLabel="NO SIGNAL"
      />
    </Box>
  );
}
