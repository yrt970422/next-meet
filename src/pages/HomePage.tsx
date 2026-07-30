import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../app/providers/useAppState'
import type { PigPose } from '../assets/pig'
import { DailyActionCard } from '../components/DailyActionCard'
import { Pig } from '../components/Pig'
import { resolveCurrentCycle } from '../services/currentCycle'
import type { ActionCategory, ActivityRecord } from '../types/models'
import './HomePage.css'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const PIG_FEEDBACK_DURATION = 3000
const actionDisplayHistory = new Map<string, number>()
let actionDisplaySequence = 0

type HeroPigFeedback =
  | null
  | {
      pose: PigPose
    }

const FEEDBACK_POSES: Record<ActionCategory, PigPose> = {
  health: 'workout-complete',
  bodyCare: 'body-care-complete',
  rest: 'sleep-complete',
  learning: 'learning-complete',
  work: 'work-complete',
  custom: 'encourage-complete',
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDaysUntil(dateString?: string) {
  if (!dateString) {
    return null
  }

  const target = parseLocalDate(dateString)
  if (!target) {
    return null
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return Math.ceil((target.getTime() - today.getTime()) / DAY_IN_MS)
}

function formatTargetDate(dateString?: string) {
  if (!dateString) {
    return '还没有设置日期'
  }

  const target = parseLocalDate(dateString)
  if (!target) {
    return dateString
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(target)
}

export default function HomePage() {
  const {
    state,
    addCycleTodo,
    toggleCycleTodo,
    deleteCycleTodo,
    recordDailyActivity,
  } = useAppState()
  const navigate = useNavigate()
  const today = formatLocalDate(new Date())
  const [pigFeedback, setPigFeedback] = useState<HeroPigFeedback>(null)
  const [actionPageStart, setActionPageStart] = useState(0)
  const [todoDraft, setTodoDraft] = useState('')
  const pigFeedbackTimer = useRef<number | null>(null)
  const activeCycle = resolveCurrentCycle(
    state.cycles,
    state.activeCycleId,
    today,
  )
  const activeCycleId = activeCycle?.id
  const daysUntil = getDaysUntil(activeCycle?.targetDate)
  const cycleTodos = state.todos.filter(
    (todo) => todo.cycleId === activeCycle?.id,
  )
  const incompleteTodos = cycleTodos
    .filter((todo) => !todo.completed)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const completedTodos = cycleTodos
    .filter((todo) => todo.completed)
    .sort((left, right) =>
      (right.completedAt ?? '').localeCompare(left.completedAt ?? ''),
    )
  const todos = [...incompleteTodos, ...completedTodos]
  const pigLevel = state.pig?.level ?? 1
  const { availableActions, todayActivityByAction } = (() => {
    const cycleActivities = activeCycleId
      ? state.activities.filter(
          (activity) => activity.cycleId === activeCycleId,
        )
      : []
    const completedCounts = new Map<string, number>()
    const todayRecords = new Map<string, ActivityRecord>()

    cycleActivities.forEach((activity) => {
      completedCounts.set(
        activity.actionId,
        (completedCounts.get(activity.actionId) ?? 0) + 1,
      )

      if (activity.date !== today) {
        return
      }

      const existing = todayRecords.get(activity.actionId)
      if (!existing || activity.recordedAt > existing.recordedAt) {
        todayRecords.set(activity.actionId, activity)
      }
    })

    const activeActions = state.actions.filter(
      (action) =>
        action.cycleId === activeCycleId &&
        !action.deletedAt,
    )
    const incompleteActions = activeActions
      .filter(
        (action) =>
          !todayRecords.has(action.id) &&
          (completedCounts.get(action.id) ?? 0) < action.targetCount,
      )
      .sort((left, right) => {
        const leftRemaining =
          left.targetCount - (completedCounts.get(left.id) ?? 0)
        const rightRemaining =
          right.targetCount - (completedCounts.get(right.id) ?? 0)
        const leftLastDisplayed =
          actionDisplayHistory.get(left.id) ??
          Number.NEGATIVE_INFINITY
        const rightLastDisplayed =
          actionDisplayHistory.get(right.id) ??
          Number.NEGATIVE_INFINITY

        return (
          rightRemaining - leftRemaining ||
          leftLastDisplayed - rightLastDisplayed ||
          left.createdAt.localeCompare(right.createdAt)
        )
      })
    const completedTodayActions = activeActions
      .filter((action) => todayRecords.has(action.id))
      .sort((left, right) => {
        const leftRecord = todayRecords.get(left.id)
        const rightRecord = todayRecords.get(right.id)

        return (
          (rightRecord?.recordedAt ?? '').localeCompare(
            leftRecord?.recordedAt ?? '',
          ) ||
          left.createdAt.localeCompare(right.createdAt)
        )
      })

    return {
      availableActions: [...incompleteActions, ...completedTodayActions],
      todayActivityByAction: todayRecords,
    }
  })()
  const normalizedActionStart =
    availableActions.length > 0
      ? actionPageStart % availableActions.length
      : 0
  const visibleActions =
    availableActions.length <= 2
      ? availableActions
      : [
          availableActions[normalizedActionStart],
          availableActions[
            (normalizedActionStart + 1) % availableActions.length
          ],
        ]
  const visibleActionIds = visibleActions.map((action) => action.id).join('|')
  const canRecordToday =
    Boolean(activeCycle) &&
    today >= (activeCycle?.startDate ?? '') &&
    today <= (activeCycle?.targetDate ?? '')

  const countdownAriaLabel =
    daysUntil === null
      ? '下一场日期尚未设置'
      : daysUntil === 0
        ? '下一场就是今天'
        : daysUntil < 0
          ? '下一场日期已经到达'
          : `距离下一场还有 ${daysUntil} 天`

  const countdownContent =
    daysUntil === null ? (
      <>
        <strong>—</strong>
        <span>天</span>
      </>
    ) : daysUntil === 0 ? (
      <strong className="home-hero__countdown-message">就是今天</strong>
    ) : daysUntil < 0 ? (
      <strong className="home-hero__countdown-message">已经到啦</strong>
    ) : (
      <>
        <strong>{daysUntil}</strong>
        <span>天</span>
      </>
    )

  useEffect(() => {
    return () => {
      if (pigFeedbackTimer.current !== null) {
        window.clearTimeout(pigFeedbackTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!visibleActionIds) {
      return
    }

    visibleActionIds.split('|').forEach((actionId) => {
      actionDisplaySequence += 1
      actionDisplayHistory.set(actionId, actionDisplaySequence)
    })
  }, [visibleActionIds])

  const showPigFeedback = (
    pose: PigPose,
  ) => {
    if (pigFeedbackTimer.current !== null) {
      window.clearTimeout(pigFeedbackTimer.current)
    }

    setPigFeedback({ pose })
    pigFeedbackTimer.current = window.setTimeout(() => {
      setPigFeedback(null)
      pigFeedbackTimer.current = null
    }, PIG_FEEDBACK_DURATION)
  }

  return (
    <section className="home-page" aria-label="首页">
      <section className="home-hero" aria-labelledby="home-cycle-title">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">下一场还有</p>
          <div className="home-hero__countdown" aria-label={countdownAriaLabel}>
            {countdownContent}
          </div>
          <h2 className="home-hero__title" id="home-cycle-title">
            {activeCycle?.title ?? '定下下一场见面的日子'}
          </h2>
          {activeCycle?.targetDate ? (
            <time className="home-hero__date" dateTime={activeCycle.targetDate}>
              {formatTargetDate(activeCycle.targetDate)}
            </time>
          ) : (
            <p className="home-hero__date">{formatTargetDate()}</p>
          )}
        </div>

        <div className="home-hero__companion">
          <div className="home-hero__pig-anchor">
            <Pig
              key={
                pigFeedback
                  ? pigFeedback.pose
                  : 'idle'
              }
              className={`home-hero__pig ${
                pigFeedback ? 'home-hero__pig--reacting' : ''
              }`}
              level={pigLevel}
              pose={pigFeedback?.pose ?? 'idle'}
              size="hero"
              name={state.pig?.name ?? '小猪'}
              loading="eager"
            />
            <div className="home-hero__pig-meta" aria-label={`${state.pig.name}，等级 ${pigLevel}`}>
              <strong>{state.pig.name}</strong>
              <i aria-hidden="true">·</i>
              <span>Lv.{pigLevel}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-daily-actions" aria-labelledby="daily-actions-title">
        <div className="home-daily-actions__heading">
          <h2 id="daily-actions-title">今日行动</h2>
          <time dateTime={today}>{formatTargetDate(today)}</time>
        </div>

        <div className="home-daily-actions__browser">
          <button
            className="home-daily-actions__arrow"
            type="button"
            aria-label="查看前面的行动"
            disabled={availableActions.length <= 2}
            onClick={() =>
              setActionPageStart((current) =>
                current <= 0
                  ? Math.max(0, availableActions.length - 1)
                  : current - 1,
              )
            }
          >
            ‹
          </button>
          <div className="home-daily-actions__grid">
            {visibleActions.map((action) => (
              <DailyActionCard
                key={action.id}
                action={action}
                record={todayActivityByAction.get(action.id) ?? null}
                onFold={() => {
                  recordDailyActivity({ actionId: action.id })
                  showPigFeedback(FEEDBACK_POSES[action.category])
                }}
                disabled={!canRecordToday}
              />
            ))}
            {Array.from({ length: Math.max(0, 2 - visibleActions.length) }).map(
              (_, index) => (
                <button
                  className="home-action-placeholder"
                  type="button"
                  key={`placeholder-${index}`}
                  onClick={() => navigate('/settings')}
                >
                  <span aria-hidden="true">?</span>
                  <strong>添加行动</strong>
                </button>
              ),
            )}
          </div>
          <button
            className="home-daily-actions__arrow"
            type="button"
            aria-label="查看更多行动"
            disabled={availableActions.length <= 2}
            onClick={() =>
              setActionPageStart((current) =>
                availableActions.length > 0
                  ? (current + 1) % availableActions.length
                  : 0,
              )
            }
          >
            ›
          </button>
        </div>
      </section>

      <section className="home-todos" aria-labelledby="home-todos-title">
        <h2 id="home-todos-title">待办</h2>
        {todos.length > 0 ? (
          <ul>
            {todos.map((todo, index) => (
              <li
                className={[
                  todo.completed ? 'home-todos__item--completed' : '',
                  todo.completed &&
                  incompleteTodos.length > 0 &&
                  index === incompleteTodos.length
                    ? 'home-todos__item--completed-first'
                    : '',
                ].filter(Boolean).join(' ')}
                key={todo.id}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleCycleTodo(todo.id)}
                  />
                  <span>{todo.text}</span>
                </label>
                <button
                  type="button"
                  aria-label={`删除${todo.text}`}
                  onClick={() => deleteCycleTodo(todo.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-todos__empty">记下一件这一场想完成的小事。</p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const text = todoDraft.trim()
            if (!text) {
              return
            }

            if (!activeCycle) {
              return
            }

            addCycleTodo(activeCycle.id, text)
            setTodoDraft('')
          }}
        >
          <input
            value={todoDraft}
            aria-label="新的待办"
            placeholder="例如：准备运动服"
            disabled={!activeCycle}
            onChange={(event) => setTodoDraft(event.target.value)}
          />
          <button type="submit">添加</button>
        </form>
      </section>
    </section>
  )
}
