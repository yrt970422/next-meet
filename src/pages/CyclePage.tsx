import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAppState } from '../app/providers/useAppState'
import type { ActivityRecord, ExerciseType } from '../types/models'
import './CyclePage.css'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const SNACKBAR_DURATION = 2500
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

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

function formatDetailDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(parseLocalDate(value))
}

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date)
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return `${year}年${month}月`
}

function shiftMonth(monthKey: string, amount: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthCells(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const leadingBlanks = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = String(index + 1).padStart(2, '0')
      return `${monthKey}-${day}`
    }),
  ]
}

function getWorkoutName(
  record: ActivityRecord,
  exerciseTypesById: Map<string, ExerciseType>,
) {
  const exerciseTypeId = record.metadata?.exerciseTypeId
  return exerciseTypeId
    ? (exerciseTypesById.get(exerciseTypeId)?.name ?? '运动')
    : '运动'
}

export default function CyclePage() {
  const {
    state,
    setActiveCycleId,
    recordActivityForDate,
    deleteActivityRecord,
  } = useAppState()
  const today = formatLocalDate(new Date())
  const activeCycle =
    state.cycles.find((cycle) => cycle.id === state.activeCycleId) ??
    state.cycles[0]
  const enabledExerciseTypes = state.exerciseTypes.filter(
    (exerciseType) => exerciseType.enabled,
  )
  const [visibleMonth, setVisibleMonth] = useState(
    () => (activeCycle?.startDate ?? today).slice(0, 7),
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isMakeupOpen, setIsMakeupOpen] = useState(false)
  const [makeupCategory, setMakeupCategory] = useState<'workout' | 'sleep'>(
    'workout',
  )
  const [exerciseTypeId, setExerciseTypeId] = useState(
    () => enabledExerciseTypes[0]?.id ?? '',
  )
  const [makeupTime, setMakeupTime] = useState('20:00')
  const [makeupNote, setMakeupNote] = useState('')
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const snackbarTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (snackbarTimer.current !== null) {
        window.clearTimeout(snackbarTimer.current)
      }
    }
  }, [])

  if (!activeCycle) {
    return (
      <section className="cycle-page cycle-page--empty">
        <p>还没有周期</p>
        <h2>先在设置里定下下一场见面的日期。</h2>
      </section>
    )
  }

  const cycleActivities = state.activities.filter(
    (activity) => activity.cycleId === activeCycle.id,
  )
  const exerciseTypesById = new Map(
    state.exerciseTypes.map((exerciseType) => [
      exerciseType.id,
      exerciseType,
    ]),
  )
  const activitiesByDate = new Map<string, ActivityRecord[]>()
  cycleActivities.forEach((activity) => {
    const records = activitiesByDate.get(activity.date) ?? []
    activitiesByDate.set(activity.date, [...records, activity])
  })

  const selectedRecords = selectedDate
    ? (activitiesByDate.get(selectedDate) ?? [])
    : []
  const selectedHasWorkout = selectedRecords.some(
    (record) => record.type === 'workout',
  )
  const selectedHasSleep = selectedRecords.some(
    (record) => record.type === 'sleep',
  )
  const canAddForSelectedDate =
    Boolean(selectedDate) &&
    selectedDate! < today &&
    selectedDate! >= activeCycle.startDate &&
    selectedDate! <= activeCycle.targetDate
  const canAddWorkout =
    canAddForSelectedDate &&
    !selectedHasWorkout &&
    enabledExerciseTypes.length > 0 &&
    activeCycle.goals.some(
      (goal) => goal.type === 'strength' || goal.type === 'cardio',
    )
  const canAddSleep =
    canAddForSelectedDate &&
    !selectedHasSleep &&
    activeCycle.goals.some((goal) => goal.type === 'sleep')
  const calendarCells = getMonthCells(visibleMonth)
  const daysUntil = Math.max(
    0,
    Math.ceil(
      (parseLocalDate(activeCycle.targetDate).getTime() -
        parseLocalDate(today).getTime()) /
        DAY_IN_MS,
    ),
  )
  const cycleExerciseTypeIds = new Set([
    ...activeCycle.goals.flatMap((goal) =>
      goal.exerciseTypeId ? [goal.exerciseTypeId] : [],
    ),
    ...cycleActivities.flatMap((activity) =>
      activity.metadata?.exerciseTypeId
        ? [activity.metadata.exerciseTypeId]
        : [],
    ),
  ])
  const sleepTarget =
    activeCycle.goals.find((goal) => goal.type === 'sleep')?.targetCount ?? 0
  const progressItems = [
    ...state.exerciseTypes
      .filter(
        (exerciseType) =>
          exerciseType.enabled || cycleExerciseTypeIds.has(exerciseType.id),
      )
      .map((exerciseType) => ({
        id: exerciseType.id,
        label: `${exerciseType.icon ?? ''} ${exerciseType.name}`.trim(),
        completed: cycleActivities.filter(
          (activity) =>
            activity.type === 'workout' &&
            activity.metadata?.exerciseTypeId === exerciseType.id,
        ).length,
        target:
          activeCycle.goals.find(
            (goal) => goal.exerciseTypeId === exerciseType.id,
          )?.targetCount ?? 0,
      })),
    {
      id: 'sleep',
      label: '早睡',
      completed: cycleActivities.filter(
        (activity) => activity.type === 'sleep',
      ).length,
      target: sleepTarget,
    },
  ].filter((item) => item.target > 0 || item.completed > 0)

  const openDate = (date: string) => {
    const records = activitiesByDate.get(date) ?? []
    const hasWorkout = records.some(
      (record) => record.type === 'workout',
    )
    setSelectedDate(date)
    setIsMakeupOpen(false)
    setMakeupCategory(hasWorkout ? 'sleep' : 'workout')
    setMakeupNote('')
  }

  const handleCycleChange = (cycleId: string) => {
    const nextCycle = state.cycles.find((cycle) => cycle.id === cycleId)
    setActiveCycleId(cycleId)
    if (nextCycle) {
      setVisibleMonth(nextCycle.startDate.slice(0, 7))
    }
    setSelectedDate(null)
    setIsMakeupOpen(false)
  }

  const handleMakeupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !selectedDate ||
      !canAddForSelectedDate ||
      (makeupCategory === 'workout' && selectedHasWorkout) ||
      (makeupCategory === 'sleep' && selectedHasSleep)
    ) {
      return
    }

    const selectedExercise = state.exerciseTypes.find(
      (exerciseType) =>
        exerciseType.id === exerciseTypeId && exerciseType.enabled,
    )
    const goal =
      makeupCategory === 'sleep'
        ? activeCycle.goals.find((candidate) => candidate.type === 'sleep')
        : activeCycle.goals.find(
            (candidate) =>
              candidate.exerciseTypeId === selectedExercise?.id,
          ) ??
          activeCycle.goals.find((candidate) =>
            selectedExercise?.category === 'strength'
              ? candidate.type === 'strength'
              : candidate.type === 'cardio',
          )

    if (!goal || (makeupCategory === 'workout' && !selectedExercise)) {
      return
    }

    recordActivityForDate({
      goalId: goal.id,
      date: selectedDate,
      time: makeupTime,
      note: makeupNote.trim() || undefined,
      metadata:
        makeupCategory === 'workout'
          ? { exerciseTypeId: selectedExercise?.id }
          : { sleepTime: makeupTime },
    })
    setIsMakeupOpen(false)
    setMakeupNote('')
  }

  const handleDeleteRecord = (activityId: string) => {
    deleteActivityRecord(activityId)

    if (snackbarTimer.current !== null) {
      window.clearTimeout(snackbarTimer.current)
    }

    setSnackbarMessage('已删除这条记录')
    snackbarTimer.current = window.setTimeout(() => {
      setSnackbarMessage(null)
      snackbarTimer.current = null
    }, SNACKBAR_DURATION)
  }

  return (
    <section className="cycle-page" aria-labelledby="cycle-page-title">
      <header className="cycle-page__header">
        <label>
          <span>当前周期</span>
          <select
            value={activeCycle.id}
            onChange={(event) => handleCycleChange(event.target.value)}
          >
            {state.cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.title}
              </option>
            ))}
          </select>
        </label>
        <h2 id="cycle-page-title">{activeCycle.title}</h2>
        <p>
          {formatShortDate(activeCycle.startDate)} –{' '}
          {formatShortDate(activeCycle.targetDate)}
          <strong>还有 {daysUntil} 天</strong>
        </p>
      </header>

      <section className="cycle-calendar" aria-labelledby="cycle-calendar-title">
        <div className="cycle-calendar__toolbar">
          <button
            type="button"
            aria-label="上个月"
            onClick={() => setVisibleMonth(shiftMonth(visibleMonth, -1))}
          >
            ‹
          </button>
          <h3 id="cycle-calendar-title">{monthLabel(visibleMonth)}</h3>
          <button
            type="button"
            aria-label="下个月"
            onClick={() => setVisibleMonth(shiftMonth(visibleMonth, 1))}
          >
            ›
          </button>
        </div>

        <div className="cycle-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="cycle-calendar__grid">
          {calendarCells.map((date, index) => {
            if (!date) {
              return <span key={`blank-${index}`} />
            }

            const records = activitiesByDate.get(date) ?? []
            const hasWorkout = records.some(
              (record) => record.type === 'workout',
            )
            const hasSleep = records.some(
              (record) => record.type === 'sleep',
            )
            const inCycle =
              date >= activeCycle.startDate && date <= activeCycle.targetDate

            return (
              <button
                className={[
                  'cycle-calendar__day',
                  hasWorkout ? 'cycle-calendar__day--workout' : '',
                  hasSleep ? 'cycle-calendar__day--sleep' : '',
                  selectedDate === date
                    ? 'cycle-calendar__day--selected'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={date}
                type="button"
                disabled={!inCycle}
                aria-label={`${formatDetailDate(date)}${
                  hasWorkout ? '，有运动记录' : ''
                }${hasSleep ? '，有早睡记录' : ''}`}
                onClick={() => openDate(date)}
              >
                {Number(date.slice(-2))}
              </button>
            )
          })}
        </div>
        <div className="cycle-calendar__legend">
          <span><i className="cycle-calendar__legend-workout" />运动</span>
          <span><i className="cycle-calendar__legend-sleep" />早睡</span>
        </div>
      </section>

      <section className="cycle-progress" aria-labelledby="cycle-progress-title">
        <h3 id="cycle-progress-title">周期进度</h3>
        <ul>
          {progressItems.map((item) => {
            const percentage =
              item.target > 0
                ? Math.min(100, (item.completed / item.target) * 100)
                : 0

            return (
              <li key={item.id}>
                <div>
                  <span>{item.label}</span>
                  <strong>
                    {item.completed} / {item.target}
                  </strong>
                </div>
                <span className="cycle-progress__track" aria-hidden="true">
                  <span style={{ width: `${percentage}%` }} />
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {selectedDate ? (
        <div
          className="cycle-detail-backdrop"
          role="presentation"
          onClick={() => setSelectedDate(null)}
        >
          <section
            className="cycle-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cycle-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cycle-detail__heading">
              <h3 id="cycle-detail-title">{formatDetailDate(selectedDate)}</h3>
              <button
                type="button"
                aria-label="关闭日期详情"
                onClick={() => setSelectedDate(null)}
              >
                ×
              </button>
            </div>

            {selectedRecords.length > 0 ? (
              <ul className="cycle-detail__records">
                {selectedRecords.map((record) => (
                  <li key={record.id}>
                    <span
                      className={`cycle-detail__record-icon cycle-detail__record-icon--${
                        record.type === 'sleep' ? 'sleep' : 'workout'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>
                        {record.type === 'sleep'
                          ? '早点休息'
                          : getWorkoutName(record, exerciseTypesById)}
                      </strong>
                      <time dateTime={record.recordedAt}>
                        {formatTime(record.recordedAt)}
                        {record.source === 'makeup' ? ' 添加' : ' 完成'}
                      </time>
                      {record.metadata?.note ? (
                        <p>备注：{record.metadata.note}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(record.id)}
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cycle-detail__empty">这一天还没有留下记录。</p>
            )}

            {(canAddWorkout || canAddSleep) && !isMakeupOpen ? (
              <div className="cycle-detail__add-actions">
                {canAddWorkout ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMakeupCategory('workout')
                      setIsMakeupOpen(true)
                    }}
                  >
                    添加运动记录
                  </button>
                ) : null}
                {canAddSleep ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMakeupCategory('sleep')
                      setIsMakeupOpen(true)
                    }}
                  >
                    添加早睡记录
                  </button>
                ) : null}
              </div>
            ) : null}

            {isMakeupOpen ? (
              <form className="cycle-makeup" onSubmit={handleMakeupSubmit}>
                <h4>
                  {makeupCategory === 'workout'
                    ? '添加运动记录'
                    : '添加早睡记录'}
                </h4>

                {makeupCategory === 'workout' ? (
                  <label>
                    <span>今天做了什么</span>
                    <select
                      value={exerciseTypeId}
                      onChange={(event) =>
                        setExerciseTypeId(event.target.value)
                      }
                    >
                      {enabledExerciseTypes.map((exerciseType) => (
                        <option key={exerciseType.id} value={exerciseType.id}>
                          {exerciseType.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label>
                  <span>时间</span>
                  <input
                    type="time"
                    value={makeupTime}
                    required
                    onChange={(event) => setMakeupTime(event.target.value)}
                  />
                </label>
                <label>
                  <span>备注（可选）</span>
                  <input
                    value={makeupNote}
                    placeholder="例如：卧推 25kg"
                    onChange={(event) => setMakeupNote(event.target.value)}
                  />
                </label>
                <div className="cycle-makeup__actions">
                  <button type="button" onClick={() => setIsMakeupOpen(false)}>
                    取消
                  </button>
                  <button type="submit">留下记录</button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}

      {snackbarMessage ? (
        <div className="cycle-snackbar" role="status" aria-live="polite">
          {snackbarMessage}
        </div>
      ) : null}
    </section>
  )
}
