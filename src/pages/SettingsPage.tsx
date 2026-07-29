import { useState, type FormEvent } from 'react'
import { useAppState } from '../app/providers/useAppState'
import { Pig } from '../components/Pig'
import { SettingsCard, SettingsSheet } from '../components/Settings'
import type {
  ExerciseCategory,
  ExerciseType,
} from '../types/models'
import './SettingsPage.css'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const SLEEP_TIME_OPTIONS = ['23:00', '23:30', '00:00', '00:30']

type ActiveSheet =
  | null
  | 'pig'
  | 'cycle'
  | 'exercises'
  | 'exercise-form'
  | 'sleep'

interface ExerciseDraft {
  id?: string
  name: string
  icon: string
  category: ExerciseCategory
  enabled: boolean
}

const categoryLabels: Record<ExerciseCategory, string> = {
  strength: '力量',
  cardio: '有氧',
  flexibility: '柔韧',
  other: '其他',
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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(parseLocalDate(value))
}

function addDays(value: string, amount: number) {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

function createExerciseTypeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `exercise-${crypto.randomUUID()}`
    : `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function SettingsPage() {
  const {
    state,
    updateSettings,
    updateCycle,
    updateGoal,
    createExerciseType,
    updateExerciseType,
    setExerciseGoalTarget,
    updatePig,
  } = useAppState()
  const activeCycle =
    state.cycles.find((cycle) => cycle.id === state.activeCycleId) ??
    state.cycles[0]
  const today = formatLocalDate(new Date())
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [pigName, setPigName] = useState(state.pig.name)
  const [cycleTitle, setCycleTitle] = useState(activeCycle?.title ?? '')
  const [cycleStartDate, setCycleStartDate] = useState(
    activeCycle?.startDate ?? today,
  )
  const [cycleTargetDate, setCycleTargetDate] = useState(
    activeCycle?.targetDate ?? addDays(today, 1),
  )
  const [exerciseTargets, setExerciseTargets] = useState<
    Record<string, number>
  >({})
  const [sleepTarget, setSleepTarget] = useState(0)
  const [cycleError, setCycleError] = useState('')
  const [exerciseDraft, setExerciseDraft] =
    useState<ExerciseDraft | null>(null)
  const [exerciseError, setExerciseError] = useState('')
  const [sleepTime, setSleepTime] = useState(
    state.settings.sleepTargetTime,
  )

  const enabledExerciseTypes = state.exerciseTypes.filter(
    (exerciseType) => exerciseType.enabled,
  )
  const daysUntil = activeCycle
    ? Math.max(
        0,
        Math.ceil(
          (parseLocalDate(activeCycle.targetDate).getTime() -
            parseLocalDate(today).getTime()) /
            DAY_IN_MS,
        ),
      )
    : 0

  const closeSheet = () => {
    setActiveSheet(null)
    setCycleError('')
    setExerciseError('')
  }

  const openPigSheet = () => {
    setPigName(state.pig.name)
    setActiveSheet('pig')
  }

  const openCycleSheet = () => {
    if (!activeCycle) {
      return
    }

    setCycleTitle(activeCycle.title)
    setCycleStartDate(activeCycle.startDate)
    setCycleTargetDate(activeCycle.targetDate)
    setExerciseTargets(
      Object.fromEntries(
        enabledExerciseTypes.map((exerciseType) => [
          exerciseType.id,
          activeCycle.goals.find(
            (goal) => goal.exerciseTypeId === exerciseType.id,
          )?.targetCount ?? 0,
        ]),
      ),
    )
    setSleepTarget(
      activeCycle.goals.find((goal) => goal.type === 'sleep')?.targetCount ??
        0,
    )
    setCycleError('')
    setActiveSheet('cycle')
  }

  const handleCycleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeCycle) {
      return
    }

    if (cycleStartDate > today) {
      setCycleError('开始日期不能晚于今天。')
      return
    }

    if (cycleTargetDate <= cycleStartDate) {
      setCycleError('目标日期需要晚于开始日期。')
      return
    }

    const normalizedSleepTarget = Math.max(0, Math.round(sleepTarget))
    const nextLengthDays = Math.ceil(
      (parseLocalDate(cycleTargetDate).getTime() -
        parseLocalDate(cycleStartDate).getTime()) /
        DAY_IN_MS,
    )

    updateCycle(activeCycle.id, {
      title: cycleTitle.trim() || activeCycle.title,
      startDate: cycleStartDate,
      targetDate: cycleTargetDate,
      lengthDays: nextLengthDays,
    })

    enabledExerciseTypes.forEach((exerciseType) => {
      setExerciseGoalTarget(
        activeCycle.id,
        exerciseType.id,
        exerciseTargets[exerciseType.id] ?? 0,
      )
    })

    const sleepGoal = activeCycle.goals.find(
      (goal) => goal.type === 'sleep',
    )
    if (sleepGoal) {
      updateGoal(sleepGoal.id, { targetCount: normalizedSleepTarget })
    }

    closeSheet()
  }

  const openNewExercise = () => {
    setExerciseDraft({
      name: '',
      icon: '',
      category: 'other',
      enabled: true,
    })
    setExerciseError('')
    setActiveSheet('exercise-form')
  }

  const openExerciseEditor = (exerciseType: ExerciseType) => {
    setExerciseDraft({
      id: exerciseType.id,
      name: exerciseType.name,
      icon: exerciseType.icon ?? '',
      category: exerciseType.category,
      enabled: exerciseType.enabled,
    })
    setExerciseError('')
    setActiveSheet('exercise-form')
  }

  const handleExerciseSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!exerciseDraft) {
      return
    }

    const name = exerciseDraft.name.trim()
    if (!name) {
      setExerciseError('写下这个运动的名字。')
      return
    }

    if (exerciseDraft.id) {
      updateExerciseType(exerciseDraft.id, {
        name,
        icon: exerciseDraft.icon.trim() || undefined,
        category: exerciseDraft.category,
      })
    } else {
      createExerciseType({
        id: createExerciseTypeId(),
        name,
        icon: exerciseDraft.icon.trim() || undefined,
        category: exerciseDraft.category,
        createdAt: new Date().toISOString(),
        enabled: true,
      })
    }

    setActiveSheet('exercises')
  }

  const handleExerciseEnabledChange = () => {
    if (!exerciseDraft?.id) {
      return
    }

    updateExerciseType(exerciseDraft.id, {
      enabled: !exerciseDraft.enabled,
    })
    setActiveSheet('exercises')
  }

  return (
    <section className="settings-page" aria-labelledby="settings-page-title">
      <header className="settings-page__heading">
        <p>调整这一场里，照顾自己的方式</p>
        <h1 id="settings-page-title">设置</h1>
      </header>

      <SettingsCard icon="🐷" title="小猪">
        <button className="settings-row" type="button" onClick={openPigSheet}>
          <span>
            <small>名字</small>
            <strong>{state.pig.name}</strong>
          </span>
          <span aria-hidden="true">›</span>
        </button>
        <button className="settings-row" type="button" onClick={openPigSheet}>
          <span>
            <small>当前形象</small>
            <strong>Lv.{state.pig.level}</strong>
          </span>
          <Pig level={state.pig.level} size="small" decorative />
          <span aria-hidden="true">›</span>
        </button>
      </SettingsCard>

      <SettingsCard icon="🎫" title="当前周期" className="settings-card--primary">
        {activeCycle ? (
          <button className="settings-cycle-summary" type="button" onClick={openCycleSheet}>
            <span>
              <strong>{activeCycle.title}</strong>
              <small>
                {formatShortDate(activeCycle.startDate)} –{' '}
                {formatShortDate(activeCycle.targetDate)}
              </small>
              <em>还有 {daysUntil} 天</em>
            </span>
            <span aria-hidden="true">编辑 ›</span>
          </button>
        ) : (
          <p className="settings-card__empty">还没有正在进行的周期。</p>
        )}
      </SettingsCard>

      <SettingsCard icon="🏃" title="我的运动">
        <button
          className="settings-exercise-summary"
          type="button"
          onClick={() => setActiveSheet('exercises')}
        >
          <span className="settings-exercise-chips">
            {enabledExerciseTypes.slice(0, 4).map((exerciseType) => (
              <span key={exerciseType.id}>
                <i aria-hidden="true">{exerciseType.icon || '○'}</i>
                {exerciseType.name}
              </span>
            ))}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </SettingsCard>

      <SettingsCard icon="🌙" title="睡眠目标">
        <button
          className="settings-row"
          type="button"
          onClick={() => {
            setSleepTime(state.settings.sleepTargetTime)
            setActiveSheet('sleep')
          }}
        >
          <span>
            <small>目标时间</small>
            <strong>{state.settings.sleepTargetTime}</strong>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </SettingsCard>

      <SettingsCard icon="✦" title="关于 next-meet" className="settings-about">
        <strong>next-meet</strong>
        <p>
          为下一场见面，
          <br />
          温柔照顾自己。
        </p>
        <small>Version 1.0</small>
      </SettingsCard>

      {activeSheet === 'pig' ? (
        <SettingsSheet title="小猪" onClose={closeSheet}>
          <div className="settings-pig-preview">
            <Pig level={state.pig.level} size="large" decorative />
            <span>当前形象 · Lv.{state.pig.level}</span>
          </div>
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault()
              const name = pigName.trim()
              if (!name) {
                return
              }
              updatePig({
                name,
                lastUpdatedAt: new Date().toISOString(),
              })
              closeSheet()
            }}
          >
            <label>
              <span>名字</span>
              <input
                value={pigName}
                autoFocus
                onChange={(event) => setPigName(event.target.value)}
              />
            </label>
            <button className="settings-primary-button" type="submit">
              保存名字
            </button>
          </form>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'cycle' && activeCycle ? (
        <SettingsSheet title="编辑当前周期" onClose={closeSheet}>
          <form className="settings-form" onSubmit={handleCycleSave}>
            <label>
              <span>周期名称</span>
              <input
                value={cycleTitle}
                onChange={(event) => setCycleTitle(event.target.value)}
              />
            </label>
            <div className="settings-form__columns">
              <label>
                <span>开始日期</span>
                <input
                  type="date"
                  max={today}
                  value={cycleStartDate}
                  onChange={(event) => {
                    setCycleStartDate(event.target.value)
                    setCycleError('')
                  }}
                />
              </label>
              <label>
                <span>目标日期</span>
                <input
                  type="date"
                  min={addDays(cycleStartDate, 1)}
                  value={cycleTargetDate}
                  onChange={(event) => {
                    setCycleTargetDate(event.target.value)
                    setCycleError('')
                  }}
                />
              </label>
            </div>
            <fieldset>
              <legend>这一场想完成</legend>
              {enabledExerciseTypes.map((exerciseType) => (
                <label
                  className="settings-target-row"
                  key={exerciseType.id}
                >
                  <span>
                    {exerciseType.icon ? `${exerciseType.icon} ` : ''}
                    {exerciseType.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={exerciseTargets[exerciseType.id] ?? 0}
                    onChange={(event) =>
                      setExerciseTargets((current) => ({
                        ...current,
                        [exerciseType.id]: Number(event.target.value),
                      }))
                    }
                  />
                  <small>次</small>
                </label>
              ))}
              <label className="settings-target-row">
                <span>早睡</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={sleepTarget}
                  onChange={(event) =>
                    setSleepTarget(Number(event.target.value))
                  }
                />
                <small>次</small>
              </label>
            </fieldset>
            {cycleError ? (
              <p className="settings-form__error" role="alert">
                {cycleError}
              </p>
            ) : null}
            <button className="settings-primary-button" type="submit">
              保存这一场
            </button>
          </form>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'exercises' ? (
        <SettingsSheet title="我的运动" onClose={closeSheet}>
          <div className="settings-exercise-list">
            {state.exerciseTypes.map((exerciseType) => (
              <button
                type="button"
                key={exerciseType.id}
                onClick={() => openExerciseEditor(exerciseType)}
              >
                <i aria-hidden="true">{exerciseType.icon || '○'}</i>
                <span>
                  <strong>{exerciseType.name}</strong>
                  <small>
                    {categoryLabels[exerciseType.category]}
                    {!exerciseType.enabled ? ' · 已停用' : ''}
                  </small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          <button
            className="settings-add-button"
            type="button"
            onClick={openNewExercise}
          >
            ＋ 添加运动
          </button>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'exercise-form' && exerciseDraft ? (
        <SettingsSheet
          title={exerciseDraft.id ? '编辑运动' : '添加运动'}
          onClose={() => setActiveSheet('exercises')}
        >
          <form className="settings-form" onSubmit={handleExerciseSave}>
            <label>
              <span>运动名称</span>
              <input
                value={exerciseDraft.name}
                autoFocus
                placeholder="例如：瑜伽"
                onChange={(event) =>
                  setExerciseDraft({
                    ...exerciseDraft,
                    name: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>图标</span>
              <input
                value={exerciseDraft.icon}
                placeholder="例如：🏃"
                onChange={(event) =>
                  setExerciseDraft({
                    ...exerciseDraft,
                    icon: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>辅助分类</span>
              <select
                value={exerciseDraft.category}
                onChange={(event) =>
                  setExerciseDraft({
                    ...exerciseDraft,
                    category: event.target.value as ExerciseCategory,
                  })
                }
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <small>分类只用于推荐，记录中会显示运动名称。</small>
            </label>
            {exerciseError ? (
              <p className="settings-form__error" role="alert">
                {exerciseError}
              </p>
            ) : null}
            <button className="settings-primary-button" type="submit">
              保存运动
            </button>
            {exerciseDraft.id ? (
              <button
                className="settings-secondary-button"
                type="button"
                onClick={handleExerciseEnabledChange}
              >
                {exerciseDraft.enabled ? '停用这个运动' : '重新启用'}
              </button>
            ) : null}
          </form>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'sleep' ? (
        <SettingsSheet title="睡眠目标" onClose={closeSheet}>
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault()
              updateSettings({ sleepTargetTime: sleepTime })
              closeSheet()
            }}
          >
            <label>
              <span>希望几点休息</span>
              <input
                type="time"
                value={sleepTime}
                onChange={(event) => setSleepTime(event.target.value)}
              />
            </label>
            <div className="settings-time-options">
              {SLEEP_TIME_OPTIONS.map((time) => (
                <button
                  className={sleepTime === time ? 'is-selected' : ''}
                  key={time}
                  type="button"
                  onClick={() => setSleepTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            <button className="settings-primary-button" type="submit">
              保存睡眠目标
            </button>
          </form>
        </SettingsSheet>
      ) : null}
    </section>
  )
}
