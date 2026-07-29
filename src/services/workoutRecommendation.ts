import type {
  ActivityRecord,
  Cycle,
  ExerciseType,
} from '../types/models'

export interface ExerciseRecommendationInput {
  cycle: Cycle | undefined
  exerciseTypes: ExerciseType[]
  activities: ActivityRecord[]
  currentDate: string
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

export function recommendExerciseType({
  cycle,
  exerciseTypes,
  activities,
  currentDate,
}: ExerciseRecommendationInput): ExerciseType | null {
  const enabledExerciseTypes = exerciseTypes.filter(
    (exerciseType) => exerciseType.enabled,
  )

  if (enabledExerciseTypes.length === 0) {
    return null
  }

  const exerciseTypesById = new Map(
    exerciseTypes.map((exerciseType) => [exerciseType.id, exerciseType]),
  )
  const cycleWorkouts = cycle
    ? activities.filter(
        (activity) =>
          activity.cycleId === cycle.id &&
          activity.type === 'workout' &&
          activity.date <= currentDate,
      )
    : []
  const strengthExerciseTypes = enabledExerciseTypes.filter(
    (exerciseType) => exerciseType.category === 'strength',
  )
  const lastStrengthDate = cycleWorkouts
    .filter((activity) => {
      const exerciseType = activity.metadata?.exerciseTypeId
        ? exerciseTypesById.get(activity.metadata.exerciseTypeId)
        : undefined
      return exerciseType?.category === 'strength'
    })
    .map((activity) => activity.date)
    .sort((left, right) => right.localeCompare(left))[0]

  if (strengthExerciseTypes.length > 0) {
    const today = parseLocalDate(currentDate)
    const previousStrength = lastStrengthDate
      ? parseLocalDate(lastStrengthDate)
      : null

    if (!previousStrength || !today) {
      return strengthExerciseTypes[0]
    }

    const daysSinceStrength = Math.floor(
      (today.getTime() - previousStrength.getTime()) / DAY_IN_MS,
    )

    if (daysSinceStrength >= 2) {
      return strengthExerciseTypes[0]
    }
  }

  const counts = new Map(
    enabledExerciseTypes.map((exerciseType) => [exerciseType.id, 0]),
  )

  cycleWorkouts.forEach((activity) => {
    const exerciseTypeId = activity.metadata?.exerciseTypeId
    if (exerciseTypeId && counts.has(exerciseTypeId)) {
      counts.set(exerciseTypeId, (counts.get(exerciseTypeId) ?? 0) + 1)
    }
  })

  return enabledExerciseTypes.reduce((recommendation, exerciseType) =>
    (counts.get(exerciseType.id) ?? 0) <
    (counts.get(recommendation.id) ?? 0)
      ? exerciseType
      : recommendation,
  )
}
