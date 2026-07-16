import { useMemo } from 'react';
import { Box, Paper } from '@mui/material';
import { haversineMeters } from '../../model/geoDistance';
import type { TimelineFrame, VesselPosition } from '../../model/types';

// Shared timeline enhancement for the multi-vessel proximity family. Plots the live
// separation between the involved vessels over the query window against the event's
// distance threshold, with a playhead synced to the slider. The analog of SpeedGraph
// for "distance between vessels vs a threshold" — kept separate from SpeedGraph
// because the series is one pairwise distance (not per-vessel speed) and the axis /
// alert semantics differ.
//
// For >2 vessels (a cluster) the plotted series is the MINIMUM pairwise separation
// per frame — the tightest the group ever gets. `inverted` flips the alert fill to
// above the threshold (duplicate_mmsi: alert when impossibly far apart).

export interface InterVesselDistanceGraphProps {
  vesselIds: string[];
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  rangeStartMs: number;
  rangeEndMs: number;
  thresholdM: number | null;
  inverted?: boolean;
}

interface DistancePoint {
  timestampMs: number;
  distanceM: number;
}

// Human-readable separation, unit chosen by magnitude (independent of the axis unit).
function formatSeparation(meters: number): string {
  if (meters >= 10_000) return `${(meters / 1000).toFixed(0)} km`;
  if (meters >= 1_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function minPairwiseDistance(positions: VesselPosition[]): number | null {
  let min = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const d = haversineMeters(positions[i], positions[j]);
      if (d < min) min = d;
    }
  }
  return Number.isFinite(min) ? min : null;
}

