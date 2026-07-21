import { useMemo } from 'react';
import { Box, Paper } from '@mui/material';
import type { TimelineFrame, TimeWindow } from '../../model/types';

function formatTimeLabel(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' UTC';
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface AisPingDensityGraphProps {
  vesselIds: string[];
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  timeWindow: TimeWindow;
  eventStartMs: number | null;
  eventEndMs: number | null;
  // Lets each event type keep its own visual identity (e.g. dark_ship's purple
  // vs signal_lost's neutral slate) while sharing the same graph mechanic.
  accentColor: string;
  windowLabel: string;
  title?: string;
}



// One trajectory frame = one real AIS position report, so a tick mark here
// means the vessel actually pinged — gaps between ticks are genuine silence.
// This is shared by every event type that's fundamentally about AIS reporting
// gaps (dark_ship, signal_lost, dark_after_departure, ...) — only the accent
// colour, window label, and surrounding info bar differ per type.
export function AisPingDensityGraph({
  vesselIds,
  timeline,
  currentTimestampMs,
  timeWindow,
  eventStartMs,
  eventEndMs,
  accentColor,
  windowLabel,
  title = 'AIS Ping Density',
}: AisPingDensityGraphProps) {
  const vessels = vesselIds.length ? vesselIds : Object.keys(timeline[0]?.vessels ?? {});

  const pingMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    vessels.forEach(id => { map[id] = []; });
    for (const frame of timeline) {
      for (const id of vessels) {
        if (frame.vessels[id]) map[id].push(frame.timestampMs);
      }
    }
    return map;
  }, [timeline, vessels]);

  if (!vessels.length) return null;

  const viewBoxWidth = 800;
  const ROW_HEIGHT = 18;
  const TICK_H = 12;
  const pad = { top: 8, right: 20, bottom: 20, left: 40 };

  const graphH = vessels.length * ROW_HEIGHT;
  const viewBoxHeight = pad.top + graphH + pad.bottom;
  const graphW = viewBoxWidth - pad.left - pad.right;

  const rangeStartMs = timeWindow.queryStartMs;
  const rangeEndMs   = timeWindow.queryEndMs;
  const tsRange = rangeEndMs - rangeStartMs || 1;
  const scaleX = (ts: number) => ((ts - rangeStartMs) / tsRange) * graphW;

  const evStart  = eventStartMs ?? timeWindow.eventStartMs;
  const evEnd    = eventEndMs   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;
  const evStartX = Math.max(0, Math.min(graphW, scaleX(evStart)));
  const evEndX   = Math.max(0, Math.min(graphW, scaleX(evEnd)));

  const playheadX = scaleX(currentTimestampMs);

  return (
    <Paper elevation={1} sx={{ mt: 0.5, p: 1, bgcolor: 'background.input', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Box sx={{ fontSize: '0.75rem', color: accentColor, mb: 0.5, ml: 1 }}>{title}</Box>

      <svg
        width="100%"
        height={viewBoxHeight}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <g transform={`translate(${pad.left}, ${pad.top})`}>
          <rect x={0} y={0} width={graphW} height={graphH} fill="rgba(255,255,255,0.03)" />

          {vessels.map((id, i) => (
            <text
              key={`label-${id}`}
              x={-5} y={i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
              fill="#999" fontSize="9" textAnchor="end"
            >
              {id.slice(-4)}
            </text>
          ))}

          {vessels.map((_, i) => i > 0 && (
            <line
              key={`divider-${i}`}
              x1={0} y1={i * ROW_HEIGHT} x2={graphW} y2={i * ROW_HEIGHT}
              stroke="rgba(255,255,255,0.07)" strokeWidth={1}
            />
          ))}

          {/* Event window shading */}
          <rect x={evStartX} y={0} width={Math.max(1, evEndX - evStartX)} height={graphH} fill={hexToRgba(accentColor, 0.18)} />
          <line x1={evStartX} y1={0} x2={evStartX} y2={graphH} stroke={accentColor} strokeWidth={1.5} strokeDasharray="4,4" />
          <line x1={evEndX} y1={0} x2={evEndX} y2={graphH} stroke={accentColor} strokeWidth={1.5} strokeDasharray="4,4" />

          {evEndX - evStartX > 30 && (
            <text
              x={(evStartX + evEndX) / 2} y={graphH / 2 + 4}
              fill={hexToRgba(accentColor, 0.6)} fontSize="10" fontWeight="700"
              textAnchor="middle" letterSpacing="2"
            >
              {windowLabel}
            </text>
          )}

          {/* Ping ticks — one per vessel row */}
          {vessels.map((id, rowIdx) => {
            const rowCentreY = rowIdx * ROW_HEIGHT + (ROW_HEIGHT - TICK_H) / 2;
            return (pingMap[id] ?? []).map(ts => (
              <line
                key={`tick-${id}-${ts}`}
                x1={scaleX(ts)} y1={rowCentreY} x2={scaleX(ts)} y2={rowCentreY + TICK_H}
                stroke={accentColor} strokeWidth={1.5} opacity={0.85}
              />
            ));
          })}

          <line x1={playheadX} y1={0} x2={playheadX} y2={graphH} stroke="#ffcc00" strokeWidth={2} />

          <line x1={0} y1={graphH} x2={graphW} y2={graphH} stroke="#555" strokeWidth={1} />

          {[
            { ts: rangeStartMs, x: 0, anchor: 'start' as const },
            { ts: (rangeStartMs + rangeEndMs) / 2, x: graphW / 2, anchor: 'middle' as const },
            { ts: rangeEndMs, x: graphW, anchor: 'end' as const },
          ].map(({ ts, x, anchor }) => (
            <text key={anchor} x={x} y={graphH + 14} fill="#666" fontSize="9" textAnchor={anchor}>
              {formatTimeLabel(ts)}
            </text>
          ))}
        </g>
      </svg>
    </Paper>
  );
}
