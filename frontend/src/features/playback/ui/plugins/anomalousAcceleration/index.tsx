import { KinematicsTimelineEnhancement } from '../../shared/KinematicsTimelineEnhancement';
import { useAnomalousAccelerationEvent } from '../../../hooks/useAnomalousAccelerationEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventTimelineProps } from '../../../model/types';

// No marker badge — see suddenStop/index.tsx for why (duplicates the info bar).
const UNIT = 'm/s²';
const LABEL = 'Accel';

function AnomalousAccelerationTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useAnomalousAccelerationEvent(eventDetails);
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

const AnomalousAccelerationPlugin: EventPlugin = {
  eventType: 'anomalous_acceleration',
  timeline: AnomalousAccelerationTimelineSlot,
};

export default AnomalousAccelerationPlugin;
