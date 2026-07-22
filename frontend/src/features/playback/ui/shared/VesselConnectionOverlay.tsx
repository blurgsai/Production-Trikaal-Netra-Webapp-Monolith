import L from 'leaflet';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { haversineMeters } from '../../model/geoDistance';
import { formatDistance } from './formatDistance';
import type { VesselPosition } from '../../model/types';

// Shared multi-vessel proximity overlay. Draws a connecting line between every
// pair of involved vessels at their LIVE positions (so the line and distance
// animate as the user scrubs), plus a distance chip on the most-relevant pair.
//
// Structural: any proximity event can drive this by supplying the involved vessel
// ids, the live positions, and its distance threshold. `inverted` flips the alert
// semantics — the default (false) alerts when vessels are CLOSER than the threshold
// (rendezvous, parallel_movement, collision); `inverted` alerts when they are
// FARTHER apart than physically possible (duplicate_mmsi). Presentational strings
// (`label`, `unit`) come from the plugin, never a mapper.
//
// Cluster / projection extensions (coordinated_dark_activity, predicted_collision)
// compose on top of this primitive; they are not baked in here.

export interface VesselConnectionOverlayProps {
  vesselIds: string[];
  currentPositions: Record<string, VesselPosition>;
  distanceThresholdM: number | null;
  inverted?: boolean;
  label?: string;
}

const ALERT_COLOR = '#ff4444';
const CALM_COLOR = '#5ec8ff';
const NEUTRAL_COLOR = '#c8ff5e';

interface Pair {
  a: VesselPosition;
  b: VesselPosition;
  midLat: number;
  midLon: number;
  distanceM: number;
}

export function VesselConnectionOverlay({
  vesselIds,
  currentPositions,
  distanceThresholdM,
  inverted = false,
  label,
}: VesselConnectionOverlayProps) {
  // Only vessels that actually have a resolved position at the current instant.
  const located = vesselIds
    .map(id => currentPositions[id])
    .filter((pos): pos is VesselPosition => pos != null);

  if (located.length < 2) return null;

  const pairs: Pair[] = [];
  for (let i = 0; i < located.length; i++) {
    for (let j = i + 1; j < located.length; j++) {
      const a = located[i];
      const b = located[j];
      pairs.push({
        a,
        b,
        midLat: (a.lat + b.lat) / 2,
        midLon: (a.lon + b.lon) / 2,
        distanceM: haversineMeters(a, b),
      });
    }
  }

  const isAlertDistance = (d: number): boolean => {
    if (distanceThresholdM == null) return false;
    return inverted ? d > distanceThresholdM : d < distanceThresholdM;
  };

  // The chip sits on the pair that best tells the story: the closest pair normally,
  // the farthest pair when the alert is about impossible separation (inverted).
  const chipPair = pairs.reduce((best, p) =>
    inverted
      ? (p.distanceM > best.distanceM ? p : best)
      : (p.distanceM < best.distanceM ? p : best),
  );
  const chipAlert = isAlertDistance(chipPair.distanceM);
  const chipColor = distanceThresholdM == null
    ? NEUTRAL_COLOR
    : chipAlert ? ALERT_COLOR : CALM_COLOR;

  // Icon container is 0×0 anchored exactly on the midpoint; the inner label is
  // absolutely positioned and shifted with translate(-50%, …) so it stays
  // horizontally centred on the line (independent of text length) and floats
  // above the midpoint — otherwise the label's top-left lands on the point and the
  // text renders underneath the two vessel dots, clipping the leading character.
  const chipIcon = L.divIcon({
    className: 'vessel-connection-distance-chip',
    html: `<div style="
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, calc(-100% - 10px));
      background-color: rgba(10, 20, 30, 0.9);
      color: ${chipColor};
      border: 1px solid ${chipColor};
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      pointer-events: none;
    ">${label ? `${label} · ` : ''}${formatDistance(chipPair.distanceM)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

  return (
    <>
      {pairs.map((p, idx) => {
        const alert = isAlertDistance(p.distanceM);
        const color = distanceThresholdM == null ? NEUTRAL_COLOR : alert ? ALERT_COLOR : CALM_COLOR;
        return (
          <Polyline
            key={idx}
            positions={[[p.a.lat, p.a.lon], [p.b.lat, p.b.lon]]}
            pathOptions={{ color, weight: 2, opacity: 0.85, dashArray: '6, 6' }}
          >
            <Tooltip sticky>
              {label && (<><strong>{label}</strong><br /></>)}
              Separation: {formatDistance(p.distanceM)}
              {distanceThresholdM != null && (
                <>
                  <br />
                  Threshold: {formatDistance(distanceThresholdM)}
                </>
              )}
            </Tooltip>
          </Polyline>
        );
      })}

      <Marker
        position={[chipPair.midLat, chipPair.midLon]}
        icon={chipIcon}
        interactive={false}
        zIndexOffset={1000}
      />
    </>
  );
}
