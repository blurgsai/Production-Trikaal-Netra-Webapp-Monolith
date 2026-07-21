import { PortIntrusionBadge } from './PortIntrusionBadge';
import { PortIntrusionOverlay } from './PortIntrusionOverlay';
import { PortIntrusionTimelineEnhancement } from './PortIntrusionTimelineEnhancement';
import { usePortIntrusionEvent } from '../../../hooks/usePortIntrusionEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventMarkerProps, EventTimelineProps } from '../../../model/types';

function PortIntrusionOverlaySlot({ eventDetails, extras }: EventOverlayProps) {
  const event = usePortIntrusionEvent(eventDetails, extras);
  return <PortIntrusionOverlay event={event} />;
}

function PortIntrusionMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = usePortIntrusionEvent(eventDetails);
  return <PortIntrusionBadge event={event} position={position} />;
}

function PortIntrusionTimelineSlot({ eventDetails }: EventTimelineProps) {
  const event = usePortIntrusionEvent(eventDetails);
  return <PortIntrusionTimelineEnhancement event={event} />;
}

const PortIntrusionPlugin: EventPlugin = {
  eventType: 'port_intrusion',
  overlay: PortIntrusionOverlaySlot,
  marker: PortIntrusionMarkerSlot,
  timeline: PortIntrusionTimelineSlot,
};

export default PortIntrusionPlugin;
