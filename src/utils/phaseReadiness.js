import { exercises } from '../data/exercises'

/**
 * Minimum days required in each phase before progression is considered.
 * Phase 1: 14 days (weeks 1-2), Phase 2: 28 days (weeks 3-6)
 */
const MIN_DAYS_IN_PHASE = { 1: 14, 2: 28 }

/**
 * Minimum exercise consistency percentage over the evaluation window.
 * "What % of days in the last 2 weeks did you complete all prescribed exercises?"
 */
const MIN_CONSISTENCY_PCT = 70

/**
 * Evaluation window in days for effort/consistency checks.
 */
const EVAL_WINDOW_DAYS = 14

/**
 * Maximum average pain score (across all assessment fields) to be considered "ready".
 */
const MAX_AVG_PAIN = 2

/**
 * Minimum number of assessments required within the evaluation window.
 */
const MIN_ASSESSMENTS = 2

/**
 * Pain fields from assessments that matter for phase readiness.
 */
const PAIN_FIELDS = [
  'painfulArc',
  'emptyCan',
  'resistedER',
  'liftOffPositioning',
  'liftOffLifting',
  'crossBodyAdduction',
  'jacketTest',
  'averageDailyPain',
]

/**
 * Evaluate whether the user is ready to progress from their current phase.
 *
 * @param {number} currentPhase - 1, 2, or 3
 * @param {string|null} phaseStartDate - ISO date string when phase began
 * @param {string} todayStr - Today's ISO date string
 * @param {Array} recentLogs - Workout logs within the evaluation window
 * @param {Array} recentAssessments - Assessments within the evaluation window
 * @returns {{ canProgress: boolean, pillars: { time: object, effort: object, results: object } } | null}
 *   Returns null if already at Phase 3 (no further progression).
 */
export function evaluatePhaseReadiness(currentPhase, phaseStartDate, todayStr, recentLogs, recentAssessments) {
  if (currentPhase >= 3) return null

  const time = evaluateTime(currentPhase, phaseStartDate, todayStr)
  const effort = evaluateEffort(currentPhase, recentLogs, todayStr)
  const results = evaluateResults(recentAssessments)

  return {
    canProgress: time.met && effort.met && results.met,
    nextPhase: currentPhase + 1,
    pillars: { time, effort, results },
  }
}

function evaluateTime(phase, phaseStartDate, todayStr) {
  const required = MIN_DAYS_IN_PHASE[phase] || 14
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

function evaluateEffort(phase, recentLogs, todayStr) {
  const phaseExercises = exercises.filter((e) => e.phase <= phase)
  if (phaseExercises.length === 0) {
    return { met: false, label: 'Consistency', current: 0, required: MIN_CONSISTENCY_PCT, unit: '%' }
  }

  // Count how many of the last EVAL_WINDOW_DAYS had all exercises completed
  let daysWithFullCompletion = 0
  for (let i = 0; i < EVAL_WINDOW_DAYS; i++) {
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

  const current = Math.round((daysWithFullCompletion / EVAL_WINDOW_DAYS) * 100)
  return {
    met: current >= MIN_CONSISTENCY_PCT,
    label: 'Consistency',
    current,
    required: MIN_CONSISTENCY_PCT,
    unit: '%',
    detail: `${daysWithFullCompletion}/${EVAL_WINDOW_DAYS} days fully completed`,
  }
}

function evaluateResults(recentAssessments) {
  if (recentAssessments.length < MIN_ASSESSMENTS) {
    return {
      met: false,
      label: 'Pain Levels',
      current: null,
      required: MAX_AVG_PAIN,
      unit: '/10',
      detail: `${recentAssessments.length}/${MIN_ASSESSMENTS} assessments recorded`,
      needsMore: true,
    }
  }

  // Use the most recent assessment's pain scores
  const latest = recentAssessments[0] // already sorted most-recent-first
  const painValues = PAIN_FIELDS
    .map((f) => latest[f])
    .filter((v) => v != null && typeof v === 'number')

  if (painValues.length === 0) {
    return { met: false, label: 'Pain Levels', current: null, required: MAX_AVG_PAIN, unit: '/10', detail: 'No pain data in latest assessment' }
  }

  const avg = painValues.reduce((s, v) => s + v, 0) / painValues.length
  const maxSingle = Math.max(...painValues)
  const current = Math.round(avg * 10) / 10

  return {
    met: maxSingle <= 3 && avg <= MAX_AVG_PAIN,
    label: 'Pain Levels',
    current,
    required: MAX_AVG_PAIN,
    unit: '/10 avg',
    detail: maxSingle > 3
      ? `Highest single score: ${maxSingle}/10`
      : `All scores ≤3, avg ${current}/10`,
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
