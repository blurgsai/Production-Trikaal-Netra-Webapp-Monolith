import { DarkAfterDepartureOverlay } from './DarkAfterDepartureOverlay';
import { DarkAfterDepartureTimelineEnhancement } from './DarkAfterDepartureTimelineEnhancement';
import { useDarkAfterDepartureEvent } from '../../../hooks/useDarkAfterDepartureEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventTimelineProps } from '../../../model/types';

// No marker badge — see darkShip/index.tsx for why (duplicates the overlay tooltip
// and the timeline info bar / departure-to-dark ruler).

function DarkAfterDepartureOverlaySlot({ eventDetails, extras }: EventOverlayProps) {
  const event = useDarkAfterDepartureEvent(eventDetails, extras);
  return <DarkAfterDepartureOverlay event={event} />;
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
  timeline: DarkAfterDepartureTimelineSlot,
};

export default DarkAfterDeparturePlugin;
