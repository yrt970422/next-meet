import type { PigLevel } from './pig'

export type GoalType = 'strength' | 'cardio' | 'sleep' | 'todo'
export type ActivityType = 'workout' | 'sleep'
export type ActivitySource = 'daily' | 'makeup' | 'migration'
export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'other'

export type CycleStatus = 'active' | 'completed' | 'archived'

export interface Goal {
  id: string
  cycleId: string
  type: GoalType
  exerciseTypeId?: string
  targetCount: number
  title?: string
  unit?: string
}

export interface ExerciseType {
  id: string
  name: string
  category: ExerciseCategory
  icon?: string
  createdAt: string
  enabled: boolean
}

export interface ActivityRecord {
  id: string
  cycleId: string
  goalId: string
  type: ActivityType
  date: string
  recordedAt: string
  source: ActivitySource
  metadata?: {
    exerciseTypeId?: string
    weight?: number
    reps?: number
    durationMinutes?: number
    sleepTime?: string
    note?: string
  }
}

export interface RecordDailyActivityInput {
  goalId: string
  note?: string
  metadata?: ActivityRecord['metadata']
}

export interface RecordActivityForDateInput extends RecordDailyActivityInput {
  date: string
  time: string
}

export interface Cycle {
  id: string
  title: string
  startDate: string
  targetDate: string
  lengthDays: number
  status: CycleStatus
  createdAt: string
  completedAt?: string
  goals: Goal[]
  historyNote?: string
}

export interface Achievement {
  id: string
  key: 'strength_awaken' | 'cardio_upgrade' | 'sleep_master' | 'next_meet' | 'pig_partner'
  title: string
  description: string
  unlocked: boolean
  unlockedAt?: string
}

export interface Pig {
  id: string
  name: string
  level: PigLevel
  completedCardCount: number
  lastUpdatedAt: string
}

export interface UserSettings {
  defaultCycleLengthDays: number
  sleepTargetTime: string
  firstLaunchCompleted: boolean
}

export interface AppState {
  schemaVersion: 4
  cycles: Cycle[]
  activeCycleId: string | null
  goals: Goal[]
  activities: ActivityRecord[]
  exerciseTypes: ExerciseType[]
  achievements: Achievement[]
  pig: Pig
  settings: UserSettings
}
