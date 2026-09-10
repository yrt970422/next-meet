import { APP_STORAGE_KEY } from './storageKeys'
import { resolveCurrentCycle } from './currentCycle'
import { getDefaultExerciseTypes } from '../constants/defaults'
import { normalizeActionTargetConfiguration } from './actionTargets'
import type {
  Action,
  ActionCategory,
  ActivityRecord,
  ActivitySource,
  AppState,
  CycleTodo,
  ExerciseType,
  Goal,
  GoalType,
  UserSettings,
} from '../types/models'

const LEGACY_HOME_TODOS_PREFIX = 'next-meet:home-todos:v1:'

interface LegacyActivityMetadata {
  action?: string
  actionName?: string
  actionCategory?: ActionCategory
  actionNote?: string
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
  goalId?: string
  actionId?: string
  type?: GoalType | 'workout' | 'sleep' | 'action'
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

interface LegacyHomeTodo {
  id?: string
  text?: string
  completed?: boolean
}

interface StoredAppState
  extends Omit<
    AppState,
    | 'actions'
    | 'activities'
    | 'exerciseTypes'
    | 'todos'
    | 'settings'
    | 'schemaVersion'
  > {
  schemaVersion?: number
  actions?: Action[]
  activities?: LegacyActivityRecord[]
  exerciseTypes?: ExerciseType[]
  todos?: CycleTodo[]
  settings: Omit<UserSettings, 'carryOverUnfinishedTodos'> & {
    carryOverUnfinishedTodos?: boolean
  }
  cards?: LegacyCardInventoryItem[]
}

function loadLegacyHomeTodos(cycleId: string): CycleTodo[] {
  if (typeof window === 'undefined') {
    return []
  }

  const todosById = new Map<string, CycleTodo>()

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(LEGACY_HOME_TODOS_PREFIX)) {
      continue
    }

    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
      if (!Array.isArray(parsed)) {
        continue
      }

      parsed.forEach((item: LegacyHomeTodo, itemIndex) => {
        const text = typeof item.text === 'string' ? item.text.trim() : ''
        if (!text) {
          return
        }

        const legacyId =
          typeof item.id === 'string'
            ? item.id
            : `${key.slice(LEGACY_HOME_TODOS_PREFIX.length)}-${itemIndex}`
        const createdAt = new Date().toISOString()
        todosById.set(legacyId, {
          id: legacyId,
          cycleId,
          text,
          completed: item.completed === true,
          createdAt,
          completedAt: item.completed === true ? createdAt : undefined,
        })
      })
    } catch {
      // Ignore malformed legacy todo entries and keep loading app data.
    }
  }

  return [...todosById.values()]
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

function deriveActions(
  cycles: AppState['cycles'],
  exerciseTypes: ExerciseType[],
  sleepTargetTime: string,
) {
  const exerciseTypesById = new Map(
    exerciseTypes.map((exerciseType) => [exerciseType.id, exerciseType]),
  )
  const createdAt = new Date().toISOString()

  return cycles.flatMap((cycle) =>
    cycle.goals.flatMap((goal): Action[] => {
      if (goal.type === 'todo') {
        return []
      }

      if (goal.type === 'sleep') {
        return [
          {
            id: `action-${goal.id}`,
            cycleId: cycle.id,
            category: 'rest',
            name: goal.title ?? '早睡',
            note: `${sleepTargetTime} 前休息`,
            targetMode: 'total',
            targetCount: goal.targetCount,
            icon: '🌙',
            createdAt,
            updatedAt: createdAt,
          },
        ]
      }

      const exerciseType = goal.exerciseTypeId
        ? exerciseTypesById.get(goal.exerciseTypeId)
        : undefined

      return [
        {
          id: `action-${goal.id}`,
          cycleId: cycle.id,
          category: 'health',
          name: exerciseType?.name ?? goal.title ?? '运动',
          note:
            exerciseType?.category === 'strength'
              ? '60 分钟'
              : '30 分钟',
          targetMode: 'total',
          targetCount: goal.targetCount,
          icon: exerciseType?.icon ?? '💪',
          createdAt,
          updatedAt: createdAt,
        },
      ]
    }),
  )
}

