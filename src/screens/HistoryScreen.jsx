import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { exercises } from '../data/exercises'
import { getAllLogs, getLogsForExercise, getLogsInRange, deleteLog } from '../db'
import { today, formatDate } from '../utils/dateUtils'

function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return null
  const diffMs = endTime - startTime
  if (diffMs < 60000) return '<1 min'
  const mins = Math.round(diffMs / 60000)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

export default function HistoryScreen() {
  const navigate = useNavigate()
  const { exerciseId } = useParams()
  const [searchParams] = useSearchParams()
  const dateFilter = searchParams.get('date')

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const exercise = exerciseId ? exercises.find((e) => e.id === exerciseId) : null
  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]))

  const loadLogs = useCallback(async () => {
    try {
      let fetched
      if (exerciseId) {
        fetched = await getLogsForExercise(exerciseId)
      } else if (dateFilter) {
        fetched = await getLogsInRange(dateFilter, dateFilter)
      } else {
        fetched = await getAllLogs()
      }
      // Sort by timestamp descending
      fetched.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      setLogs(fetched)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }, [exerciseId, dateFilter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleDelete = useCallback(async (logId) => {
    await deleteLog(logId)
    setConfirmDelete(null)
    setLogs((prev) => prev.filter((l) => l.id !== logId))
  }, [])

  // Group logs by date
  const grouped = {}
  logs.forEach((log) => {
    const d = log.date || 'Unknown'
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(log)
  })
  const sortedDates = Object.keys(grouped).sort().reverse()

  // Title
  let title = 'Exercise History'
  if (exercise) {
    title = exercise.shortName || exercise.name
  } else if (dateFilter) {
    title = formatDate(dateFilter)
  }

  return (
    <div className="page-enter px-4 pt-4 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2 text-muted dark:text-muted-dark hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {exercise && (
            <span className="text-2xl shrink-0" aria-hidden="true">{exercise.emoji}</span>
          )}
          <h1 className="text-xl font-bold truncate dark:text-white">{title}</h1>
        </div>
      </div>

      {/* Summary stats */}
      {logs.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-teal dark:text-teal-light tabular-nums">{logs.length}</div>
            <div className="text-xs text-muted dark:text-muted-dark">Sessions</div>
          </div>
          <div className="flex-1 bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-teal dark:text-teal-light tabular-nums">
              {logs.reduce((sum, l) => sum + (l.setsCompleted || 0), 0)}
            </div>
            <div className="text-xs text-muted dark:text-muted-dark">Total Sets</div>
          </div>
          <div className="flex-1 bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-teal dark:text-teal-light tabular-nums">{sortedDates.length}</div>
            <div className="text-xs text-muted dark:text-muted-dark">Days</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40dvh]">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted dark:text-muted-dark">No history yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedDates.map((date) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-bold text-muted dark:text-muted-dark">
                  {date === today() ? 'Today' : formatDate(date)}
                </h2>
                <div className="flex-1 h-px bg-gray-200 dark:bg-[#3A3A3C]" />
                <span className="text-xs text-muted dark:text-muted-dark tabular-nums">
                  {grouped[date].reduce((s, l) => s + (l.setsCompleted || 0), 0)} sets
                </span>
              </div>

              {/* Log entries for this date */}
              <div className="space-y-2">
                {grouped[date].map((log) => {
                  const ex = exerciseMap[log.exerciseId]
                  const isManual = log.source === 'manual'
                  const duration = formatDuration(log.startTime, log.endTime)
                  const isDeleting = confirmDelete === log.id

                  return (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-3.5 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Emoji (only show if not filtered to single exercise) */}
                        {!exerciseId && ex && (
                          <span className="text-2xl leading-none select-none shrink-0" aria-hidden="true">
                            {ex.emoji}
                          </span>
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Exercise name (only if not filtered) */}
                          {!exerciseId && (
                            <h3 className="text-sm font-semibold truncate dark:text-white">
                              {ex?.shortName || ex?.name || log.exerciseId}
                            </h3>
                          )}

                          {/* Time and details row */}
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {log.startTime && (
                              <span className="text-xs text-muted dark:text-muted-dark tabular-nums">
                                {formatTime(log.startTime)}
                                {log.endTime && log.endTime !== log.startTime && (
                                  <> &ndash; {formatTime(log.endTime)}</>
                                )}
                              </span>
                            )}
                            {duration && !isManual && (
                              <span className="text-xs text-muted dark:text-muted-dark">
                                ({duration})
                              </span>
                            )}
                          </div>

                          {/* Sets + badges */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-semibold text-teal dark:text-teal-light tabular-nums">
                              {log.setsCompleted} {log.setsCompleted === 1 ? 'set' : 'sets'}
                            </span>
                            {isManual && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber/15 text-amber">
                                Manual
                              </span>
                            )}
                            {!isManual && log.source !== 'manual' && log.startTime && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal/10 text-teal dark:text-teal-light">
                                Timer
                              </span>
                            )}
                            {log.painLevel != null && log.painLevel > 0 && (
                              <span className={`text-xs font-medium tabular-nums ${
                                log.painLevel <= 3 ? 'text-green-600 dark:text-green-400'
                                  : log.painLevel <= 6 ? 'text-amber'
                                  : 'text-red'
                              }`}>
                                Pain {log.painLevel}/10
                              </span>
                            )}
                          </div>

                          {/* Notes */}
                          {log.notes && (
                            <p className="text-xs text-muted dark:text-muted-dark mt-1 line-clamp-2 italic">
                              {log.notes}
                            </p>
                          )}
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(isDeleting ? null : log.id)}
                          aria-label="Delete entry"
                          className="touch-target min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1 text-muted dark:text-muted-dark hover:text-red transition-colors shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>

                      {/* Confirm delete row */}
                      {isDeleting && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-[#3A3A3C]">
                          <span className="text-xs text-muted dark:text-muted-dark flex-1">Remove this entry?</span>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(log.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red hover:bg-red/80 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
