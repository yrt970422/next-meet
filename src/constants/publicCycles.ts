export interface PublicCyclePreset {
  name: string
  startDate: string
  targetDate: string
}

/**
 * Shared upcoming journeys that should be offered before a generic cycle.
 * Keep entries in chronological order and use inclusive start/target dates.
 */
export const SHANGHAI_PUBLIC_CYCLE: PublicCyclePreset = {
  name: '时空乐园-上海',
  startDate: '2026-08-20',
  targetDate: '2026-09-12',
}

export const PUBLIC_UPCOMING_CYCLES: PublicCyclePreset[] = [
  SHANGHAI_PUBLIC_CYCLE,
]
