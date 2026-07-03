import { useMemo } from 'react';
import { Box, Paper } from '@mui/material';

// One colour per vessel — cycles when there are more than 6 vessels
const VESSEL_COLORS = ['#5ec8ff', '#ff9e5e', '#5eff9e', '#ff5e9e', '#c8ff5e', '#c85eff'];

export interface SpeedPoint {
  timestampMs: number;
  speed: number;
}

interface SpeedGraphProps {
  speedDataByVessel: Record<string, SpeedPoint[]>;
  currentTimestampMs: number;
  threshold: number | null;
  rangeStartMs: number;
  rangeEndMs: number;
}

export function SpeedGraph({
  speedDataByVessel,
  currentTimestampMs,
  threshold,
  rangeStartMs,
  rangeEndMs,
}: SpeedGraphProps) {
  const vesselIds = Object.keys(speedDataByVessel);
  if (vesselIds.length === 0) return null;

  // ── Graph layout ──────────────────────────────────────────────────────────────
  const viewBoxWidth  = 800;
  const viewBoxHeight = 120;
  const pad = { top: 10, right: 20, bottom: 25, left: 40 };
  const graphW = viewBoxWidth  - pad.left - pad.right;
  const graphH = viewBoxHeight - pad.top  - pad.bottom;

  // ── X scale — anchored to the full query window so playhead aligns with slider ─
  const tsRange = rangeEndMs - rangeStartMs || 1;
  const scaleX = (ts: number) => ((ts - rangeStartMs) / tsRange) * graphW;

  // ── Y scale — driven by real data across all vessels ─────────────────────────
  const allPoints = vesselIds.flatMap(id => speedDataByVessel[id]);
  const hasThreshold = threshold != null && threshold > 0;

  const dataMax = Math.max(
    ...allPoints.map(d => d.speed),
    hasThreshold ? (threshold as number) * 1.5 : 0,
  );
  const maxSpeed = dataMax > 0 ? dataMax * 1.1 : 0.1;

  // Adaptive precision: 3 decimals for tiny speeds (<0.1 m/s), down to 1 for fast vessels
  const yLabelDecimals = maxSpeed < 0.1 ? 3 : maxSpeed < 1 ? 2 : 1;

  const scaleY = (speed: number) => graphH - (speed / maxSpeed) * graphH;

  // ── Per-vessel SVG paths ──────────────────────────────────────────────────────
  const vesselPaths = vesselIds.map((vesselId, idx) => {
    const data  = speedDataByVessel[vesselId];
    const color = VESSEL_COLORS[idx % VESSEL_COLORS.length];
    const d = data
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.timestampMs)} ${scaleY(pt.speed)}`)
      .join(' ');
    return { vesselId, color, data, d };
  });

  // ── Threshold fill areas: red = below threshold, green = above ───────────────
  const buildAreaPath = (belowThreshold: boolean): string => {
    if (!hasThreshold) return '';
    const thresholdY = scaleY(threshold as number);
    const sorted = allPoints.slice().sort((a, b) => a.timestampMs - b.timestampMs);
    let path = '';
    let open = false;

    for (const d of sorted) {
      const x       = scaleX(d.timestampMs);
      const y       = scaleY(d.speed);
      const isBelow = d.speed < (threshold as number);

      if (isBelow === belowThreshold) {
        if (!open) { path += `M ${x} ${thresholdY} L ${x} ${y} `; open = true; }
        else        { path += `L ${x} ${y} `; }
      } else if (open) {
        path += `L ${x} ${thresholdY} Z `;
        open = false;
      }
    }

    if (open) path += `L ${scaleX(rangeEndMs)} ${thresholdY} Z`;
    return path;
  };

  // ── Playhead: nearest data point per vessel at currentTimestampMs ─────────────
  const nearestByVessel = useMemo(() => {
    const result: Record<string, SpeedPoint> = {};
    for (const id of vesselIds) {
      const data = speedDataByVessel[id];
      if (!data?.length) continue;
      result[id] = data.reduce((best, pt) =>
        Math.abs(pt.timestampMs - currentTimestampMs) < Math.abs(best.timestampMs - currentTimestampMs)
          ? pt : best,
      );
    }
    return result;
  }, [currentTimestampMs, speedDataByVessel, vesselIds]);

  const playheadX = scaleX(currentTimestampMs);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Paper
      elevation={1}
      sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 1 }}
    >
      {/* Header + legend (legend only when multiple vessels) */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: '0.75rem', color: '#fff' }}>Speed Over Time</Box>
        {vesselIds.length > 1 && vesselPaths.map(({ vesselId, color }) => (
          <Box key={vesselId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 20, height: 2, backgroundColor: color, borderRadius: 1 }} />
            <Box sx={{ fontSize: '0.7rem', color: '#ccc' }}>{vesselId}</Box>
          </Box>
        ))}
      </Box>

      <svg
        width="100%"
        height="120"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <g transform={`translate(${pad.left}, ${pad.top})`}>

          {/* Horizontal grid lines with Y-axis speed labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y     = graphH * ratio;
            const speed = maxSpeed * (1 - ratio);
            return (
              <g key={ratio}>
                <line x1={0} y1={y} x2={graphW} y2={y}
                  stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <text x={-5} y={y + 3} fill="#999" fontSize="10" textAnchor="end">
                  {speed.toFixed(yLabelDecimals)}
                </text>
              </g>
            );
          })}

          {/* Threshold dashed line + label */}
          {hasThreshold && (
            <>
              <line
                x1={0} y1={scaleY(threshold as number)}
                x2={graphW} y2={scaleY(threshold as number)}
                stroke="#ff4444" strokeWidth={2} strokeDasharray="5,5"
              />
              <text
                x={graphW - 5} y={scaleY(threshold as number) - 5}
                fill="#ff4444" fontSize="10" textAnchor="end"
              >
                Threshold: {threshold} m/s
              </text>
            </>
          )}

          {/* Colour-filled threshold zones */}
          {hasThreshold && (
            <>
              <path d={buildAreaPath(true)}  fill="rgba(255,68,68,0.15)" />
              <path d={buildAreaPath(false)} fill="rgba(68,255,68,0.15)" />
            </>
          )}

          {/* Per-vessel speed lines */}
          {vesselPaths.map(({ vesselId, color, d }) => (
            <path key={vesselId} d={d} fill="none" stroke={color} strokeWidth={2} />
          ))}

          {/* Playhead: yellow vertical line + coloured dot snapped to nearest data point */}
          <>
            <line
              x1={playheadX} y1={0}
              x2={playheadX} y2={graphH}
              stroke="#ffcc00" strokeWidth={2}
            />
            {vesselPaths.map(({ vesselId, color }) => {
              const pt = nearestByVessel[vesselId];
              return pt ? (
                <circle
                  key={vesselId}
                  cx={playheadX}
                  cy={scaleY(pt.speed)}
                  r={4} fill={color} stroke="#ffcc00" strokeWidth={1}
                />
              ) : null;
            })}
          </>

          {/* X axis baseline */}
          <line x1={0} y1={graphH} x2={graphW} y2={graphH} stroke="#666" strokeWidth={1} />
          <text x={graphW / 2} y={graphH + 20} fill="#999" fontSize="10" textAnchor="middle">
            Time
          </text>

          {/* Y axis label */}
          <text
            x={-25} y={graphH / 2} fill="#999" fontSize="10" textAnchor="middle"
            transform={`rotate(-90, -25, ${graphH / 2})`}
          >
            Speed (m/s)
          </text>

        </g>
      </svg>
    </Paper>
  );
}
