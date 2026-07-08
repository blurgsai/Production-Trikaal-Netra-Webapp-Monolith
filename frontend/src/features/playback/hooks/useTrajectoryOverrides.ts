import { useMemo } from 'react';
import { getTrajectoryOverridesForType } from '../model/trajectoryOverrideRegistry';
import type { EventDetailsBase, PlaybackData, TrajectoryOverrideRule } from '../model/types';

// Merges trajectory colour overrides across every constituent type of a
// (possibly compound) event. Calls into model/trajectoryOverrideRegistry.ts
// rather than ui/pluginRegistry.ts — trajectoryFn returns plain data, never
// JSX, and hooks/ isn't allowed to import from ui/.
export function useTrajectoryOverrides(
  data: PlaybackData | null | undefined,
  resolvedTypes: string[],
  resolvedDetails: Record<string, EventDetailsBase>,
): Record<string, TrajectoryOverrideRule[]> | null {
  return useMemo(() => {
    if (!data) return null;
    const merged: Record<string, TrajectoryOverrideRule[]> = {};
    for (const t of resolvedTypes) {
      const details = resolvedDetails[t];
      if (!details) continue;
      const result = getTrajectoryOverridesForType(t, details, data.timeWindow);
      if (!result) continue;
      for (const [vesselId, rules] of Object.entries(result)) {
        merged[vesselId] = [...(merged[vesselId] ?? []), ...rules];
      }
    }
    return Object.keys(merged).length ? merged : null;
  }, [data, resolvedTypes, resolvedDetails]);
}
