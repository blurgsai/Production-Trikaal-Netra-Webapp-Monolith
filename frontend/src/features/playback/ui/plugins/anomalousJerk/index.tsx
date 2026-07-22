import { KinematicsTimelineEnhancement } from '../../shared/KinematicsTimelineEnhancement';
import { useAnomalousJerkEvent } from '../../../hooks/useAnomalousJerkEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventTimelineProps } from '../../../model/types';

// No marker badge — see suddenStop/index.tsx for why (duplicates the info bar).
const UNIT = 'm/s³';
const LABEL = 'Jerk';

function AnomalousJerkTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useAnomalousJerkEvent(eventDetails);
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

const AnomalousJerkPlugin: EventPlugin = {
  eventType: 'anomalous_jerk',
  timeline: AnomalousJerkTimelineSlot,
};

export default AnomalousJerkPlugin;
