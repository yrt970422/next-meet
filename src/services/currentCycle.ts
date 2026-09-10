import type { Cycle } from '../types/models'
import { getActionDate } from './actionDay'

export function resolveCurrentCycle(
  cycles: Cycle[],
  preferredCycleId: string | null,
  today = getActionDate(),
) {
  const activeCycles = cycles.filter(
    (cycle) => cycle.status === 'active' && cycle.targetDate >= today,
  )
  const coversToday = (cycle: Cycle) =>
    cycle.startDate <= today && cycle.targetDate >= today

  return (
    activeCycles.find(
      (cycle) => cycle.id === preferredCycleId && coversToday(cycle),
    ) ??
    activeCycles.find(coversToday) ??
    activeCycles.find((cycle) => cycle.id === preferredCycleId) ??
    [...activeCycles].sort((left, right) =>
      left.startDate.localeCompare(right.startDate) ||
      right.createdAt.localeCompare(left.createdAt),
    )[0]
  )
}

export function resolvePreviousCycle(
  cycles: Cycle[],
  currentCycle: Cycle,
) {
  return [...cycles]
    .filter(
      (cycle) =>
        cycle.id !== currentCycle.id &&
        cycle.status !== 'active' &&
        cycle.targetDate < currentCycle.targetDate,
    )
    .sort((left, right) =>
      right.targetDate.localeCompare(left.targetDate) ||
      right.createdAt.localeCompare(left.createdAt),
    )[0]
}
