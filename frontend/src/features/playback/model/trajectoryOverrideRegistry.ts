import {
  getGeofenceTrajectoryOverrides,
  getDarkShipTrajectoryOverrides,
  getSignalLostTrajectoryOverrides,
  getDarkAfterDepartureTrajectoryOverrides,
  getPortIntrusionTrajectoryOverrides,
} from './eventTypeMappers';
import { getKinematicsTrajectoryOverrides } from './kinematicsTrajectory';
import type { EventDetailsBase, TimeWindow, TrajectoryOverrideFn, TrajectoryOverrideRule } from './types';

// Separate from ui/PluginRegistry.tsx on purpose: trajectoryFn returns plain data
// (never JSX), and hooks/ is not allowed to import from ui/. Keeping this
// dispatch table in model/ lets hooks/useTrajectoryOverrides.ts call it directly
// without crossing a layer boundary. Register a new type here only if it
// contributes a trajectory override — most types won't.
const TRAJECTORY_OVERRIDE_REGISTRY: Record<string, TrajectoryOverrideFn> = {
  geofence_intrusion: getGeofenceTrajectoryOverrides,
  dark_ship: getDarkShipTrajectoryOverrides,
  signal_lost: getSignalLostTrajectoryOverrides,
  dark_after_departure: getDarkAfterDepartureTrajectoryOverrides,
  port_intrusion: getPortIntrusionTrajectoryOverrides,
  // Kinematics family — all three share the same min-span-centred override.
  sudden_stop: getKinematicsTrajectoryOverrides,
  anomalous_acceleration: getKinematicsTrajectoryOverrides,
  anomalous_jerk: getKinematicsTrajectoryOverrides,
};

export function getTrajectoryOverridesForType(
  eventType: string,
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const fn = TRAJECTORY_OVERRIDE_REGISTRY[eventType];
  return fn ? fn(eventDetails, timeWindow) : null;
}
