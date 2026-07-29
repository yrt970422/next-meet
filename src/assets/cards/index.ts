import sleepLogo from './sleep-card-logo.png'
import workoutLogo from './workout-card-logo.png'

export const DAILY_ACTION_LOGOS = {
  workout: {
    src: workoutLogo,
    alt: '运动卡',
  },
  sleep: {
    src: sleepLogo,
    alt: '睡眠卡',
  },
} as const

export type DailyActionLogoType = keyof typeof DAILY_ACTION_LOGOS

export function resolveDailyActionLogo(type: DailyActionLogoType) {
  return DAILY_ACTION_LOGOS[type]
}
