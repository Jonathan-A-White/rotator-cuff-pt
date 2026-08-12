/**
 * Ordering rules for the home screen exercise list.
 *
 * Exercises you still owe for the day stay at the top; ones you've finished
 * sink to the bottom. Partial progress does NOT count as finished — an
 * exercise at 2/5 sets is still "to do" and keeps its place up top.
 */

/** Exercises without a sortOrder sort after those that have one. */
function sortRank(exercise) {
  const value = exercise?.sortOrder
  // MAX_SAFE_INTEGER rather than Infinity so two unranked entries compare as
  // 0 (stable, keeps input order) instead of NaN.
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

/** Program order — the therapist's intended sequence, ignoring completion. */
export function byProgramOrder(a, b) {
  return sortRank(a) - sortRank(b)
}

/** True when every set for the day has been logged. */
export function isExerciseComplete(exercise, setsCompletedMap = {}) {
  const target = exercise?.sets ?? 0
  if (target <= 0) return false
  return (setsCompletedMap[exercise.id] || 0) >= target
}

/**
 * Order exercises for display: unfinished first, finished last, each group
 * keeping the program's own order.
 *
 * @param {Array} exercises            exercises to display
 * @param {Object} setsCompletedMap    exerciseId -> sets logged today
 * @param {Object} [options]
 * @param {string[]|null} [options.frozenOrder]
 *        Explicit id order to hold, used while Edit mode is open so cards
 *        don't jump out from under a tap. Ids not in the list fall to the end
 *        in program order.
 * @param {string|null} [options.pinnedId]
 *        Exercise to treat as unfinished for this render, so a just-completed
 *        card can render in place once and then animate down.
 * @returns {Array} a new, ordered array
 */
export function orderExercises(exercises = [], setsCompletedMap = {}, options = {}) {
  const { frozenOrder = null, pinnedId = null } = options
  const inProgramOrder = [...exercises].sort(byProgramOrder)

  if (frozenOrder) {
    const position = new Map(frozenOrder.map((id, i) => [id, i]))
    const rank = (ex) => (position.has(ex.id) ? position.get(ex.id) : Number.MAX_SAFE_INTEGER)
    return inProgramOrder.sort((a, b) => rank(a) - rank(b))
  }

  const sinks = (ex) => ex.id !== pinnedId && isExerciseComplete(ex, setsCompletedMap)
  return [
    ...inProgramOrder.filter((ex) => !sinks(ex)),
    ...inProgramOrder.filter(sinks),
  ]
}
