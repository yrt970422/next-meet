import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDefaultAppState } from '../../constants/defaults'
import { loadAppState, saveAppState } from '../../services/storage'
import type {
  ActivityRecord,
  ActivityType,
  AppState,
  GoalType,
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

function getActivityType(goalType: GoalType): ActivityType | null {
  if (goalType === 'sleep') {
    return 'sleep'
  }

  if (goalType === 'strength' || goalType === 'cardio') {
    return 'workout'
  }

  return null
}

function isExerciseCompatibleWithGoal(
  goalType: GoalType,
  exerciseCategory: string,
) {
  return goalType === 'strength'
    ? exerciseCategory === 'strength'
    : goalType === 'cardio'
      ? exerciseCategory !== 'strength'
      : false
}

function createActivityId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createGoalId(cycleId: string, exerciseTypeId: string) {
  return `goal-${cycleId}-${exerciseTypeId}-${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36)
  }`
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>(() => loadAppState() ?? getDefaultAppState())

  useEffect(() => {
    saveAppState(state)
  }, [state])

  const value = useMemo<AppContextValue>(() => ({
    state,
    setActiveCycleId: (cycleId) => {
      setState((prev) => ({ ...prev, activeCycleId: cycleId }))
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
      setState((prev) => ({
        ...prev,
        cycles: [cycle, ...prev.cycles],
        activeCycleId: cycle.id,
        goals: [...cycle.goals, ...prev.goals],
      }))
    },
    updateCycle: (cycleId, updates) => {
      setState((prev) => ({
        ...prev,
        cycles: prev.cycles.map((cycle) =>
          cycle.id === cycleId ? { ...cycle, ...updates } : cycle,
        ),
      }))
    },
    updateGoal: (goalId, updates) => {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.map((goal) => (goal.id === goalId ? { ...goal, ...updates } : goal)),
        cycles: prev.cycles.map((cycle) => ({
          ...cycle,
          goals: cycle.goals.map((goal) =>
            goal.id === goalId ? { ...goal, ...updates } : goal,
          ),
        })),
      }))
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
        if (!exerciseType || !cycle) {
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
    recordDailyActivity: (input) => {
      setState((prev) => {
        const goal =
          prev.goals.find((candidate) => candidate.id === input.goalId) ??
          prev.cycles
            .flatMap((cycle) => cycle.goals)
            .find((candidate) => candidate.id === input.goalId)

        const activityType = goal ? getActivityType(goal.type) : null
        if (!goal || goal.cycleId !== prev.activeCycleId || !activityType) {
          return prev
        }

        const now = new Date()
        const date = formatLocalDate(now)
        const activeCycle = prev.cycles.find((cycle) => cycle.id === goal.cycleId)

        if (!activeCycle || date < activeCycle.startDate || date > activeCycle.targetDate) {
          return prev
        }

        const exerciseType =
          activityType === 'workout'
            ? prev.exerciseTypes.find(
                (candidate) =>
                  candidate.id === input.metadata?.exerciseTypeId &&
                  candidate.enabled,
              )
            : null

        if (
          activityType === 'workout' &&
          (!exerciseType ||
            !isExerciseCompatibleWithGoal(goal.type, exerciseType.category))
        ) {
          return prev
        }

        const alreadyRecorded = prev.activities.some(
          (activity) =>
            activity.cycleId === goal.cycleId &&
            activity.date === date &&
            activity.type === activityType,
        )

        if (alreadyRecorded) {
          return prev
        }

        const record: ActivityRecord = {
          id: createActivityId(),
          cycleId: goal.cycleId,
          goalId: goal.id,
          type: activityType,
          date,
          recordedAt: now.toISOString(),
          source: 'daily',
          metadata: {
            ...input.metadata,
            exerciseTypeId:
              activityType === 'workout' ? exerciseType?.id : undefined,
            note: input.note ?? input.metadata?.note,
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
        const goal =
          prev.goals.find((candidate) => candidate.id === input.goalId) ??
          prev.cycles
            .flatMap((cycle) => cycle.goals)
            .find((candidate) => candidate.id === input.goalId)

        const activityType = goal ? getActivityType(goal.type) : null
        if (!goal || !activityType) {
          return prev
        }

        const cycle = prev.cycles.find((candidate) => candidate.id === goal.cycleId)
        const today = formatLocalDate(new Date())

        if (
          !cycle ||
          input.date >= today ||
          input.date < cycle.startDate ||
          input.date > cycle.targetDate
        ) {
          return prev
        }

        const exerciseType =
          activityType === 'workout'
            ? prev.exerciseTypes.find(
                (candidate) =>
                  candidate.id === input.metadata?.exerciseTypeId &&
                  candidate.enabled,
              )
            : null

        if (
          activityType === 'workout' &&
          (!exerciseType ||
            !isExerciseCompatibleWithGoal(goal.type, exerciseType.category))
        ) {
          return prev
        }

        const alreadyRecorded = prev.activities.some(
          (activity) =>
            activity.cycleId === goal.cycleId &&
            activity.date === input.date &&
            activity.type === activityType,
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
          cycleId: goal.cycleId,
          goalId: goal.id,
          type: activityType,
          date: input.date,
          recordedAt: recordedAt.toISOString(),
          source: 'makeup',
          metadata: {
            ...input.metadata,
            exerciseTypeId:
              activityType === 'workout' ? exerciseType?.id : undefined,
            note: input.note ?? input.metadata?.note,
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
  }), [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
