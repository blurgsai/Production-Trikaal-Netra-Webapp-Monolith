import type { TrajectoryPoint, FocusEvent } from './types'

export const MAX_EVENT_MARKS = 100

export function findNearestTrajectoryIndex(trajectory: TrajectoryPoint[], eventMs: number): number {
  if (!trajectory.length) return 0

  let bestIndex = 0
  let bestDiff = Math.abs(trajectory[0].timestamp * 1000 - eventMs)

  for (let i = 1; i < trajectory.length; i++) {
    const diff = Math.abs(trajectory[i].timestamp * 1000 - eventMs)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = i
    }
  }

  return bestIndex
}

export function buildEventMarks(trajectory: TrajectoryPoint[], events: FocusEvent[]) {
  if (!trajectory.length || !events.length) return []

  const indices = events
    .filter((event) => event.timestamp)
    .map((event) => findNearestTrajectoryIndex(trajectory, event.timestamp!.getTime()))

  const unique = [...new Set(indices)].sort((a, b) => a - b)
  if (unique.length <= MAX_EVENT_MARKS) {
    return unique.map((value) => ({ value }))
  }

  const step = Math.ceil(unique.length / MAX_EVENT_MARKS)
  return unique
    .filter((_, index) => index % step === 0)
    .map((value) => ({ value }))
}
