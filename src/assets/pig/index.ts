import level1Idle from './level-1/pig-level-1-idle.png'
import level1SleepComplete from './level-1/pig-level-1-sleep-complete.png'
import level1WorkoutComplete from './level-1/pig-level-1-workout-complete.png'
import level1BodyCareComplete from './level-1/feedback/pig-level-1-body-care-complete-v2.png'
import level1EncourageComplete from './level-1/feedback/pig-level-1-encourage-complete-v2.png'
import level1LearningComplete from './level-1/feedback/pig-level-1-learning-complete-v2.png'
import level1WorkComplete from './level-1/feedback/pig-level-1-work-complete-v2.png'
import level2Idle from './level-2/pig-level-2-idle-v2.png'
import level3Idle from './level-3/pig-level-3-idle-v2.png'
import level4Idle from './level-4/pig-level-4-idle-v2.png'
import level5Idle from './level-5/pig-level-5-idle-v2.png'
import type { PigLevel } from '../../types/pig'

export const PIG_POSES = [
  'idle',
  'workout-complete',
  'sleep-complete',
  'body-care-complete',
  'learning-complete',
  'work-complete',
  'encourage-complete',
] as const

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

const level1BodyCareCompleteAsset: PigAsset = {
  level: 1,
  pose: 'body-care-complete',
  src: level1BodyCareComplete,
}

const level1LearningCompleteAsset: PigAsset = {
  level: 1,
  pose: 'learning-complete',
  src: level1LearningComplete,
}

const level1WorkCompleteAsset: PigAsset = {
  level: 1,
  pose: 'work-complete',
  src: level1WorkComplete,
}

const level1EncourageCompleteAsset: PigAsset = {
  level: 1,
  pose: 'encourage-complete',
  src: level1EncourageComplete,
}

const growthIdleAssets = {
  2: {
    level: 2,
    pose: 'idle',
    src: level2Idle,
  },
  3: {
    level: 3,
    pose: 'idle',
    src: level3Idle,
  },
  4: {
    level: 4,
    pose: 'idle',
    src: level4Idle,
  },
  5: {
    level: 5,
    pose: 'idle',
    src: level5Idle,
  },
} as const satisfies Record<2 | 3 | 4 | 5, PigAsset>

const pigAssetRegistry: PigAssetRegistry = {
  1: {
    idle: level1Asset,
    'workout-complete': level1WorkoutCompleteAsset,
    'sleep-complete': level1SleepCompleteAsset,
    'body-care-complete': level1BodyCareCompleteAsset,
    'learning-complete': level1LearningCompleteAsset,
    'work-complete': level1WorkCompleteAsset,
    'encourage-complete': level1EncourageCompleteAsset,
  },
  2: {
    idle: growthIdleAssets[2],
  },
  3: {
    idle: growthIdleAssets[3],
  },
  4: {
    idle: growthIdleAssets[4],
  },
  5: {
    idle: growthIdleAssets[5],
  },
}

export const PIG_LEVEL_ASSET_STATUS = {
  1: 'ready',
  2: 'ready',
  3: 'ready',
  4: 'ready',
  5: 'ready',
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
