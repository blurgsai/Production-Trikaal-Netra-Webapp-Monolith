import { Box } from '@mui/material';
import { AisPingDensityGraph } from '../../shared/AisPingDensityGraph';
import type { CoordinatedDarkActivityEvent } from '../../../model/eventTypeTypes';
import type { TimelineFrame, TimeWindow } from '../../../model/types';

const ACCENT = '#ff5252'; // critical/coordinated variant — distinct from dark_ship's purple

function formatWindow(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export interface Props {
  event: CoordinatedDarkActivityEvent;
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

// Reuses the dark-ship-family AisPingDensityGraph: with every cluster vessel on its
// own row, the SYNCHRONIZED gap across all rows during the window is the coordination
// evidence — so the graph mechanic (AIS reporting gaps) fits directly; only the accent
// and the surrounding info bar differ. No distance graph (the story is co-going-dark,
// not distance-vs-threshold — that spatial thread is the map's cluster hull instead).
export function CoordinatedDarkActivityTimelineEnhancement({
  event,
  timeline,
  currentTimestampMs,
  timeWindow,
}: Props) {
  const { areaAverageRatePerHour, clusterAverageRatePerHour } = event;
  const suppressionPct = areaAverageRatePerHour > 0
    ? Math.round((1 - clusterAverageRatePerHour / areaAverageRatePerHour) * 100)
    : null;

  return (
    <Box>
      {/* Info bar */}
      <Box
        sx={{
          mt: 1, px: 2, py: 0.5,
          backgroundColor: 'rgba(255,82,82,0.15)',
          borderLeft: `3px solid ${ACCENT}`,
          fontSize: '0.75rem',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <span style={{ color: ACCENT, fontWeight: 700 }}>Coordinated Dark</span>

        <span>
          Cluster:{' '}
          <span style={{ color: '#ffcc00', fontWeight: 700 }}>×{event.clusterSize}</span>
        </span>

        <span>
          Coordination:{' '}
          <span style={{ color: '#ff8a80', fontWeight: 700 }}>
            {event.coordinationScore.toFixed(2)}
          </span>
        </span>

        <span>
          Co-dark window:{' '}
          <span style={{ color: '#ff9800', fontWeight: 700 }}>
            {formatWindow(event.coDarkWindowSec)}
          </span>
        </span>

        <span>
          Cluster rate:{' '}
          <span style={{ color: '#f44336', fontWeight: 700 }}>{clusterAverageRatePerHour}/hr</span>
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
      </Box>

      <AisPingDensityGraph
        vesselIds={event.vesselIds}
        timeline={timeline}
        currentTimestampMs={currentTimestampMs}
        timeWindow={timeWindow}
        eventStartMs={event.eventStartMs}
        eventEndMs={event.eventEndMs}
        accentColor={ACCENT}
        windowLabel="CO-DARK"
        title="Coordinated Dark — AIS Ping Density"
      />
    </Box>
  );
}
