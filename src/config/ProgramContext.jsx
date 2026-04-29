import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import defaultProgram from './defaultProgram.json'
import { validateProgram, inferTimerType } from './schema'
import {
  getActiveProgram,
  saveProgram,
  getProgram,
  getAllPrograms,
  deleteProgram,
  getSettings,
  saveSettings,
} from '../db'

const ProgramContext = createContext(null)

const DEFAULT_PROGRAM_ID = defaultProgram.id

/**
 * Normalize exercises: ensure timerType is set on every exercise.
 */
function normalizeExercises(exercises) {
  return exercises.map((ex) => ({
    ...ex,
    timerType: inferTimerType(ex),
  }))
}

function buildDefaultProgram() {
  return {
    ...defaultProgram,
    exercises: normalizeExercises(defaultProgram.exercises),
  }
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

async function setActiveProgramIdInSettings(id) {
  const settings = await getSettings()
  await saveSettings({ ...settings, activeProgramId: id })
}

export function ProgramProvider({ children }) {
  const [program, setProgram] = useState(buildDefaultProgram)
  const [savedPrograms, setSavedPrograms] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshSavedPrograms = useCallback(async () => {
    try {
      const all = await getAllPrograms()
      setSavedPrograms(all)
    } catch (err) {
      console.warn('Failed to list saved programs:', err)
    }
  }, [])

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
        if (!cancelled) {
          await refreshSavedPrograms()
        }
      } catch (err) {
        console.warn('Failed to load saved program, using default:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshSavedPrograms])

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
    await setActiveProgramIdInSettings(normalized.id)
    setProgram(normalized)
    await refreshSavedPrograms()
    return { success: true, errors: [] }
  }, [refreshSavedPrograms])

  const switchToProgramId = useCallback(async (id) => {
    if (!id || id === DEFAULT_PROGRAM_ID) {
      await setActiveProgramIdInSettings(null)
      setProgram(buildDefaultProgram())
      return { success: true, errors: [] }
    }
    const stored = await getProgram(id)
    if (!stored) {
      return { success: false, errors: [`Program "${id}" was not found.`] }
    }
    const validation = validateProgram(stored)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
    const normalized = {
      ...stored,
      exercises: normalizeExercises(stored.exercises),
    }
    await setActiveProgramIdInSettings(id)
    setProgram(normalized)
    return { success: true, errors: [] }
  }, [])

  const resetToDefault = useCallback(async () => {
    await setActiveProgramIdInSettings(null)
    setProgram(buildDefaultProgram())
  }, [])

  const removeSavedProgram = useCallback(async (id) => {
    if (!id || id === DEFAULT_PROGRAM_ID) return
    await deleteProgram(id)
    if (program.id === id) {
      await setActiveProgramIdInSettings(null)
      setProgram(buildDefaultProgram())
    }
    await refreshSavedPrograms()
  }, [program.id, refreshSavedPrograms])

  // Build the list of programs the user can switch between: bundled default + saved imports.
  const availablePrograms = [
    { id: DEFAULT_PROGRAM_ID, name: defaultProgram.name, builtIn: true },
    ...savedPrograms
      .filter((p) => p.id !== DEFAULT_PROGRAM_ID)
      .map((p) => ({ id: p.id, name: p.name, builtIn: false })),
  ]

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
    availablePrograms,
    // Actions
    switchProgram,
    switchToProgramId,
    resetToDefault,
    removeSavedProgram,
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
