import type {
  Achievement,
  Action,
  ActivityRecord,
  AppState,
  Cycle,
  CycleTodo,
  ExerciseType,
  Goal,
  Pig,
  UserSettings,
} from '../types/models'
import { synchronizePigGrowth } from './pigGrowth'
import { normalizeActionTargetConfiguration } from './actionTargets'

export const NEXT_MEET_BACKUP_FORMAT = 'next-meet-backup'
export const NEXT_MEET_BACKUP_VERSION = 1
export const NEXT_MEET_BACKUP_MAX_BYTES = 10 * 1024 * 1024

interface BackupSource {
  appSchemaVersion: AppState['schemaVersion']
  timeZone: string
}

export interface NextMeetBackup {
  format: typeof NEXT_MEET_BACKUP_FORMAT
  formatVersion: typeof NEXT_MEET_BACKUP_VERSION
  exportedAt: string
  source: BackupSource
  data: AppState
}

export interface BackupSummary {
  exportedAt: string
  cycleCount: number
  actionCount: number
  activityCount: number
  todoCount: number
  pigName: string
  pigLevel: number
}

export interface ParsedBackup {
  backup: NextMeetBackup
  state: AppState
  summary: BackupSummary
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isOptionalString(value: unknown) {
  return value === undefined || isString(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOptionalFiniteNumber(value: unknown) {
  return value === undefined || isFiniteNumber(value)
}

function isGoal(value: unknown): value is Goal {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.cycleId) &&
    ['strength', 'cardio', 'sleep', 'todo'].includes(String(value.type)) &&
    isFiniteNumber(value.targetCount) &&
    isOptionalString(value.exerciseTypeId) &&
    isOptionalString(value.title) &&
    isOptionalString(value.unit)
  )
}

function isCycle(value: unknown): value is Cycle {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.startDate) &&
    isString(value.targetDate) &&
    isFiniteNumber(value.lengthDays) &&
    ['active', 'completed', 'archived'].includes(String(value.status)) &&
    isString(value.createdAt) &&
    isOptionalString(value.completedAt) &&
    isOptionalString(value.historyNote) &&
    Array.isArray(value.goals) &&
    value.goals.every(isGoal)
  )
}

function isAction(value: unknown): value is Action {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.cycleId) &&
    ['health', 'bodyCare', 'rest', 'learning', 'work', 'custom'].includes(
      String(value.category),
    ) &&
    isOptionalString(value.categoryLabel) &&
    isString(value.name) &&
    isString(value.note) &&
    (value.targetMode === undefined ||
      ['total', 'weekly'].includes(String(value.targetMode))) &&
    isFiniteNumber(value.targetCount) &&
    isOptionalFiniteNumber(value.weeklyTarget) &&
    (value.targetMode !== 'weekly' ||
      (isFiniteNumber(value.weeklyTarget) && value.weeklyTarget > 0)) &&
    isOptionalString(value.icon) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isOptionalString(value.deletedAt)
  )
}

function isActivity(value: unknown): value is ActivityRecord {
  if (
    !isObject(value) ||
    !isString(value.id) ||
    !isString(value.cycleId) ||
    !isString(value.actionId) ||
    value.type !== 'action' ||
    !isString(value.date) ||
    !isString(value.recordedAt) ||
    !['daily', 'makeup', 'migration'].includes(String(value.source))
  ) {
    return false
  }

  if (value.metadata === undefined) {
    return true
  }
  if (!isObject(value.metadata)) {
    return false
  }

  return (
    isOptionalString(value.metadata.exerciseTypeId) &&
    isOptionalFiniteNumber(value.metadata.weight) &&
    isOptionalFiniteNumber(value.metadata.reps) &&
    isOptionalFiniteNumber(value.metadata.durationMinutes) &&
    isOptionalString(value.metadata.sleepTime) &&
    isOptionalString(value.metadata.note) &&
    isOptionalString(value.metadata.actionName) &&
    (value.metadata.actionCategory === undefined ||
      ['health', 'bodyCare', 'rest', 'learning', 'work', 'custom'].includes(
        String(value.metadata.actionCategory),
      )) &&
    isOptionalString(value.metadata.actionNote)
  )
}

function isTodo(value: unknown): value is CycleTodo {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.cycleId) &&
    isString(value.text) &&
    typeof value.completed === 'boolean' &&
    isString(value.createdAt) &&
    isOptionalString(value.completedAt) &&
    isOptionalString(value.carriedFromTodoId)
  )
}

function isExerciseType(value: unknown): value is ExerciseType {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.name) &&
    ['strength', 'cardio', 'flexibility', 'other'].includes(
      String(value.category),
    ) &&
    isOptionalString(value.icon) &&
    isString(value.createdAt) &&
    typeof value.enabled === 'boolean'
  )
}

function isAchievement(value: unknown): value is Achievement {
  return (
    isObject(value) &&
    isString(value.id) &&
    [
      'strength_awaken',
      'cardio_upgrade',
      'sleep_master',
      'next_meet',
      'pig_partner',
    ].includes(String(value.key)) &&
    isString(value.title) &&
    isString(value.description) &&
    typeof value.unlocked === 'boolean' &&
    isOptionalString(value.unlockedAt)
  )
}

