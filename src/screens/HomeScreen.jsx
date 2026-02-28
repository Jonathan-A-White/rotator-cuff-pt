import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { exercises } from '../data/exercises'
import { getSettings, getLogsForDate, adjustSetsForDate } from '../db'
import { today } from '../utils/dateUtils'
import ExerciseCard from '../components/ExerciseCard'

export default function HomeScreen() {
  const navigate = useNavigate()
  const [currentPhase, setCurrentPhase] = useState(1)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

  const phaseDescriptions = {
    1: 'Pain Reduction & Isometric Loading',
    2: 'Isotonic Strengthening',
    3: 'Pull-Up Return',
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [settings, todayLogs] = await Promise.all([
          getSettings(),
          getLogsForDate(today()),
        ])
        if (cancelled) return
        setCurrentPhase(settings.currentPhase || 1)
        setLogs(todayLogs)
      } catch (err) {
        console.error('Failed to load home data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Reload today's logs from DB
  const reloadLogs = useCallback(async () => {
    const todayLogs = await getLogsForDate(today())
    setLogs(todayLogs)
  }, [])

  // Adjust sets for an exercise (used in edit mode)
  const handleAdjustSets = useCallback(async (exerciseId, delta) => {
    const currentSets = logs
      .filter((l) => l.exerciseId === exerciseId)
      .reduce((sum, l) => sum + (l.setsCompleted || 0), 0)
    const newTotal = Math.max(0, currentSets + delta)
    await adjustSetsForDate(exerciseId, today(), newTotal)
    await reloadLogs()
  }, [logs, reloadLogs])

  // Phase is cumulative: phase 2 shows phase 1+2, phase 3 shows all
  const phaseExercises = exercises
    .filter((ex) => ex.phase <= currentPhase)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // Calculate sets completed per exercise from today's logs
  const setsCompletedMap = {}
  logs.forEach((log) => {
    if (!setsCompletedMap[log.exerciseId]) {
      setsCompletedMap[log.exerciseId] = 0
    }
    setsCompletedMap[log.exerciseId] += log.setsCompleted || 0
  })

  // Daily summary calculations
  const exercisesDone = phaseExercises.filter(
    (ex) => (setsCompletedMap[ex.id] || 0) >= ex.sets
  ).length
  const totalExercises = phaseExercises.length
  const totalSetsCompleted = Object.values(setsCompletedMap).reduce(
    (sum, v) => sum + v,
    0
  )
  const totalSetsTarget = phaseExercises.reduce(
    (sum, ex) => sum + ex.sets,
    0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-enter px-4 pt-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-teal text-white">
            Phase {currentPhase}
          </span>
          <span className="text-sm text-muted dark:text-muted-dark font-medium">
            {phaseDescriptions[currentPhase]}
          </span>
        </div>

        {/* Gear icon linking to settings */}
        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-muted dark:text-muted-dark hover:text-teal transition-colors"
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Today's exercises */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold dark:text-white">
          Today&apos;s Exercises
        </h2>
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
            editMode
              ? 'bg-teal text-white'
              : 'text-teal dark:text-teal-light hover:bg-teal/10'
          }`}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {phaseExercises.length === 0 ? (
        <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl p-6 text-center">
          <p className="text-muted dark:text-muted-dark">
            No exercises found for this phase.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {phaseExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              setsCompleted={setsCompletedMap[exercise.id] || 0}
              onStart={() => navigate(`/exercise/${exercise.id}`)}
              onDetail={() => navigate(`/exercise/${exercise.id}/detail`)}
              editMode={editMode}
              onAdjustSets={(delta) => handleAdjustSets(exercise.id, delta)}
            />
          ))}
        </div>
      )}

      {/* Daily summary bar */}
      <div className="fixed bottom-16 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white dark:bg-[#2C2C2E] border border-[#E5E5E5] dark:border-[#3A3A3C] rounded-xl px-4 py-3 shadow-lg flex items-center justify-center gap-2 text-sm font-medium">
            <span className="text-teal dark:text-teal-light font-bold">
              {exercisesDone}/{totalExercises}
            </span>
            <span className="text-muted dark:text-muted-dark">
              exercises done
            </span>
            <span className="text-muted dark:text-muted-dark" aria-hidden="true">
              &middot;
            </span>
            <span className="text-teal dark:text-teal-light font-bold">
              {totalSetsCompleted}/{totalSetsTarget}
            </span>
            <span className="text-muted dark:text-muted-dark">total sets</span>
          </div>
        </div>
      </div>
    </div>
  )
}
