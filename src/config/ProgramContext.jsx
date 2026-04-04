import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import defaultProgram from './defaultProgram.json'
import { validateProgram, inferTimerType } from './schema'
import { getActiveProgram, saveProgram } from '../db'

const ProgramContext = createContext(null)

/**
 * Normalize exercises: ensure timerType is set on every exercise.
 */
function normalizeExercises(exercises) {
  return exercises.map((ex) => ({
    ...ex,
    timerType: inferTimerType(ex),
  }))
}

/**
 * Build a lookup map from phase id to phase object.
 */
function buildPhaseMap(phases) {
  const map = {}
  for (const phase of phases) {
    map[phase.id] = phase
  }
  return map
}

export function ProgramProvider({ children }) {
  const [program, setProgram] = useState(() => ({
    ...defaultProgram,
    exercises: normalizeExercises(defaultProgram.exercises),
  }))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const saved = await getActiveProgram()
        if (saved && !cancelled) {
          const validation = validateProgram(saved)
          if (validation.valid) {
            setProgram({
              ...saved,
              exercises: normalizeExercises(saved.exercises),
            })
          } else {
            console.warn('Saved program config is invalid, using default:', validation.errors)
          }
        }
      } catch (err) {
        console.warn('Failed to load saved program, using default:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const switchProgram = useCallback(async (newProgram) => {
    const validation = validateProgram(newProgram)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
    const normalized = {
      ...newProgram,
      exercises: normalizeExercises(newProgram.exercises),
    }
    await saveProgram(normalized)
    setProgram(normalized)
    return { success: true, errors: [] }
  }, [])

  const resetToDefault = useCallback(async () => {
    const normalized = {
      ...defaultProgram,
      exercises: normalizeExercises(defaultProgram.exercises),
    }
    await saveProgram(normalized)
    setProgram(normalized)
  }, [])

  const value = {
    program,
    loading,
    // Convenience accessors
    exercises: program.exercises,
    phases: program.phases,
    phaseMap: buildPhaseMap(program.phases),
    categories: program.categories || [],
    assessmentSections: program.assessmentSections || [],
    assessmentSummaryFields: program.assessmentSummaryFields || [],
    progressionRules: program.progressionRules || {},
    // Actions
    switchProgram,
    resetToDefault,
  }

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  )
}

/**
 * Hook to access the active program configuration.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useProgram() {
  const ctx = useContext(ProgramContext)
  if (!ctx) {
    throw new Error('useProgram must be used within a ProgramProvider')
  }
  return ctx
}

export default ProgramContext
