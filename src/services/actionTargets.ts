import type { Action, Cycle, TargetMode } from '../types/models'

const DAY_IN_MS = 24 * 60 * 60 * 1000

function parseDateAsUtc(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function getCycleDayCount(
  startDate: string,
  targetDate: string,
) {
  return Math.max(
    1,
    Math.floor(
      (parseDateAsUtc(targetDate) - parseDateAsUtc(startDate)) /
        DAY_IN_MS,
    ) + 1,
  )
}

export function normalizeTargetValue(value: number) {
  return Math.max(1, Math.round(value))
}

export function calculateWeeklyTargetCount(
  startDate: string,
  targetDate: string,
  weeklyTarget: number,
) {
  const normalizedWeeklyTarget = normalizeTargetValue(weeklyTarget)
  return Math.max(
    1,
    Math.floor(
      (getCycleDayCount(startDate, targetDate) / 7) *
        normalizedWeeklyTarget,
    ),
  )
}

export function resolveTargetMode(action: Action): TargetMode {
  return action.targetMode === 'weekly' ? 'weekly' : 'total'
}

export function normalizeActionTargetConfiguration(action: Action): Action {
  const targetMode = resolveTargetMode(action)
  return {
    ...action,
    targetMode,
    targetCount: normalizeTargetValue(action.targetCount),
    weeklyTarget:
      targetMode === 'weekly'
        ? normalizeTargetValue(action.weeklyTarget ?? 1)
        : undefined,
  }
}

export function applyActionTargetToCycle(
  action: Action,
  cycle: Pick<Cycle, 'startDate' | 'targetDate'>,
): Action {
  const normalizedAction = normalizeActionTargetConfiguration(action)
  if (normalizedAction.targetMode !== 'weekly') {
    return normalizedAction
  }

  return {
    ...normalizedAction,
    targetCount: calculateWeeklyTargetCount(
      cycle.startDate,
      cycle.targetDate,
      normalizedAction.weeklyTarget ?? 1,
    ),
  }
}
