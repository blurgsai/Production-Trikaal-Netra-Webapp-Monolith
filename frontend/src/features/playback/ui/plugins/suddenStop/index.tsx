import { KinematicsBadge } from '../../shared/KinematicsBadge';
import { KinematicsTimelineEnhancement } from '../../shared/KinematicsTimelineEnhancement';
import { useSuddenStopEvent } from '../../../hooks/useSuddenStopEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventMarkerProps, EventTimelineProps } from '../../../model/types';

// First of the kinematics family (sudden_stop / anomalous_acceleration / anomalous_jerk).
// All three reuse the shared KinematicsBadge + KinematicsTimelineEnhancement; only the
// unit and label differ. Trajectory highlight is the shared kinematics override,
// registered in model/trajectoryOverrideRegistry.ts.
const UNIT = 'm/s²';
const LABEL = 'Sudden Stop';

function SuddenStopMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = useSuddenStopEvent(eventDetails);
  return <KinematicsBadge event={event} position={position} unit={UNIT} label={LABEL} />;
}

function SuddenStopTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useSuddenStopEvent(eventDetails);
  return (
    <KinematicsTimelineEnhancement
      event={event}
      unit={UNIT}
      label={LABEL}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const SuddenStopPlugin: EventPlugin = {
  eventType: 'sudden_stop',
  marker: SuddenStopMarkerSlot,
  timeline: SuddenStopTimelineSlot,
};

export default SuddenStopPlugin;
