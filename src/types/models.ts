export type GoalType = 'strength' | 'cardio' | 'sleep' | 'todo'

export type CycleStatus = 'active' | 'completed' | 'archived'

export interface Goal {
  id: string
  cycleId: string
  type: GoalType
  targetCount: number
  title?: string
  unit?: string
}

export interface ActivityRecord {
  id: string
  cycleId: string
  goalId: string
  completedAt: string
  note?: string
  metadata?: {
    action?: string
    weight?: number
    reps?: number
    durationMinutes?: number
  }
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
  level: 1 | 2 | 3 | 4 | 5
  completedCardCount: number
  lastUpdatedAt: string
}

export interface UserSettings {
  defaultCycleLengthDays: number
  sleepTargetTime: string
  firstLaunchCompleted: boolean
}

export interface AppState {
  cycles: Cycle[]
  activeCycleId: string | null
  goals: Goal[]
  activities: ActivityRecord[]
  achievements: Achievement[]
  pig: Pig
  settings: UserSettings
}
