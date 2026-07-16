import { KinematicsBadge } from '../../shared/KinematicsBadge';
import { KinematicsTimelineEnhancement } from '../../shared/KinematicsTimelineEnhancement';
import { useAnomalousJerkEvent } from '../../../hooks/useAnomalousJerkEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventMarkerProps, EventTimelineProps } from '../../../model/types';

const UNIT = 'm/s³';
const LABEL = 'Jerk';

function AnomalousJerkMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = useAnomalousJerkEvent(eventDetails);
  return <KinematicsBadge event={event} position={position} unit={UNIT} label={LABEL} />;
}

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
  marker: AnomalousJerkMarkerSlot,
  timeline: AnomalousJerkTimelineSlot,
};

export default AnomalousJerkPlugin;
