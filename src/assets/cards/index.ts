import bodyCareLogo from './card/body-care-card-logo.png'
import bodyCareLogoSmall from './small/body-care-card-logo.png'
import customLogo from './card/custom-card-logo.png'
import customLogoSmall from './small/custom-card-logo.png'
import learningLogo from './card/learning-card-logo.png'
import learningLogoSmall from './small/learning-card-logo.png'
import sleepLogo from './card/sleep-card-logo.png'
import sleepLogoSmall from './small/sleep-card-logo.png'
import workLogo from './card/work-card-logo.png'
import workLogoSmall from './small/work-card-logo.png'
import workoutLogo from './card/workout-card-logo.png'
import workoutLogoSmall from './small/workout-card-logo.png'
import type { ActionCategory } from '../../types/models'

export interface ActionCategoryLogo {
  src: string
  smallSrc: string
  alt: string
}

export const ACTION_CATEGORY_LOGOS: Record<ActionCategory, ActionCategoryLogo> = {
  health: {
    src: workoutLogo,
    smallSrc: workoutLogoSmall,
    alt: '运动',
  },
  bodyCare: {
    src: bodyCareLogo,
    smallSrc: bodyCareLogoSmall,
    alt: '身体照顾',
  },
  rest: {
    src: sleepLogo,
    smallSrc: sleepLogoSmall,
    alt: '休息',
  },
  learning: {
    src: learningLogo,
    smallSrc: learningLogoSmall,
    alt: '学习与兴趣',
  },
  work: {
    src: workLogo,
    smallSrc: workLogoSmall,
    alt: '工作',
  },
  custom: {
    src: customLogo,
    smallSrc: customLogoSmall,
    alt: '自定义',
  },
}

export function resolveActionCategoryLogo(
  category: ActionCategory,
  size: 'card' | 'small' = 'card',
) {
  const asset = ACTION_CATEGORY_LOGOS[category]
  return {
    src: size === 'small' ? asset.smallSrc : asset.src,
    alt: asset.alt,
  }
}