export function InterVesselDistanceGraph({
  vesselIds,
  timeline,
  currentTimestampMs,
  rangeStartMs,
  rangeEndMs,
  thresholdM,
  inverted = false,
}: InterVesselDistanceGraphProps) {
  // Distance series: carry forward each vessel's last-known position (frames only
  // contain vessels that reported at that instant), then record the pairwise
  // separation once at least two involved vessels have a known position.
  const points = useMemo(() => {
    const series: DistancePoint[] = [];
    const last: Record<string, VesselPosition> = {};
    for (const frame of timeline) {
      for (const [id, pos] of Object.entries(frame.vessels)) last[id] = pos;
      const located = vesselIds
        .map(id => last[id])
        .filter((p): p is VesselPosition => p != null);
      if (located.length < 2) continue;
      const d = minPairwiseDistance(located);
      if (d != null) series.push({ timestampMs: frame.timestampMs, distanceM: d });
    }
    return series;
  }, [timeline, vesselIds]);

  const nearest = useMemo(() => {
    if (!points.length) return null;
    return points.reduce((best, pt) =>
      Math.abs(pt.timestampMs - currentTimestampMs) < Math.abs(best.timestampMs - currentTimestampMs)
        ? pt : best,
    );
  }, [points, currentTimestampMs]);

  if (points.length === 0) return null;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const viewBoxWidth = 800;
  const viewBoxHeight = 120;
  const pad = { top: 10, right: 20, bottom: 25, left: 48 };
  const graphW = viewBoxWidth - pad.left - pad.right;
  const graphH = viewBoxHeight - pad.top - pad.bottom;

  const tsRange = rangeEndMs - rangeStartMs || 1;
  const scaleX = (ts: number) => ((ts - rangeStartMs) / tsRange) * graphW;

  const hasThreshold = thresholdM != null && thresholdM > 0;
  const dataMax = Math.max(...points.map(p => p.distanceM), 0);

  // Y-axis top. With a threshold, cap the axis at a few multiples of it so the
  // threshold band stays legible even when vessels approach from far away — a 21 km
  // approach would otherwise squash a 500 m threshold into a 1-px notch at the bottom.
  // Distances beyond the cap ride flat along the top edge (the live "now" readout still
  // shows the true value). Without a threshold, auto-scale to the data as before.
  const THRESHOLD_AXIS_CAP = 3;
  let maxDist: number;
  if (hasThreshold) {
    const t = thresholdM as number;
    maxDist = Math.max(t * 1.5, Math.min(dataMax * 1.1, t * THRESHOLD_AXIS_CAP));
  } else {
    maxDist = dataMax > 0 ? dataMax * 1.1 : 1;
  }

  // Clamp so off-scale distances pin to the top edge instead of drawing outside the plot.
  const scaleY = (d: number) => {
    const y = graphH - (d / maxDist) * graphH;
    return Math.max(0, Math.min(graphH, y));
  };

  // Axis unit: km once distances get large, metres otherwise.
  const useKm = maxDist >= 2000;
  const unitLabel = useKm ? 'km' : 'm';
  const fmtAxis = (d: number) => (useKm ? (d / 1000).toFixed(1) : String(Math.round(d)));

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.timestampMs)} ${scaleY(p.distanceM)}`)
    .join(' ');

  // Alert fill: below the threshold by default (too close), above it when inverted.
  const buildAreaPath = (alertSide: boolean): string => {
    if (!hasThreshold) return '';
    const thresholdY = scaleY(thresholdM as number);
    let path = '';
    let open = false;
    for (const p of points) {
      const x = scaleX(p.timestampMs);
      const y = scaleY(p.distanceM);
      const below = p.distanceM < (thresholdM as number);
      const onAlertSide = inverted ? !below : below;
      if (onAlertSide === alertSide) {
        if (!open) { path += `M ${x} ${thresholdY} L ${x} ${y} `; open = true; }
        else { path += `L ${x} ${y} `; }
      } else if (open) {
        path += `L ${x} ${thresholdY} Z `;
        open = false;
      }
    }
    if (open) path += `L ${scaleX(points[points.length - 1].timestampMs)} ${thresholdY} Z`;
    return path;
  };

  const playheadX = scaleX(currentTimestampMs);

  return (
    <Paper elevation={1} sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: '0.75rem', color: '#fff' }}>Separation Over Time</Box>
        {nearest && (
          <Box sx={{ fontSize: '0.7rem', color: '#5ec8ff' }}>
            now: {formatSeparation(nearest.distanceM)}
          </Box>
        )}
      </Box>

      <svg
        width="100%"
        height="120"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <g transform={`translate(${pad.left}, ${pad.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = graphH * ratio;
            const d = maxDist * (1 - ratio);
            return (
              <g key={ratio}>
                <line x1={0} y1={y} x2={graphW} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <text x={-5} y={y + 3} fill="#999" fontSize="10" textAnchor="end">{fmtAxis(d)}</text>
              </g>
            );
          })}

          {hasThreshold && (
            <>
              <line
                x1={0} y1={scaleY(thresholdM as number)}
                x2={graphW} y2={scaleY(thresholdM as number)}
                stroke="#ff4444" strokeWidth={2} strokeDasharray="5,5"
              />
              <text
                x={graphW - 5} y={scaleY(thresholdM as number) - 5}
                fill="#ff4444" fontSize="10" textAnchor="end"
              >
                Threshold: {fmtAxis(thresholdM as number)} {unitLabel}
              </text>
              <path d={buildAreaPath(true)} fill="rgba(255,68,68,0.15)" />
              <path d={buildAreaPath(false)} fill="rgba(68,255,68,0.12)" />
            </>
          )}

          <path d={lineD} fill="none" stroke="#5ec8ff" strokeWidth={2} />

          <>
            <line x1={playheadX} y1={0} x2={playheadX} y2={graphH} stroke="#ffcc00" strokeWidth={2} />
            {nearest && (
              <circle
                cx={playheadX} cy={scaleY(nearest.distanceM)}
                r={4} fill="#5ec8ff" stroke="#ffcc00" strokeWidth={1}
              />
            )}
          </>

          <line x1={0} y1={graphH} x2={graphW} y2={graphH} stroke="#666" strokeWidth={1} />
          <text x={graphW / 2} y={graphH + 20} fill="#999" fontSize="10" textAnchor="middle">Time</text>
          <text
            x={-30} y={graphH / 2} fill="#999" fontSize="10" textAnchor="middle"
            transform={`rotate(-90, -30, ${graphH / 2})`}
          >
            Distance ({unitLabel})
          </text>
        </g>
      </svg>
    </Paper>
  );
}
