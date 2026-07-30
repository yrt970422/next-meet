import type { Cycle } from '../types/models'

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function resolveCurrentCycle(
  cycles: Cycle[],
  preferredCycleId: string | null,
  today = formatLocalDate(new Date()),
) {
  const activeCycles = cycles.filter((cycle) => cycle.status === 'active')
  const coversToday = (cycle: Cycle) =>
    cycle.startDate <= today && cycle.targetDate >= today

  return (
    activeCycles.find(coversToday) ??
    activeCycles.find((cycle) => cycle.id === preferredCycleId) ??
    [...activeCycles].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )[0] ??
    cycles.find(coversToday) ??
    cycles.find((cycle) => cycle.id === preferredCycleId) ??
    cycles[0]
  )
}
