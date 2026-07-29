import { createContext } from 'react'
import type {
  AppState,
  Cycle,
  ExerciseType,
  Goal,
  Pig,
  RecordActivityForDateInput,
  RecordDailyActivityInput,
  UserSettings,
} from '../../types/models'

export interface AppContextValue {
  state: AppState
  setActiveCycleId: (cycleId: string | null) => void
  updateSettings: (settings: Partial<UserSettings>) => void
  createCycle: (cycle: Cycle) => void
  updateCycle: (
    cycleId: string,
    updates: Partial<Pick<Cycle, 'title' | 'startDate' | 'targetDate' | 'lengthDays'>>,
  ) => void
  updateGoal: (goalId: string, updates: Partial<Goal>) => void
  createExerciseType: (exerciseType: ExerciseType) => void
  updateExerciseType: (
    exerciseTypeId: string,
    updates: Partial<Pick<ExerciseType, 'name' | 'category' | 'icon' | 'enabled'>>,
  ) => void
  setExerciseGoalTarget: (
    cycleId: string,
    exerciseTypeId: string,
    targetCount: number,
  ) => void
  recordDailyActivity: (input: RecordDailyActivityInput) => void
  recordActivityForDate: (input: RecordActivityForDateInput) => void
  deleteActivityRecord: (activityId: string) => void
  updatePig: (updates: Partial<Pig>) => void
}

export const AppContext = createContext<AppContextValue | undefined>(undefined)
