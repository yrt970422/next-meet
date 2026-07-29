import { APP_STORAGE_KEY } from './storageKeys'
import { getDefaultExerciseTypes } from '../constants/defaults'
import type {
  ActivityRecord,
  ActivitySource,
  ActivityType,
  AppState,
  ExerciseType,
  Goal,
  GoalType,
} from '../types/models'

interface LegacyActivityMetadata {
  action?: string
  exerciseTypeId?: string
  weight?: number
  reps?: number
  durationMinutes?: number
  sleepTime?: string
  note?: string
}

interface LegacyActivityRecord {
  id: string
  cycleId: string
  goalId: string
  type?: GoalType | ActivityType
  date?: string
  completedAt?: string
  recordedAt?: string
  source?: ActivitySource
  note?: string
  metadata?: LegacyActivityMetadata
}

interface LegacyCardInventoryItem {
  id: string
  goalId: string
  date: string | null
  status: 'folded' | 'unfolded'
  activityRecord?: LegacyActivityRecord | null
}

interface StoredAppState
  extends Omit<
    AppState,
    'activities' | 'exerciseTypes' | 'schemaVersion'
  > {
  schemaVersion?: number
  activities?: LegacyActivityRecord[]
  exerciseTypes?: ExerciseType[]
  cards?: LegacyCardInventoryItem[]
}

function normalizeGoal(goal: Goal): Goal {
  return {
    id: goal.id,
    cycleId: goal.cycleId,
    type: goal.type,
    exerciseTypeId: goal.exerciseTypeId,
    targetCount: goal.targetCount,
    title: goal.title,
    unit: goal.unit,
  }
}

function migrateExerciseGoals(
  cycleId: string,
  goals: Goal[],
  exerciseTypes: ExerciseType[],
) {
  const nonWorkoutGoals = goals.filter(
    (goal) => goal.type !== 'strength' && goal.type !== 'cardio',
  )
  const migratedWorkoutGoals = (
    ['strength', 'cardio'] as const
  ).flatMap((category) => {
    const categoryGoals = goals.filter((goal) => goal.type === category)
    if (
      categoryGoals.length === 0 ||
      categoryGoals.every((goal) => goal.exerciseTypeId)
    ) {
      return categoryGoals
    }

    const matchingExerciseTypes = exerciseTypes.filter((exerciseType) =>
      category === 'strength'
        ? exerciseType.enabled && exerciseType.category === 'strength'
        : exerciseType.enabled && exerciseType.category !== 'strength',
    )
    const fallbackExerciseType = exerciseTypes.find(
      (exerciseType) =>
        exerciseType.id ===
        (category === 'strength' ? 'strength-default' : 'cardio-default'),
    )
    const targetExerciseTypes =
      matchingExerciseTypes.length > 0
        ? matchingExerciseTypes
        : fallbackExerciseType
          ? [fallbackExerciseType]
          : []

    if (targetExerciseTypes.length === 0) {
      return categoryGoals
    }

    const totalTarget = categoryGoals.reduce(
      (total, goal) => total + goal.targetCount,
      0,
    )
    const baseTarget = Math.floor(totalTarget / targetExerciseTypes.length)
    const remainder = totalTarget % targetExerciseTypes.length
    const firstLegacyGoal = categoryGoals[0]
    const distributedGoals = targetExerciseTypes.map(
      (exerciseType, index): Goal => ({
        ...(index === 0
          ? firstLegacyGoal
          : {
              id: `goal-${cycleId}-${exerciseType.id}`,
              cycleId,
              type: category,
            }),
        type: category,
        exerciseTypeId: exerciseType.id,
        targetCount: baseTarget + (index < remainder ? 1 : 0),
        title: exerciseType.name,
        unit: '次',
      }),
    )
    const preservedLegacyGoals = categoryGoals.slice(1).map((goal) => ({
      ...goal,
      exerciseTypeId:
        category === 'strength' ? 'strength-default' : 'cardio-default',
      targetCount: 0,
    }))

    return [...distributedGoals, ...preservedLegacyGoals]
  })

  return [...migratedWorkoutGoals, ...nonWorkoutGoals]
}

