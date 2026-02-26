import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { exercises } from '../data/exercises'
import { getLogsForExercise } from '../db'
import { formatDate } from '../utils/dateUtils'

export default function ExerciseDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const exercise = exercises.find(e => e.id === id)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (exercise) {
      getLogsForExercise(id, 14).then(setHistory)
    }
  }, [id, exercise])

  if (!exercise) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted dark:text-muted-dark">Exercise not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-teal font-medium">Go Back</button>
      </div>
    )
  }

  const categoryColors = {
    isometric: 'bg-teal/10 text-teal',
    isotonic: 'bg-amber/10 text-amber',
    mobility: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    functional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  }

  // Aggregate history by date
  const historyByDate = {}
  history.forEach(log => {
    if (!historyByDate[log.date]) historyByDate[log.date] = 0
    historyByDate[log.date] += log.setsCompleted || 0
  })
  const historyDates = Object.keys(historyByDate).sort().reverse().slice(0, 7)
  const maxSets = Math.max(...Object.values(historyByDate), exercise.sets)

  return (
    <div className="page-enter px-4 pt-4 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-muted dark:text-muted-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-3xl">{exercise.emoji}</span>
        <h1 className="text-xl font-bold dark:text-white flex-1">{exercise.name}</h1>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal text-white">
          Phase {exercise.phase}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${categoryColors[exercise.category] || ''}`}>
          {exercise.category}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {exercise.frequency}
        </span>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-2">Description</h2>
        <p className="text-sm leading-relaxed dark:text-white">{exercise.description}</p>
      </div>

      {/* Cues */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-2">Cues</h2>
        <ul className="space-y-2">
          {exercise.cues.map((cue, i) => (
            <li key={i} className="flex items-start gap-2 text-sm dark:text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 shrink-0" />
              {cue}
            </li>
          ))}
        </ul>
      </div>

      {/* Effort & Pain */}
      {(exercise.effortGuidance || exercise.painThreshold) && (
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4 mb-4 space-y-3">
          {exercise.effortGuidance && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-1">Effort Guidance</h3>
              <p className="text-sm text-teal dark:text-teal-light font-medium">{exercise.effortGuidance}</p>
            </div>
          )}
          {exercise.painThreshold && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-1">Pain Threshold</h3>
              <p className="text-sm text-red font-medium">{exercise.painThreshold}</p>
            </div>
          )}
        </div>
      )}

      {/* Video */}
      {exercise.videoUrl && (
        <a
          href={exercise.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-red/10 text-red font-medium text-sm touch-target mb-4"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
          </svg>
          Watch Video
        </a>
      )}

      {/* History */}
      <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted dark:text-muted-dark mb-3">Recent History</h2>
        {historyDates.length === 0 ? (
          <p className="text-sm text-muted dark:text-muted-dark">No sessions logged yet.</p>
        ) : (
          <div className="space-y-2">
            {historyDates.map(date => (
              <div key={date} className="flex items-center gap-3">
                <span className="text-xs text-muted dark:text-muted-dark w-20">{formatDate(date)}</span>
                <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal rounded-full transition-all"
                    style={{ width: `${Math.min(100, (historyByDate[date] / maxSets) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium dark:text-white w-12 text-right">
                  {historyByDate[date]}/{exercise.sets}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
