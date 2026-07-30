import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { resolveActionCategoryLogo } from '../../assets/cards'
import type { PigPose } from '../../assets/pig'
import type {
  Action,
  ActionCategory,
  ActivityRecord,
} from '../../types/models'
import { Pig } from '../Pig'
import './DailyActionCard.css'

const FOLD_THRESHOLD = 80
const MAX_DRAG_DISTANCE = 150
const FOLD_COMMIT_DURATION = 340
const INLINE_NOTE_TITLE_LINE_LIMIT = 2

const CATEGORY_POSES: Record<ActionCategory, PigPose> = {
  health: 'workout-complete',
  bodyCare: 'body-care-complete',
  rest: 'sleep-complete',
  learning: 'learning-complete',
  work: 'work-complete',
  custom: 'encourage-complete',
}

export interface DailyActionCardProps {
  action: Action
  record: ActivityRecord | null
  onFold: () => void
  onFoldSuccess?: () => void
  disabled?: boolean
}

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

export function DailyActionCard({
  action,
  record,
  onFold,
  onFoldSuccess,
  disabled = false,
}: DailyActionCardProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isAwaitingRecord, setIsAwaitingRecord] = useState(false)
  const [titleLayout, setTitleLayout] = useState({
    isInline: false,
    showNote: false,
  })
  const dragOrigin = useRef<{ x: number; y: number } | null>(null)
  const dragOffsetRef = useRef(dragOffset)
  const foldTimer = useRef<number | null>(null)
  const singleLineMeasureRef = useRef<HTMLSpanElement | null>(null)
  const wrappedTitleMeasureRef = useRef<HTMLSpanElement | null>(null)
  const isFolded = record !== null
  const logo = resolveActionCategoryLogo(action.category)
  const smallLogo = resolveActionCategoryLogo(action.category, 'small')
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
    if (!isAwaitingRecord || !record) {
      return
    }

    const confirmationTimer = window.setTimeout(() => {
      setIsAwaitingRecord(false)
      onFoldSuccess?.()
    }, 0)

    return () => window.clearTimeout(confirmationTimer)
  }, [isAwaitingRecord, onFoldSuccess, record])

  useLayoutEffect(() => {
    if (isFolded) {
      return
    }

    const singleLineMeasure = singleLineMeasureRef.current
    const wrappedTitleMeasure = wrappedTitleMeasureRef.current
    if (!singleLineMeasure || !wrappedTitleMeasure) {
      return
    }

    const measureTitle = () => {
      const isInline =
        singleLineMeasure.scrollWidth > singleLineMeasure.clientWidth + 1
      const lineHeight = Number.parseFloat(
        window.getComputedStyle(wrappedTitleMeasure).lineHeight,
      )
      const wrappedLines =
        lineHeight > 0
          ? Math.ceil(wrappedTitleMeasure.scrollHeight / lineHeight)
          : INLINE_NOTE_TITLE_LINE_LIMIT + 1
      const showNote =
        isInline &&
        Boolean(action.note.trim()) &&
        wrappedLines <= INLINE_NOTE_TITLE_LINE_LIMIT

      setTitleLayout((current) =>
        current.isInline === isInline && current.showNote === showNote
          ? current
          : { isInline, showNote },
      )
    }

    measureTitle()
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measureTitle)
    resizeObserver?.observe(singleLineMeasure)
    resizeObserver?.observe(wrappedTitleMeasure)
    window.addEventListener('resize', measureTitle)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureTitle)
    }
  }, [action.name, action.note, isFolded])

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
    if (isFolded || disabled || isCommitting || isAwaitingRecord) {
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
      onFold()
      foldTimer.current = null
    }, FOLD_COMMIT_DURATION)
  }

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (
      isFolded ||
      disabled ||
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

    updateDragOffset({
      x: Math.min(
        MAX_DRAG_DISTANCE,
        Math.max(0, event.clientX - dragOrigin.current.x),
      ),
      y: Math.min(
        MAX_DRAG_DISTANCE,
        Math.max(0, event.clientY - dragOrigin.current.y),
      ),
    })
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

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isFolded || disabled || isCommitting || isAwaitingRecord) {
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

  return (
    <article
      className={[
        'daily-action-card',
        `daily-action-card--${action.category}`,
        isFolded
          ? 'daily-action-card--folded'
          : 'daily-action-card--available',
        isDragging ? 'daily-action-card--dragging' : '',
        isCommitting ? 'daily-action-card--committing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={isFolded ? undefined : 'group'}
      tabIndex={isFolded || disabled || isAwaitingRecord ? undefined : 0}
      aria-disabled={disabled || isAwaitingRecord || undefined}
      aria-live="polite"
      aria-label={
        isFolded
          ? `${action.name}已完成`
          : `向下或向右拖动，折下${action.name}卡`
      }
      style={{
        transform: cardTransform,
        opacity: isCommitting ? 0.28 : 1 - progress * 0.12,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        if (!isCommitting) {
          resetDrag()
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {!isFolded ? (
        <span className="daily-action-card__title-measures" aria-hidden="true">
          <span
            ref={singleLineMeasureRef}
            className="daily-action-card__title-measure daily-action-card__title-measure--single"
          >
            {action.name}
          </span>
          <span
            ref={wrappedTitleMeasureRef}
            className="daily-action-card__title-measure daily-action-card__title-measure--wrapped"
          >
            {action.name}
          </span>
        </span>
      ) : null}
      {isFolded && record ? (
        <div className="daily-action-card__face daily-action-card__face--folded">
          <div className="daily-action-card__visual">
            <Pig
              className="daily-action-card__feedback-pig"
              level={1}
              pose={CATEGORY_POSES[action.category]}
              decorative
            />
          </div>
          <div className="daily-action-card__details">
            <h3>{action.name}</h3>
            <time dateTime={record.recordedAt}>
              {formatRecordedTime(record.recordedAt)}
            </time>
          </div>
        </div>
      ) : titleLayout.isInline ? (
        <div className="daily-action-card__face daily-action-card__face--inline">
          <div className="daily-action-card__inline-content">
            <div className="daily-action-card__inline-title">
              <img
                className="daily-action-card__inline-logo"
                src={smallLogo.src}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
              <h3>{action.name}</h3>
            </div>
            {titleLayout.showNote ? (
              <p className="daily-action-card__target daily-action-card__inline-note">
                {action.note}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="daily-action-card__face">
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
            <h3>{action.name}</h3>
            <p className="daily-action-card__target">{action.note}</p>
          </div>
        </div>
      )}
    </article>
  )
}
