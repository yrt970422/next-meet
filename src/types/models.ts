import type { PigLevel } from './pig'

export type GoalType = 'strength' | 'cardio' | 'sleep' | 'todo'
export type ActivityType = 'action'
export type ActivitySource = 'daily' | 'makeup' | 'migration'
export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'other'
export type ActionCategory =
  | 'health'
  | 'bodyCare'
  | 'rest'
  | 'learning'
  | 'work'
  | 'custom'

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

export interface Action {
  id: string
  cycleId: string
  category: ActionCategory
  categoryLabel?: string
  name: string
  note: string
  targetCount: number
  icon?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface ActivityRecord {
  id: string
  cycleId: string
  actionId: string
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
    actionName?: string
    actionCategory?: ActionCategory
    actionNote?: string
  }
}

export interface CycleTodo {
  id: string
  cycleId: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
  carriedFromTodoId?: string
}

export interface RecordDailyActivityInput {
  actionId: string
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
  carryOverUnfinishedTodos: boolean
}

export interface AppState {
  schemaVersion: 6
  cycles: Cycle[]
  activeCycleId: string | null
  goals: Goal[]
  actions: Action[]
  activities: ActivityRecord[]
  todos: CycleTodo[]
  exerciseTypes: ExerciseType[]
  achievements: Achievement[]
  pig: Pig
  settings: UserSettings
}
