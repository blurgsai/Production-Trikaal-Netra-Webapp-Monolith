import { VesselConnectionOverlay } from '../../shared/VesselConnectionOverlay';
import { DuplicateMmsiBadge } from './DuplicateMmsiBadge';
import { DuplicateMmsiReadout } from './DuplicateMmsiReadout';
import { useDuplicateMmsiEvent } from '../../../hooks/useDuplicateMmsiEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventMarkerProps, EventTimelineProps } from '../../../model/types';

// Multi-vessel proximity family, inverted: the two tracks share one MMSI but sit
// impossibly far apart. The HEADLINE signal is the per-vessel badge — the same cloned
// MMSI stamped on both vessels (marker slot). The connection line is the supporting
// thread pointing to the far duplicate; it alerts (red) when the live separation
// exceeds the plausible-distance bound (top speed × duration). No distance graph — the
// separation is ~constant and the story is identity, not motion — so the timeline slot
// is a one-line spoofing verdict instead. Trajectory highlight is the shared proximity
// override.
const LABEL = 'Duplicate MMSI';

function DuplicateMmsiOverlaySlot({ eventDetails, currentPositions }: EventOverlayProps) {
  const event = useDuplicateMmsiEvent(eventDetails);
  return (
    <VesselConnectionOverlay
      vesselIds={event.vesselIds}
      currentPositions={currentPositions}
      distanceThresholdM={event.maxPlausibleDistanceM}
      inverted
      label={LABEL}
    />
  );
}

function DuplicateMmsiMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = useDuplicateMmsiEvent(eventDetails);
  return <DuplicateMmsiBadge event={event} position={position} />;
}

function DuplicateMmsiTimelineSlot({ eventDetails }: EventTimelineProps) {
  const event = useDuplicateMmsiEvent(eventDetails);
  return <DuplicateMmsiReadout event={event} />;
}

const DuplicateMmsiPlugin: EventPlugin = {
  eventType: 'duplicate_mmsi',
  overlay: DuplicateMmsiOverlaySlot,
  marker: DuplicateMmsiMarkerSlot,
  timeline: DuplicateMmsiTimelineSlot,
};

export default DuplicateMmsiPlugin;
