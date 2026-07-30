import type { AppState } from '../types/models'
import type { PigLevel } from '../types/pig'

export const PIG_LEVEL_TOTALS = {
  1: 0,
  2: 12,
  3: 60,
  4: 204,
  5: 540,
} as const satisfies Record<PigLevel, number>

export const PIG_LEVEL_REQUIREMENTS = {
  1: 12,
  2: 48,
  3: 144,
  4: 336,
} as const

export interface PigGrowth {
  level: PigLevel
  foldedCardCount: number
  nextLevel: PigLevel | null
  nextLevelTotal: number | null
  cardsUntilNextLevel: number
  levelProgress: number
}

export function resolvePigGrowth(activityCount: number): PigGrowth {
  const foldedCardCount = Math.max(0, Math.floor(activityCount))
  const level: PigLevel =
    foldedCardCount >= PIG_LEVEL_TOTALS[5]
      ? 5
      : foldedCardCount >= PIG_LEVEL_TOTALS[4]
        ? 4
        : foldedCardCount >= PIG_LEVEL_TOTALS[3]
          ? 3
          : foldedCardCount >= PIG_LEVEL_TOTALS[2]
            ? 2
            : 1

  if (level === 5) {
    return {
      level,
      foldedCardCount,
      nextLevel: null,
      nextLevelTotal: null,
      cardsUntilNextLevel: 0,
      levelProgress: 1,
    }
  }

  const nextLevel = (level + 1) as PigLevel
  const nextLevelTotal = PIG_LEVEL_TOTALS[nextLevel]

  return {
    level,
    foldedCardCount,
    nextLevel,
    nextLevelTotal,
    cardsUntilNextLevel: nextLevelTotal - foldedCardCount,
    levelProgress: Math.min(1, foldedCardCount / nextLevelTotal),
  }
}

export function synchronizePigGrowth(state: AppState): AppState {
  const growth = resolvePigGrowth(state.activities.length)

  if (
    state.pig.level === growth.level &&
    state.pig.completedCardCount === growth.foldedCardCount
  ) {
    return state
  }

  return {
    ...state,
    pig: {
      ...state.pig,
      level: growth.level,
      completedCardCount: growth.foldedCardCount,
    },
  }
}
