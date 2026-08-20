import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDefaultAppState } from '../../constants/defaults'
import { ensureCycleLifecycle } from '../../services/cycleLifecycle'
import { resolveCurrentCycle } from '../../services/currentCycle'
import { synchronizePigGrowth } from '../../services/pigGrowth'
import { loadAppState, saveAppState } from '../../services/storage'
import type {
  ActivityRecord,
  AppState,
} from '../../types/models'
import { AppContext, type AppContextValue } from './AppContext'

interface AppProviderProps {
  children: ReactNode
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createActivityId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createTodoId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createActionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `action-${crypto.randomUUID()}`
    : `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createGoalId(cycleId: string, exerciseTypeId: string) {
  return `goal-${cycleId}-${exerciseTypeId}-${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36)
  }`
}

function getInitialAppState() {
  const initialState = loadAppState() ?? getDefaultAppState()
  return ensureCycleLifecycle(initialState)
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>(getInitialAppState)
  const resolvedState = useMemo(() => synchronizePigGrowth(state), [state])

  useEffect(() => {
    saveAppState(resolvedState)
  }, [resolvedState])

  const value = useMemo<AppContextValue>(() => ({
    state: resolvedState,
    replaceAppState: (nextState) => {
      setState(ensureCycleLifecycle(nextState))
    },
    setActiveCycleId: (cycleId) => {
      setState((prev) => {
        if (cycleId === null) {
          return { ...prev, activeCycleId: null }
        }

        const cycle = prev.cycles.find((candidate) => candidate.id === cycleId)
        return cycle?.status === 'active'
          ? { ...prev, activeCycleId: cycleId }
          : prev
      })
    },
    updateSettings: (settings) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...settings,
        },
      }))
    },
    createCycle: (cycle) => {
      setState((prev) => {
        const now = new Date().toISOString()
        const carriedTodos = prev.settings.carryOverUnfinishedTodos
          ? prev.todos
              .filter(
                (todo) =>
                  todo.cycleId === prev.activeCycleId && !todo.completed,
              )
              .map((todo) => ({
                id: createTodoId(),
                cycleId: cycle.id,
                text: todo.text,
                completed: false,
                createdAt: now,
                carriedFromTodoId: todo.id,
              }))
          : []
        const carriedActions = prev.actions
          .filter(
            (action) =>
              action.cycleId === prev.activeCycleId && !action.deletedAt,
          )
          .map((action) => ({
            ...action,
            id: createActionId(),
            cycleId: cycle.id,
            createdAt: now,
            updatedAt: now,
          }))

        return {
          ...prev,
          cycles: [cycle, ...prev.cycles],
          activeCycleId: cycle.id,
          goals: [...cycle.goals, ...prev.goals],
          actions: [...carriedActions, ...prev.actions],
          todos: [...carriedTodos, ...prev.todos],
        }
      })
    },
    updateCycle: (cycleId, updates) => {
      setState((prev) => {
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (currentCycle?.id !== cycleId || currentCycle.status !== 'active') {
          return prev
        }

        return {
          ...prev,
          cycles: prev.cycles.map((cycle) =>
            cycle.id === cycleId ? { ...cycle, ...updates } : cycle,
          ),
        }
      })
    },
    updateGoal: (goalId, updates) => {
      setState((prev) => {
        const goal = prev.goals.find((candidate) => candidate.id === goalId)
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (!goal || goal.cycleId !== currentCycle?.id) {
          return prev
        }

        return {
          ...prev,
          goals: prev.goals.map((candidate) =>
            candidate.id === goalId ? { ...candidate, ...updates } : candidate,
          ),
          cycles: prev.cycles.map((cycle) => ({
            ...cycle,
            goals: cycle.goals.map((candidate) =>
              candidate.id === goalId
                ? { ...candidate, ...updates }
                : candidate,
            ),
          })),
        }
      })
    },
    createExerciseType: (exerciseType) => {
      setState((prev) => {
        if (
          prev.exerciseTypes.some(
            (candidate) => candidate.id === exerciseType.id,
          )
        ) {
          return prev
        }

        const activeCycle = prev.cycles.find(
          (cycle) => cycle.id === prev.activeCycleId,
        )
        const goal = activeCycle
          ? {
              id: createGoalId(activeCycle.id, exerciseType.id),
              cycleId: activeCycle.id,
              type:
                exerciseType.category === 'strength'
                  ? ('strength' as const)
                  : ('cardio' as const),
              exerciseTypeId: exerciseType.id,
              targetCount: 0,
              title: exerciseType.name,
              unit: '次',
            }
          : null

        return {
          ...prev,
          exerciseTypes: [...prev.exerciseTypes, exerciseType],
          goals: goal ? [...prev.goals, goal] : prev.goals,
          cycles: goal
            ? prev.cycles.map((cycle) =>
                cycle.id === activeCycle?.id
                  ? { ...cycle, goals: [...cycle.goals, goal] }
                  : cycle,
              )
            : prev.cycles,
        }
      })
    },
    updateExerciseType: (exerciseTypeId, updates) => {
      setState((prev) => {
        const currentExerciseType = prev.exerciseTypes.find(
          (exerciseType) => exerciseType.id === exerciseTypeId,
        )
        if (!currentExerciseType) {
          return prev
        }

        const nextExerciseType = {
          ...currentExerciseType,
          ...updates,
        }
        const updateLinkedGoal = (goal: (typeof prev.goals)[number]) =>
          goal.exerciseTypeId === exerciseTypeId
            ? {
                ...goal,
                title: nextExerciseType.name,
                type:
                  nextExerciseType.category === 'strength'
                    ? ('strength' as const)
                    : ('cardio' as const),
              }
            : goal

        return {
          ...prev,
          exerciseTypes: prev.exerciseTypes.map((exerciseType) =>
            exerciseType.id === exerciseTypeId
              ? nextExerciseType
              : exerciseType,
          ),
          goals: prev.goals.map(updateLinkedGoal),
          cycles: prev.cycles.map((cycle) => ({
            ...cycle,
            goals: cycle.goals.map(updateLinkedGoal),
          })),
        }
      })
    },
    setExerciseGoalTarget: (cycleId, exerciseTypeId, targetCount) => {
      setState((prev) => {
        const exerciseType = prev.exerciseTypes.find(
          (candidate) => candidate.id === exerciseTypeId,
        )
        const cycle = prev.cycles.find(
          (candidate) => candidate.id === cycleId,
        )
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (!exerciseType || !cycle || cycle.id !== currentCycle?.id) {
          return prev
        }

        const normalizedTarget = Math.max(0, Math.round(targetCount))
        const existingGoal = cycle.goals.find(
          (goal) => goal.exerciseTypeId === exerciseTypeId,
        )

        if (existingGoal) {
          const updateTarget = (goal: (typeof prev.goals)[number]) =>
            goal.id === existingGoal.id
              ? { ...goal, targetCount: normalizedTarget }
              : goal

          return {
            ...prev,
            goals: prev.goals.map(updateTarget),
            cycles: prev.cycles.map((candidate) => ({
              ...candidate,
              goals:
                candidate.id === cycleId
                  ? candidate.goals.map(updateTarget)
                  : candidate.goals,
            })),
          }
        }

        const goal = {
          id: createGoalId(cycleId, exerciseTypeId),
          cycleId,
          type:
            exerciseType.category === 'strength'
              ? ('strength' as const)
              : ('cardio' as const),
          exerciseTypeId,
          targetCount: normalizedTarget,
          title: exerciseType.name,
          unit: '次',
        }

        return {
          ...prev,
          goals: [...prev.goals, goal],
          cycles: prev.cycles.map((candidate) =>
            candidate.id === cycleId
              ? { ...candidate, goals: [...candidate.goals, goal] }
              : candidate,
          ),
        }
      })
    },
    createAction: (action) => {
      setState((prev) => {
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (
          prev.actions.some((candidate) => candidate.id === action.id) ||
          action.cycleId !== currentCycle?.id
        ) {
          return prev
        }

        return {
          ...prev,
          actions: [
            ...prev.actions,
            {
              ...action,
              name: action.name.trim(),
              note: action.note.trim(),
              targetCount: Math.max(1, Math.round(action.targetCount)),
            },
          ],
        }
      })
    },
    updateAction: (actionId, updates) => {
      setState((prev) => {
        const actionToUpdate = prev.actions.find(
          (action) => action.id === actionId,
        )
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (!actionToUpdate || actionToUpdate.cycleId !== currentCycle?.id) {
          return prev
        }

        return {
          ...prev,
          actions: prev.actions.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  ...updates,
                  name: updates.name?.trim() || action.name,
                  note:
                    updates.note === undefined
                      ? action.note
                      : updates.note.trim(),
                  targetCount:
                    updates.targetCount === undefined
                      ? action.targetCount
                      : Math.max(1, Math.round(updates.targetCount)),
                  updatedAt: new Date().toISOString(),
                }
              : action,
          ),
        }
      })
    },
    deleteAction: (actionId) => {
      setState((prev) => {
        const actionToDelete = prev.actions.find(
          (action) => action.id === actionId,
        )
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (!actionToDelete || actionToDelete.cycleId !== currentCycle?.id) {
          return prev
        }

        return {
          ...prev,
          actions: prev.actions.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  deletedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : action,
          ),
        }
      })
    },
    addCycleTodo: (cycleId, text) => {
      const normalizedText = text.trim()
      if (!normalizedText) {
        return
      }

      setState((prev) => {
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (cycleId !== currentCycle?.id) {
          return prev
        }

        return {
          ...prev,
          todos: [
            ...prev.todos,
            {
              id: createTodoId(),
              cycleId,
              text: normalizedText,
              completed: false,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })
    },
    toggleCycleTodo: (todoId) => {
      setState((prev) => {
        const todoToToggle = prev.todos.find((todo) => todo.id === todoId)
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (!todoToToggle || todoToToggle.cycleId !== currentCycle?.id) {
          return prev
        }

        return {
          ...prev,
          todos: prev.todos.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  completed: !todo.completed,
                  completedAt: todo.completed
                    ? undefined
                    : new Date().toISOString(),
                }
              : todo,
          ),
        }
      })
    },
    deleteCycleTodo: (todoId) => {
      setState((prev) => {
        const todoToDelete = prev.todos.find((todo) => todo.id === todoId)
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
        )
        if (!todoToDelete || todoToDelete.cycleId !== currentCycle?.id) {
          return prev
        }

        return {
          ...prev,
          todos: prev.todos.filter((todo) => todo.id !== todoId),
        }
      })
    },
    recordDailyActivity: (input) => {
      setState((prev) => {
        const action = prev.actions.find(
          (candidate) => candidate.id === input.actionId,
        )
        const now = new Date()
        const date = formatLocalDate(now)
        const currentCycle = resolveCurrentCycle(
          prev.cycles,
          prev.activeCycleId,
          date,
        )
        if (
          !action ||
          action.deletedAt ||
          action.cycleId !== currentCycle?.id
        ) {
          return prev
        }

        const activeCycle = prev.cycles.find(
          (cycle) => cycle.id === action.cycleId,
        )

        if (!activeCycle || date < activeCycle.startDate || date > activeCycle.targetDate) {
          return prev
        }

        const completedCount = prev.activities.filter(
          (activity) => activity.actionId === action.id,
        ).length
        if (completedCount >= action.targetCount) {
          return prev
        }

        const alreadyRecorded = prev.activities.some(
          (activity) =>
            activity.actionId === action.id &&
            activity.date === date &&
            activity.type === 'action',
        )

        if (alreadyRecorded) {
          return prev
        }

        const record: ActivityRecord = {
          id: createActivityId(),
          cycleId: action.cycleId,
          actionId: action.id,
          type: 'action',
          date,
          recordedAt: now.toISOString(),
          source: 'daily',
          metadata: {
            ...input.metadata,
            note: input.note ?? input.metadata?.note,
            actionName: action.name,
            actionCategory: action.category,
            actionNote: action.note,
          },
        }

        return {
          ...prev,
          activities: [record, ...prev.activities],
        }
      })
    },
    recordActivityForDate: (input) => {
      setState((prev) => {
        const action = prev.actions.find(
          (candidate) => candidate.id === input.actionId,
        )
        if (!action || action.deletedAt) {
          return prev
        }

        const cycle = prev.cycles.find(
          (candidate) => candidate.id === action.cycleId,
        )
        const today = formatLocalDate(new Date())

        if (
          !cycle ||
          input.date >= today ||
          input.date < cycle.startDate ||
          input.date > cycle.targetDate
        ) {
          return prev
        }

        const completedCount = prev.activities.filter(
          (activity) => activity.actionId === action.id,
        ).length
        if (completedCount >= action.targetCount) {
          return prev
        }

        const alreadyRecorded = prev.activities.some(
          (activity) =>
            activity.actionId === action.id &&
            activity.date === input.date &&
            activity.type === 'action',
        )

        if (alreadyRecorded) {
          return prev
        }

        const recordedAt = new Date(`${input.date}T${input.time}:00`)
        if (Number.isNaN(recordedAt.getTime())) {
          return prev
        }

        const record: ActivityRecord = {
          id: createActivityId(),
          cycleId: action.cycleId,
          actionId: action.id,
          type: 'action',
          date: input.date,
          recordedAt: recordedAt.toISOString(),
          source: 'makeup',
          metadata: {
            ...input.metadata,
            note: input.note ?? input.metadata?.note,
            actionName: action.name,
            actionCategory: action.category,
            actionNote: action.note,
          },
        }

        return {
          ...prev,
          activities: [record, ...prev.activities],
        }
      })
    },
    deleteActivityRecord: (activityId) => {
      setState((prev) => ({
        ...prev,
        activities: prev.activities.filter(
          (activity) => activity.id !== activityId,
        ),
      }))
    },
    updatePig: (updates) => {
      setState((prev) => ({
        ...prev,
        pig: {
          ...prev.pig,
          ...updates,
        },
      }))
    },
  }), [resolvedState])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
