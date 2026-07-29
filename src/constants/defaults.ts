import type { AppState, ExerciseType } from '../types/models'

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

export function getDefaultAppState(): AppState {
  const cycleId = 'cycle-1'
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 1)
  const targetDate = new Date(startDate)
  targetDate.setDate(targetDate.getDate() + 21)
  const goals = [
    {
      id: 'goal-strength-default',
      cycleId,
      type: 'strength' as const,
      exerciseTypeId: 'strength-default',
      targetCount: 6,
      title: '力量训练',
      unit: '次',
    },
    {
      id: 'goal-dance',
      cycleId,
      type: 'cardio' as const,
      exerciseTypeId: 'dance',
      targetCount: 3,
      title: '健身操',
      unit: '次',
    },
    {
      id: 'goal-boxing',
      cycleId,
      type: 'cardio' as const,
      exerciseTypeId: 'boxing',
      targetCount: 3,
      title: '拳击',
      unit: '次',
    },
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
      targetCount: 19,
      title: '早睡',
      unit: '晚',
    },
    {
      id: 'goal-todo',
      cycleId,
      type: 'todo' as const,
      targetCount: 5,
      title: '见面前的小事',
      unit: '件',
    },
  ]

  return {
    schemaVersion: 4,
    cycles: [
      {
        id: cycleId,
        title: '下一场见',
        startDate: formatLocalDate(startDate),
        targetDate: formatLocalDate(targetDate),
        lengthDays: 21,
        status: 'active',
        createdAt: new Date().toISOString(),
        goals: goals.map((goal) => ({ ...goal })),
      },
    ],
    activeCycleId: cycleId,
    goals: goals.map((goal) => ({ ...goal })),
    activities: [],
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
      lastUpdatedAt: new Date().toISOString(),
    },
    settings: {
      defaultCycleLengthDays: 21,
      sleepTargetTime: '00:00',
      firstLaunchCompleted: false,
    },
  }
}
