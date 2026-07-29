import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../app/providers/useAppState'
import { DailyActionCard } from '../components/DailyActionCard'
import { Pig } from '../components/Pig'
import { recommendExerciseType } from '../services/workoutRecommendation'
import './HomePage.css'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const PIG_FEEDBACK_DURATION = 3000
const HOME_TODOS_STORAGE_KEY = 'next-meet:home-todos:v1'

interface HomeTodo {
  id: string
  text: string
  completed: boolean
}

type HeroPigFeedback =
  | null
  | {
      pose: 'workout-complete' | 'sleep-complete'
      startedAt: number
    }

function loadHomeTodos(date: string): HomeTodo[] {
  try {
    const stored = window.localStorage.getItem(
      `${HOME_TODOS_STORAGE_KEY}:${date}`,
    )
    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is HomeTodo =>
            typeof item?.id === 'string' &&
            typeof item?.text === 'string' &&
            typeof item?.completed === 'boolean',
        )
      : []
  } catch {
    return []
  }
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
  const { state, recordDailyActivity } = useAppState()
  const today = formatLocalDate(new Date())
  const [exerciseSelectionId, setExerciseSelectionId] = useState<string | null>(
    null,
  )
  const [pigFeedback, setPigFeedback] = useState<HeroPigFeedback>(null)
  const [todos, setTodos] = useState<HomeTodo[]>(() => loadHomeTodos(today))
  const [todoDraft, setTodoDraft] = useState('')
  const pigFeedbackTimer = useRef<number | null>(null)
  const activeCycle =
    state.cycles.find((cycle) => cycle.id === state.activeCycleId) ?? state.cycles[0]
  const daysUntil = getDaysUntil(activeCycle?.targetDate)
  const pigLevel = state.pig?.level ?? 1
  const cycleActivities = activeCycle
    ? state.activities.filter((activity) => activity.cycleId === activeCycle.id)
    : []
  const todayActivities = cycleActivities.filter((activity) => activity.date === today)
  const workoutRecord =
    todayActivities.find((activity) => activity.type === 'workout') ?? null
  const sleepRecord = todayActivities.find((activity) => activity.type === 'sleep') ?? null
  const strengthGoal = activeCycle?.goals.find((goal) => goal.type === 'strength')
  const cardioGoal = activeCycle?.goals.find((goal) => goal.type === 'cardio')
  const sleepGoal = activeCycle?.goals.find((goal) => goal.type === 'sleep')

  const enabledExerciseTypes = state.exerciseTypes.filter(
    (exerciseType) => exerciseType.enabled,
  )
  const recommendedExerciseType = recommendExerciseType({
    cycle: activeCycle,
    exerciseTypes: state.exerciseTypes,
    activities: state.activities,
    currentDate: today,
  })
  const selectedExercise =
    enabledExerciseTypes.find(
      (exerciseType) => exerciseType.id === exerciseSelectionId,
    ) ??
    recommendedExerciseType ??
    enabledExerciseTypes[0]
  const selectedWorkoutGoal =
    activeCycle?.goals.find(
      (goal) => goal.exerciseTypeId === selectedExercise?.id,
    ) ??
    (selectedExercise?.category === 'strength'
      ? strengthGoal
      : (cardioGoal ?? strengthGoal))
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
    window.localStorage.setItem(
      `${HOME_TODOS_STORAGE_KEY}:${today}`,
      JSON.stringify(todos),
    )
  }, [today, todos])

  const showPigFeedback = (
    pose: Exclude<HeroPigFeedback, null>['pose'],
  ) => {
    if (pigFeedbackTimer.current !== null) {
      window.clearTimeout(pigFeedbackTimer.current)
    }

    setPigFeedback({ pose, startedAt: Date.now() })
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
          <Pig
            key={
              pigFeedback
                ? `${pigFeedback.pose}-${pigFeedback.startedAt}`
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
        </div>
      </section>

      <section className="home-daily-actions" aria-labelledby="daily-actions-title">
        <div className="home-daily-actions__heading">
          <h2 id="daily-actions-title">今日行动</h2>
          <time dateTime={today}>{formatTargetDate(today)}</time>
        </div>

        <div className="home-daily-actions__grid">
          {selectedExercise ? (
            <DailyActionCard
              category="workout"
              record={workoutRecord}
              selectedExercise={selectedExercise}
              exerciseTypes={state.exerciseTypes}
              onCycleType={() => {
                const currentIndex = enabledExerciseTypes.findIndex(
                  (exerciseType) => exerciseType.id === selectedExercise.id,
                )
                const nextExercise =
                  enabledExerciseTypes[
                    (currentIndex + 1) % enabledExerciseTypes.length
                  ]
                setExerciseSelectionId(nextExercise?.id ?? null)
              }}
              onFold={() => {
                if (selectedWorkoutGoal) {
                  recordDailyActivity({
                    goalId: selectedWorkoutGoal.id,
                    metadata: {
                      exerciseTypeId: selectedExercise.id,
                      durationMinutes:
                        selectedExercise.category === 'strength' ? 60 : 30,
                    },
                  })
                }
              }}
              onFoldSuccess={() => {
                showPigFeedback('workout-complete')
              }}
              disabled={!selectedWorkoutGoal || !canRecordToday}
            />
          ) : null}
          <DailyActionCard
            category="sleep"
            record={sleepRecord}
            targetTime={state.settings.sleepTargetTime}
            onFold={() => {
              if (sleepGoal) {
                recordDailyActivity({ goalId: sleepGoal.id })
              }
            }}
            onFoldSuccess={() => {
              showPigFeedback('sleep-complete')
            }}
            disabled={!sleepGoal || !canRecordToday}
          />
        </div>
      </section>

      <section className="home-todos" aria-labelledby="home-todos-title">
        <h2 id="home-todos-title">待办</h2>
        {todos.length > 0 ? (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() =>
                      setTodos((current) =>
                        current.map((item) =>
                          item.id === todo.id
                            ? { ...item, completed: !item.completed }
                            : item,
                        ),
                      )
                    }
                  />
                  <span>{todo.text}</span>
                </label>
                <button
                  type="button"
                  aria-label={`删除${todo.text}`}
                  onClick={() =>
                    setTodos((current) =>
                      current.filter((item) => item.id !== todo.id),
                    )
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-todos__empty">记下一件今天想准备的小事。</p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const text = todoDraft.trim()
            if (!text) {
              return
            }

            setTodos((current) => [
              ...current,
              {
                id:
                  typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `todo-${Date.now()}`,
                text,
                completed: false,
              },
            ])
            setTodoDraft('')
          }}
        >
          <input
            value={todoDraft}
            aria-label="新的小事"
            placeholder="例如：准备运动服"
            onChange={(event) => setTodoDraft(event.target.value)}
          />
          <button type="submit">添加</button>
        </form>
      </section>
    </section>
  )
}