function normalizeActivity(
  activity: LegacyActivityRecord,
  goalTypes: Map<string, GoalType>,
  actionsById: Map<string, Action>,
  actionIdByGoalId: Map<string, string>,
  actionIdByExercise: Map<string, string>,
  cardDate?: string | null,
): ActivityRecord | null {
  const legacyType =
    activity.type ??
    (activity.goalId ? goalTypes.get(activity.goalId) : undefined)
  const recordedAt = activity.recordedAt ?? activity.completedAt

  if (!legacyType || legacyType === 'todo' || !recordedAt) {
    return null
  }

  const migratedExerciseTypeId =
    legacyType === 'strength'
      ? 'strength-default'
      : legacyType === 'cardio'
        ? 'cardio-default'
        : activity.metadata?.exerciseTypeId ??
          activity.metadata?.action
  const actionId =
    activity.actionId ??
    (migratedExerciseTypeId
      ? actionIdByExercise.get(
          `${activity.cycleId}:${migratedExerciseTypeId}`,
        )
      : undefined) ??
    (activity.goalId ? actionIdByGoalId.get(activity.goalId) : undefined)
  const action = actionId ? actionsById.get(actionId) : undefined

  if (!actionId || !action) {
    return null
  }

  return {
    id: activity.id,
    cycleId: activity.cycleId,
    actionId,
    type: 'action',
    date: activity.date ?? cardDate ?? formatLocalDate(recordedAt),
    recordedAt,
    source: activity.source ?? 'migration',
    metadata: {
      exerciseTypeId: migratedExerciseTypeId,
      weight: activity.metadata?.weight,
      reps: activity.metadata?.reps,
      durationMinutes: activity.metadata?.durationMinutes,
      sleepTime: activity.metadata?.sleepTime,
      note: activity.metadata?.note ?? activity.note,
      actionName: activity.metadata?.actionName ?? action.name,
      actionCategory:
        activity.metadata?.actionCategory ?? action.category,
      actionNote: activity.metadata?.actionNote ?? action.note,
    },
  }
}

function migrateStoredState(state: StoredAppState): AppState {
  if (
    state.schemaVersion === 6 &&
    Array.isArray(state.actions) &&
    Array.isArray(state.activities) &&
    Array.isArray(state.todos) &&
    Array.isArray(state.exerciseTypes) &&
    typeof state.settings.carryOverUnfinishedTodos === 'boolean'
  ) {
    const currentState = state as unknown as AppState
    return {
      ...currentState,
      actions: currentState.actions.map(normalizeActionTargetConfiguration),
    }
  }

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
  const migratedCycles = storedCycles.map((cycle) => ({
    ...cycle,
    goals: migrateExerciseGoals(cycle.id, cycle.goals, exerciseTypes),
  }))
  const cycles = migratedCycles
  const currentCycleId =
    resolveCurrentCycle(cycles, state.activeCycleId)?.id ??
    state.activeCycleId
  const goals = cycles.flatMap((cycle) => cycle.goals)
  const migratedActions =
    state.schemaVersion === 6 && state.actions
      ? state.actions
      : deriveActions(cycles, exerciseTypes, state.settings.sleepTargetTime)
  const actions = migratedActions.map(normalizeActionTargetConfiguration)
  const actionsById = new Map(actions.map((action) => [action.id, action]))
  const actionIdByGoalId = new Map<string, string>()
  const actionIdByExercise = new Map<string, string>()

  cycles.forEach((cycle) => {
    cycle.goals.forEach((goal) => {
      const derivedAction = actions.find(
        (action) => action.id === `action-${goal.id}`,
      )
      if (derivedAction) {
        actionIdByGoalId.set(goal.id, derivedAction.id)
      }
      if (goal.exerciseTypeId && derivedAction) {
        actionIdByExercise.set(
          `${cycle.id}:${goal.exerciseTypeId}`,
          derivedAction.id,
        )
      }
    })
  })
  const todoCycleId = currentCycleId ?? cycles[0]?.id
  const migratedTodos =
    (state.schemaVersion ?? 0) >= 5
      ? (state.todos ?? [])
      : todoCycleId
        ? loadLegacyHomeTodos(todoCycleId)
        : []
  const todos = migratedTodos

  legacyCards.forEach((card) => {
    if (!card.activityRecord) {
      return
    }

    const activity = normalizeActivity(
      card.activityRecord,
      goalTypes,
      actionsById,
      actionIdByGoalId,
      actionIdByExercise,
      card.date,
    )
    if (activity) {
      activitiesById.set(activity.id, activity)
    }
  })

  ;(state.activities ?? []).forEach((legacyActivity) => {
    const activity = normalizeActivity(
      legacyActivity,
      goalTypes,
      actionsById,
      actionIdByGoalId,
      actionIdByExercise,
    )
    if (!activity) {
      return
    }

    const existing = activitiesById.get(activity.id)
    activitiesById.set(activity.id, existing ? { ...activity, date: existing.date } : activity)
  })
  return {
    schemaVersion: 6,
    cycles,
    activeCycleId: currentCycleId,
    goals,
    actions,
    activities: [...activitiesById.values()].sort((left, right) =>
      right.recordedAt.localeCompare(left.recordedAt),
    ),
    todos,
    exerciseTypes,
    achievements: state.achievements,
    pig: state.pig,
    settings: {
      ...state.settings,
      carryOverUnfinishedTodos:
        state.settings.carryOverUnfinishedTodos ?? true,
    },
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