function formatLocalDate(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 10)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeActivity(
  activity: LegacyActivityRecord,
  goalTypes: Map<string, GoalType>,
  cardDate?: string | null,
): ActivityRecord | null {
  const legacyType = activity.type ?? goalTypes.get(activity.goalId)
  const recordedAt = activity.recordedAt ?? activity.completedAt

  if (
    !legacyType ||
    legacyType === 'todo' ||
    !recordedAt
  ) {
    return null
  }

  const type: ActivityType =
    legacyType === 'sleep' ? 'sleep' : 'workout'
  const migratedExerciseTypeId =
    legacyType === 'strength'
      ? 'strength-default'
      : legacyType === 'cardio'
        ? 'cardio-default'
        : activity.metadata?.exerciseTypeId ??
          activity.metadata?.action

  return {
    id: activity.id,
    cycleId: activity.cycleId,
    goalId: activity.goalId,
    type,
    date: activity.date ?? cardDate ?? formatLocalDate(recordedAt),
    recordedAt,
    source: activity.source ?? 'migration',
    metadata: {
      exerciseTypeId:
        type === 'workout' ? migratedExerciseTypeId : undefined,
      weight: activity.metadata?.weight,
      reps: activity.metadata?.reps,
      durationMinutes: activity.metadata?.durationMinutes,
      sleepTime: activity.metadata?.sleepTime,
      note: activity.metadata?.note ?? activity.note,
    },
  }
}

function migrateStoredState(state: StoredAppState): AppState {
  const storedGoals = state.goals.map(normalizeGoal)
  const storedCycles = state.cycles.map((cycle) => ({
    ...cycle,
    goals: cycle.goals.map(normalizeGoal),
  }))
  const goalTypes = new Map<string, GoalType>()

  storedGoals.forEach((goal) => goalTypes.set(goal.id, goal.type))
  storedCycles.forEach((cycle) => {
    cycle.goals.forEach((goal) => goalTypes.set(goal.id, goal.type))
  })

  const activitiesById = new Map<string, ActivityRecord>()
  const exerciseTypesById = new Map<string, ExerciseType>()
  const legacyCards = state.cards ?? []

  getDefaultExerciseTypes().forEach((exerciseType) => {
    exerciseTypesById.set(exerciseType.id, exerciseType)
  })
  ;(state.exerciseTypes ?? []).forEach((exerciseType) => {
    const defaultExerciseType = exerciseTypesById.get(exerciseType.id)
    exerciseTypesById.set(exerciseType.id, {
      ...defaultExerciseType,
      ...exerciseType,
      icon: exerciseType.icon ?? defaultExerciseType?.icon,
    })
  })
  const exerciseTypes = [...exerciseTypesById.values()]
  const cycles = storedCycles.map((cycle) => ({
    ...cycle,
    goals: migrateExerciseGoals(cycle.id, cycle.goals, exerciseTypes),
  }))
  const goals = cycles.flatMap((cycle) => cycle.goals)

  legacyCards.forEach((card) => {
    if (!card.activityRecord) {
      return
    }

    const activity = normalizeActivity(card.activityRecord, goalTypes, card.date)
    if (activity) {
      activitiesById.set(activity.id, activity)
    }
  })

  ;(state.activities ?? []).forEach((legacyActivity) => {
    const activity = normalizeActivity(legacyActivity, goalTypes)
    if (!activity) {
      return
    }

    const existing = activitiesById.get(activity.id)
    activitiesById.set(activity.id, existing ? { ...activity, date: existing.date } : activity)
  })

  return {
    schemaVersion: 4,
    cycles,
    activeCycleId: state.activeCycleId,
    goals,
    activities: [...activitiesById.values()].sort((left, right) =>
      right.recordedAt.localeCompare(left.recordedAt),
    ),
    exerciseTypes,
    achievements: state.achievements,
    pig: state.pig,
    settings: state.settings,
  }
}

export function loadAppState(): AppState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) {
      return null
    }

    return migrateStoredState(JSON.parse(raw) as StoredAppState)
  } catch (error) {
    console.warn('Failed to load app state from storage', error)
    return null
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save app state to storage', error)
  }
}

export function clearAppState(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(APP_STORAGE_KEY)
}
