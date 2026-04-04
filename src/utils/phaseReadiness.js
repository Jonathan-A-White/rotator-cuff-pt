/**
 * Evaluate whether the user is ready to progress from their current phase.
 *
 * @param {number} currentPhase - 1, 2, or 3
 * @param {string|null} phaseStartDate - ISO date string when phase began
 * @param {string} todayStr - Today's ISO date string
 * @param {Array} recentLogs - Workout logs within the evaluation window
 * @param {Array} recentAssessments - Assessments within the evaluation window
 * @param {object} config
 * @param {Array} config.exercises - array of exercise objects
 * @param {object} config.progressionRules - { minDaysInPhase, minConsistencyPct, evalWindowDays, maxAvgPain, minAssessments, maxSinglePain }
 * @param {Array<string>} config.painFields - array of pain metric field ID strings
 * @param {number} [config.maxPhase] - highest phase number (defaults to max phase found in exercises)
 * @returns {{ canProgress: boolean, nextPhase: number, pillars: { time: object, effort: object, results: object } } | null}
 *   Returns null if already at the max phase (no further progression).
 */
export function evaluatePhaseReadiness(currentPhase, phaseStartDate, todayStr, recentLogs, recentAssessments, { exercises, progressionRules, painFields, maxPhase }) {
  const effectiveMaxPhase = maxPhase ?? Math.max(...exercises.map((e) => e.phase))

  if (currentPhase >= effectiveMaxPhase) return null

  const time = evaluateTime(currentPhase, phaseStartDate, todayStr, progressionRules)
  const effort = evaluateEffort(currentPhase, recentLogs, todayStr, exercises, progressionRules)
  const results = evaluateResults(recentAssessments, progressionRules, painFields)

  return {
    canProgress: time.met && effort.met && results.met,
    nextPhase: currentPhase + 1,
    pillars: { time, effort, results },
  }
}

function evaluateTime(phase, phaseStartDate, todayStr, progressionRules) {
  const required = (progressionRules.minDaysInPhase && progressionRules.minDaysInPhase[phase]) || 14
  if (!phaseStartDate) {
    return { met: false, label: 'Time in Phase', current: 0, required, unit: 'days' }
  }
  const current = daysDiff(phaseStartDate, todayStr)
  return {
    met: current >= required,
    label: 'Time in Phase',
    current,
    required,
    unit: 'days',
  }
}

function evaluateEffort(phase, recentLogs, todayStr, exercises, progressionRules) {
  const { minConsistencyPct, evalWindowDays } = progressionRules
  const phaseExercises = exercises.filter((e) => e.phase <= phase)
  if (phaseExercises.length === 0) {
    return { met: false, label: 'Consistency', current: 0, required: minConsistencyPct, unit: '%' }
  }

  // Count how many of the last evalWindowDays had all exercises completed
  let daysWithFullCompletion = 0
  for (let i = 0; i < evalWindowDays; i++) {
    const dateStr = subtractDays(todayStr, i)
    const dayLogs = recentLogs.filter((l) => l.date === dateStr)

    const allDone = phaseExercises.every((ex) => {
      const setsForEx = dayLogs
        .filter((l) => l.exerciseId === ex.id)
        .reduce((sum, l) => sum + (l.setsCompleted || 0), 0)
      return setsForEx >= ex.sets
    })

    if (allDone) daysWithFullCompletion++
  }

  const current = Math.round((daysWithFullCompletion / evalWindowDays) * 100)
  return {
    met: current >= minConsistencyPct,
    label: 'Consistency',
    current,
    required: minConsistencyPct,
    unit: '%',
    detail: `${daysWithFullCompletion}/${evalWindowDays} days fully completed`,
  }
}

function evaluateResults(recentAssessments, progressionRules, painFields) {
  const { maxAvgPain, minAssessments, maxSinglePain } = progressionRules

  if (recentAssessments.length < minAssessments) {
    return {
      met: false,
      label: 'Pain Levels',
      current: null,
      required: maxAvgPain,
      unit: '/10',
      detail: `${recentAssessments.length}/${minAssessments} assessments recorded`,
      needsMore: true,
    }
  }

  // Use the most recent assessment's pain scores
  const latest = recentAssessments[0] // already sorted most-recent-first
  const painValues = painFields
    .map((f) => latest[f])
    .filter((v) => v != null && typeof v === 'number')

  if (painValues.length === 0) {
    return { met: false, label: 'Pain Levels', current: null, required: maxAvgPain, unit: '/10', detail: 'No pain data in latest assessment' }
  }

  const avg = painValues.reduce((s, v) => s + v, 0) / painValues.length
  const highestSingle = Math.max(...painValues)
  const current = Math.round(avg * 10) / 10

  return {
    met: highestSingle <= maxSinglePain && avg <= maxAvgPain,
    label: 'Pain Levels',
    current,
    required: maxAvgPain,
    unit: '/10 avg',
    detail: highestSingle > maxSinglePain
      ? `Highest single score: ${highestSingle}/10`
      : `All scores ≤${maxSinglePain}, avg ${current}/10`,
  }
}

// ── Date helpers (no dependency on dateUtils to keep this pure) ──

function daysDiff(date1, date2) {
  const [y1, m1, d1] = date1.split('-').map(Number)
  const [y2, m2, d2] = date2.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function subtractDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - n)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
