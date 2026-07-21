import { KinematicsTimelineEnhancement } from '../../shared/KinematicsTimelineEnhancement';
import { useSuddenStopEvent } from '../../../hooks/useSuddenStopEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventTimelineProps } from '../../../model/types';

// First of the kinematics family (sudden_stop / anomalous_acceleration / anomalous_jerk).
// All three reuse the shared KinematicsTimelineEnhancement; only the unit and label
// differ. No marker badge — the reading is a single static value already shown in the
// timeline info bar, and duplicating it on the map only added clutter. Trajectory
// highlight is the shared kinematics override, registered in model/trajectoryOverrideRegistry.ts.
const UNIT = 'm/s²';
const LABEL = 'Sudden Stop';

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
  timeline: SuddenStopTimelineSlot,
};

export default SuddenStopPlugin;
