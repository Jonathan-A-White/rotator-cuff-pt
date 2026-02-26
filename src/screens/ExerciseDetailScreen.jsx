import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { exercises } from '../data/exercises'
import { getLogsForExercise } from '../db'
import { formatDate } from '../utils/dateUtils'

export default function ExerciseDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const exercise = exercises.find((e) => e.id === id)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!exercise) {
      setLoading(false)
      return
    }
    getLogsForExercise(id, 14).then((logs) => {
      setHistory(logs)
      setLoading(false)
    })
  }, [id, exercise])

  if (!exercise) {
    return (
      <div className="page-enter px-4 pt-6 max-w-lg mx-auto text-center">
        <p className="text-muted dark:text-muted-dark py-12">Exercise not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full min-h-[48px] rounded-xl bg-teal text-white font-semibold py-3"
        >
          Back to Home
        </button>
      </div>
    )
  }

  // Category pill colors
  const categoryColors = {
    isometric: 'bg-teal/10 text-teal dark:bg-teal/20 dark:text-teal-light',
    isotonic: 'bg-amber/10 text-amber dark:bg-amber/20',
    mobility: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    functional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  }

  // Aggregate history by date for the last 7 unique dates
  const historyByDate = {}
  history.forEach((log) => {
    if (!historyByDate[log.date]) historyByDate[log.date] = { sets: 0, pain: null }
    historyByDate[log.date].sets += log.setsCompleted || 0
    if (log.painLevel != null) historyByDate[log.date].pain = log.painLevel
  })
  const historyDates = Object.keys(historyByDate).sort().reverse().slice(0, 7)
  const maxSets = Math.max(...Object.values(historyByDate).map((d) => d.sets), exercise.sets)

  return (
    <div className="page-enter px-4 pt-4 pb-24 max-w-lg mx-auto">
      {/* Back button + Exercise name + emoji */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2 text-muted dark:text-muted-dark hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-3xl shrink-0" aria-hidden="true">{exercise.emoji}</span>
          <h1 className="text-xl font-bold truncate dark:text-white">{exercise.name}</h1>
        </div>
      </div>

      {/* Phase / category / frequency tags */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal text-white">
          Phase {exercise.phase}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${categoryColors[exercise.category] || 'bg-gray-100 text-gray-600'}`}>
          {exercise.category}
        </span>
        {exercise.frequency && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {exercise.frequency}
          </span>
        )}
      </div>

      {/* Full description */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4 mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-2">
          Description
        </h2>
        <p className="text-sm leading-relaxed dark:text-white">
          {exercise.description}
        </p>
      </div>

      {/* All cues (bullet list, not collapsible) */}
      {exercise.cues && exercise.cues.length > 0 && (
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-2">
            Cues
          </h2>
          <ul className="space-y-2" role="list">
            {exercise.cues.map((cue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed dark:text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 shrink-0" aria-hidden="true" />
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Effort guidance section */}
      {exercise.effortGuidance && (
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-1">
            Effort Guidance
          </h2>
          <p className="text-sm text-teal dark:text-teal-light font-medium">
            {exercise.effortGuidance}
          </p>
        </div>
      )}

      {/* Pain threshold section */}
      {exercise.painThreshold && (
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-1">
            Pain Threshold
          </h2>
          <p className="text-sm text-red font-medium">
            {exercise.painThreshold}
          </p>
        </div>
      )}

      {/* Watch Video button */}
      {exercise.videoUrl && (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-sm font-semibold text-red hover:bg-red/5 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Watch Video
        </a>
      )}

      {/* History section: last 7 days of logs */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-3">
          Recent History
        </h2>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historyDates.length === 0 ? (
          <p className="text-sm text-muted dark:text-muted-dark">
            No sessions logged yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {historyDates.map((date) => {
              const { sets, pain } = historyByDate[date]
              const barWidth = maxSets > 0 ? Math.min(100, (sets / maxSets) * 100) : 0
              return (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-xs text-muted dark:text-muted-dark w-20 shrink-0 tabular-nums">
                    {formatDate(date)}
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal dark:bg-teal-light rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium dark:text-white w-12 text-right tabular-nums">
                    {sets}/{exercise.sets}
                  </span>
                  {pain != null && pain > 0 && (
                    <span className={`text-xs font-medium w-6 text-right tabular-nums ${
                      pain <= 3 ? 'text-green-600 dark:text-green-400'
                        : pain <= 6 ? 'text-amber dark:text-amber'
                        : 'text-red'
                    }`}>
                      {pain}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
