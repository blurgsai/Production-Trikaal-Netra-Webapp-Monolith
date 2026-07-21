import L from 'leaflet';
import { Marker, Polygon, Polyline, Tooltip } from 'react-leaflet';
import { haversineMeters } from '../../model/geoDistance';
import { formatDistance } from './formatDistance';
import type { VesselPosition } from '../../model/types';

// Shared multi-vessel CLUSTER overlay — sibling to VesselConnectionOverlay.
// Where the connection overlay tells the "distance between a pair" story with
// pairwise lines + a midpoint chip, this tells the "these N ships are one tight
// group" story with a convex hull + centroid. Both live-update as the user scrubs.
//
// Structural: any cluster event (coordinated_dark_activity, and future grouping
// types) can drive this by supplying the involved vessel ids, their live positions,
// and the clustering distance threshold. The cluster is "confirmed tight" — and the
// hull turns alert-coloured — when the live max pairwise separation (hull diameter)
// is within the threshold. Presentational strings (`label`) come from the plugin.

export interface VesselClusterOverlayProps {
  vesselIds: string[];
  currentPositions: Record<string, VesselPosition>;
  spreadThresholdM: number | null;
  label?: string;
}

const ALERT_COLOR = '#ff4444';
const CALM_COLOR = '#5ec8ff';
const NEUTRAL_COLOR = '#c8ff5e';

interface Pt {
  lat: number;
  lon: number;
}

// Andrew's monotone chain convex hull on lat/lon (planar approx — fine at cluster
// scale). Returns hull vertices CCW. Collinear inputs collapse to 2 points.
function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => (a.lon - b.lon) || (a.lat - b.lat));
  if (pts.length < 3) return pts;

  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);

  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function VesselClusterOverlay({
  vesselIds,
  currentPositions,
  spreadThresholdM,
  label,
}: VesselClusterOverlayProps) {
  // Only vessels that actually have a resolved position at the current instant.
  const located = vesselIds
    .map(id => currentPositions[id])
    .filter((pos): pos is VesselPosition => pos != null);

  if (located.length < 2) return null;

  const centroid = {
    lat: located.reduce((s, p) => s + p.lat, 0) / located.length,
    lon: located.reduce((s, p) => s + p.lon, 0) / located.length,
  };

  // Hull diameter = max pairwise separation. The whole cluster is within the
  // threshold iff its diameter is.
  let spreadM = 0;
  for (let i = 0; i < located.length; i++) {
    for (let j = i + 1; j < located.length; j++) {
      const d = haversineMeters(located[i], located[j]);
      if (d > spreadM) spreadM = d;
    }
  }

  const alert = spreadThresholdM != null && spreadM <= spreadThresholdM;
  const color = spreadThresholdM == null ? NEUTRAL_COLOR : alert ? ALERT_COLOR : CALM_COLOR;

  const hull = convexHull(located.map(p => ({ lat: p.lat, lon: p.lon })));
  const hullLatLngs = hull.map(p => [p.lat, p.lon] as [number, number]);

  // Same 0×0-anchored divIcon technique as VesselConnectionOverlay's chip: the
  // label is translate(-50%, …)-shifted so it stays centred on the centroid and
  // floats above the vessel dots rather than clipping underneath them.
  const chipIcon = L.divIcon({
    className: 'vessel-cluster-chip',
    html: `<div style="
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, calc(-100% - 10px));
      background-color: rgba(10, 20, 30, 0.9);
      color: ${color};
      border: 1px solid ${color};
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      pointer-events: none;
    ">${label ? `${label} · ` : ''}×${located.length} · ⌀ ${formatDistance(spreadM)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

  const hullTooltip = (
    <Tooltip sticky>
      {label && (<><strong>{label}</strong><br /></>)}
      Cluster: {located.length} vessels
      <br />
      Spread: {formatDistance(spreadM)}
      {spreadThresholdM != null && (
        <>
          <br />
          Threshold: {formatDistance(spreadThresholdM)}
        </>
      )}
    </Tooltip>
  );

  return (
    <>
      {hullLatLngs.length >= 3 ? (
        <Polygon
          positions={hullLatLngs}
          pathOptions={{ color, weight: 2, opacity: 0.85, fillColor: color, fillOpacity: 0.12, dashArray: '6, 6' }}
        >
          {hullTooltip}
        </Polygon>
      ) : (
        <Polyline
          positions={hullLatLngs}
          pathOptions={{ color, weight: 2, opacity: 0.85, dashArray: '6, 6' }}
        >
          {hullTooltip}
        </Polyline>
      )}

      <Marker
        position={[centroid.lat, centroid.lon]}
        icon={chipIcon}
        interactive={false}
        zIndexOffset={1000}
      />
    </>
  );
}
