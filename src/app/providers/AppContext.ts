import { createContext } from 'react'
import type {
  Action,
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
  replaceAppState: (state: AppState) => void
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
  createAction: (action: Action) => void
  updateAction: (
    actionId: string,
    updates: Partial<
      Pick<
        Action,
        'category' | 'categoryLabel' | 'name' | 'note' | 'targetCount' | 'icon'
      >
    >,
  ) => void
  deleteAction: (actionId: string) => void
  addCycleTodo: (cycleId: string, text: string) => void
  toggleCycleTodo: (todoId: string) => void
  deleteCycleTodo: (todoId: string) => void
  recordDailyActivity: (input: RecordDailyActivityInput) => void
  recordActivityForDate: (input: RecordActivityForDateInput) => void
  deleteActivityRecord: (activityId: string) => void
  updatePig: (updates: Partial<Pig>) => void
}

export const AppContext = createContext<AppContextValue | undefined>(undefined)
