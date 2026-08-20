import { PUBLIC_UPCOMING_CYCLES } from '../constants/publicCycles'
import type {
  Action,
  AppState,
  Cycle,
  CycleTodo,
  Goal,
} from '../types/models'
import { resolveCurrentCycle } from './currentCycle'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const FALLBACK_CYCLE_LENGTH_DAYS = 21

interface EnsureCycleLifecycleOptions {
  today?: string
  now?: string
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(value: string, amount: number) {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

function inclusiveDayCount(startDate: string, targetDate: string) {
  return Math.max(
    1,
    Math.round(
      (parseLocalDate(targetDate).getTime() -
        parseLocalDate(startDate).getTime()) /
        DAY_IN_MS,
    ) + 1,
  )
}

function createId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isSamePublicCycle(
  cycle: Cycle,
  preset: (typeof PUBLIC_UPCOMING_CYCLES)[number],
) {
  return (
    cycle.title === preset.name &&
    cycle.startDate === preset.startDate &&
    cycle.targetDate === preset.targetDate
  )
}

function cloneGoals(goals: Goal[], cycleId: string) {
  return goals.map((goal) => ({
    ...goal,
    id: createId('goal'),
    cycleId,
  }))
}

function cloneActions(actions: Action[], cycleId: string, now: string) {
  return actions
    .filter((action) => !action.deletedAt)
    .map((action) => {
      const { deletedAt: _deletedAt, ...actionConfiguration } = action
      void _deletedAt
      return {
        ...actionConfiguration,
        id: createId('action'),
        cycleId,
        createdAt: now,
        updatedAt: now,
      }
    })
}

function cloneTodos(
  todos: CycleTodo[],
  previousCycleId: string | undefined,
  cycleId: string,
  now: string,
  shouldCarry: boolean,
) {
  if (!shouldCarry || !previousCycleId) return []

  return todos
    .filter(
      (todo) => todo.cycleId === previousCycleId && !todo.completed,
    )
    .map((todo) => ({
      id: createId('todo'),
      cycleId,
      text: todo.text,
      completed: false,
      createdAt: now,
      carriedFromTodoId: todo.id,
    }))
}

function latestEndedCycle(cycles: Cycle[], today: string) {
  return [...cycles]
    .filter((cycle) => cycle.targetDate < today)
    .sort((left, right) =>
      right.targetDate.localeCompare(left.targetDate) ||
      right.createdAt.localeCompare(left.createdAt),
    )[0]
}

function nextPublicCycle(cycles: Cycle[], today: string) {
  return [...PUBLIC_UPCOMING_CYCLES]
    .filter((preset) => preset.targetDate >= today)
    .sort((left, right) => {
      const leftCoversToday = left.startDate <= today ? 0 : 1
      const rightCoversToday = right.startDate <= today ? 0 : 1
      return (
        leftCoversToday - rightCoversToday ||
        left.startDate.localeCompare(right.startDate)
      )
    })
    .find(
      (preset) =>
        !cycles.some(
          (cycle) =>
            isSamePublicCycle(cycle, preset) &&
            cycle.status !== 'active',
        ),
    )
}

function buildNextCycle(
  cycles: Cycle[],
  previousCycle: Cycle | undefined,
  today: string,
  now: string,
) {
  const publicPreset = nextPublicCycle(cycles, today)
  const cycleId = publicPreset
    ? `cycle-public-${publicPreset.startDate}-${publicPreset.targetDate}`
    : createId('cycle')
  const previousLength = previousCycle
    ? inclusiveDayCount(previousCycle.startDate, previousCycle.targetDate)
    : FALLBACK_CYCLE_LENGTH_DAYS
  const startDate = publicPreset
    ? publicPreset.startDate
    : previousCycle
      ? [today, addDays(previousCycle.targetDate, 1)].sort().at(-1)!
      : today
  const targetDate = publicPreset
    ? publicPreset.targetDate
    : addDays(startDate, previousLength - 1)
  const goals = cloneGoals(previousCycle?.goals ?? [], cycleId)

  return {
    cycle: {
      id: cycleId,
      title: publicPreset?.name ?? '下一场见',
      startDate,
      targetDate,
      lengthDays: inclusiveDayCount(startDate, targetDate),
      status: 'active' as const,
      createdAt: now,
      goals,
    },
    goals,
  }
}

/**
 * Reconciles cycle state once when the app loads. It is intentionally pure:
 * no timers, storage writes, or UI refreshes happen inside this service.
 */
export function ensureCycleLifecycle(
  state: AppState,
  options: EnsureCycleLifecycleOptions = {},
): AppState {
  const today = options.today ?? formatLocalDate(new Date())
  const now = options.now ?? new Date().toISOString()
  let didCompleteCycle = false
  const cycles = state.cycles.map((cycle) => {
    if (cycle.status !== 'active' || today <= cycle.targetDate) {
      return cycle
    }

    didCompleteCycle = true
    return {
      ...cycle,
      status: 'completed' as const,
      completedAt: cycle.completedAt ?? now,
    }
  })
  const stateAfterCompletion = didCompleteCycle
    ? { ...state, cycles }
    : state
  const currentCycle = resolveCurrentCycle(
    stateAfterCompletion.cycles,
    stateAfterCompletion.activeCycleId,
    today,
  )

  if (currentCycle) {
    return currentCycle.id === stateAfterCompletion.activeCycleId
      ? stateAfterCompletion
      : { ...stateAfterCompletion, activeCycleId: currentCycle.id }
  }

  const previousCycle = latestEndedCycle(stateAfterCompletion.cycles, today)
  const reusablePublicCycle = PUBLIC_UPCOMING_CYCLES
    .filter((preset) => preset.targetDate >= today)
    .map((preset) =>
      stateAfterCompletion.cycles.find(
        (cycle) => isSamePublicCycle(cycle, preset) && cycle.status === 'active',
      ),
    )
    .find((cycle): cycle is Cycle => Boolean(cycle))

  if (reusablePublicCycle) {
    return {
      ...stateAfterCompletion,
      activeCycleId: reusablePublicCycle.id,
    }
  }

  const { cycle, goals } = buildNextCycle(
    stateAfterCompletion.cycles,
    previousCycle,
    today,
    now,
  )
  const previousActions = previousCycle
    ? stateAfterCompletion.actions.filter(
        (action) => action.cycleId === previousCycle.id,
      )
    : []
  const actions = cloneActions(previousActions, cycle.id, now)
  const todos = cloneTodos(
    stateAfterCompletion.todos,
    previousCycle?.id,
    cycle.id,
    now,
    stateAfterCompletion.settings.carryOverUnfinishedTodos,
  )

  return {
    ...stateAfterCompletion,
    cycles: [cycle, ...stateAfterCompletion.cycles],
    activeCycleId: cycle.id,
    goals: [...goals, ...stateAfterCompletion.goals],
    actions: [...actions, ...stateAfterCompletion.actions],
    todos: [...todos, ...stateAfterCompletion.todos],
  }
}
