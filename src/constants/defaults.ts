import type {
  Action,
  ActivityRecord,
  AppState,
  Cycle,
  CycleTodo,
  ExerciseType,
} from '../types/models'
import { SHANGHAI_PUBLIC_CYCLE } from './publicCycles'

export const SAMPLE_PREVIOUS_CYCLE_ID = 'sample-previous-cycle-v1'

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

function toRecordedAt(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export interface SamplePreviousCycleData {
  cycle: Cycle
  actions: Action[]
  activities: ActivityRecord[]
  todos: CycleTodo[]
}

export function getSamplePreviousCycleData(
  currentCycleStartDate: string,
): SamplePreviousCycleData {
  const targetDate = addDays(currentCycleStartDate, -7)
  const startDate = addDays(targetDate, -21)
  const createdAt = toRecordedAt(startDate, '09:00')
  const actionDefinitions = [
    {
      id: 'sample-action-running',
      category: 'health' as const,
      name: '跑步',
      note: '30 分钟',
      targetCount: 6,
      icon: '🏃',
      offsets: [1, 6, 12, 18],
      time: '19:20',
    },
    {
      id: 'sample-action-reading',
      category: 'learning' as const,
      name: '阅读',
      note: '阅读 20 分钟',
      targetCount: 8,
      icon: '📖',
      offsets: [0, 3, 7, 10, 14, 19],
      time: '21:10',
    },
    {
      id: 'sample-action-sleep',
      category: 'rest' as const,
      name: '早睡',
      note: '23:30 前休息',
      targetCount: 14,
      icon: '🌙',
      offsets: [0, 2, 4, 6, 8, 10, 12, 14, 16, 19],
      time: '23:18',
    },
    {
      id: 'sample-action-project',
      category: 'work' as const,
      name: '项目推进',
      note: '向前推进一点',
      targetCount: 5,
      icon: '📌',
      offsets: [5, 11, 17],
      time: '18:45',
    },
  ]
  const actions: Action[] = actionDefinitions.map((definition) => ({
    id: definition.id,
    cycleId: SAMPLE_PREVIOUS_CYCLE_ID,
    category: definition.category,
    name: definition.name,
    note: definition.note,
    targetCount: definition.targetCount,
    icon: definition.icon,
    createdAt,
    updatedAt: createdAt,
  }))
  const activities: ActivityRecord[] = actionDefinitions.flatMap(
    (definition) =>
      definition.offsets.map((offset, index) => {
        const date = addDays(startDate, offset)
        return {
          id: `sample-record-${definition.id}-${index + 1}`,
          cycleId: SAMPLE_PREVIOUS_CYCLE_ID,
          actionId: definition.id,
          type: 'action',
          date,
          recordedAt: toRecordedAt(date, definition.time),
          source: 'daily',
          metadata: {
            actionName: definition.name,
            actionCategory: definition.category,
            actionNote: definition.note,
            note:
              definition.id === 'sample-action-running' && index === 2
                ? '河边慢跑，状态不错'
                : undefined,
          },
        }
      }),
  )
  const todos: CycleTodo[] = [
    {
      id: 'sample-todo-gift',
      cycleId: SAMPLE_PREVIOUS_CYCLE_ID,
      text: '挑选见面礼',
      completed: true,
      createdAt,
      completedAt: toRecordedAt(addDays(startDate, 8), '20:10'),
    },
    {
      id: 'sample-todo-photos',
      cycleId: SAMPLE_PREVIOUS_CYCLE_ID,
      text: '整理一起拍过的照片',
      completed: true,
      createdAt,
      completedAt: toRecordedAt(addDays(startDate, 15), '21:30'),
    },
    {
      id: 'sample-todo-restaurant',
      cycleId: SAMPLE_PREVIOUS_CYCLE_ID,
      text: '预订想去的餐厅',
      completed: true,
      createdAt,
      completedAt: toRecordedAt(addDays(startDate, 19), '17:40'),
    },
    {
      id: 'sample-todo-letter',
      cycleId: SAMPLE_PREVIOUS_CYCLE_ID,
      text: '准备一封小信',
      completed: false,
      createdAt,
    },
  ]

  return {
    cycle: {
      id: SAMPLE_PREVIOUS_CYCLE_ID,
      title: '春日见面准备',
      startDate,
      targetDate,
      lengthDays: 21,
      status: 'completed',
      createdAt,
      completedAt: toRecordedAt(targetDate, '23:00'),
      goals: [],
      historyNote: '测试用历史周期',
    },
    actions,
    activities,
    todos,
  }
}

export function getDefaultExerciseTypes(): ExerciseType[] {
  const createdAt = new Date().toISOString()

  return [
    {
      id: 'strength-default',
      name: '力量训练',
      category: 'strength',
      icon: '💪',
      createdAt,
      enabled: true,
    },
    {
      id: 'dance',
      name: '健身操',
      category: 'cardio',
      icon: '🎵',
      createdAt,
      enabled: true,
    },
    {
      id: 'boxing',
      name: '拳击',
      category: 'cardio',
      icon: '🥊',
      createdAt,
      enabled: true,
    },
    {
      id: 'running',
      name: '跑步',
      category: 'cardio',
      icon: '🏃',
      createdAt,
      enabled: true,
    },
    {
      id: 'cardio-default',
      name: '有氧训练',
      category: 'cardio',
      createdAt,
      enabled: false,
    },
  ]
}

const GUIYANG_TARGET_DATE = '2026-08-19'
const SHANGHAI_TARGET_DATE = SHANGHAI_PUBLIC_CYCLE.targetDate

export function getDefaultCyclePreset(openedAt = new Date()) {
  const startDate = formatLocalDate(openedAt)

  if (startDate < GUIYANG_TARGET_DATE) {
    return {
      title: '时空乐园-贵阳',
      startDate,
      targetDate: GUIYANG_TARGET_DATE,
    }
  }

  if (startDate < SHANGHAI_TARGET_DATE) {
    return {
      title: SHANGHAI_PUBLIC_CYCLE.name,
      startDate,
      targetDate: SHANGHAI_TARGET_DATE,
    }
  }

  return {
    title: '下一场见',
    startDate,
    targetDate: addDays(startDate, 21),
  }
}

export function getDefaultAppState(openedAt = new Date()): AppState {
  const cycleId = 'cycle-1'
  const createdAt = openedAt.toISOString()
  const cyclePreset = getDefaultCyclePreset(openedAt)
  const lengthDays = Math.max(
    1,
    Math.ceil(
      (parseLocalDate(cyclePreset.targetDate).getTime() -
        parseLocalDate(cyclePreset.startDate).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  )
  const goals = [
    {
      id: 'goal-running',
      cycleId,
      type: 'cardio' as const,
      exerciseTypeId: 'running',
      targetCount: 3,
      title: '跑步',
      unit: '次',
    },
    {
      id: 'goal-sleep',
      cycleId,
      type: 'sleep' as const,
      targetCount: 5,
      title: '早睡',
      unit: '晚',
    },
  ]
  const actions = [
    {
      id: 'action-running',
      cycleId,
      category: 'health' as const,
      name: '跑步',
      note: '30 分钟',
      targetCount: 3,
      icon: '🏃',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'action-sleep',
      cycleId,
      category: 'rest' as const,
      name: '早睡',
      note: '00:00 前休息',
      targetCount: 5,
      icon: '🌙',
      createdAt,
      updatedAt: createdAt,
    },
  ]
  return {
    schemaVersion: 6,
    cycles: [
      {
        id: cycleId,
        title: cyclePreset.title,
        startDate: cyclePreset.startDate,
        targetDate: cyclePreset.targetDate,
        lengthDays,
        status: 'active',
        createdAt,
        goals: goals.map((goal) => ({ ...goal })),
      },
    ],
    activeCycleId: cycleId,
    goals: goals.map((goal) => ({ ...goal })),
    actions,
    activities: [],
    todos: [
      {
        id: 'todo-fold-card-guide',
        cycleId,
        text: '完成一项行动后，向右滑动卡片来折卡哦~',
        completed: false,
        createdAt,
      },
    ],
    exerciseTypes: getDefaultExerciseTypes(),
    achievements: [
      {
        id: 'achievement-strength',
        key: 'strength_awaken',
        title: '力量觉醒',
        description: '完成周期力量目标',
        unlocked: false,
      },
      {
        id: 'achievement-cardio',
        key: 'cardio_upgrade',
        title: '心肺升级',
        description: '完成周期有氧目标',
        unlocked: false,
      },
      {
        id: 'achievement-sleep',
        key: 'sleep_master',
        title: '夜晚掌控者',
        description: '早睡完成 90%',
        unlocked: false,
      },
    ],
    pig: {
      id: 'pig-1',
      name: '小猪',
      level: 1,
      completedCardCount: 0,
      lastUpdatedAt: createdAt,
    },
    settings: {
      defaultCycleLengthDays: 21,
      sleepTargetTime: '00:00',
      firstLaunchCompleted: false,
      carryOverUnfinishedTodos: true,
    },
  }
}
