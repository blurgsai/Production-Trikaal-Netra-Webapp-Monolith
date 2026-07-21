import { DarkShipBadge } from './DarkShipBadge';
import { DarkShipOverlay } from './DarkShipOverlay';
import { DarkShipTimelineEnhancement } from './DarkShipTimelineEnhancement';
import { useDarkShipEvent } from '../../../hooks/useDarkShipEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventMarkerProps, EventTimelineProps } from '../../../model/types';

function DarkShipOverlaySlot({ eventDetails }: EventOverlayProps) {
  const event = useDarkShipEvent(eventDetails);
  return <DarkShipOverlay event={event} />;
}

function DarkShipMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = useDarkShipEvent(eventDetails);
  return <DarkShipBadge event={event} position={position} />;
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
  marker: DarkShipMarkerSlot,
  timeline: DarkShipTimelineSlot,
};

export default DarkShipPlugin;
