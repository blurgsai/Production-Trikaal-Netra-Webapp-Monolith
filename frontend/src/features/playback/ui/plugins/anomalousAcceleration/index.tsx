import { KinematicsBadge } from '../../shared/KinematicsBadge';
import { KinematicsTimelineEnhancement } from '../../shared/KinematicsTimelineEnhancement';
import { useAnomalousAccelerationEvent } from '../../../hooks/useAnomalousAccelerationEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventMarkerProps, EventTimelineProps } from '../../../model/types';

const UNIT = 'm/s²';
const LABEL = 'Accel';

function AnomalousAccelerationMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = useAnomalousAccelerationEvent(eventDetails);
  return <KinematicsBadge event={event} position={position} unit={UNIT} label={LABEL} />;
}

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
  marker: AnomalousAccelerationMarkerSlot,
  timeline: AnomalousAccelerationTimelineSlot,
};

export default AnomalousAccelerationPlugin;
