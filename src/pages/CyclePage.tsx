import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAppState } from '../app/providers/useAppState'
import { resolveActionCategoryLogo } from '../assets/cards'
import { getActionDate } from '../services/actionDay'
import { resolveCurrentCycle } from '../services/currentCycle'
import type { ActivityRecord } from '../types/models'
import './CyclePage.css'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const SNACKBAR_DURATION = 2500
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

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

function formatCompletedTodoDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('zh-CN', {
        month: 'numeric',
        day: 'numeric',
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

function getCycleCalendarMonth(
  startDate: string,
  targetDate: string,
  today: string,
) {
  if (today < startDate) return startDate.slice(0, 7)
  if (today > targetDate) return targetDate.slice(0, 7)
  return today.slice(0, 7)
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

export default function CyclePage() {
  const {
    state,
    recordActivityForDate,
    deleteActivityRecord,
  } = useAppState()
  const today = getActionDate()
  const currentCycle = resolveCurrentCycle(
    state.cycles,
    state.activeCycleId,
    today,
  )
  const [viewedCycleId, setViewedCycleId] = useState(
    () => currentCycle?.id ?? '',
  )
  const viewedCycle =
    state.cycles.find((cycle) => cycle.id === viewedCycleId) ??
    currentCycle
  const cycleActions = state.actions.filter(
    (action) => action.cycleId === viewedCycle?.id && !action.deletedAt,
  )
  const [visibleMonth, setVisibleMonth] = useState(
    () => viewedCycle
      ? getCycleCalendarMonth(
          viewedCycle.startDate,
          viewedCycle.targetDate,
          today,
        )
      : today.slice(0, 7),
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isMakeupOpen, setIsMakeupOpen] = useState(false)
  const [makeupActionId, setMakeupActionId] = useState(
    () => cycleActions[0]?.id ?? '',
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

  if (!viewedCycle) {
    return (
      <section className="cycle-page cycle-page--empty">
        <p>还没有周期</p>
        <h2>先在设置里定下下一场见面的日期。</h2>
      </section>
    )
  }

  const cycleActivities = state.activities.filter(
    (activity) => activity.cycleId === viewedCycle.id,
  )
  const actionsById = new Map(
    state.actions.map((action) => [action.id, action]),
  )
  const completedCounts = new Map<string, number>()
  cycleActivities.forEach((activity) => {
    completedCounts.set(
      activity.actionId,
      (completedCounts.get(activity.actionId) ?? 0) + 1,
    )
  })
  const activitiesByDate = new Map<string, ActivityRecord[]>()
  cycleActivities.forEach((activity) => {
    const records = activitiesByDate.get(activity.date) ?? []
    activitiesByDate.set(activity.date, [...records, activity])
  })
  const selectedRecords = selectedDate
    ? (activitiesByDate.get(selectedDate) ?? [])
    : []
  const recordedActionIds = new Set(
    selectedRecords.map((record) => record.actionId),
  )
  const availableMakeupActions = cycleActions.filter(
    (action) => !recordedActionIds.has(action.id),
  )
  const canAddForSelectedDate =
    Boolean(selectedDate) &&
    selectedDate! < today &&
    selectedDate! >= viewedCycle.startDate &&
    selectedDate! <= viewedCycle.targetDate &&
    availableMakeupActions.length > 0
  const completedTodos = state.todos
    .filter((todo) => todo.cycleId === viewedCycle.id && todo.completed)
    .sort((left, right) =>
      (right.completedAt ?? '').localeCompare(left.completedAt ?? ''),
    )
  const daysUntil = Math.max(
    0,
    Math.ceil(
      (parseLocalDate(viewedCycle.targetDate).getTime() -
        parseLocalDate(today).getTime()) /
        DAY_IN_MS,
    ),
  )
  const cycleStatusText =
    viewedCycle.targetDate < today
      ? '这一场已经结束啦'
      : viewedCycle.targetDate === today
        ? '就是今天'
        : `还有 ${daysUntil} 天`

  const openDate = (date: string) => {
    const dateRecords = activitiesByDate.get(date) ?? []
    const dateActionIds = new Set(
      dateRecords.map((record) => record.actionId),
    )
    const firstAvailable = cycleActions.find(
      (action) => !dateActionIds.has(action.id),
    )
    setSelectedDate(date)
    setMakeupActionId(firstAvailable?.id ?? '')
    setIsMakeupOpen(false)
    setMakeupNote('')
  }

  const handleCycleChange = (cycleId: string) => {
    const nextCycle = state.cycles.find((cycle) => cycle.id === cycleId)
    setViewedCycleId(cycleId)
    if (nextCycle) {
      setVisibleMonth(
        getCycleCalendarMonth(
          nextCycle.startDate,
          nextCycle.targetDate,
          today,
        ),
      )
    }
    setSelectedDate(null)
    setIsMakeupOpen(false)
  }

  const handleMakeupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const selectedAction = availableMakeupActions.find(
      (action) => action.id === makeupActionId,
    )
    if (!selectedDate || !canAddForSelectedDate || !selectedAction) {
      return
    }

    recordActivityForDate({
      actionId: selectedAction.id,
      date: selectedDate,
      time: makeupTime,
      note: makeupNote.trim() || undefined,
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
          <span>查看周期</span>
          <select
            value={viewedCycle.id}
            onChange={(event) => handleCycleChange(event.target.value)}
          >
            {state.cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>{cycle.title}</option>
            ))}
          </select>
        </label>
        <h2 id="cycle-page-title">{viewedCycle.title}</h2>
        <p>
          {formatShortDate(viewedCycle.startDate)} –{' '}
          {formatShortDate(viewedCycle.targetDate)}
          <strong>{cycleStatusText}</strong>
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
          {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="cycle-calendar__grid">
          {getMonthCells(visibleMonth).map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />
            const hasRecords = (activitiesByDate.get(date)?.length ?? 0) > 0
            const inCycle =
              date >= viewedCycle.startDate && date <= viewedCycle.targetDate
            return (
              <button
                className={[
                  'cycle-calendar__day',
                  hasRecords ? 'cycle-calendar__day--recorded' : '',
                  selectedDate === date
                    ? 'cycle-calendar__day--selected'
                    : '',
                ].filter(Boolean).join(' ')}
                key={date}
                type="button"
                disabled={!inCycle}
                aria-label={`${formatDetailDate(date)}${
                  hasRecords ? '，有行动记录' : ''
                }`}
                onClick={() => openDate(date)}
              >
                {Number(date.slice(-2))}
              </button>
            )
          })}
        </div>
        <div className="cycle-calendar__legend">
          <span><i className="cycle-calendar__legend-recorded" />有努力生活哦</span>
        </div>
      </section>

      <section className="cycle-progress" aria-labelledby="cycle-progress-title">
        <h3 id="cycle-progress-title">周期进度</h3>
        {cycleActions.length > 0 ? (
          <ul>
            {cycleActions.map((action) => {
              const completed = completedCounts.get(action.id) ?? 0
              const logo = resolveActionCategoryLogo(action.category, 'small')
              const percentage = Math.min(
                100,
                (completed / action.targetCount) * 100,
              )
              return (
                <li key={action.id}>
                  <div>
                    <span className="cycle-progress__label">
                      <img src={logo.src} alt="" aria-hidden="true" />
                      <span>{action.name}</span>
                    </span>
                    <strong>{completed} / {action.targetCount}</strong>
                  </div>
                  <span className="cycle-progress__track" aria-hidden="true">
                    <span style={{ width: `${percentage}%` }} />
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="cycle-progress__empty">还没有设置行动。</p>
        )}
      </section>

      <section className="cycle-todos" aria-labelledby="cycle-todos-title">
        <div className="cycle-todos__heading">
          <h3 id="cycle-todos-title">完成的事情</h3>
          <span>{completedTodos.length} 件</span>
        </div>
        {completedTodos.length > 0 ? (
          <ul>
            {completedTodos.map((todo) => (
              <li key={todo.id}>
                <span aria-hidden="true">✓</span>
                <strong>{todo.text}</strong>
                <time dateTime={todo.completedAt}>
                  {formatCompletedTodoDate(todo.completedAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p>这一场完成的待办会留在这里。</p>
        )}
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
                {selectedRecords.map((record) => {
                  const action = actionsById.get(record.actionId)
                  const categoryLogo = action
                    ? resolveActionCategoryLogo(action.category, 'small')
                    : null
                  return (
                    <li key={record.id}>
                      <span className="cycle-detail__record-symbol" aria-hidden="true">
                        {categoryLogo ? (
                          <img src={categoryLogo.src} alt="" />
                        ) : null}
                      </span>
                      <div>
                        <strong>
                          {record.metadata?.actionName ??
                            action?.name ??
                            '行动记录'}
                        </strong>
                        <time dateTime={record.recordedAt}>
                          {formatTime(record.recordedAt)}
                          {record.source === 'makeup' ? ' 添加' : ' 完成'}
                        </time>
                        {record.metadata?.actionNote || action?.note ? (
                          <p>{record.metadata?.actionNote ?? action?.note}</p>
                        ) : null}
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
                  )
                })}
              </ul>
            ) : (
              <p className="cycle-detail__empty">这一天还没有留下记录。</p>
            )}

            {canAddForSelectedDate && !isMakeupOpen ? (
              <div className="cycle-detail__add-actions">
                <button
                  type="button"
                  onClick={() => {
                    setMakeupActionId(availableMakeupActions[0]?.id ?? '')
                    setIsMakeupOpen(true)
                  }}
                >
                  添加行动记录
                </button>
              </div>
            ) : null}

            {isMakeupOpen ? (
              <form className="cycle-makeup" onSubmit={handleMakeupSubmit}>
                <h4>添加行动记录</h4>
                <label>
                  <span>完成了什么</span>
                  <select
                    value={makeupActionId}
                    onChange={(event) => setMakeupActionId(event.target.value)}
                  >
                    {availableMakeupActions.map((action) => (
                      <option key={action.id} value={action.id}>
                        {action.name}
                      </option>
                    ))}
                  </select>
                </label>
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
