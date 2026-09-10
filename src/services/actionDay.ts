export const ACTION_DAY_CUTOFF_HOUR = 4

export function formatCalendarDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Before 04:00, actions still belong to the previous calendar date.
 */
export function getActionDate(now = new Date()) {
  const actionTime = new Date(now)
  actionTime.setHours(actionTime.getHours() - ACTION_DAY_CUTOFF_HOUR)
  return formatCalendarDate(actionTime)
}

/**
 * Combines an action-day date with a displayed completion time. Times before
 * the cutoff belong to the following calendar morning while remaining part
 * of the selected action day.
 */
export function createRecordedAtForActionDate(
  actionDate: string,
  time: string,
) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(actionDate)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return null

  const [, yearText, monthText, dayText] = dateMatch
  const [, hourText, minuteText] = timeMatch
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  const calendarDayOffset = hour < ACTION_DAY_CUTOFF_HOUR ? 1 : 0
  const recordedAt = new Date(
    year,
    month - 1,
    day + calendarDayOffset,
    hour,
    minute,
    0,
    0,
  )

  const expectedDate = new Date(year, month - 1, day)
  if (
    expectedDate.getFullYear() !== year ||
    expectedDate.getMonth() !== month - 1 ||
    expectedDate.getDate() !== day
  ) {
    return null
  }

  return recordedAt
}
