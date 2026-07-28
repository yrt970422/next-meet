import type { AppState } from '../types/models'

export function getDefaultAppState(): AppState {
  const cycleId = 'cycle-1'

  return {
    cycles: [
      {
        id: cycleId,
        title: '下一场见',
        startDate: new Date().toISOString().slice(0, 10),
        targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        lengthDays: 21,
        status: 'active',
        createdAt: new Date().toISOString(),
        goals: [
          {
            id: 'goal-strength',
            cycleId,
            type: 'strength',
            targetCount: 6,
            title: '力量训练',
            unit: '次',
          },
          {
            id: 'goal-cardio',
            cycleId,
            type: 'cardio',
            targetCount: 9,
            title: '有氧训练',
            unit: '次',
          },
          {
            id: 'goal-sleep',
            cycleId,
            type: 'sleep',
            targetCount: 19,
            title: '早睡',
            unit: '晚',
          },
        ],
      },
    ],
    activeCycleId: cycleId,
    goals: [
      {
        id: 'goal-strength',
        cycleId,
        type: 'strength',
        targetCount: 6,
        title: '力量训练',
        unit: '次',
      },
      {
        id: 'goal-cardio',
        cycleId,
        type: 'cardio',
        targetCount: 9,
        title: '有氧训练',
        unit: '次',
      },
      {
        id: 'goal-sleep',
        cycleId,
        type: 'sleep',
        targetCount: 19,
        title: '早睡',
        unit: '晚',
      },
    ],
    activities: [],
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
