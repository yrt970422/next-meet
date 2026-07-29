export const PIG_LEVELS = [1, 2, 3, 4, 5] as const

export type PigLevel = (typeof PIG_LEVELS)[number]

export interface PigLevelDefinition {
  level: PigLevel
  key: 'new-companion' | 'getting-active' | 'growing-confident' | 'getting-ready' | 'cycle-keepsake'
  label: string
  description: string
}

export const PIG_LEVEL_DEFINITIONS = {
  1: {
    level: 1,
    key: 'new-companion',
    label: '初遇的小猪',
    description: '刚来到用户身边，安静地一起等待。',
  },
  2: {
    level: 2,
    key: 'getting-active',
    label: '开始运动的小猪',
    description: '愿意和用户一起动一动。',
  },
  3: {
    level: 3,
    key: 'growing-confident',
    label: '更自信的小猪',
    description: '在日常积累中变得更从容。',
  },
  4: {
    level: 4,
    key: 'getting-ready',
    label: '认真准备的小猪',
    description: '陪用户继续走向下一场见面。',
  },
  5: {
    level: 5,
    key: 'cycle-keepsake',
    label: '长期伙伴',
    description: '把一起走过的周期留作温柔纪念。',
  },
} as const satisfies Record<PigLevel, PigLevelDefinition>
