import { SignalLostBadge } from './SignalLostBadge';
import { SignalLostOverlay } from './SignalLostOverlay';
import { SignalLostTimelineEnhancement } from './SignalLostTimelineEnhancement';
import { useSignalLostEvent } from '../../../hooks/useSignalLostEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventMarkerProps, EventTimelineProps } from '../../../model/types';

function SignalLostOverlaySlot({ eventDetails }: EventOverlayProps) {
  const event = useSignalLostEvent(eventDetails);
  return <SignalLostOverlay event={event} />;
}

function SignalLostMarkerSlot({ position, eventDetails }: EventMarkerProps) {
  const event = useSignalLostEvent(eventDetails);
  return <SignalLostBadge event={event} position={position} />;
}

function SignalLostTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useSignalLostEvent(eventDetails);
  return (
    <SignalLostTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const SignalLostPlugin: EventPlugin = {
  eventType: 'signal_lost',
  overlay: SignalLostOverlaySlot,
  marker: SignalLostMarkerSlot,
  timeline: SignalLostTimelineSlot,
};

export default SignalLostPlugin;
