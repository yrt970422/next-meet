import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { resolveDailyActionLogo } from '../../assets/cards'
import { Pig } from '../Pig'
import type { ActivityRecord, ExerciseType } from '../../types/models'
import './DailyActionCard.css'

const FOLD_THRESHOLD = 80
const MAX_DRAG_DISTANCE = 150
const FOLD_COMMIT_DURATION = 340

interface DailyActionCardBaseProps {
  record: ActivityRecord | null
  onFold: () => void
  onFoldSuccess?: () => void
  disabled?: boolean
}

interface WorkoutCardProps extends DailyActionCardBaseProps {
  category: 'workout'
  selectedExercise: ExerciseType
  exerciseTypes: ExerciseType[]
  onCycleType: () => void
}

interface SleepCardProps extends DailyActionCardBaseProps {
  category: 'sleep'
  targetTime: string
}

export type DailyActionCardProps = WorkoutCardProps | SleepCardProps

function formatRecordedTime(recordedAt: string) {
  const date = new Date(recordedAt)
  if (Number.isNaN(date.getTime())) {
    return recordedAt
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function DailyActionCard(props: DailyActionCardProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isAwaitingRecord, setIsAwaitingRecord] = useState(false)
  const dragOrigin = useRef<{ x: number; y: number } | null>(null)
  const dragOffsetRef = useRef(dragOffset)
  const foldTimer = useRef<number | null>(null)
  const currentRecord = props.record
  const handleFoldSuccess = props.onFoldSuccess
  const isFolded = currentRecord !== null
  const recordedExercise =
    props.category === 'workout'
      ? props.exerciseTypes.find(
          (exerciseType) =>
            exerciseType.id === props.record?.metadata?.exerciseTypeId,
        )
      : null
  const activeExercise =
    props.category === 'workout'
      ? (recordedExercise ?? props.selectedExercise)
      : null
  const presentation =
    props.category === 'workout'
      ? {
          label: activeExercise?.name ?? '运动',
          target:
            activeExercise?.category === 'strength'
              ? '60 分钟'
              : '30 分钟',
        }
      : {
          label: '早点休息',
          target: '',
        }
  const logo = resolveDailyActionLogo(props.category)
  const progress = Math.min(
    1,
    Math.hypot(dragOffset.x, dragOffset.y) / FOLD_THRESHOLD,
  )

  useEffect(() => {
    return () => {
      if (foldTimer.current !== null) {
        window.clearTimeout(foldTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAwaitingRecord || !currentRecord) {
      return
    }

    const confirmationTimer = window.setTimeout(() => {
      setIsAwaitingRecord(false)
      handleFoldSuccess?.()
    }, 0)

    return () => {
      window.clearTimeout(confirmationTimer)
    }
  }, [currentRecord, handleFoldSuccess, isAwaitingRecord])

  const updateDragOffset = (offset: { x: number; y: number }) => {
    dragOffsetRef.current = offset
    setDragOffset(offset)
  }

  const resetDrag = () => {
    dragOrigin.current = null
    setIsDragging(false)
    updateDragOffset({ x: 0, y: 0 })
  }

  const commitFold = () => {
    if (isFolded || props.disabled || isCommitting || isAwaitingRecord) {
      resetDrag()
      return
    }

    const currentOffset = dragOffsetRef.current
    setIsDragging(false)
    setIsCommitting(true)
    updateDragOffset({
      x: Math.max(currentOffset.x, 42),
      y: Math.max(currentOffset.y, 54),
    })

    foldTimer.current = window.setTimeout(() => {
      setIsCommitting(false)
      setIsAwaitingRecord(true)
      updateDragOffset({ x: 0, y: 0 })
      props.onFold()
      foldTimer.current = null
    }, FOLD_COMMIT_DURATION)
  }

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (
      isFolded ||
      props.disabled ||
      isCommitting ||
      isAwaitingRecord ||
      event.button !== 0
    ) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragOrigin.current = { x: event.clientX, y: event.clientY }
    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragOrigin.current || !isDragging) {
      return
    }

    const x = Math.min(
      MAX_DRAG_DISTANCE,
      Math.max(0, event.clientX - dragOrigin.current.x),
    )
    const y = Math.min(
      MAX_DRAG_DISTANCE,
      Math.max(0, event.clientY - dragOrigin.current.y),
    )
    updateDragOffset({ x, y })
  }

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!dragOrigin.current) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const distance = Math.hypot(dragOffsetRef.current.x, dragOffsetRef.current.y)
    dragOrigin.current = null

    if (distance >= FOLD_THRESHOLD) {
      commitFold()
    } else {
      resetDrag()
    }
  }

  const handlePointerCancel = () => {
    if (!isCommitting) {
      resetDrag()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isFolded || props.disabled || isCommitting || isAwaitingRecord) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      commitFold()
    }
  }

  const cardTransform = isFolded
    ? 'translate(2px, -1px) rotate(-0.8deg) scale(0.992)'
    : isCommitting
      ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(7deg) scale(0.86)`
      : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${progress * 5}deg) scale(${
          1 - progress * 0.025
        })`
  const cardOpacity = isCommitting ? 0.28 : 1 - progress * 0.12

  return (
    <article
      className={`daily-action-card daily-action-card--${props.category} ${
        isFolded ? 'daily-action-card--folded' : 'daily-action-card--available'
      } ${isDragging ? 'daily-action-card--dragging' : ''} ${
        isCommitting ? 'daily-action-card--committing' : ''
      }`}
      role={isFolded ? undefined : 'group'}
      tabIndex={isFolded || props.disabled || isAwaitingRecord ? undefined : 0}
      aria-disabled={props.disabled || isAwaitingRecord || undefined}
      aria-live="polite"
      aria-label={
        isFolded
          ? `${presentation.label}已完成`
          : `向下或向右拖动，折下${presentation.label}卡`
      }
      style={{ transform: cardTransform, opacity: cardOpacity }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      {isFolded && props.record ? (
        <div className="daily-action-card__face daily-action-card__face--folded">
          <div className="daily-action-card__visual">
            <Pig
              className="daily-action-card__feedback-pig"
              level={1}
              pose={
                props.category === 'workout'
                  ? 'workout-complete'
                  : 'sleep-complete'
              }
              decorative
            />
          </div>
          <div className="daily-action-card__details">
            <h3>{presentation.label}</h3>
            <time dateTime={props.record.recordedAt}>
              {formatRecordedTime(props.record.recordedAt)}
            </time>
          </div>
        </div>
      ) : (
        <div className="daily-action-card__face">
          {props.category === 'workout' ? (
            <button
              className="daily-action-card__cycle"
              type="button"
              aria-label={`换一种运动，当前是${presentation.label}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={props.onCycleType}
            >
              ↻
            </button>
          ) : null}

          <div className="daily-action-card__visual">
            <img
              className="daily-action-card__logo"
              src={logo.src}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </div>
          <div className="daily-action-card__details">
            <h3>{presentation.label}</h3>
            <p className="daily-action-card__target">
              {props.category === 'workout'
                ? presentation.target
                : `目标 ${props.targetTime}`}
            </p>
          </div>
        </div>
      )}
    </article>
  )
}
