import level1Idle from './level-1/pig-level-1-idle.png'
import level1SleepComplete from './level-1/pig-level-1-sleep-complete.png'
import level1WorkoutComplete from './level-1/pig-level-1-workout-complete.png'
import type { PigLevel } from '../../types/pig'

export const PIG_POSES = ['idle', 'workout-complete', 'sleep-complete'] as const

export type PigPose = (typeof PIG_POSES)[number]

export interface PigAsset {
  level: PigLevel
  pose: PigPose
  src: string
}

export interface ResolvedPigAsset extends PigAsset {
  requestedLevel: PigLevel
  isFallback: boolean
}

type PigAssetRegistry = Partial<Record<PigLevel, Partial<Record<PigPose, PigAsset>>>>

const level1Asset: PigAsset = {
  level: 1,
  pose: 'idle',
  src: level1Idle,
}

const level1WorkoutCompleteAsset: PigAsset = {
  level: 1,
  pose: 'workout-complete',
  src: level1WorkoutComplete,
}

const level1SleepCompleteAsset: PigAsset = {
  level: 1,
  pose: 'sleep-complete',
  src: level1SleepComplete,
}

const pigAssetRegistry: PigAssetRegistry = {
  1: {
    idle: level1Asset,
    'workout-complete': level1WorkoutCompleteAsset,
    'sleep-complete': level1SleepCompleteAsset,
  },
  2: {},
  3: {},
  4: {},
  5: {},
}

export const PIG_LEVEL_ASSET_STATUS = {
  1: 'ready',
  2: 'fallback',
  3: 'fallback',
  4: 'fallback',
  5: 'fallback',
} as const satisfies Record<PigLevel, 'ready' | 'fallback'>

export function resolvePigAsset(level: PigLevel, pose: PigPose = 'idle'): ResolvedPigAsset {
  const requestedAsset = pigAssetRegistry[level]?.[pose]
  const resolvedAsset = requestedAsset ?? pigAssetRegistry[1]?.[pose] ?? level1Asset

  return {
    ...resolvedAsset,
    requestedLevel: level,
    isFallback: requestedAsset === undefined,
  }
}
