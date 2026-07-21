import { DarkShipOverlay } from './DarkShipOverlay';
import { DarkShipTimelineEnhancement } from './DarkShipTimelineEnhancement';
import { useDarkShipEvent } from '../../../hooks/useDarkShipEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventTimelineProps } from '../../../model/types';

// No marker badge — the dark duration is a single static value already shown in the
// hover overlay tooltip and the timeline info bar; a floating map pill only duplicated it.

function DarkShipOverlaySlot({ eventDetails }: EventOverlayProps) {
  const event = useDarkShipEvent(eventDetails);
  return <DarkShipOverlay event={event} />;
}

function DarkShipTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useDarkShipEvent(eventDetails);
  return (
    <DarkShipTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const DarkShipPlugin: EventPlugin = {
  eventType: 'dark_ship',
  overlay: DarkShipOverlaySlot,
  timeline: DarkShipTimelineSlot,
};

export default DarkShipPlugin;