function isPig(value: unknown): value is Pig {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.name) &&
    typeof value.level === 'number' &&
    [1, 2, 3, 4, 5].includes(value.level) &&
    isFiniteNumber(value.completedCardCount) &&
    isString(value.lastUpdatedAt)
  )
}

function isSettings(value: unknown): value is UserSettings {
  return (
    isObject(value) &&
    isFiniteNumber(value.defaultCycleLengthDays) &&
    isString(value.sleepTargetTime) &&
    typeof value.firstLaunchCompleted === 'boolean' &&
    typeof value.carryOverUnfinishedTodos === 'boolean'
  )
}

function hasUniqueIds(items: Array<{ id: string }>) {
  return new Set(items.map((item) => item.id)).size === items.length
}

function validateReferences(state: AppState) {
  const cycleIds = new Set(state.cycles.map((cycle) => cycle.id))
  const actionById = new Map(state.actions.map((action) => [action.id, action]))

  if (
    state.activeCycleId !== null &&
    !cycleIds.has(state.activeCycleId)
  ) {
    throw new Error('备份中的当前周期不存在。')
  }

  state.cycles.forEach((cycle) => {
    if (cycle.goals.some((goal) => goal.cycleId !== cycle.id)) {
      throw new Error('备份中的周期目标引用不完整。')
    }
  })

  if (
    state.goals.some((goal) => !cycleIds.has(goal.cycleId)) ||
    state.actions.some((action) => !cycleIds.has(action.cycleId)) ||
    state.todos.some((todo) => !cycleIds.has(todo.cycleId))
  ) {
    throw new Error('备份中有内容引用了不存在的周期。')
  }

  state.activities.forEach((activity) => {
    const action = actionById.get(activity.actionId)
    if (!action || action.cycleId !== activity.cycleId) {
      throw new Error('备份中的成长记录缺少对应行动。')
    }
  })
}

function validateAppState(value: unknown): AppState {
  if (
    !isObject(value) ||
    value.schemaVersion !== 6 ||
    !Array.isArray(value.cycles) ||
    !value.cycles.every(isCycle) ||
    !(value.activeCycleId === null || isString(value.activeCycleId)) ||
    !Array.isArray(value.goals) ||
    !value.goals.every(isGoal) ||
    !Array.isArray(value.actions) ||
    !value.actions.every(isAction) ||
    !Array.isArray(value.activities) ||
    !value.activities.every(isActivity) ||
    !Array.isArray(value.todos) ||
    !value.todos.every(isTodo) ||
    !Array.isArray(value.exerciseTypes) ||
    !value.exerciseTypes.every(isExerciseType) ||
    !Array.isArray(value.achievements) ||
    !value.achievements.every(isAchievement) ||
    !isPig(value.pig) ||
    !isSettings(value.settings)
  ) {
    throw new Error('这不是有效的 next-meet 备份，或备份版本暂不支持。')
  }

  const state = value as unknown as AppState
  const collections = [
    state.cycles,
    state.goals,
    state.actions,
    state.activities,
    state.todos,
    state.exerciseTypes,
    state.achievements,
  ]
  if (collections.some((items) => !hasUniqueIds(items))) {
    throw new Error('备份中包含重复的数据标识，无法安全导入。')
  }

  validateReferences(state)
  return state
}

export function createNextMeetBackup(state: AppState): NextMeetBackup {
  return {
    format: NEXT_MEET_BACKUP_FORMAT,
    formatVersion: NEXT_MEET_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source: {
      appSchemaVersion: state.schemaVersion,
      timeZone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    },
    data: state,
  }
}

export function serializeNextMeetBackup(state: AppState) {
  return JSON.stringify(createNextMeetBackup(state), null, 2)
}

export function createBackupFileName(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `next-meet-backup-${year}-${month}-${day}.json`
}

export function parseNextMeetBackup(raw: string): ParsedBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('无法读取这个文件，请选择 next-meet 导出的备份。')
  }

  if (
    !isObject(parsed) ||
    parsed.format !== NEXT_MEET_BACKUP_FORMAT ||
    parsed.formatVersion !== NEXT_MEET_BACKUP_VERSION ||
    !isString(parsed.exportedAt) ||
    !isObject(parsed.source) ||
    parsed.source.appSchemaVersion !== 6 ||
    !isString(parsed.source.timeZone)
  ) {
    throw new Error('这不是有效的 next-meet 备份，或备份版本暂不支持。')
  }

  const validatedState = validateAppState(parsed.data)
  const state = synchronizePigGrowth({
    ...validatedState,
    actions: validatedState.actions.map(normalizeActionTargetConfiguration),
  })
  const backup = parsed as unknown as NextMeetBackup
  return {
    backup,
    state,
    summary: {
      exportedAt: backup.exportedAt,
      cycleCount: state.cycles.length,
      actionCount: state.actions.filter((action) => !action.deletedAt).length,
      activityCount: state.activities.length,
      todoCount: state.todos.length,
      pigName: state.pig.name,
      pigLevel: state.pig.level,
    },
  }
}
