import { PortIntrusionOverlay } from './PortIntrusionOverlay';
import { PortIntrusionTimelineEnhancement } from './PortIntrusionTimelineEnhancement';
import { usePortIntrusionEvent } from '../../../hooks/usePortIntrusionEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventTimelineProps } from '../../../model/types';

// No marker badge — see darkShip/index.tsx for why (duplicates the overlay tooltip
// and the timeline info bar).

function PortIntrusionOverlaySlot({ eventDetails, extras }: EventOverlayProps) {
  const event = usePortIntrusionEvent(eventDetails, extras);
  return <PortIntrusionOverlay event={event} />;
}

function PortIntrusionTimelineSlot({ eventDetails }: EventTimelineProps) {
  const event = usePortIntrusionEvent(eventDetails);
  return <PortIntrusionTimelineEnhancement event={event} />;
}

const PortIntrusionPlugin: EventPlugin = {
  eventType: 'port_intrusion',
  overlay: PortIntrusionOverlaySlot,
  timeline: PortIntrusionTimelineSlot,
};

export default PortIntrusionPlugin;
