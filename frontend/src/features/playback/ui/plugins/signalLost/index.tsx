import { SignalLostOverlay } from './SignalLostOverlay';
import { SignalLostTimelineEnhancement } from './SignalLostTimelineEnhancement';
import { useSignalLostEvent } from '../../../hooks/useSignalLostEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventTimelineProps } from '../../../model/types';

// No marker badge — see darkShip/index.tsx for why (duplicates the overlay tooltip
// and the timeline info bar).

function SignalLostOverlaySlot({ eventDetails }: EventOverlayProps) {
  const event = useSignalLostEvent(eventDetails);
  return <SignalLostOverlay event={event} />;
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
  timeline: SignalLostTimelineSlot,
};

export default SignalLostPlugin;
