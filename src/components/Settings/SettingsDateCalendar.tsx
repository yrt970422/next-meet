import { useId, useMemo, useState } from 'react'
import './SettingsDateCalendar.css'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

interface SettingsDateCalendarProps {
  label: string
  value: string
  min?: string
  max?: string
  isOpen: boolean
  onToggle: () => void
  onChange: (value: string) => void
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

function formatDisplayDate(value: string) {
  const date = parseLocalDate(value)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function monthKey(date: Date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function getMonthDays(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7
  const dayCount = new Date(year, monthIndex + 1, 0).getDate()

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from(
      { length: dayCount },
      (_, index) => new Date(year, monthIndex, index + 1),
    ),
  ]
}

export function SettingsDateCalendar({
  label,
  value,
  min,
  max,
  isOpen,
  onToggle,
  onChange,
}: SettingsDateCalendarProps) {
  const calendarId = useId()

  return (
    <div className="settings-date-picker">
      <span className="settings-date-picker__label">{label}</span>
      <button
        className="settings-date-picker__field"
        type="button"
        aria-expanded={isOpen}
        aria-controls={calendarId}
        onClick={onToggle}
      >
        <span>{formatDisplayDate(value)}</span>
        <span
          className={[
            'settings-date-picker__chevron',
            isOpen ? 'is-open' : '',
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {isOpen ? (
        <CalendarPanel
          id={calendarId}
          label={label}
          value={value}
          min={min}
          max={max}
          onChange={onChange}
        />
      ) : null}
    </div>
  )
}

interface CalendarPanelProps {
  id: string
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}

function CalendarPanel({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: CalendarPanelProps) {
  const selectedDate = parseLocalDate(value)
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )
  const days = useMemo(() => getMonthDays(visibleMonth), [visibleMonth])
  const minimumMonth = min ? monthKey(parseLocalDate(min)) : undefined
  const maximumMonth = max ? monthKey(parseLocalDate(max)) : undefined
  const currentMonth = monthKey(visibleMonth)
  const cannotGoBack = minimumMonth !== undefined && currentMonth <= minimumMonth
  const cannotGoForward = maximumMonth !== undefined && currentMonth >= maximumMonth
  const today = formatLocalDate(new Date())

  return (
    <section
      id={id}
      className="settings-date-calendar"
      aria-label={`${label}日历`}
    >
      <div className="settings-date-calendar__heading">
        <button
          type="button"
          aria-label="上一个月"
          disabled={cannotGoBack}
          onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
        >
          ‹
        </button>
        <strong>
          {visibleMonth.getFullYear()}年{visibleMonth.getMonth() + 1}月
        </strong>
        <button
          type="button"
          aria-label="下一个月"
          disabled={cannotGoForward}
          onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
        >
          ›
        </button>
      </div>

      <div className="settings-date-calendar__weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="settings-date-calendar__days" role="grid">
        {days.map((date, index) => {
          if (!date) {
            return <span key={`empty-${index}`} aria-hidden="true" />
          }

          const dateValue = formatLocalDate(date)
          const isDisabled =
            (min !== undefined && dateValue < min) ||
            (max !== undefined && dateValue > max)
          const isSelected = dateValue === value
          const isToday = dateValue === today

          return (
            <button
              key={dateValue}
              type="button"
              role="gridcell"
              disabled={isDisabled}
              aria-selected={isSelected}
              aria-current={isToday ? 'date' : undefined}
              className={[
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onChange(dateValue)}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </section>
  )
}
