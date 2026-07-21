import { DarkAfterDepartureBadge } from './DarkAfterDepartureBadge';
import { DarkAfterDepartureOverlay } from './DarkAfterDepartureOverlay';
import { DarkAfterDepartureTimelineEnhancement } from './DarkAfterDepartureTimelineEnhancement';
import { useDarkAfterDepartureEvent } from '../../../hooks/useDarkAfterDepartureEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventMarkerProps, EventTimelineProps } from '../../../model/types';

function DarkAfterDepartureOverlaySlot({ eventDetails, extras }: EventOverlayProps) {
  const event = useDarkAfterDepartureEvent(eventDetails, extras);
  return <DarkAfterDepartureOverlay event={event} />;
}

function DarkAfterDepartureMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = useDarkAfterDepartureEvent(eventDetails);
  return <DarkAfterDepartureBadge event={event} position={position} />;
}

function DarkAfterDepartureTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useDarkAfterDepartureEvent(eventDetails);
  return (
    <DarkAfterDepartureTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const DarkAfterDeparturePlugin: EventPlugin = {
  eventType: 'dark_after_departure',
  overlay: DarkAfterDepartureOverlaySlot,
  marker: DarkAfterDepartureMarkerSlot,
  timeline: DarkAfterDepartureTimelineSlot,
};

export default DarkAfterDeparturePlugin;
