/**
 * Program config schema validation.
 * Validates that a JSON program config has the required shape.
 */

const REQUIRED_TOP_LEVEL = ['id', 'name', 'phases', 'exercises']
const VALID_TIMER_TYPES = ['isometric', 'rep_based', 'hybrid']
const VALID_FIELD_TYPES = ['pain_scale', 'number', 'select', 'text']

/**
 * Validate a program configuration object.
 * @param {object} program
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProgram(program) {
  const errors = []

  if (!program || typeof program !== 'object') {
    return { valid: false, errors: ['Program config must be an object.'] }
  }

  // Required top-level fields
  for (const field of REQUIRED_TOP_LEVEL) {
    if (!program[field]) {
      errors.push(`Missing required field: "${field}".`)
    }
  }

  if (typeof program.id !== 'string' || program.id.trim() === '') {
    errors.push('"id" must be a non-empty string.')
  }

  if (typeof program.name !== 'string' || program.name.trim() === '') {
    errors.push('"name" must be a non-empty string.')
  }

  // Phases
  if (Array.isArray(program.phases)) {
    if (program.phases.length === 0) {
      errors.push('"phases" must have at least one phase.')
    }
    const phaseIds = new Set()
    for (let i = 0; i < program.phases.length; i++) {
      const phase = program.phases[i]
      if (!phase.id && phase.id !== 0) {
        errors.push(`phases[${i}]: missing "id".`)
      } else if (phaseIds.has(phase.id)) {
        errors.push(`phases[${i}]: duplicate id "${phase.id}".`)
      } else {
        phaseIds.add(phase.id)
      }
      if (!phase.name) errors.push(`phases[${i}]: missing "name".`)
      if (phase.rules && !Array.isArray(phase.rules)) {
        errors.push(`phases[${i}]: "rules" must be an array.`)
      }
      if (phase.checklists && !Array.isArray(phase.checklists)) {
        errors.push(`phases[${i}]: "checklists" must be an array.`)
      }
    }
  }

  // Exercises
  if (Array.isArray(program.exercises)) {
    if (program.exercises.length === 0) {
      errors.push('"exercises" must have at least one exercise.')
    }
    const exerciseIds = new Set()
    for (let i = 0; i < program.exercises.length; i++) {
      const ex = program.exercises[i]
      if (!ex.id) {
        errors.push(`exercises[${i}]: missing "id".`)
      } else if (exerciseIds.has(ex.id)) {
        errors.push(`exercises[${i}]: duplicate id "${ex.id}".`)
      } else {
        exerciseIds.add(ex.id)
      }
      if (!ex.name) errors.push(`exercises[${i}]: missing "name".`)
      if (!ex.phase && ex.phase !== 0) errors.push(`exercises[${i}]: missing "phase".`)
      if (ex.timerType && !VALID_TIMER_TYPES.includes(ex.timerType)) {
        errors.push(`exercises[${i}]: invalid timerType "${ex.timerType}". Must be one of: ${VALID_TIMER_TYPES.join(', ')}.`)
      }
      if (!ex.sets || ex.sets < 1) errors.push(`exercises[${i}]: "sets" must be >= 1.`)
    }
  }

  // Categories (optional but validate if present)
  if (program.categories && !Array.isArray(program.categories)) {
    errors.push('"categories" must be an array.')
  }

  // Assessment sections (optional)
  if (program.assessmentSections) {
    if (!Array.isArray(program.assessmentSections)) {
      errors.push('"assessmentSections" must be an array.')
    } else {
      for (let i = 0; i < program.assessmentSections.length; i++) {
        const section = program.assessmentSections[i]
        if (!section.id) errors.push(`assessmentSections[${i}]: missing "id".`)
        if (!Array.isArray(section.fields) || section.fields.length === 0) {
          errors.push(`assessmentSections[${i}]: must have at least one field.`)
        } else {
          for (let j = 0; j < section.fields.length; j++) {
            const field = section.fields[j]
            if (!field.id) errors.push(`assessmentSections[${i}].fields[${j}]: missing "id".`)
            if (!field.type) errors.push(`assessmentSections[${i}].fields[${j}]: missing "type".`)
            if (field.type && !VALID_FIELD_TYPES.includes(field.type)) {
              errors.push(`assessmentSections[${i}].fields[${j}]: invalid type "${field.type}".`)
            }
            if (field.type === 'select' && (!Array.isArray(field.options) || field.options.length === 0)) {
              errors.push(`assessmentSections[${i}].fields[${j}]: "select" type requires non-empty "options" array.`)
            }
          }
        }
      }
    }
  }

  // Progression rules (optional)
  if (program.progressionRules) {
    const pr = program.progressionRules
    if (typeof pr !== 'object') {
      errors.push('"progressionRules" must be an object.')
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Infer the timer type for an exercise if not explicitly set.
 * This provides backward compatibility with exercises that don't have timerType.
 */
export function inferTimerType(exercise) {
  if (exercise.timerType) return exercise.timerType
  if (exercise.holdSeconds && exercise.reps) return 'hybrid'
  if (exercise.holdSeconds) return 'isometric'
  if (exercise.reps) return 'rep_based'
  return 'rep_based'
}

/**
 * Build a category color map from a program's categories array.
 * Falls back to defaults for unknown categories.
 */
export function buildCategoryColorMap(categories) {
  const defaults = {
    isometric: 'bg-teal/10 text-teal dark:bg-teal/20 dark:text-teal-light',
    isotonic: 'bg-amber/10 text-amber dark:bg-amber/20',
    mobility: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    functional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  }

  if (!categories || !Array.isArray(categories)) return defaults

  const map = { ...defaults }
  for (const cat of categories) {
    if (cat.id && cat.colorClass) {
      map[cat.id] = cat.colorClass
    }
  }
  return map
}

/**
 * Extract the list of pain metric field IDs from assessment sections.
 */
export function extractPainFields(assessmentSections) {
  if (!assessmentSections) return []
  const fields = []
  for (const section of assessmentSections) {
    for (const field of section.fields || []) {
      if (field.isPainMetric) {
        fields.push(field.id)
      }
    }
  }
  return fields
}

/**
 * Build the initial form state from assessment sections.
 */
export function buildInitialAssessmentForm(assessmentSections) {
  if (!assessmentSections) return {}
  const form = {}
  for (const section of assessmentSections) {
    for (const field of section.fields || []) {
      if (field.type === 'pain_scale') {
        form[field.id] = 0
      } else if (field.type === 'number') {
        form[field.id] = ''
      } else if (field.type === 'select') {
        form[field.id] = field.defaultValue || field.options?.[0] || ''
      } else if (field.type === 'text') {
        form[field.id] = ''
      }
    }
  }
  return form
}

/**
 * Get all checklists across all phases that have them.
 * Returns an array of { phaseId, phaseName, items: [...] }.
 */
export function getPhaseChecklists(phases) {
  if (!phases) return []
  return phases
    .filter((p) => p.checklists && p.checklists.length > 0)
    .map((p) => ({
      phaseId: p.id,
      phaseName: p.name,
      items: p.checklists,
    }))
}
